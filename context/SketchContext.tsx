import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface SketchEntry {
  id: string;
  originalUri: string;
  sketchBase64: string;
  createdAt: number;
  label?: string;
}

interface SketchContextValue {
  entries: SketchEntry[];
  currentEntry: SketchEntry | null;
  setCurrentEntry: (entry: SketchEntry | null) => void;
  addEntry: (entry: SketchEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

const SketchContext = createContext<SketchContextValue | null>(null);

const STORAGE_KEY = "sketch_entries";

export function SketchProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<SketchEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<SketchEntry | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setEntries(JSON.parse(raw) as SketchEntry[]);
      })
      .catch(() => {});
  }, []);

  const persistEntries = useCallback(async (next: SketchEntry[]) => {
    setEntries(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addEntry = useCallback(
    async (entry: SketchEntry) => {
      const next = [entry, ...entries.slice(0, 19)];
      await persistEntries(next);
    },
    [entries, persistEntries],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const next = entries.filter((e) => e.id !== id);
      await persistEntries(next);
      if (currentEntry?.id === id) setCurrentEntry(null);
    },
    [entries, currentEntry, persistEntries],
  );

  return (
    <SketchContext.Provider
      value={{ entries, currentEntry, setCurrentEntry, addEntry, removeEntry }}
    >
      {children}
    </SketchContext.Provider>
  );
}

export function useSketch() {
  const ctx = useContext(SketchContext);
  if (!ctx) throw new Error("useSketch must be used within SketchProvider");
  return ctx;
}
