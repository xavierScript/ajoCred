import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";

/**
 * Wallet configuration for AjoCred.
 *
 * Two ways in, side by side:
 *  1. CDP Embedded Wallet — email sign-in issues an instant self-custodial
 *     wallet (no seed phrase). This is the preferred, lowest-friction path.
 *  2. External wallets — MetaMask / browser injected, the Coinbase Wallet
 *     extension, and (when a project id is configured) WalletConnect.
 *
 * Both surface through the same wagmi connectors array, so every downstream
 * `useAccount` / `useWriteContract` in the deposit and borrow flows works
 * unchanged regardless of how the user signed in.
 */

const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID;
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const transports = {
  [baseSepolia.id]: http(),
};

// CDP embedded-wallet connector. Only added when a project id is present; the
// email sign-in modal cannot function without one, so we omit it rather than
// register a connector that would fail on first use.
const cdpConnector = cdpProjectId
  ? [
      createCDPEmbeddedWalletConnector({
        cdpConfig: {
          projectId: cdpProjectId,
          ethereum: { createOnLogin: "eoa" },
        },
        providerConfig: {
          chains: [baseSepolia],
          transports,
          // Don't announce over EIP-6963: we surface the embedded wallet through
          // the email sign-in button, so it must not also appear as a discovered
          // injected connector in the external-wallet list.
          announceProvider: false,
        },
      }),
    ]
  : [];

// WalletConnect is optional (needs a Reown/WalletConnect project id). Injected
// + Coinbase extension work with no extra configuration.
const walletConnectConnector = walletConnectProjectId
  ? [walletConnect({ projectId: walletConnectProjectId })]
  : [];

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    ...cdpConnector,
    injected(),
    coinbaseWallet({ appName: "AjoCred" }),
    ...walletConnectConnector,
  ],
  transports,
});
