"use client";

import { useBetSlip } from "@/context/BetSlipContext";
import { formatOdds } from "@/lib/format";
import type { Selection } from "@/lib/types";

export function OddsButton({
  selection,
  marketName,
  eventLabel,
  disabled,
}: {
  selection: Selection;
  marketName: string;
  eventLabel: string;
  disabled?: boolean;
}) {
  const { toggleSelection, isSelected } = useBetSlip();
  const selected = isSelected(selection.id);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        toggleSelection({
          selectionId: selection.id,
          label: selection.label,
          odds: Number(selection.currentOdds),
          marketName,
          eventLabel,
        })
      }
      className={`odds-btn ${selected ? "selected" : ""}`}
    >
      <span className="text-xs text-kanio-muted truncate max-w-[90px]">{selection.label}</span>
      <span className="font-semibold text-kanio-text">{formatOdds(selection.currentOdds)}</span>
    </button>
  );
}
