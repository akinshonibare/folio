"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type StealthCtx = {
  stealth: boolean;
  setStealth: (v: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<StealthCtx | null>(null);

const STORAGE_KEY = "folio:stealth";

export function StealthProvider({
  defaultOn,
  children,
}: {
  defaultOn?: boolean;
  children: React.ReactNode;
}) {
  const [stealth, setStealthState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setStealthState(true);
    else if (stored === "0") setStealthState(false);
    else if (defaultOn) setStealthState(true);
  }, [defaultOn]);

  const setStealth = useCallback((v: boolean) => {
    setStealthState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    }
  }, []);
  const toggle = useCallback(() => setStealth(!stealth), [setStealth, stealth]);

  const value = useMemo(
    () => ({ stealth, setStealth, toggle }),
    [stealth, setStealth, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStealth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStealth must be used inside <StealthProvider>");
  return v;
}
