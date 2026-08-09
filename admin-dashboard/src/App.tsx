import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { Web3Provider } from "@/providers/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";
import { AdminCoopProvider } from "@/hooks/useAdminCoop";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RequireWallet } from "@/components/RequireWallet";
import { OverviewPage } from "@/pages/Overview";
import { RegisterCoopPage } from "@/pages/RegisterCoop";
import { FundPoolPage } from "@/pages/FundPool";
import { MembersRiskPage } from "@/pages/MembersRisk";
import { CompliancePage } from "@/pages/Compliance";
import { FiatRampPage } from "@/pages/FiatRamp";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireWallet>
            <OverviewPage />
          </RequireWallet>
        ),
      },
      {
        path: "cooperatives",
        element: (
          <RequireWallet>
            <RegisterCoopPage />
          </RequireWallet>
        ),
      },
      {
        path: "fund",
        element: (
          <RequireWallet>
            <FundPoolPage />
          </RequireWallet>
        ),
      },
      {
        path: "members",
        element: (
          <RequireWallet>
            <MembersRiskPage />
          </RequireWallet>
        ),
      },
      {
        path: "compliance",
        element: (
          <RequireWallet>
            <CompliancePage />
          </RequireWallet>
        ),
      },
      {
        path: "ramp",
        element: (
          <RequireWallet>
            <FiatRampPage />
          </RequireWallet>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <AdminCoopProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AdminCoopProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}
