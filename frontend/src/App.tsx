import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { Web3Provider } from "@/providers/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireWallet } from "@/components/RequireWallet";
import { LandingPage } from "@/pages/Landing";
import { OnboardPage } from "@/pages/Onboard";
import { DashboardPage } from "@/pages/Dashboard";
import { DepositPage } from "@/pages/Deposit";
import { BorrowPage } from "@/pages/Borrow";

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
            <DepositPage />
          </RequireWallet>
        ),
        path: "deposit",
      },
      {
        element: (
          <RequireWallet>
            <BorrowPage />
          </RequireWallet>
        ),
        path: "borrow",
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}
