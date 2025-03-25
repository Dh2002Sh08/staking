import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './idl';

// Define the program's public key
export const PROGRAM_ID_PUBKEY = new PublicKey(PROGRAM_ID);

/**
 * Derives the PDA for Staking Metadata.
 * PDA Seed Format: ["staking_metadata", user]
 */
export const deriveStakingMetadataPDA = (user: PublicKey): PublicKey => {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staking_metadata'), user.toBuffer()],
        PROGRAM_ID_PUBKEY
    );
    return pda;
};

/**
 * Derives the PDA for the Staking Vault.
 * PDA Seed Format: ["staking_vault", mint]
 */
export const deriveStakingVaultPDA = (mint: PublicKey): PublicKey => {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staking_vault'), mint.toBuffer()],
        PROGRAM_ID_PUBKEY
    );
    return pda;
};

/**
 * Derives the PDA for a User's Stake Account.
 * PDA Seed Format: ["user_stake", user, mint]
 */
export const deriveUserStakePDA = (user: PublicKey, mint: PublicKey): PublicKey => {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_stake'), user.toBuffer(), mint.toBuffer()],
        PROGRAM_ID_PUBKEY
    );
    return pda;
};
