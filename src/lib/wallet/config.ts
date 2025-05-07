import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

// Get your projectId from WalletConnect Cloud: https://cloud.walletconnect.com/
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const wagmiConfig = getDefaultConfig({
  appName: 'GovAIrn',
  projectId: projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false // We're not using SSR
});

// Utility function to get shortened wallet address
export function formatWalletAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
