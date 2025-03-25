import './globals.css';
import './wallet.css';
import { SolanaWalletProvider } from "@/components/WalletProvider";

export const metadata = {
  title: 'Solana Staking dApp',
  description: 'A decentralized application for staking Solana tokens',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
