import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";

const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID;
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const transports = {
  [baseSepolia.id]: http(),
};

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
          announceProvider: false,
        },
      }),
    ]
  : [];

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
