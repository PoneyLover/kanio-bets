export function formatKan(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KAN`;
}

export function formatOdds(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toFixed(2);
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
