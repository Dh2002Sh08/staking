import { Idl } from '@project-serum/anchor';

export const PROGRAM_ID = "9KqUvjg4NNZpJvL3TxqDjcxTAib37RJNRBRjKLveTPoe";

export interface StakingAccount {
    totalStaked: bigint;
    tokenMint: string;
}

export const IDL: Idl = {
    "version": "0.1.0",
    "name": "staking",
    "instructions": [
        {
            "name": "initialize",
            "accounts": [
                {
                    "name": "stakingAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "stake",
            "accounts": [
                {
                    "name": "stakingAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "unstake",
            "accounts": [
                {
                    "name": "stakingAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "StakingAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "totalStaked",
                        "type": "u64"
                    },
                    {
                        "name": "tokenMint",
                        "type": "publicKey"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "InsufficientFunds",
            "msg": "Insufficient funds to unstake."
        },
        {
            "code": 6001,
            "name": "IncorrectTokenMint",
            "msg": "The token mint does not match."
        }
    ]
}; 