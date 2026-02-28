import { CHART_SPECS } from './chartSpecs';
import { BASELINE_COLOR, CHANGES_SERIES_COLORS, SCENARIO_COLORS, SCENARIO_KEYS, SCENARIO_LABELS } from './constants';
import { cellToNumber, type ModelEngine } from './engine';
import type {
  ChangesRowView,
  ChartPoint,
  ChartSeriesView,
  ChartViewModel,
  ImpactFocus,
  InsightCard,
  MarketPowerFocus,
  ScenarioKey,
  ScenarioTableRow,
  SummaryGroupView,
} from './types';

const LOW_MARKET_SCENARIOS: ScenarioKey[] = ['low-low', 'med-low', 'high-low'];
const HIGH_MARKET_SCENARIOS: ScenarioKey[] = ['low-high', 'med-high', 'high-high'];
const LOW_IMPACT_SCENARIOS: ScenarioKey[] = ['low-low', 'low-high'];
const MED_IMPACT_SCENARIOS: ScenarioKey[] = ['med-low', 'med-high'];
const HIGH_IMPACT_SCENARIOS: ScenarioKey[] = ['high-low', 'high-high'];
const ASSUMPTION_SECTION_SPECS = [
  { titleRow: 3, startRow: 4, endRow: 8, columns: ['C'], variantLabels: ['Value'] },
  { titleRow: 9, startRow: 10, endRow: 12, columns: ['C'], variantLabels: ['Value'] },
  { titleRow: 13, startRow: 14, endRow: 17, columns: ['C', 'D', 'E'] },
  { titleRow: 18, startRow: 19, endRow: 21, columns: ['C'], variantLabels: ['Value'] },
  { titleRow: 22, startRow: 23, endRow: 25, columns: ['C', 'D'] },
  { titleRow: 26, startRow: 27, endRow: 27, columns: ['C'], variantLabels: ['Value'] },
  { titleRow: 28, startRow: 29, endRow: 35, columns: ['C'], variantLabels: ['Value'] },
  { titleRow: 36, startRow: 37, endRow: 39, columns: ['C'], variantLabels: ['Value'] },
] as const;

type AssumptionInputFormat = 'auto' | 'percent' | 'points' | 'number';

export interface AssumptionSheetVariantView {
  id: string;
  label: string;
  sheetCell: string;
  value: number | string | boolean | null;
  editable: boolean;
  format: AssumptionInputFormat;
  min: number | null;
  max: number | null;
  step: number | null;
}

export interface AssumptionSheetRowView {
  id: string;
  label: string;
  additionalInfo: string | null;
  variants: AssumptionSheetVariantView[];
}

export interface AssumptionSheetSectionView {
  id: string;
  title: string;
  variantLabels: string[];
  rows: AssumptionSheetRowView[];
}

function toNumber(value: number | string | boolean | null): number {
  const parsed = cellToNumber(value);
  return parsed ?? 0;
}

function toLabel(value: number | string | boolean | null): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return '';
}

