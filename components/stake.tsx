"use client";
import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getMint
} from '@solana/spl-token';
import { PROGRAM_ID_PUBKEY, deriveStakingMetadataPDA, deriveStakingVaultPDA, deriveUserStakePDA } from '@/lib/program';

export const StakeComponent: FC = () => {
    const { publicKey, sendTransaction } = useWallet();
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
            const mintPubkey = new PublicKey(tokenMint);
            const userStakePDA = deriveUserStakePDA(publicKey!, mintPubkey);
            const accountInfo = await connection.getAccountInfo(userStakePDA);
            if (accountInfo) {
                const amount = accountInfo.data.readBigUInt64LE(32);
                setStakedAmount(Number(amount));
            }
        } catch (error) {
            console.error('Error fetching staked amount:', error);
        }
    };

    const handleStake = async () => {
        if (!publicKey || !amount || !tokenMint) return;

        try {
            setLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMint);
            const stakingAmount = BigInt(Number(amount) * Math.pow(10, tokenDecimals));
            const stakingMetadataPDA = deriveStakingMetadataPDA(mintPubkey);
            const stakingVaultPDA = deriveStakingVaultPDA(mintPubkey);
            const userStakePDA = deriveUserStakePDA(publicKey, mintPubkey);
            
            console.log('Staking Parameters:', {
                stakingAmount: stakingAmount.toString(),
                stakingMetadataPDA: stakingMetadataPDA.toString(),
                stakingVaultPDA: stakingVaultPDA.toString(),
                userStakePDA: userStakePDA.toString(),
                tokenMint: mintPubkey.toString()
            });
            
            // Get or create user's token account
            const userTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );

            const transaction = new Transaction();

            // Check if token account exists and get its balance
            try {
                const tokenAccount = await getAccount(connection, userTokenAccount);
                console.log('Token Account Balance:', tokenAccount.amount.toString());
                
                // Check if user has enough tokens
                if (tokenAccount.amount < stakingAmount) {
                    throw new Error(`Insufficient token balance. Required: ${stakingAmount.toString()}, Available: ${tokenAccount.amount.toString()}`);
                }
            } catch (e: any) {
                if (e.name === 'TokenAccountNotFoundError') {
                    console.log('Creating new token account...');
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            userTokenAccount,
                            publicKey,
                            mintPubkey,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID
                        )
                    );
                } else {
                    throw e;
                }
            }

            // Add stake instruction
            const stakeIx = {
                programId: PROGRAM_ID_PUBKEY,
                keys: [
                    { pubkey: stakingMetadataPDA, isSigner: false, isWritable: true },
                    { pubkey: stakingVaultPDA, isSigner: false, isWritable: true },
                    { pubkey: userStakePDA, isSigner: false, isWritable: true },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: mintPubkey, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                data: Buffer.from([1, ...new Uint8Array(new BigUint64Array([stakingAmount]).buffer)])
            };

            transaction.add(stakeIx);
            console.log('Transaction created, sending...');

            const signature = await sendTransaction(transaction, connection);
            console.log('Transaction sent:', signature);
            
            const confirmation = await connection.confirmTransaction(signature);
            console.log('Transaction confirmed:', confirmation);
            
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            await fetchStakedAmount();
            setAmount('');
        } catch (error: any) {
            console.error('Detailed staking error:', error);
            if (error.message) {
                setError(`Failed to stake tokens: ${error.message}`);
            } else if (error.logs) {
                setError(`Failed to stake tokens: ${error.logs.join('\n')}`);
            } else {
                setError('Failed to stake tokens. Please check your token balance and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnstake = async () => {
        if (!publicKey || stakedAmount <= 0 || !tokenMint) return;

        try {
            setLoading(true);
            setError('');

            const mintPubkey = new PublicKey(tokenMint);
            const unstakingAmount = BigInt(stakedAmount * Math.pow(10, tokenDecimals));
            const stakingMetadataPDA = deriveStakingMetadataPDA(mintPubkey);
            const stakingVaultPDA = deriveStakingVaultPDA(mintPubkey);
            const userStakePDA = deriveUserStakePDA(publicKey, mintPubkey);
            
            const userTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                publicKey
            );

            const transaction = new Transaction();

            // Add unstake instruction
            const unstakeIx = {
                programId: PROGRAM_ID_PUBKEY,
                keys: [
                    { pubkey: stakingMetadataPDA, isSigner: false, isWritable: true },
                    { pubkey: stakingVaultPDA, isSigner: false, isWritable: true },
                    { pubkey: userStakePDA, isSigner: false, isWritable: true },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: mintPubkey, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                data: Buffer.from([2, ...new Uint8Array(new BigUint64Array([unstakingAmount]).buffer)])
            };

            transaction.add(unstakeIx);

            const signature = await sendTransaction(transaction, connection);
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
