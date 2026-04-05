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
  'low-low': 'Low impact/High domestic value capture',
  'med-low': 'Medium impact/High domestic value capture',
  'high-low': 'High impact/High domestic value capture',
  'low-high': 'Low impact/Low domestic value capture',
  'med-high': 'Medium impact/Low domestic value capture',
  'high-high': 'High impact/Low domestic value capture',
};

export const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  'low-low': '#60A5FA',
  'med-low': '#2563EB',
  'high-low': '#1E3A8A',
  'low-high': '#FCA5A5',
  'med-high': '#EF4444',
  'high-high': '#991B1B',
};

export const BASELINE_COLOR = '#15803D';

export const CHANGES_SERIES_COLORS: Record<string, string> = {
  'total-change': '#2563EB',
  'net-change': '#DC2626',
};

