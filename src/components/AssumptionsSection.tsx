import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AssumptionSheetSectionView,
  AssumptionSheetVariantView,
} from '../model/selectors';
import { formatValue } from '../utils/format';

interface AssumptionControlView {
  sheetCell: string;
  value: number;
}

interface AssumptionsSectionProps {
  sections: AssumptionSheetSectionView[];
  controls: AssumptionControlView[];
  onToggleAssumptions: () => void;
  onReset: () => void;
  onDownloadAssumptions: () => void;
  onControlChange: (sheetCell: string, value: number) => void;
}

const HALF_WIDTH_ROW_LABELS = new Set([
  'Baseline labor tax (exposed sector)',
  'Baseline labor tax (non-exposed sector)',
  'Baseline consumption tax (linked to exposed sector)',
  'Baseline consumption tax (other sources)',
]);

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      <span className="icon-btn__glyph" aria-hidden="true">
        {children}
      </span>
    </button>
  );
}

function PanelHideIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" />
      <path d="M7 4v12" />
      <path d="m12.5 10-2.5-2.5" />
      <path d="m12.5 10-2.5 2.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10a5.5 5.5 0 1 0 1.7-4" />
      <path d="M4.5 4.5v3.2h3.2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5v8" />
      <path d="m6.8 8.8 3.2 3.2 3.2-3.2" />
      <path d="M4 15.5h12" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5H3.5V7" />
      <path d="m3.5 3.5 4.2 4.2" />
      <path d="M13 3.5h3.5V7" />
      <path d="m16.5 3.5-4.2 4.2" />
      <path d="M7 16.5H3.5V13" />
      <path d="m3.5 16.5 4.2-4.2" />
      <path d="M13 16.5h3.5V13" />
      <path d="m16.5 16.5-4.2-4.2" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7H3.5V3.5" />
      <path d="m3.5 3.5 4.2 4.2" />
      <path d="M13 7h3.5V3.5" />
      <path d="m16.5 3.5-4.2 4.2" />
      <path d="M7 13H3.5v3.5" />
      <path d="m3.5 16.5 4.2-4.2" />
      <path d="M13 13h3.5v3.5" />
      <path d="m16.5 16.5-4.2-4.2" />
    </svg>
  );
}

function toDisplayValue(variant: AssumptionSheetVariantView, value: number): number {
  if (variant.format === 'percent') {
    return Number((value * 100).toFixed(3));
  }
  return value;
}

function toModelValue(variant: AssumptionSheetVariantView, value: number): number {
  if (variant.format === 'percent') {
    return value / 100;
  }
  return value;
}

function getDisplayStep(variant: AssumptionSheetVariantView): number {
  if (variant.step === null) {
    return 1;
  }
  return variant.format === 'percent' ? variant.step * 100 : variant.step;
}

function getInputSuffix(variant: AssumptionSheetVariantView): string | null {
  return variant.format === 'percent' ? '%' : null;
}

function getDisplayInputValue(value: number): string {
  return value.toFixed(1);
}

function getInputLabel(rowLabel: string, variantLabel: string): string {
  return variantLabel === 'Value' ? rowLabel : `${rowLabel} ${variantLabel}`;
}

function shouldShowVariantLabel(variantLabel: string, totalVariants: number): boolean {
  return totalVariants > 1 || variantLabel !== 'Value';
}

function AssumptionValueCell({
  rowLabel,
  variant,
  totalVariants,
  onControlChange,
}: {
  rowLabel: string;
  variant: AssumptionSheetVariantView;
  totalVariants: number;
  onControlChange: (sheetCell: string, value: number) => void;
}) {
  const inputLabel = getInputLabel(rowLabel, variant.label);
  const showVariantLabel = shouldShowVariantLabel(variant.label, totalVariants);

  if (!variant.editable || typeof variant.value !== 'number') {
    return (
      <div
        className={`assumption-value assumption-value--static ${
          showVariantLabel ? 'assumption-value--labeled' : 'assumption-value--inline'
        }`}
      >
        {showVariantLabel ? <span className="assumption-value__label">{variant.label}</span> : null}
        <strong className="assumption-value__readonly">{formatValue(variant.value, variant.format)}</strong>
      </div>
    );
  }

  const displayValue = toDisplayValue(variant, variant.value);
  const suffix = getInputSuffix(variant);

  return (
    <div
      className={`assumption-value ${
        showVariantLabel ? 'assumption-value--labeled' : 'assumption-value--inline'
      }`}
    >
      {showVariantLabel ? <span className="assumption-value__label">{variant.label}</span> : null}
      <div className="assumption-value__slider">
        <input
          aria-label={`${inputLabel} slider`}
          type="range"
          min={variant.min === null ? undefined : toDisplayValue(variant, variant.min)}
          max={variant.max === null ? undefined : toDisplayValue(variant, variant.max)}
          step={getDisplayStep(variant)}
          value={displayValue}
          onChange={(event) => onControlChange(variant.sheetCell, toModelValue(variant, Number(event.target.value)))}
        />
      </div>
      <label className="assumption-value__number">
        <input
          aria-label={`${inputLabel} number`}
          type="number"
          inputMode="decimal"
          min={variant.min === null ? undefined : toDisplayValue(variant, variant.min)}
          max={variant.max === null ? undefined : toDisplayValue(variant, variant.max)}
          step={getDisplayStep(variant)}
          value={getDisplayInputValue(displayValue)}
          onChange={(event) => onControlChange(variant.sheetCell, toModelValue(variant, Number(event.target.value)))}
        />
        {suffix && <span className="assumption-value__suffix">{suffix}</span>}
      </label>
    </div>
  );
}

