import { Program, AnchorProvider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { IDL, PROGRAM_ID as IDL_PROGRAM_ID } from './idl';

export const PROGRAM_ID = new PublicKey(IDL_PROGRAM_ID);

/**
 * Derives the PDA for the Staking Account.
 * PDA Seed Format: ["staking", user]
 */
export function deriveStakingAccountPDA(userPubkey: PublicKey): PublicKey {
    const [stakingAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('staking'), userPubkey.toBuffer()],
        PROGRAM_ID
    );
    return stakingAccountPDA;
}

export function getProgram(provider: AnchorProvider): Program {
    return new Program(IDL, PROGRAM_ID, provider);
}
