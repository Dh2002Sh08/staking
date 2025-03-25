export const PROGRAM_ID = "8at9aBRvovFguL6ri67YWfCEJFD5gzxwo9FMGuupkSSM";

export interface StakingMetadata {
    owner: string;
    totalStaked: bigint;
}

export interface UserStake {
    owner: string;
    amount: bigint;
}

export interface StakingProgram {
    version: "0.1.0";
    name: "staking";
    instructions: [
        {
            name: "initialize";
            accounts: [
                { name: "stakingMetadata"; isMut: true; isSigner: false },
                { name: "user"; isMut: true; isSigner: true },
                { name: "systemProgram"; isMut: false; isSigner: false }
            ];
            args: [];
        },
        {
            name: "stake";
            accounts: [
                { name: "stakingMetadata"; isMut: true; isSigner: false },
                { name: "stakingVault"; isMut: true; isSigner: false },
                { name: "userStake"; isMut: true; isSigner: false },
                { name: "userTokenAccount"; isMut: true; isSigner: false },
                { name: "mint"; isMut: true; isSigner: false },
                { name: "user"; isMut: true; isSigner: true },
                { name: "tokenProgram"; isMut: false; isSigner: false },
                { name: "systemProgram"; isMut: false; isSigner: false },
                { name: "associatedTokenProgram"; isMut: false; isSigner: false }
            ];
            args: [{ name: "amount"; type: "u64" }];
        },
        {
            name: "unstake";
            accounts: [
                { name: "stakingMetadata"; isMut: true; isSigner: false },
                { name: "stakingVault"; isMut: true; isSigner: false },
                { name: "userStake"; isMut: true; isSigner: false },
                { name: "userTokenAccount"; isMut: true; isSigner: false },
                { name: "mint"; isMut: true; isSigner: false },
                { name: "user"; isMut: true; isSigner: true },
                { name: "tokenProgram"; isMut: false; isSigner: false },
                { name: "systemProgram"; isMut: false; isSigner: false },
                { name: "associatedTokenProgram"; isMut: false; isSigner: false }
            ];
            args: [{ name: "amount"; type: "u64" }];
        }
    ];
} 