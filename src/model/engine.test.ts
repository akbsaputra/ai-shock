import { describe, expect, it } from 'vitest';
import { ModelEngine } from './engine';
import { modelData } from './modelData';

const TOLERANCE = 1e-6;

function colIndexToLabel(colIndex: number): string {
  let n = colIndex;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function readMatrix(
  engine: ModelEngine,
  sheetName: string,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
): Array<Array<number | string | boolean | null>> {
  const result: Array<Array<number | string | boolean | null>> = [];
  for (let row = startRow; row <= endRow; row += 1) {
    const startLabel = `${colIndexToLabel(startCol)}${row}`;
    const endLabel = `${colIndexToLabel(endCol)}${row}`;
    result.push(engine.getRange(sheetName, `${startLabel}:${endLabel}`)[0]);
  }
  return result;
}

function assertMatrixClose(
  actual: Array<Array<number | string | boolean | null>>,
  expected: Array<Array<number | string | null>>,
): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, rIdx) => {
    expect(row.length).toBe(expected[rIdx].length);
    row.forEach((value, cIdx) => {
      const expectedValue = expected[rIdx][cIdx];
      if (typeof value === 'number' && typeof expectedValue === 'number') {
        expect(Math.abs(value - expectedValue)).toBeLessThanOrEqual(TOLERANCE);
      } else {
        expect(value).toEqual(expectedValue);
      }
    });
  });
}

describe('ModelEngine parity', () => {
  it('matches baseline workbook values for summary and changes sheets', () => {
    const engine = new ModelEngine(modelData);

    const summaryActual = readMatrix(engine, 'summary', 4, 50, 2, 12);
    const changesActual = readMatrix(engine, 'changes', 3, 8, 2, 3);

    assertMatrixClose(summaryActual, modelData.baselineSnapshots.summaryB4L50);
    assertMatrixClose(changesActual, modelData.baselineSnapshots.changesB3C8);
  });

  it('matches baseline workbook values for all scenario tables', () => {
    const engine = new ModelEngine(modelData);

    for (const scenario of modelData.scenarios.keys) {
      const actual = readMatrix(engine, scenario, 4, 30, 2, 13);
      const expected = modelData.baselineSnapshots.scenarioTables[scenario];
      assertMatrixClose(actual, expected);
    }
  });

  it('registers all named expressions from the workbook', () => {
    const engine = new ModelEngine(modelData);
    const names = Object.keys(modelData.namedExpressions);

    expect(names.length).toBe(39);
    names.forEach((name) => {
      expect(engine.hf.getNamedExpression(name)).toBeDefined();
    });
  });
});
