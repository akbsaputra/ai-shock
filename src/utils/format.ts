export function formatValue(value: number | string | boolean | null, mode: 'auto' | 'percent' | 'points' | 'number' = 'auto'): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'string') {
    return value.replace(/\uFFFD/g, '');
  }

  if (mode === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (mode === 'points') {
    return value.toFixed(2);
  }

  if (mode === 'number') {
    return value.toFixed(2);
  }

  if (Math.abs(value) < 1) {
    return `${(value * 100).toFixed(2)}%`;
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  return value.toFixed(2);
}

export function formatCompactNumber(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
