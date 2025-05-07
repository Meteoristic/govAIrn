import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import WalletProvider from './lib/wallet/WalletProvider'

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <WalletProvider>
      <App />
    </WalletProvider>
  </BrowserRouter>
);
