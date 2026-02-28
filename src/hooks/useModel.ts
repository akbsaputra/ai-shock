import { useMemo, useRef, useState } from 'react';
import { cellToNumber, createModelEngine } from '../model/engine';
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
const CURRENT_TAX_SHARE_CELLS = ['C5', 'C6', 'C7', 'C8'] as const;

function roundToTenths(value: number): number {
  return Math.round(value * 10) / 10;
}

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

  function rebalanceCurrentTaxShares(editedCell: string, editedValue: number): void {
    const otherCells = CURRENT_TAX_SHARE_CELLS.filter((cell) => cell !== editedCell);
    const currentOtherValues = otherCells.map((cell) => cellToNumber(engine.getCell('assumptions', cell)) ?? 0);
    const remainingTotal = Math.max(0, roundToTenths(100 - editedValue));
    const currentOtherTotal = currentOtherValues.reduce((sum, value) => sum + value, 0);

    let assignedTotal = 0;

    otherCells.forEach((cell, index) => {
      const isLast = index === otherCells.length - 1;
      let nextValue: number;

      if (isLast) {
        nextValue = roundToTenths(remainingTotal - assignedTotal);
      } else if (currentOtherTotal <= 0) {
        nextValue = roundToTenths(remainingTotal / otherCells.length);
        assignedTotal += nextValue;
      } else {
        nextValue = roundToTenths((remainingTotal * currentOtherValues[index]) / currentOtherTotal);
        assignedTotal += nextValue;
      }

      engine.setCell('assumptions', cell, Math.max(0, nextValue));
    });
  }

  function updateAssumption(sheetCell: string, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    if (CURRENT_TAX_SHARE_CELLS.includes(sheetCell as (typeof CURRENT_TAX_SHARE_CELLS)[number])) {
      const roundedValue = roundToTenths(value);
      engine.setCell('assumptions', sheetCell, roundedValue);
      rebalanceCurrentTaxShares(sheetCell, roundedValue);
      bump();
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
