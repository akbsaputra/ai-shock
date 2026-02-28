import type { ScenarioKey } from './types';

export const SCENARIO_KEYS: ScenarioKey[] = [
  'low-low',
  'med-low',
  'high-low',
  'low-high',
  'med-high',
  'high-high',
];

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  'low-low': 'Low impact/Low market power',
  'med-low': 'Medium impact/Low market power',
  'high-low': 'High impact/Low market power',
  'low-high': 'Low impact/High market power',
  'med-high': 'Medium impact/High market power',
  'high-high': 'High impact/High market power',
};

export const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  'low-low': '#60A5FA',
  'med-low': '#2563EB',
  'high-low': '#1E3A8A',
  'low-high': '#C08A4B',
  'med-high': '#9A6125',
  'high-high': '#6F3F1C',
};

export const BASELINE_COLOR = '#15803D';

export const CHANGES_SERIES_COLORS: Record<string, string> = {
  'total-change': '#2563EB',
  'net-change': '#9A6125',
};
