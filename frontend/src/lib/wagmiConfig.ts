import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = walletConnectProjectId
  ? getDefaultConfig({
      appName: "AjoCred",
      projectId: walletConnectProjectId,
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http(),
      },
    })
  : createConfig({
      chains: [baseSepolia],
      transports: {
        [baseSepolia.id]: http(),
      },
    });
