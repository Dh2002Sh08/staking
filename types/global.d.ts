import { AnchorProvider } from '@project-serum/anchor';

declare global {
    interface Window {
        solana: {
            publicKey: PublicKey | null;
            isConnected: boolean;
            signTransaction: (transaction: Transaction) => Promise<Transaction>;
            signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
        };
    }
} 