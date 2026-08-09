import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "ajocred.admin.selectedCoopId";

interface AdminCoopContextValue {
  selectedCoopId: string | null;
  selectCoop: (id: string | null) => void;
}

const AdminCoopContext = createContext<AdminCoopContextValue | null>(null);

export function AdminCoopProvider({ children }: { children: ReactNode }) {
  const [selectedCoopId, setSelectedCoopId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const selectCoop = useCallback((id: string | null) => {
    setSelectedCoopId(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage non-fatal */
    }
  }, []);

  const value = useMemo(
    () => ({ selectedCoopId, selectCoop }),
    [selectedCoopId, selectCoop],
  );

  return (
    <AdminCoopContext.Provider value={value}>
      {children}
    </AdminCoopContext.Provider>
  );
}

export function useAdminCoop() {
  const ctx = useContext(AdminCoopContext);
  if (!ctx) throw new Error("useAdminCoop must be used within <AdminCoopProvider>");
  return ctx;
}
