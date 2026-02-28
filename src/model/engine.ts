import {
  CellError,
  HyperFormula,
  type CellValue,
  type RawCellContent,
  type SimpleCellAddress,
} from 'hyperformula';
import type { ModelData } from './types';
import { modelData } from './modelData';

const A1_REF = /^([A-Z]+)(\d+)$/;

export interface ParsedRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

function columnLabelToIndex(label: string): number {
  let value = 0;
  for (const char of label) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value - 1;
}

function parseA1Reference(reference: string): { row: number; col: number } {
  const match = reference.toUpperCase().match(A1_REF);
  if (!match) {
    throw new Error(`Invalid A1 reference: ${reference}`);
  }
  return {
    col: columnLabelToIndex(match[1]),
    row: Number(match[2]) - 1,
  };
}

export function parseRange(range: string): ParsedRange {
  const [startRef, endRef] = range.split(':');
  const start = parseA1Reference(startRef);
  const end = parseA1Reference(endRef ?? startRef);
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  };
}

function normalizeFormulaCell(cell: string): string {
  if (!cell.startsWith('=')) {
    return cell;
  }
  return cell;
}

function normalizeSheetData(data: ModelData): Record<string, RawCellContent[][]> {
  const sheets: Record<string, RawCellContent[][]> = {};
  Object.entries(data.sheets).forEach(([sheetName, sheet]) => {
    sheets[sheetName] = sheet.cells.map((row) =>
      row.map((cell) => {
        if (cell === null) {
          return null;
        }
        if (typeof cell === 'string' && cell.startsWith('=')) {
          return normalizeFormulaCell(cell);
        }
        return cell;
      }),
    );
  });
  return sheets;
}

function toCellValue(value: CellValue): number | string | boolean | null {
  if (value instanceof CellError) {
    return null;
  }
  if (value === '') {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

export class ModelEngine {
  readonly data: ModelData;
  readonly hf: HyperFormula;
  readonly sheetIdByName: Record<string, number>;

  constructor(input: ModelData = modelData) {
    this.data = input;
    this.hf = HyperFormula.buildFromSheets(normalizeSheetData(input), {
      licenseKey: 'gpl-v3',
      precisionEpsilon: 1e-12,
      leapYear1900: false,
      evaluateNullToZero: false,
      smartRounding: false,
    });
    this.sheetIdByName = {};

    this.hf.getSheetNames().forEach((name) => {
      const id = this.hf.getSheetId(name);
      if (id !== undefined) {
        this.sheetIdByName[name] = id;
      }
    });

    Object.entries(input.namedExpressions).forEach(([name, expression]) => {
      if (this.hf.getNamedExpression(name) !== undefined) {
        return;
      }
      this.hf.addNamedExpression(name, expression);
    });
  }

  private assertSheet(sheetName: string): number {
    const id = this.sheetIdByName[sheetName];
    if (id === undefined) {
      throw new Error(`Unknown sheet ${sheetName}`);
    }
    return id;
  }

  address(sheetName: string, ref: string): SimpleCellAddress {
    const sheet = this.assertSheet(sheetName);
    const { col, row } = parseA1Reference(ref);
    return { sheet, col, row };
  }

  getCell(sheetName: string, ref: string): number | string | boolean | null {
    const value = this.hf.getCellValue(this.address(sheetName, ref));
    return toCellValue(value);
  }

  getRange(sheetName: string, range: string): Array<Array<number | string | boolean | null>> {
    const sheet = this.assertSheet(sheetName);
    const parsed = parseRange(range);
    const rows: Array<Array<number | string | boolean | null>> = [];

    for (let row = parsed.startRow; row <= parsed.endRow; row += 1) {
      const outRow: Array<number | string | boolean | null> = [];
      for (let col = parsed.startCol; col <= parsed.endCol; col += 1) {
        const value = this.hf.getCellValue({ sheet, col, row });
        outRow.push(toCellValue(value));
      }
      rows.push(outRow);
    }

    return rows;
  }

  setCell(sheetName: string, ref: string, value: number): void {
    this.hf.setCellContents(this.address(sheetName, ref), [[value]]);
  }

  resetAssumptionsToDefault(): void {
    this.data.assumptions.controls.forEach((control) => {
      this.setCell(control.sheet, control.sheetCell, control.defaultValue);
    });
  }
}

export function createModelEngine(): ModelEngine {
  return new ModelEngine(modelData);
}

export function cellToNumber(value: number | string | boolean | null): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}
