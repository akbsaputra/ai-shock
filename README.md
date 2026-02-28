# AI Shock Fiscal Simulator

Single-page React + TypeScript application that reproduces the AI shock workbook in-browser with HyperFormula and interactive charts.

## Setup

1. Install dependencies:
   - `npm install`
2. Rebuild model JSON from the workbook (optional unless workbook changed):
   - `npm run build:model`
3. Start dev server:
   - `npm run dev`
4. Run tests:
   - `npm test`

## Notes

- Source workbook expected by the model builder:
  - `C:\Users\akbar\Downloads\AI shock model (11).xlsx`
- Generated model data:
  - `src/model/modelData.json`
- `diff countries` sheet is intentionally excluded in v1.
