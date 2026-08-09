import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * The cooperative a member is currently acting within. AjoCred is now
 * multi-tenant: a person joins one cooperative and their dashboard, limit, and
 * borrow/repay all scope to it. We keep the choice in localStorage so it
 * survives a reload, and expose it through a tiny context shared by the
 * dashboard and borrow screens.
 */

const STORAGE_KEY = "ajocred.selectedCoopId";

interface SelectedCoopContextValue {
  /** The chosen cooperative's id, or null until the member picks one. */
  coopId: string | null;
  setCoopId: (id: string | null) => void;
}

const SelectedCoopContext = createContext<SelectedCoopContextValue | undefined>(
  undefined,
);

export function SelectedCoopProvider({ children }: { children: ReactNode }) {
  const [coopId, setCoopIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setCoopId = useCallback((id: string | null) => {
    setCoopIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode) — in-memory selection still works */
    }
  }, []);

  return (
    <SelectedCoopContext.Provider value={{ coopId, setCoopId }}>
      {children}
    </SelectedCoopContext.Provider>
  );
}

export function useSelectedCoop() {
  const ctx = useContext(SelectedCoopContext);
  if (!ctx) {
    throw new Error("useSelectedCoop must be used within a SelectedCoopProvider");
  }
  return ctx;
}
