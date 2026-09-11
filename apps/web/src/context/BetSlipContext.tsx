"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface SlipSelection {
  selectionId: string;
  label: string;
  odds: number;
  marketName: string;
  eventLabel: string;
}

interface BetSlipContextValue {
  selection: SlipSelection | null;
  setSelection: (s: SlipSelection | null) => void;
  toggleSelection: (s: SlipSelection) => void;
  isSelected: (selectionId: string) => boolean;
}

const BetSlipContext = createContext<BetSlipContextValue | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SlipSelection | null>(null);

  const toggleSelection = (s: SlipSelection) => {
    setSelection((current) => (current?.selectionId === s.selectionId ? null : s));
  };

  const isSelected = (selectionId: string) => selection?.selectionId === selectionId;

  return (
    <BetSlipContext.Provider value={{ selection, setSelection, toggleSelection, isSelected }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip doit etre utilise a l'interieur de <BetSlipProvider>");
  return ctx;
}
