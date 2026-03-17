import { useMemo, useRef, useState } from 'react';
import { createModelEngine } from '../model/engine';
import { modelData } from '../model/modelData';
import {
  selectAssumptionSheet,
  selectAssumptionValues,
  selectCharts,
  selectChangesRows,
  selectScenarioTable,
  selectSummaryGroups,
  selectYearHeaders,
} from '../model/selectors';
import type { ImpactFocus, MarketPowerFocus, ScenarioKey } from '../model/types';

const STORAGE_KEY = 'ai-shock-show-summary-table';

function readInitialSummaryToggle(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function useModel() {
  const engineRef = useRef(createModelEngine());
  const [version, setVersion] = useState(0);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('low-low');
  const [marketPowerFocus, setMarketPowerFocus] = useState<MarketPowerFocus>('all');
  const [impactFocus, setImpactFocus] = useState<ImpactFocus>('all');
  const [showSummaryTable, setShowSummaryTable] = useState<boolean>(readInitialSummaryToggle);

  const engine = engineRef.current;

  const assumptions = useMemo(() => selectAssumptionValues(engine), [engine, version]);
  const assumptionSheet = useMemo(() => selectAssumptionSheet(engine), [engine, version]);

  const summaryGroups = useMemo(
    () => selectSummaryGroups(engine, marketPowerFocus, impactFocus),
    [engine, version, marketPowerFocus, impactFocus],
  );

  const changesRows = useMemo(() => selectChangesRows(engine), [engine, version]);

  const charts = useMemo(
    () => selectCharts(engine, marketPowerFocus, impactFocus),
    [engine, version, marketPowerFocus, impactFocus],
  );

  const scenarioTable = useMemo(() => selectScenarioTable(engine, activeScenario), [engine, version, activeScenario]);

  const yearHeadersSummary = useMemo(() => selectYearHeaders(engine, 'summary', 2), [engine, version]);
  const yearHeadersScenario = useMemo(() => selectYearHeaders(engine, activeScenario, 2), [engine, version, activeScenario]);

  const workbookLastModified = modelData.metadata.workbookLastModified;

  function bump(): void {
    setVersion((prev) => prev + 1);
  }

  function updateAssumption(sheetCell: string, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    engine.setCell('assumptions', sheetCell, value);
    bump();
  }

  function resetAssumptions(): void {
    engine.resetAssumptionsToDefault();
    bump();
  }

  function setShowSummary(next: boolean): void {
    setShowSummaryTable(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    }
  }

  return {
    engine,
    assumptions,
    assumptionSheet,
    summaryGroups,
    changesRows,
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
  };
}
