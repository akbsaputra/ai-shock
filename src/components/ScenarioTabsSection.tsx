import { SCENARIO_KEYS, SCENARIO_LABELS } from '../model/constants';
import type { ScenarioKey, ScenarioTableRow } from '../model/types';
import { formatPercent, formatValue } from '../utils/format';

interface ScenarioTabsSectionProps {
  activeScenario: ScenarioKey;
  onScenarioChange: (scenario: ScenarioKey) => void;
  yearHeaders: string[];
  rows: ScenarioTableRow[];
}

export function ScenarioTabsSection({
  activeScenario,
  onScenarioChange,
  yearHeaders,
  rows,
}: ScenarioTabsSectionProps) {
  return (
    <section id="scenarios" className="panel panel--scenarios section-animate">
      <div className="panel__header">
        <h2>Scenario Details</h2>
      </div>

      <div className="tabs" role="tablist" aria-label="Scenario tabs">
        {SCENARIO_KEYS.map((scenario) => (
          <button
            type="button"
            key={scenario}
            role="tab"
            aria-selected={activeScenario === scenario}
            className={`tab ${activeScenario === scenario ? 'tab--active' : ''}`}
            onClick={() => onScenarioChange(scenario)}
          >
            {SCENARIO_LABELS[scenario]}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="scenario-table">
          <thead>
            <tr>
              <th className="sticky-col">Row Title</th>
              {yearHeaders.map((header) => (
                <th key={`scenario-head-${header}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`scenario-row-${row.row}`}
                className={`
                  ${row.isSection ? 'scenario-row--section' : ''}
                  ${row.isSummaryEmphasis ? 'scenario-row--emphasis' : ''}
                `}
              >
                <td className="sticky-col">{row.label}</td>
                {row.values.map((value, index) => {
                  const isTotalColumn = index === row.values.length - 1;
                  const showDelta = isTotalColumn && row.deltaVsBaselineTotal !== null;
                  return (
                    <td key={`scenario-cell-${row.row}-${index}`}>
                      {formatValue(value)}
                      {showDelta && (
                        <span className={`delta-badge ${row.deltaVsBaselineTotal! < 0 ? 'delta-badge--down' : 'delta-badge--up'}`}>
                          {formatPercent(row.deltaVsBaselineTotal!)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
