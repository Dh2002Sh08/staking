"use client";
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getMint
} from '@solana/spl-token';
import { AnchorProvider, BN, Program } from '@project-serum/anchor';
import { PROGRAM_ID, deriveStakingAccountPDA, getProgram } from '@/lib/program';

export const StakeComponent: FC = () => {
    const { publicKey, sendTransaction, signTransaction } = useWallet();
    const [amount, setAmount] = useState<string>('');
    const [tokenMint, setTokenMint] = useState<string>('');
    const [stakedAmount, setStakedAmount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [tokenDecimals, setTokenDecimals] = useState<number>(9);
    const [tokenSymbol, setTokenSymbol] = useState<string>('');

    const connection = new Connection('https://api.devnet.solana.com');

    useEffect(() => {
        if (publicKey) {
            fetchStakedAmount();
        }
    }, [publicKey]);

    const fetchTokenInfo = async (mintAddress: string) => {
        try {
            const mintPubkey = new PublicKey(mintAddress);
            const mintInfo = await getMint(connection, mintPubkey);
            setTokenDecimals(mintInfo.decimals);
            setTokenSymbol(mintAddress.slice(0, 4) + '...' + mintAddress.slice(-4));
            setError('');
        } catch (error) {
            console.error('Error fetching token info:', error);
            setError('Invalid token mint address');
            setTokenDecimals(9);
            setTokenSymbol('Unknown');
        }
    };

    const handleTokenMintChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTokenMint(value);
        if (value) {
            await fetchTokenInfo(value);
        }
    };

    const fetchStakedAmount = async () => {
        try {
            if (!publicKey || !tokenMint) return;

            const mintPubkey = new PublicKey(tokenMint);
            const stakingAccountPDA = deriveStakingAccountPDA(publicKey);
            const accountInfo = await connection.getAccountInfo(stakingAccountPDA);

            if (accountInfo) {
                const amount = accountInfo.data.readBigUInt64LE(8);
                setStakedAmount(Number(amount));
            }
        } catch (error) {
            console.error('Error fetching staked amount:', error);
        }
    };

    const handleStake = async () => {
        if (!publicKey || !amount || !tokenMint || !signTransaction) return;

        try {
            setLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMint);
            const stakingAmount = new BN(Number(amount) * Math.pow(10, tokenDecimals));

            // Get or create user's token account
            const userTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );

            // Get PDA
            const stakingAccountPDA = deriveStakingAccountPDA(publicKey);

            // Create provider and program
            const provider = new AnchorProvider(
                connection,
                {
                    publicKey,
                    signTransaction,
                    signAllTransactions: async (txs) => {
                        const signedTxs = await Promise.all(
                            txs.map(tx => signTransaction(tx))
                        );
                        return signedTxs;
                    }
                },
                { commitment: 'confirmed' }
            );
            const program = getProgram(provider);

            // Check if staking account exists
            const stakingAccount = await connection.getAccountInfo(stakingAccountPDA);
            if (!stakingAccount) {
                // Verify token mint account exists and is valid
                const mintInfo = await getMint(connection, mintPubkey);
                if (!mintInfo) {
                    throw new Error('Invalid token mint account');
                }

                // Initialize staking account
                const initTx = await program.methods
                    .initialize()
                    .accounts({
                        stakingAccount: stakingAccountPDA,
                        user: publicKey,
                        tokenMint: mintPubkey,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .transaction();

                // Get the latest blockhash
                const { blockhash } = await connection.getLatestBlockhash();
                initTx.recentBlockhash = blockhash;
                initTx.feePayer = publicKey;

                // Sign and send the initialization transaction
                const signedInitTx = await signTransaction(initTx);
                const initSignature = await connection.sendRawTransaction(signedInitTx.serialize());
                await connection.confirmTransaction(initSignature);
            }

            // Check if token account exists
            try {
                await getAccount(connection, userTokenAccount);
            } catch (e: any) {
                if (e.name === 'TokenAccountNotFoundError') {
                    const transaction = new Transaction().add(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            userTokenAccount,
                            publicKey,
                            mintPubkey,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID
                        )
                    );
                    const signature = await sendTransaction(transaction, connection);
                    await connection.confirmTransaction(signature);
                } else {
                    throw e;
                }
            }

            // Create the stake transaction
            const tx = await program.methods
                .stake(stakingAmount)
                .accounts({
                    stakingAccount: stakingAccountPDA,
                    userTokenAccount: userTokenAccount,
                    user: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .transaction();

            // Get the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            // Sign the transaction
            const signedTx = await signTransaction(tx);

            // Send the transaction
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction(signature);

            await fetchStakedAmount();
            setAmount('');
        } catch (error: any) {
            console.error('Detailed staking error:', error);
            if (error.logs) {
                // Check for token mint error
                const tokenMintError = error.logs.find((log: string) => 
                    log.includes('ProgramError caused by account: token_mint') ||
                    log.includes('Error Code: InvalidAccountData')
                );
                
                if (tokenMintError) {
                    setError('Invalid token mint address. Please enter a valid SPL token mint address.');
                } else {
                    setError(`Failed to stake tokens: ${error.logs.join('\n')}`);
                }
            } else if (error.message) {
                setError(`Failed to stake tokens: ${error.message}`);
            } else {
                setError('Failed to stake tokens. Please check your token balance and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnstake = async () => {
        if (!publicKey || stakedAmount <= 0 || !tokenMint || !signTransaction) return;

        try {
            setLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMint);
            const unstakingAmount = new BN(stakedAmount * Math.pow(10, tokenDecimals));

            // Get user's token account
            const userTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );

            // Get PDA
            const stakingAccountPDA = deriveStakingAccountPDA(publicKey);

            // Create provider and program
            const provider = new AnchorProvider(
                connection,
                {
                    publicKey,
                    signTransaction,
                    signAllTransactions: async (txs) => {
                        const signedTxs = await Promise.all(
                            txs.map(tx => signTransaction(tx))
                        );
                        return signedTxs;
                    }
                },
                { commitment: 'confirmed' }
            );
            const program = getProgram(provider);

            // Create the unstake transaction
            const tx = await program.methods
                .unstake(unstakingAmount)
                .accounts({
                    stakingAccount: stakingAccountPDA,
                    userTokenAccount: userTokenAccount,
                    user: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .transaction();

            // Get the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            // Sign the transaction
            const signedTx = await signTransaction(tx);

            // Send the transaction
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction(signature);

            await fetchStakedAmount();
        } catch (error) {
            console.error('Error unstaking:', error);
            setError('Failed to unstake tokens. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white/80 dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="flex justify-center mb-8">
                <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white font-bold py-2 px-4 rounded" />
            </div>

            {publicKey && (
                <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        Connected Wallet: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Token Mint Address
                        </label>
                        <input
                            type="text"
                            value={tokenMint}
                            onChange={handleTokenMintChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Enter token mint address"
                        />
                        {tokenSymbol && (
                            <div className="text-sm text-gray-600">
                                Token: {tokenSymbol}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Amount to Stake
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Enter amount"
                        />
                        <div className="text-sm text-gray-500">
                            Decimals: {tokenDecimals}
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        Currently Staked: {stakedAmount} {tokenSymbol}
                    </div>

                    {error && (
                        <div className="text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={handleStake}
                            disabled={loading || !amount || !tokenMint}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Stake'}
                        </button>

                        <button
                            onClick={handleUnstake}
                            disabled={loading || stakedAmount <= 0 || !tokenMint}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Unstake'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