function SoftWarnings({ controls }: { controls: AssumptionControlView[] }) {
  const byCell = useMemo(() => {
    const map = new Map<string, number>();
    controls.forEach((control) => {
      map.set(control.sheetCell, control.value);
    });
    return map;
  }, [controls]);

  const lowSum = (byCell.get('C23') ?? 0) + (byCell.get('C24') ?? 0) + (byCell.get('C25') ?? 0);
  const highSum = (byCell.get('D23') ?? 0) + (byCell.get('D24') ?? 0) + (byCell.get('D25') ?? 0);

  const warnings: string[] = [];
  if (Math.abs(lowSum - 1) > 0.001) {
    warnings.push(`Low market power shares sum to ${(lowSum * 100).toFixed(1)}% (target: 100%).`);
  }
  if (Math.abs(highSum - 1) > 0.001) {
    warnings.push(`High market power shares sum to ${(highSum * 100).toFixed(1)}% (target: 100%).`);
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="soft-warnings" role="status">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}

export function AssumptionsSection({
  sections,
  controls,
  onToggleAssumptions,
  onReset,
  onDownloadAssumptions,
  onControlChange,
}: AssumptionsSectionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set<string>();
      sections.forEach((section) => {
        if (prev.has(section.id)) {
          next.add(section.id);
        }
      });
      return next;
    });
  }, [sections]);

  function toggleSection(sectionId: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function expandAll(): void {
    setOpenSections(new Set(sections.map((section) => section.id)));
  }

  function collapseAll(): void {
    setOpenSections(new Set());
  }

  return (
    <section id="assumptions" className="panel panel--assumptions section-animate">
      <div className="panel__header panel__header--sidebar">
        <div>
          <h2>Model Assumptions</h2>
        </div>
        <div className="sidebar-toolbar" role="toolbar" aria-label="Assumptions controls">
          <IconButton label="Hide assumptions" onClick={onToggleAssumptions}>
            <PanelHideIcon />
          </IconButton>
          <IconButton label="Reset defaults" onClick={onReset}>
            <ResetIcon />
          </IconButton>
          <IconButton label="Export assumptions JSON" onClick={onDownloadAssumptions}>
            <DownloadIcon />
          </IconButton>
          <IconButton label="Expand all sections" onClick={expandAll}>
            <ExpandIcon />
          </IconButton>
          <IconButton label="Collapse all sections" onClick={collapseAll}>
            <CollapseIcon />
          </IconButton>
        </div>
      </div>

      <SoftWarnings controls={controls} />

      <div className="assumptions-groups">
        {sections.map((section) => (
          <details key={section.id} open={openSections.has(section.id)} className="assumption-group">
            <summary
              onClick={(event) => {
                event.preventDefault();
                toggleSection(section.id);
              }}
            >
              {section.title}
            </summary>
            <div className="assumption-group__body">
              {section.rows.map((row) => (
                <article
                  key={row.id}
                  className={`assumption-row ${HALF_WIDTH_ROW_LABELS.has(row.label) ? 'assumption-row--half' : ''}`}
                >
                  <div className="assumption-row__main">
                    <h4>{row.label}</h4>
                    {row.additionalInfo ? <p className="assumption-row__info">{row.additionalInfo}</p> : null}
                  </div>
                  <div
                    className={`assumption-row__values ${
                      row.variants.length > 1 ? 'assumption-row__values--multi' : ''
                    }`}
                  >
                    {row.variants.map((variant) => (
                      <AssumptionValueCell
                        key={variant.id}
                        rowLabel={row.label}
                        variant={variant}
                        totalVariants={row.variants.length}
                        onControlChange={onControlChange}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
