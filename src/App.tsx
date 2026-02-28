import { useMemo, useState } from 'react';
import { AssumptionsSection } from './components/AssumptionsSection';
import { ChartsSection } from './components/ChartsSection';
import { ScenarioTabsSection } from './components/ScenarioTabsSection';
import { SummaryTablePanel } from './components/SummaryTablePanel';
import { TopBar } from './components/TopBar';
import { useModel } from './hooks/useModel';
import { downloadCsv, downloadJson } from './utils/download';

export default function App() {
  const [showAssumptionsPanel, setShowAssumptionsPanel] = useState(true);
  const {
    assumptions,
    assumptionSheet,
    summaryGroups,
    charts,
    scenarioTable,
    yearHeadersSummary,
    yearHeadersScenario,
    activeScenario,
    setActiveScenario,
    marketPowerFocus,
    setMarketPowerFocus,
    impactFocus,
    setImpactFocus,
    showSummaryTable,
    setShowSummary,
    updateAssumption,
    resetAssumptions,
    workbookLastModified,
  } = useModel();

  const assumptionsPayload = useMemo(
    () => ({
      exportedAt: new Date().toISOString(),
      assumptions: assumptions.controls.map((control) => ({
        id: control.id,
        sheetCell: control.sheetCell,
        label: control.label,
        value: control.value,
      })),
    }),
    [assumptions.controls],
  );

  const handleExportSummaryCsv = () => {
    const rows: string[][] = [['Metric', ...yearHeadersSummary]];
    summaryGroups.forEach((group) => {
      rows.push([group.title, ...new Array(yearHeadersSummary.length).fill('')]);
      group.rows.forEach((row) => {
        rows.push([row.label, ...row.values.map((value) => (value === null ? '' : String(value)))]);
      });
    });
    downloadCsv('ai-shock-summary.csv', rows);
  };

  return (
    <div className="app-shell">
      <TopBar workbookLastModified={workbookLastModified} />

      <main className={`workspace-shell ${showAssumptionsPanel ? '' : 'workspace-shell--collapsed'}`}>
        <aside
          className={`sidebar-pane ${showAssumptionsPanel ? '' : 'sidebar-pane--collapsed'}`}
          aria-label="Model assumptions sidebar"
        >
          <div className="sidebar-pane__inner">
            {showAssumptionsPanel ? (
              <AssumptionsSection
                sections={assumptionSheet}
                controls={assumptions.controls}
                onToggleAssumptions={() => setShowAssumptionsPanel((prev) => !prev)}
                onReset={resetAssumptions}
                onDownloadAssumptions={() => downloadJson('ai-shock-assumptions.json', assumptionsPayload)}
                onControlChange={updateAssumption}
              />
            ) : (
              <div className="sidebar-rail">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Show assumptions"
                  onClick={() => setShowAssumptionsPanel(true)}
                >
                  <span className="icon-btn__glyph" aria-hidden="true">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" />
                      <path d="M7 4v12" />
                      <path d="m10.2 10 2.5-2.5" />
                      <path d="m10.2 10 2.5 2.5" />
                    </svg>
                  </span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className="content-pane">
          <div className="content-pane__inner">
            <ChartsSection
              charts={charts}
              marketPowerFocus={marketPowerFocus}
              onMarketPowerFocusChange={setMarketPowerFocus}
              impactFocus={impactFocus}
              onImpactFocusChange={setImpactFocus}
              showSummaryTable={showSummaryTable}
              onShowSummaryChange={setShowSummary}
            />

            <SummaryTablePanel
              visible={showSummaryTable}
              yearHeaders={yearHeadersSummary}
              groups={summaryGroups}
              onExportCsv={handleExportSummaryCsv}
            />

            <ScenarioTabsSection
              activeScenario={activeScenario}
              onScenarioChange={setActiveScenario}
              yearHeaders={yearHeadersScenario}
              rows={scenarioTable}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
