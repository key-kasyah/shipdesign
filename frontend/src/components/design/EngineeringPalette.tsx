// Render-only palette adapter. Persisted waterline colors and exported design
// payloads retain their original values; only browser paint uses theme tokens.
const waterlineColors = [
  "#38bdf8", "#06b6d4", "#0ea5e9", "#0284c7", "#2563eb", "#4f46e5",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

const aliases: Record<string, string> = {
  "#0891b2": "--chart-primary", "#22d3ee": "--chart-primary",
  "#67e8f9": "--chart-primary", "#a5f3fc": "--chart-primary",
  "#7dd3fc": "--chart-primary", "#bae6fd": "--chart-primary",
  "#0c4a6e": "--chart-primary", "#075985": "--chart-primary",
  "#7c3aed": "--chart-secondary", "#a78bfa": "--chart-secondary",
  "#c4b5fd": "--chart-secondary", "#c7d2fe": "--chart-secondary",
  "#818cf8": "--chart-secondary", "#c084fc": "--chart-secondary",
  "#f59e0b": "--chart-tertiary", "#d97706": "--chart-tertiary",
  "#eab308": "--chart-tertiary", "#facc15": "--chart-tertiary",
  "#fbbf24": "--chart-tertiary", "#fde047": "--chart-tertiary",
  "#fde68a": "--chart-tertiary", "#ea580c": "--chart-tertiary",
  "#10b981": "--status-success", "#059669": "--status-success",
  "#16a34a": "--status-success", "#2dd4bf": "--chart-primary",
  "#5eead4": "--chart-primary", "#ef4444": "--status-danger",
  "#dc2626": "--status-danger", "#fb7185": "--status-danger",
  "#db2777": "--chart-waterline-10",
  "#64748b": "--text-tertiary", "#94a3b8": "--text-tertiary",
  "#475569": "--text-tertiary", "#cbd5e1": "--border-default",
  "#334155": "--border-default", "#1e293b": "--border-subtle",
  "#f1f5f9": "--border-subtle", "#e2e8f0": "--text-secondary",
  "#0f172a": "--text-primary", "#ffffff": "--surface-engineering",
  "#fff": "--surface-engineering", "#090d16": "--surface-inset",
  "#020617": "--surface-inset",
  "#ecfeff": "--surface-engineering", "#fef3c7": "--surface-engineering",
  "#f3e8ff": "--surface-engineering", "#0f2b48": "--surface-selected",
  "#083344": "--surface-selected",
};

export function engineeringColor(color: string, role?: "text"): string {
  const normalized = color.toLowerCase();
  if (role === "text" && ["#cbd5e1", "#334155", "#1e293b", "#e2e8f0", "#f1f5f9", "#ffffff", "#fff"].includes(normalized)) {
    return "var(--text-secondary)";
  }
  const withAlpha = normalized.match(/^(#[0-9a-f]{6})([0-9a-f]{2})$/);
  if (withAlpha) {
    const base = engineeringColor(withAlpha[1]);
    if (base !== withAlpha[1]) {
      return `color-mix(in srgb, ${base} ${(parseInt(withAlpha[2], 16) / 255) * 100}%, transparent)`;
    }
  }
  const rgba = normalized.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    const hex = `#${[rgba[1], rgba[2], rgba[3]].map(value => Number(value).toString(16).padStart(2, "0")).join("")}`;
    const base = engineeringColor(hex);
    if (base !== hex) return rgba[4] ? `color-mix(in srgb, ${base} ${Number(rgba[4]) * 100}%, transparent)` : base;
  }
  const index = waterlineColors.indexOf(normalized);
  if (index >= 0) return `var(--chart-waterline-${index})`;
  return aliases[normalized] ? `var(${aliases[normalized]})` : color;
}
