import { useState } from 'react';
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartSeriesView, ChartViewModel, ImpactFocus, MarketPowerFocus } from '../model/types';
import { formatValue } from '../utils/format';

interface ChartsSectionProps {
  charts: ChartViewModel[];
  marketPowerFocus: MarketPowerFocus;
  onMarketPowerFocusChange: (focus: MarketPowerFocus) => void;
  impactFocus: ImpactFocus;
  onImpactFocusChange: (focus: ImpactFocus) => void;
  showSummaryTable: boolean;
  onShowSummaryChange: (value: boolean) => void;
}

const PRIMARY_SUMMARY_CHART_IDS = new Set(['summary-total-tax-revenue', 'summary-net-fiscal-impact']);

interface TooltipEntry {
  id: string;
  name: string;
  color: string;
  value: number | null;
  delta: number | null;
}

interface RechartsTooltipItem {
  color?: string;
  dataKey?: string;
  name?: string;
  payload?: Record<string, unknown>;
  value?: number | null;
}

type ImpactBucket = 'low' | 'med' | 'high';

function formatTooltipLabel(label: string | number): string {
  if (typeof label === 'number') {
    return `Year ${label}`;
  }

  const numericLabel = Number(label);
  if (label.trim() !== '' && Number.isFinite(numericLabel)) {
    return `Year ${numericLabel}`;
  }

  return String(label);
}

function compactSeriesName(name: string): string {
  return name
    .replace('Medium impact', 'Med')
    .replace(' impact', '')
    .replace(' / ', '/')
    .replace(' domestic value capture', ' DVC')
    .replace(' market power', ' MP');
}

function formatLegendLabel(series: ChartSeriesView): string {
  if (series.role === 'baseline' || series.id === 'baseline' || series.name.toLowerCase().startsWith('baseline')) {
    return 'baseline';
  }

  if (series.scenarioKey) {
    const [impact, marketPower] = series.scenarioKey.split('-');
    if (impact && marketPower) {
      const domesticValueCapture = marketPower === 'low' ? 'high' : marketPower === 'high' ? 'low' : marketPower;
      return `${impact}/${domesticValueCapture}`;
    }
  }

  return compactSeriesName(series.name);
}

function parseScenarioLabel(value: string): { impact: ImpactBucket; marketPower: 'low' | 'high' } | null {
  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
  const impactMatch = normalized.match(/\b(low|med|medium|high)\s+impact\b/);
  const marketPowerMatch = normalized.match(/\b(low|high)\s+(?:market power|domestic value capture)\b/);

  if (!impactMatch || !marketPowerMatch) {
    return null;
  }

  const impact = impactMatch[1] === 'medium' ? 'med' : (impactMatch[1] as ImpactBucket);
  return {
    impact,
    marketPower: marketPowerMatch[1] as 'low' | 'high',
  };
}

function extractDisplacementRate(value: string): string | null {
  const match = value.match(/(\d+(?:\.\d+)?)%\s*displacement/i);
  return match ? `${match[1]}%` : null;
}

function formatChangesAxisTick(value: string | number): string {
  const raw = String(value);
  const parsed = parseScenarioLabel(raw);
  if (parsed) {
    return `${parsed.impact}/${parsed.marketPower}`;
  }
  return raw.replace(/\s+/g, ' ').slice(0, 28);
}

function formatScenarioLabelForTooltip(value: string | number): string {
  const raw = String(value).replace(/\s+/g, ' ').trim();
  const parsed = parseScenarioLabel(raw);
  if (!parsed) {
    return raw;
  }

  const impactLabel = parsed.impact === 'med' ? 'Medium' : parsed.impact === 'low' ? 'Low' : 'High';
  const marketPowerLabel = parsed.marketPower === 'low' ? 'Low' : 'High';
  return `${impactLabel} impact/${marketPowerLabel} domestic value capture`;
}

function formatTooltipPercent(value: number | null): string {
  if (value === null) {
    return '';
  }
  return `${(value * 100).toFixed(1)}%`;
}

function buildChangesDisplacementNote(chart: ChartViewModel): string | null {
  const rates: Partial<Record<ImpactBucket, string>> = {};

  chart.data.forEach((point) => {
    if (typeof point.x !== 'string') {
      return;
    }
    const parsed = parseScenarioLabel(point.x);
    const displacementRate = extractDisplacementRate(point.x);
    if (!parsed || !displacementRate) {
      return;
    }
    if (!rates[parsed.impact]) {
      rates[parsed.impact] = displacementRate;
    }
  });

  const orderedImpacts: ImpactBucket[] = ['low', 'med', 'high'];
  const parts = orderedImpacts
    .filter((impact) => Boolean(rates[impact]))
    .map((impact) => `${impact} ${rates[impact]}`);

  return parts.length > 0 ? `Displacement: ${parts.join(', ')}.` : null;
}