function getSeriesName(engine: ModelEngine, sheet: string, cell: string | undefined, fallback: string): string {
  if (!cell) {
    return fallback;
  }
  const value = engine.getCell(sheet, cell);
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function isScenarioAllowedByFocus(scenario: ScenarioKey, focus: MarketPowerFocus): boolean {
  if (focus === 'all') {
    return true;
  }
  if (focus === 'low') {
    return LOW_MARKET_SCENARIOS.includes(scenario);
  }
  return HIGH_MARKET_SCENARIOS.includes(scenario);
}

function isScenarioAllowedByImpact(scenario: ScenarioKey, focus: ImpactFocus): boolean {
  if (focus === 'all') {
    return true;
  }
  if (focus === 'low') {
    return LOW_IMPACT_SCENARIOS.includes(scenario);
  }
  if (focus === 'med') {
    return MED_IMPACT_SCENARIOS.includes(scenario);
  }
  return HIGH_IMPACT_SCENARIOS.includes(scenario);
}

export function selectAssumptionValues(engine: ModelEngine): {
  controls: Array<{
    id: string;
    sheetCell: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: 'percent' | 'points' | 'number';
    label: string;
    group: string;
    variable: string | null;
    additionalInfo: string | null;
  }>;
  derived: Array<{
    id: string;
    sheetCell: string;
    value: number | string | null;
    label: string | null;
    variable: string | null;
    additionalInfo: string | null;
  }>;
} {
  const controls = engine.data.assumptions.controls.map((control) => {
    const value = toNumber(engine.getCell(control.sheet, control.sheetCell));
    return {
      id: control.id,
      sheetCell: control.sheetCell,
      value,
      min: control.min,
      max: control.max,
      step: control.step,
      format: control.format,
      label: control.label,
      group: control.group,
      variable: control.variable,
      additionalInfo: control.additionalInfo,
    };
  });

  const derived = engine.data.assumptions.derived.map((field) => ({
    id: field.id,
    sheetCell: field.sheetCell,
    value: engine.getCell(field.sheet, field.sheetCell),
    label: field.label,
    variable: field.variable,
    additionalInfo: field.additionalInfo,
  }));

  return { controls, derived };
}

export function selectAssumptionSheet(engine: ModelEngine): AssumptionSheetSectionView[] {
  const controlsByCell = new Map(engine.data.assumptions.controls.map((control) => [control.sheetCell, control]));
  const derivedByCell = new Map(engine.data.assumptions.derived.map((field) => [field.sheetCell, field]));

  return ASSUMPTION_SECTION_SPECS.map((section) => {
    const title = toLabel(engine.getCell('assumptions', `A${section.titleRow}`));
    const variantLabels = section.columns.map((column, index) => {
      if (section.variantLabels?.[index]) {
        return section.variantLabels[index];
      }
      return toLabel(engine.getCell('assumptions', `${column}${section.titleRow}`));
    });

    const rows: AssumptionSheetRowView[] = [];

    for (let row = section.startRow; row <= section.endRow; row += 1) {
      const label = toLabel(engine.getCell('assumptions', `A${row}`));
      if (!label) {
        continue;
      }

      const additionalInfoRaw = engine.getCell('assumptions', `F${row}`);
      const additionalInfo = typeof additionalInfoRaw === 'string' && additionalInfoRaw.trim() ? additionalInfoRaw : null;

      const variants = section.columns
        .map((column, index) => {
          const sheetCell = `${column}${row}`;
          const control = controlsByCell.get(sheetCell);
          const derived = derivedByCell.get(sheetCell);
          const value = engine.getCell('assumptions', sheetCell);

          if (!control && !derived && value === null) {
            return null;
          }

          return {
            id: `assumption-sheet-${sheetCell.toLowerCase()}`,
            label: variantLabels[index] ?? 'Value',
            sheetCell,
            value,
            editable: Boolean(control),
            format: control?.format ?? 'auto',
            min: control?.min ?? null,
            max: control?.max ?? null,
            step: control?.step ?? null,
          } satisfies AssumptionSheetVariantView;
        })
        .filter((variant): variant is AssumptionSheetVariantView => variant !== null);

      rows.push({
        id: `assumption-sheet-row-${row}`,
        label,
        additionalInfo,
        variants,
      });
    }

    return {
      id: `assumption-sheet-section-${section.titleRow}`,
      title,
      variantLabels,
      rows,
    };
  });
}

export function selectSummaryGroups(
  engine: ModelEngine,
  marketPowerFocus: MarketPowerFocus,
  impactFocus: ImpactFocus,
): SummaryGroupView[] {
  const groups: SummaryGroupView[] = [];

  engine.data.summary.groups.forEach((group) => {
    const rows = [];
    for (let row = group.startRow; row <= group.endRow; row += 1) {
      const label = toLabel(engine.getCell('summary', `A${row}`));

      let scenarioKey: ScenarioKey | null = null;
      if (row >= 10 && row <= 15) {
        scenarioKey = SCENARIO_KEYS[row - 10];
      } else if (row >= 17 && row <= 22) {
        scenarioKey = SCENARIO_KEYS[row - 17];
      } else if (row >= 24 && row <= 29) {
        scenarioKey = SCENARIO_KEYS[row - 24];
      } else if (row >= 31 && row <= 36) {
        scenarioKey = SCENARIO_KEYS[row - 31];
      } else if (row >= 38 && row <= 43) {
        scenarioKey = SCENARIO_KEYS[row - 38];
      } else if (row >= 45 && row <= 50) {
        scenarioKey = SCENARIO_KEYS[row - 45];
      }

      if (
        scenarioKey &&
        (!isScenarioAllowedByFocus(scenarioKey, marketPowerFocus) || !isScenarioAllowedByImpact(scenarioKey, impactFocus))
      ) {
        continue;
      }

      const values = engine.getRange('summary', `B${row}:M${row}`)[0] ?? [];
      rows.push({ row, label, values });
    }

    groups.push({ title: group.title, rows });
  });

  return groups;
}

export function selectChangesRows(engine: ModelEngine): ChangesRowView[] {
  const rows: ChangesRowView[] = [];
  for (let row = 3; row <= 8; row += 1) {
    rows.push({
      row,
      scenarioLabel: toLabel(engine.getCell('changes', `A${row}`)),
      totalTaxRevenueChange: toNumber(engine.getCell('changes', `B${row}`)),
      netFiscalImpactChange: toNumber(engine.getCell('changes', `C${row}`)),
    });
  }
  return rows;
}

export function selectScenarioTable(engine: ModelEngine, scenario: ScenarioKey): ScenarioTableRow[] {
  const sheetName = engine.data.scenarios.sheetByKey[scenario];
  const rows: ScenarioTableRow[] = [];

  const baselineTotal = toNumber(engine.getCell(sheetName, 'M26'));
  const sectionRows = new Set(engine.data.scenarios.meta.sectionRows.map((section) => section.row));
  const summaryRows = new Set(engine.data.scenarios.meta.summaryRows);

  for (let row = 3; row <= 30; row += 1) {
    const label = toLabel(engine.getCell(sheetName, `A${row}`));
    const values = engine.getRange(sheetName, `B${row}:M${row}`)[0] ?? [];
    const total = toNumber(values[11] ?? null);
    const delta = baselineTotal !== 0 ? (total - baselineTotal) / baselineTotal : null;

    rows.push({
      row,
      label,
      values,
      isSection: sectionRows.has(row),
      isSummaryEmphasis: summaryRows.has(row),
      deltaVsBaselineTotal: summaryRows.has(row) ? delta : null,
    });
  }

  return rows;
}

export function selectScenarioTables(engine: ModelEngine): Record<ScenarioKey, ScenarioTableRow[]> {
  return {
    'low-low': selectScenarioTable(engine, 'low-low'),
    'med-low': selectScenarioTable(engine, 'med-low'),
    'high-low': selectScenarioTable(engine, 'high-low'),
    'low-high': selectScenarioTable(engine, 'low-high'),
    'med-high': selectScenarioTable(engine, 'med-high'),
    'high-high': selectScenarioTable(engine, 'high-high'),
  };
}

function buildChartData(
  xValues: Array<number | string | boolean | null>,
  visibleSeries: ChartSeriesView[],
  ySeriesValues: Record<string, Array<number | string | boolean | null>>,
): ChartPoint[] {
  return xValues.map((x, idx) => {
    const point: ChartPoint = { x: typeof x === 'number' ? x : toLabel(x) };
    visibleSeries.forEach((series) => {
      const y = ySeriesValues[series.id]?.[idx] ?? null;
      point[series.id] = typeof y === 'boolean' ? Number(y) : y;
    });
    return point;
  });
}

export function selectCharts(
  engine: ModelEngine,
  marketPowerFocus: MarketPowerFocus,
  impactFocus: ImpactFocus,
): ChartViewModel[] {
  const charts: ChartViewModel[] = [];

  CHART_SPECS.forEach((spec) => {
    if (marketPowerFocus !== 'all' && spec.group === 'deep-dive' && spec.marketPowerTag !== marketPowerFocus) {
      return;
    }

    const xRangeRows = engine.getRange(spec.sheet, spec.xRange);
    const xValues = xRangeRows.flat();

    const visibleSeries: ChartSeriesView[] = [];
    const ySeriesValues: Record<string, Array<number | string | boolean | null>> = {};

    spec.series.forEach((seriesSpec, seriesIndex) => {
      const isBaseline = seriesSpec.role === 'baseline';
      const allowedByScenario =
        !seriesSpec.scenarioKey ||
        (isScenarioAllowedByFocus(seriesSpec.scenarioKey, marketPowerFocus) &&
          isScenarioAllowedByImpact(seriesSpec.scenarioKey, impactFocus));

      if (!isBaseline && !allowedByScenario) {
        return;
      }

      const name = seriesSpec.label ?? (isBaseline ? 'Baseline' : getSeriesName(engine, spec.sheet, seriesSpec.labelCell, `Series ${seriesIndex + 1}`));
      const isChangesSeries = spec.id === 'changes-over-10y';
      const color = isBaseline
        ? BASELINE_COLOR
        : seriesSpec.scenarioKey
          ? SCENARIO_COLORS[seriesSpec.scenarioKey]
          : isChangesSeries
            ? (CHANGES_SERIES_COLORS[seriesSpec.id] ?? '#2563EB')
            : '#2563EB';

      visibleSeries.push({
        id: seriesSpec.id,
        name,
        color,
        scenarioKey: seriesSpec.scenarioKey,
        role: seriesSpec.role,
      });

      if (typeof seriesSpec.constantValue === 'number') {
        ySeriesValues[seriesSpec.id] = xValues.map(() => seriesSpec.constantValue);
      } else if (seriesSpec.valuesRange) {
        ySeriesValues[seriesSpec.id] = engine.getRange(spec.sheet, seriesSpec.valuesRange).flat();
      } else {
        ySeriesValues[seriesSpec.id] = xValues.map(() => null);
      }
    });

    let data = buildChartData(xValues, visibleSeries, ySeriesValues);

    if (spec.id === 'changes-over-10y') {
      data = data.filter((_, index) => {
        const scenario = SCENARIO_KEYS[index];
        return isScenarioAllowedByFocus(scenario, marketPowerFocus) && isScenarioAllowedByImpact(scenario, impactFocus);
      });
    }

    charts.push({
      spec,
      data,
      visibleSeries,
    });
  });

  return charts;
}

function formatScenarioOutcome(scenario: ScenarioKey, value: number): string {
  const pct = `${(value * 100).toFixed(2)}%`;
  return `${SCENARIO_LABELS[scenario]} (${pct})`;
}

export function selectInsights(engine: ModelEngine): InsightCard[] {
  const changes = selectChangesRows(engine);

  const totalChangeByScenario: Record<ScenarioKey, number> = {
    'low-low': changes[0].totalTaxRevenueChange,
    'med-low': changes[1].totalTaxRevenueChange,
    'high-low': changes[2].totalTaxRevenueChange,
    'low-high': changes[3].totalTaxRevenueChange,
    'med-high': changes[4].totalTaxRevenueChange,
    'high-high': changes[5].totalTaxRevenueChange,
  };

  const netChangeByScenario: Record<ScenarioKey, number> = {
    'low-low': changes[0].netFiscalImpactChange,
    'med-low': changes[1].netFiscalImpactChange,
    'high-low': changes[2].netFiscalImpactChange,
    'low-high': changes[3].netFiscalImpactChange,
    'med-high': changes[4].netFiscalImpactChange,
    'high-high': changes[5].netFiscalImpactChange,
  };

  const bestTotalTaxScenario = Object.entries(totalChangeByScenario).sort((a, b) => b[1] - a[1])[0] as [
    ScenarioKey,
    number,
  ];

  const worstNetScenario = Object.entries(netChangeByScenario).sort((a, b) => a[1] - b[1])[0] as [
    ScenarioKey,
    number,
  ];

  const lowPenalty = totalChangeByScenario['low-high'] - totalChangeByScenario['low-low'];
  const medPenalty = totalChangeByScenario['med-high'] - totalChangeByScenario['med-low'];
  const highPenalty = totalChangeByScenario['high-high'] - totalChangeByScenario['high-low'];

  const baselineThreshold = toNumber(engine.getCell('summary', 'M8'));
  const netTotals = [45, 46, 47, 48, 49, 50].map((row) => toNumber(engine.getCell('summary', `M${row}`)));
  const riskCount = netTotals.filter((value) => value < baselineThreshold).length;

  return [
    {
      id: 'best-total-tax',
      title: 'Best 10-year total tax scenario',
      value: formatScenarioOutcome(bestTotalTaxScenario[0], bestTotalTaxScenario[1]),
      supportingText: 'Highest % change in total tax revenue from the changes sheet.',
      severity: bestTotalTaxScenario[1] >= 0 ? 'positive' : 'warning',
    },
    {
      id: 'worst-net-fiscal',
      title: 'Worst 10-year net fiscal scenario',
      value: formatScenarioOutcome(worstNetScenario[0], worstNetScenario[1]),
      supportingText: 'Lowest net fiscal change; monitor this as downside risk.',
      severity: 'negative',
    },
    {
      id: 'market-power-penalty',
      title: 'Market-power penalty by impact level',
      value: `Low ${(lowPenalty * 100).toFixed(2)}% | Med ${(medPenalty * 100).toFixed(2)}% | High ${(highPenalty * 100).toFixed(2)}%`,
      supportingText: 'Difference between high-market-power and low-market-power total-tax outcomes.',
      severity: 'warning',
    },
    {
      id: 'risk-flags',
      title: 'Risk flags',
      value: `${riskCount}/6 scenarios below baseline net fiscal threshold`,
      supportingText: `Threshold set at baseline 10-year total (${baselineThreshold.toFixed(2)}).`,
      severity: riskCount > 0 ? 'negative' : 'neutral',
    },
  ];
}

export function selectYearHeaders(engine: ModelEngine, sheetName: string, row: number): string[] {
  return engine
    .getRange(sheetName, `B${row}:M${row}`)[0]
    .map((value) => (typeof value === 'number' ? value.toString() : toLabel(value)));
}

export function selectScenarioRowsForChangesChart(engine: ModelEngine): string[] {
  return engine
    .getRange('changes', 'A3:A8')
    .flat()
    .map((item) => toLabel(item));
}
