export type ScenarioKey =
  | 'low-low'
  | 'med-low'
  | 'high-low'
  | 'low-high'
  | 'med-high'
  | 'high-high';

export type MarketPowerFocus = 'all' | 'low' | 'high';
export type ImpactFocus = 'all' | 'low' | 'med' | 'high';

export type AssumptionGroup = 'Core Drivers' | 'Tax & Pass-through' | 'Labour Tax Dynamics';

export interface AssumptionControl {
  id: string;
  sheet: 'assumptions';
  sheetCell: string;
  group: AssumptionGroup;
  label: string;
  variable: string | null;
  additionalInfo: string | null;
  editable: true;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  format: 'percent' | 'points' | 'number';
}

export interface DerivedAssumptionField {
  id: string;
  sheet: 'assumptions';
  sheetCell: string;
  label: string | null;
  variable: string | null;
  additionalInfo: string | null;
  editable: false;
}

export interface ChartSeriesSpec {
  id: string;
  labelCell?: string;
  valuesRange?: string;
  label?: string;
  constantValue?: number;
  scenarioKey?: ScenarioKey;
  role?: 'baseline' | 'scenario';
}

export interface ChartSpec {
  id: string;
  title: string;
  group: 'summary' | 'changes' | 'deep-dive';
  chartType: 'line' | 'bar';
  sheet: string;
  xRange: string;
  marketPowerTag: MarketPowerFocus;
  series: ChartSeriesSpec[];
}

export interface ChartPoint {
  x: string | number;
  [seriesId: string]: string | number | null;
}

export interface ChartSeriesView {
  id: string;
  name: string;
  color: string;
  scenarioKey?: ScenarioKey;
  role?: 'baseline' | 'scenario';
}

export interface ChartViewModel {
  spec: ChartSpec;
  data: ChartPoint[];
  visibleSeries: ChartSeriesView[];
}

export interface InsightCard {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  severity: 'neutral' | 'positive' | 'warning' | 'negative';
}

export interface SummaryRowView {
  row: number;
  label: string;
  values: Array<number | string | boolean | null>;
}

export interface SummaryGroupView {
  title: string;
  rows: SummaryRowView[];
}

export interface ChangesRowView {
  row: number;
  scenarioLabel: string;
  totalTaxRevenueChange: number;
  netFiscalImpactChange: number;
}

export interface ScenarioTableRow {
  row: number;
  label: string;
  values: Array<number | string | boolean | null>;
  isSection: boolean;
  isSummaryEmphasis: boolean;
  deltaVsBaselineTotal: number | null;
}

export interface ModelSnapshot {
  assumptions: {
    controls: AssumptionControl[];
    derived: Array<DerivedAssumptionField & { value: number | string | null }>;
  };
  summaryRows: SummaryGroupView[];
  changesRows: ChangesRowView[];
  scenarioTables: Record<ScenarioKey, ScenarioTableRow[]>;
  chartSeries: ChartViewModel[];
  insights: InsightCard[];
}

export interface ModelData {
  metadata: {
    title: string;
    generatedAt: string;
    workbookSource: string;
    workbookLastModified: string;
    includedSheets: string[];
    scenarioKeys: ScenarioKey[];
    excludedSheets: string[];
    units: string;
  };
  sheets: Record<string, { maxRow: number; maxCol: number; cells: Array<Array<string | number | null>> }>;
  sheetsValues: Record<string, { maxRow: number; maxCol: number; cells: Array<Array<string | number | null>> }>;
  namedExpressions: Record<string, string>;
  assumptions: {
    controls: AssumptionControl[];
    derived: DerivedAssumptionField[];
    groups: AssumptionGroup[];
    infoMap: Record<string, string>;
  };
  summary: {
    yearHeaderRow: number;
    dataRange: { startRow: number; endRow: number; startCol: number; endCol: number };
    groups: Array<{ title: string; startRow: number; endRow: number; rowLabels: string[] }>;
  };
  changes: {
    headerRow: number;
    dataRange: { startRow: number; endRow: number; startCol: number; endCol: number };
  };
  scenarios: {
    keys: ScenarioKey[];
    sheetByKey: Record<ScenarioKey, string>;
    meta: {
      rowLabelRange: { start: number; end: number };
      valueRange: { startRow: number; endRow: number; startCol: number; endCol: number };
      yearHeaderRow: number;
      summaryRows: number[];
      baselineRow: number;
      sectionRows: Array<{ row: number; label: string }>;
      rowLabels: string[];
    };
  };
  baselineSnapshots: {
    summaryB4L50: Array<Array<number | string | null>>;
    changesB3C8: Array<Array<number | string | null>>;
    scenarioTables: Record<ScenarioKey, Array<Array<number | string | null>>>;
  };
}
