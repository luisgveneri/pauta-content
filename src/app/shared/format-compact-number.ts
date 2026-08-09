const COMPACT_FORMATTER = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatCompactNumber(value: number): string {
  return COMPACT_FORMATTER.format(value);
}