function sortByImpactOrder(series: ChartSeriesView[]): ChartSeriesView[] {
  const impactOrder: Record<string, number> = {
    low: 0,
    med: 1,
    high: 2,
  };

  return [...series].sort((left, right) => {
    const leftImpact = left.scenarioKey?.split('-')[0] ?? '';
    const rightImpact = right.scenarioKey?.split('-')[0] ?? '';
    return (impactOrder[leftImpact] ?? 99) - (impactOrder[rightImpact] ?? 99);
  });
}

function buildLegendRows(series: ChartSeriesView[]): ChartSeriesView[][] {
  const baseline = series.filter((item) => item.role === 'baseline' || item.id === 'baseline');
  const lowMarketPower = sortByImpactOrder(series.filter((item) => item.scenarioKey?.endsWith('-low')));
  const highMarketPower = sortByImpactOrder(series.filter((item) => item.scenarioKey?.endsWith('-high')));

  const usedIds = new Set([...baseline, ...lowMarketPower, ...highMarketPower].map((item) => item.id));
  const ungrouped = series.filter((item) => !usedIds.has(item.id));

  if (lowMarketPower.length === 0 && highMarketPower.length === 0) {
    return [[...baseline, ...ungrouped]];
  }

  const firstRow = [...baseline, ...lowMarketPower, ...ungrouped];
  const secondRow = [...highMarketPower];

  return secondRow.length > 0 ? [firstRow, secondRow] : [firstRow];
}

function formatDeltaFromBaseline(delta: number): string {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${(delta * 100).toFixed(1)}% from baseline`;
}

function buildTooltipEntries(
  payload: RechartsTooltipItem[],
  focusedSeriesId: string | null = null,
): TooltipEntry[] {
  if (payload.length === 0) {
    return [];
  }

  const row = payload[0].payload ?? {};
  const baseline = typeof row.baseline === 'number' ? row.baseline : null;

  const entries = payload.map((item) => {
    const value = typeof item.value === 'number' ? item.value : null;
    const delta = baseline !== null && item.dataKey !== 'baseline' && value !== null && baseline !== 0 ? (value - baseline) / baseline : null;
    return {
      id: item.dataKey ?? '',
      name: item.name ?? item.dataKey ?? '',
      color: item.color ?? '#1f2937',
      value,
      delta,
    };
  });

  if (!focusedSeriesId) {
    return entries;
  }

  const primary = entries.find((entry) => entry.id === focusedSeriesId);
  if (!primary) {
    return [];
  }

  if (focusedSeriesId === 'baseline') {
    return [primary];
  }

  const primaryValue = primary.value;
  if (primaryValue === null) {
    return [primary];
  }

  const overlaps = entries.filter((entry) => entry.value !== null && Math.abs(entry.value - primaryValue) < 0.000001);
  return overlaps.length > 1 ? overlaps : [primary];
}

function TooltipBody({ label, entries, showDelta = true }: { label: string; entries: TooltipEntry[]; showDelta?: boolean }) {
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{formatTooltipLabel(label)}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <span style={{ color: entry.color }}>{entry.name}:</span> {formatValue(entry.value, 'number')}
            {showDelta && entry.delta !== null ? ` (${formatDeltaFromBaseline(entry.delta)})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DefaultTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: RechartsTooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return <TooltipBody label={String(label ?? '')} entries={buildTooltipEntries(payload)} />;
}

function ChangesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: RechartsTooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entries = payload.map((item) => ({
    id: item.dataKey ?? '',
    name: item.name ?? item.dataKey ?? '',
    color: item.color ?? '#1f2937',
    value: typeof item.value === 'number' ? item.value : null,
  }));

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{formatScenarioLabelForTooltip(label ?? '')}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <span style={{ color: entry.color }}>{entry.name}:</span> {formatTooltipPercent(entry.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilteredLineTooltip({
  active,
  payload,
  label,
  hoveredSeriesId,
}: {
  active?: boolean;
  payload?: RechartsTooltipItem[];
  label?: string | number;
  hoveredSeriesId: string | null;
}) {
  if (!active || !payload || payload.length === 0 || !hoveredSeriesId) {
    return null;
  }

  const entries = buildTooltipEntries(payload, hoveredSeriesId);
  if (entries.length === 0) {
    return null;
  }

  return <TooltipBody label={String(label ?? '')} entries={entries} showDelta={hoveredSeriesId !== 'baseline'} />;
}

function ChartCard({ chart }: { chart: ChartViewModel }) {
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [legendHoverSeriesId, setLegendHoverSeriesId] = useState<string | null>(null);
  const [pinnedSeriesIds, setPinnedSeriesIds] = useState<Set<string>>(() => new Set());

  const focusedSeriesId = legendHoverSeriesId ?? hoveredSeriesId;
  const hasPinnedSeries = pinnedSeriesIds.size > 0;
  const legendRows = buildLegendRows(chart.visibleSeries);
  const changesDisplacementNote = chart.spec.id === 'changes-over-10y' ? buildChangesDisplacementNote(chart) : null;

  const togglePinnedSeries = (seriesId: string) => {
    setPinnedSeriesIds((current) => {
      const next = new Set(current);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  return (
    <article className="chart-card">
      <header className="chart-card__header">
        <div className="chart-card__title-block">
          <h4>{chart.spec.title}</h4>
          {changesDisplacementNote ? <p className="chart-card__title-note">{changesDisplacementNote}</p> : null}
        </div>
        <div
          className="chart-card__series-key"
          aria-label="Chart series key"
          onMouseLeave={() => setLegendHoverSeriesId(null)}
        >
          {legendRows.map((row, rowIndex) => (
            <div key={`legend-row-${rowIndex}`} className="chart-card__series-row">
              {row.map((series) => {
                const isPinned = pinnedSeriesIds.has(series.id);
                const isHighlighted = hasPinnedSeries
                  ? isPinned
                  : focusedSeriesId === null || focusedSeriesId === series.id;
                return (
                  <button
                    key={series.id}
                    type="button"
                    className={`chart-card__series-item ${isPinned ? 'chart-card__series-item--active' : ''}`}
                    onMouseEnter={() => setLegendHoverSeriesId(series.id)}
                    onMouseLeave={() => setLegendHoverSeriesId((current) => (current === series.id ? null : current))}
                    onFocus={() => setLegendHoverSeriesId(series.id)}
                    onBlur={() => setLegendHoverSeriesId((current) => (current === series.id ? null : current))}
                    onClick={() => togglePinnedSeries(series.id)}
                    style={{ opacity: isHighlighted ? 1 : 0.42 }}
                    title={series.name}
                  >
                    <span className="chart-card__series-swatch" style={{ backgroundColor: series.color }} />
                    {formatLegendLabel(series)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </header>

      <div className={`chart-card__canvas ${chart.spec.chartType === 'line' ? 'chart-card__canvas--line' : ''}`}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.spec.chartType === 'line' ? (
            <LineChart
              data={chart.data}
              margin={{ top: 8, right: 8, bottom: 2, left: 0 }}
              onMouseLeave={() => {
                setHoveredSeriesId(null);
              }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(31, 41, 55, 0.18)" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={2} />
              <YAxis tick={{ fontSize: 11 }} width={42} />
              <Tooltip
                cursor={false}
                offset={10}
                shared
                wrapperStyle={{ pointerEvents: 'none' }}
                content={<FilteredLineTooltip hoveredSeriesId={hoveredSeriesId} />}
              />
              {chart.visibleSeries.map((series) => {
                const isHighlighted = hasPinnedSeries
                  ? pinnedSeriesIds.has(series.id)
                  : focusedSeriesId === null || focusedSeriesId === series.id;
                const handleSeriesHover = () => {
                  setHoveredSeriesId(series.id);
                };
                const handleSeriesLeave = () => {
                  setHoveredSeriesId((current) => (current === series.id ? null : current));
                };

                return (
                  <Line
                    key={series.id}
                    type="monotone"
                    dataKey={series.id}
                    className="chart-line--interactive"
                    stroke={series.color}
                    strokeOpacity={isHighlighted ? 1 : 0.34}
                    strokeWidth={series.role === 'baseline' ? (isHighlighted ? 2.8 : 2.3) : isHighlighted ? 2.3 : 1.8}
                    dot={false}
                    activeDot={
                      hoveredSeriesId === series.id
                        ? {
                            r: 3.5,
                            strokeWidth: 0,
                            fill: series.color,
                            style: { cursor: 'pointer' },
                            onMouseEnter: handleSeriesHover,
                            onMouseMove: handleSeriesHover,
                            onMouseLeave: handleSeriesLeave,
                          }
                        : false
                    }
                    name={series.name}
                    isAnimationActive
                    animationDuration={260}
                    onMouseEnter={handleSeriesHover}
                    onMouseMove={handleSeriesHover}
                    onMouseLeave={handleSeriesLeave}
                  />
                );
              })}
              <Brush
                dataKey="x"
                height={20}
                travellerWidth={8}
                stroke="rgba(31, 41, 55, 0.5)"
                tickFormatter={(value) => String(value)}
              />
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 8, right: 6, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(31, 41, 55, 0.18)" />
              <XAxis
                dataKey="x"
                interval={0}
                tick={{ fontSize: 11 }}
                tickMargin={4}
                tickFormatter={(value) =>
                  chart.spec.id === 'changes-over-10y'
                    ? formatChangesAxisTick(value)
                    : String(value).replace(/\s+/g, ' ').slice(0, 28)
                }
              />
              <YAxis
                tick={{ fontSize: 11 }}
                width={42}
                tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
              />
              <Tooltip content={chart.spec.id === 'changes-over-10y' ? <ChangesTooltip /> : <DefaultTooltip />} />
              {chart.visibleSeries.map((series) => {
                const isHighlighted = hasPinnedSeries
                  ? pinnedSeriesIds.has(series.id)
                  : focusedSeriesId === null || focusedSeriesId === series.id;
                return (
                  <Bar
                    key={series.id}
                    dataKey={series.id}
                    name={series.name}
                    fill={series.color}
                    fillOpacity={isHighlighted ? 1 : 0.35}
                    isAnimationActive
                    animationDuration={260}
                  />
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function ChartsSection({
  charts,
  marketPowerFocus,
  onMarketPowerFocusChange,
  impactFocus,
  onImpactFocusChange,
  showSummaryTable,
  onShowSummaryChange,
}: ChartsSectionProps) {
  const summaryCharts = charts.filter((chart) => chart.spec.group === 'summary');
  const primarySummaryCharts = summaryCharts.filter((chart) => PRIMARY_SUMMARY_CHART_IDS.has(chart.spec.id));
  const secondarySummaryCharts = summaryCharts.filter((chart) => !PRIMARY_SUMMARY_CHART_IDS.has(chart.spec.id));
  const changesCharts = charts.filter((chart) => chart.spec.group === 'changes');

  return (
    <section id="insights" className="panel panel--insights section-animate">
      <div className="charts-toolbar">
        <h2>Charts</h2>

        <div className="charts-toolbar__controls">
          <p className="charts-toolbar__legend-note">
            <span>Legend format: impact/domestic value capture</span>
            <span>For example, "low/high" means low impact and high domestic value capture.</span>
            <span>Line charts: drag the timeline handles to zoom.</span>
          </p>
          <div className="charts-toolbar__filters">
            <div className="segmented" role="group" aria-label="Impact focus">
              {(['all', 'low', 'med', 'high'] as const).map((focus) => (
                <button
                  key={focus}
                  type="button"
                  className={`segmented__button ${impactFocus === focus ? 'segmented__button--active' : ''}`}
                  onClick={() => onImpactFocusChange(focus)}
                >
                  {focus === 'all' ? 'All impact' : focus === 'med' ? 'Medium' : focus === 'low' ? 'Low' : 'High'}
                </button>
              ))}
            </div>

            <div className="segmented" role="group" aria-label="Domestic value capture focus">
              {(['all', 'low', 'high'] as const).map((focus) => (
                <button
                  key={focus}
                  type="button"
                  className={`segmented__button ${marketPowerFocus === focus ? 'segmented__button--active' : ''}`}
                  onClick={() => onMarketPowerFocusChange(focus)}
                >
                  {focus === 'all' ? 'All Domestic Value Capture' : focus === 'low' ? 'Low' : 'High'}
                </button>
              ))}
            </div>

            <label className="summary-toggle">
              <input
                type="checkbox"
                checked={showSummaryTable}
                onChange={(event) => onShowSummaryChange(event.target.checked)}
              />
              Show Summary Table
            </label>
          </div>
        </div>
      </div>

      <section className="chart-section">
        <div className="chart-grid">
          {primarySummaryCharts.map((chart) => (
            <ChartCard key={chart.spec.id} chart={chart} />
          ))}
        </div>
      </section>

      <section className="chart-section">
        <div className="chart-grid chart-grid--single">
          {changesCharts.map((chart) => (
            <ChartCard key={chart.spec.id} chart={chart} />
          ))}
        </div>
      </section>

      <section className="chart-section">
        <div className="chart-grid">
          {secondarySummaryCharts.map((chart) => (
            <ChartCard key={chart.spec.id} chart={chart} />
          ))}
        </div>
      </section>

    </section>
  );
}

