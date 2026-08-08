import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type ToastTone = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: ReactNode;
  /** ms; 0 or undefined for loading = sticky until updated/dismissed. */
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => string;
  update: (id: string, t: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Monotonic id without Math.random / Date.now (avoids SSR/lint pitfalls).
let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const schedule = useCallback(
    (t: Toast) => {
      const auto = t.tone === "loading" ? 0 : (t.duration ?? 5000);
      if (auto > 0) {
        timers.current[t.id] = setTimeout(() => dismiss(t.id), auto);
      }
    },
    [dismiss],
  );

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `t${++toastSeq}`;
      const next: Toast = { id, ...t };
      setToasts((prev) => [...prev, next]);
      schedule(next);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Toast, "id">>) => {
      setToasts((prev) => {
        const found = prev.find((t) => t.id === id);
        if (!found) return prev;
        const merged = { ...found, ...patch };
        if (timers.current[id]) {
          clearTimeout(timers.current[id]);
          delete timers.current[id];
        }
        schedule(merged);
        return prev.map((t) => (t.id === id ? merged : t));
      });
    },
    [schedule],
  );

  const value = useMemo(
    () => ({ toast, update, dismiss }),
    [toast, update, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CircleCheck className="size-5 text-success" />,
  error: <CircleAlert className="size-5 text-destructive" />,
  info: <Info className="size-5 text-primary" />,
  loading: <Spinner className="size-5 text-muted-foreground" />,
};

function ToastRow({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg",
      )}
    >
      <span className="mt-0.5 shrink-0">{toneIcon[toast.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <div className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {toast.description}
          </div>
        )}
      </div>
      {toast.tone !== "loading" && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

// Provider + hook are colocated by design; the rule only concerns dev fast-refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
