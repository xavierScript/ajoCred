import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CDPReactProvider } from "@coinbase/cdp-react/components/CDPReactProvider";
import { wagmiConfig } from "@/lib/wagmiConfig";

const cdpProjectId = import.meta.env.VITE_CDP_PROJECT_ID;

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

  // The CDP context powers email sign-in. It is only mounted when a project id
  // is configured; without one the app still runs on external wallets alone.
  if (!cdpProjectId) return tree;

  return (
    <CDPReactProvider
      config={{
        projectId: cdpProjectId,
        ethereum: { createOnLogin: "eoa" },
        appName: "AjoCred",
        authMethods: ["email"],
      }}
    >
      {tree}
    </CDPReactProvider>
  );
}
