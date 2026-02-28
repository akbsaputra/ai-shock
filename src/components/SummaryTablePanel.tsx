import React from 'react';
import type { SummaryGroupView } from '../model/types';
import { formatValue } from '../utils/format';

interface SummaryTablePanelProps {
  visible: boolean;
  yearHeaders: string[];
  groups: SummaryGroupView[];
  onExportCsv: () => void;
}

export function SummaryTablePanel({ visible, yearHeaders, groups, onExportCsv }: SummaryTablePanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <section className="panel panel--summary-table section-animate">
      <div className="panel__header panel__header--inline">
        <h2>Summary Table</h2>
        <button type="button" className="btn btn--ghost" onClick={onExportCsv}>
          Export CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="summary-table">
          <thead>
            <tr>
              <th className="sticky-col">Metric</th>
              {yearHeaders.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={`group-${group.title}`}>
                <tr key={`${group.title}-title`} className="group-row">
                  <td className="sticky-col">{group.title}</td>
                  {yearHeaders.map((header, index) => (
                    <td key={`group-${group.title}-${header}-${index}`} aria-hidden="true" />
                  ))}
                </tr>
                {group.rows.map((row) => (
                  <tr key={`summary-row-${row.row}`}>
                    <td className="sticky-col">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={`summary-${row.row}-${index}`}>{formatValue(value)}</td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
