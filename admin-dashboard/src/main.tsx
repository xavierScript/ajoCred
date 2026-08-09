import { Buffer } from "buffer";
import process from "process";

if (typeof window !== "undefined") {
  if (!window.Buffer) {
    (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
  }
  if (!window.process) {
    (window as unknown as { process: typeof process }).process = process;
  }
}

import { Component, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: "sans-serif", background: "#0f172a", color: "#f8fafc", minHeight: "100vh" }}>
          <h2 style={{ color: "#ef4444" }}>Application Startup Error</h2>
          <p style={{ marginTop: 8, color: "#94a3b8" }}>An error prevented the application from rendering:</p>
          <pre style={{ marginTop: 16, background: "#1e293b", padding: 16, borderRadius: 8, overflowX: "auto", color: "#fca5a5", fontSize: 13 }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
