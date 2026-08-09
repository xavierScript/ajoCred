import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { Web3Provider } from "@/providers/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";
import { SelectedCoopProvider } from "@/hooks/useSelectedCoop";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireWallet } from "@/components/RequireWallet";
import { LandingPage } from "@/pages/Landing";
import { OnboardPage } from "@/pages/Onboard";
import { DashboardPage } from "@/pages/Dashboard";
import { CooperativesPage } from "@/pages/Cooperatives";
import { BorrowPage } from "@/pages/Borrow";
import { RampPage } from "@/pages/Ramp";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "onboard", element: <OnboardPage /> },
      {
        element: (
          <RequireWallet>
            <DashboardPage />
          </RequireWallet>
        ),
        path: "dashboard",
      },
      {
        element: (
          <RequireWallet>
            <CooperativesPage />
          </RequireWallet>
        ),
        path: "cooperatives",
      },
      {
        element: (
          <RequireWallet>
            <BorrowPage />
          </RequireWallet>
        ),
        path: "borrow",
      },
      {
        element: (
          <RequireWallet>
            <RampPage />
          </RequireWallet>
        ),
        path: "ramp",
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <SelectedCoopProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </SelectedCoopProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}
