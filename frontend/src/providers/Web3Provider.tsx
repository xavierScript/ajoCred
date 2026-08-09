import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CDPReactProvider } from "@coinbase/cdp-react";
import { wagmiConfig } from "@/lib/wagmiConfig";

const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID;

const validCdpId =
  typeof cdpProjectId === "string" &&
  cdpProjectId.trim() !== "" &&
  cdpProjectId !== "undefined";

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  const tree = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );

  // The CDP context powers email sign-in. It is only mounted when a valid project id
  // is configured; without one the app still runs on external wallets alone.
  if (!validCdpId) return tree;

  return (
    <CDPReactProvider
      config={{
        projectId: cdpProjectId.trim(),
        ethereum: { createOnLogin: "eoa" },
        appName: "AjoCred",
        authMethods: ["email"],
      }}
    >
      {tree}
    </CDPReactProvider>
  );
}
