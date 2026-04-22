export function formatStat(value, decimals = 3) {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return value.toFixed(decimals);
}

export function formatPercentage(value, decimals = 1) {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  return (value * 100).toFixed(decimals) + '%';
}
