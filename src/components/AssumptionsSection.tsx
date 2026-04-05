import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AssumptionSheetSectionView, AssumptionSheetVariantView } from '../model/selectors';
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
  'Baseline labour tax (exposed sector)',
  'Baseline labour tax (non-exposed sector)',
]);
const ALLOCATION_SECTION_ID = 'assumption-sheet-section-22';

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
  return String(Number(value.toFixed(3)));
}

function getInputLabel(rowLabel: string, variantLabel: string): string {
  return variantLabel === 'Value' ? rowLabel : `${rowLabel} ${variantLabel}`;
}

function shouldShowVariantLabel(variantLabel: string, totalVariants: number): boolean {
  return totalVariants > 1 || variantLabel !== 'Value';
}

function rowClassNames(label: string): string {
  const classes = ['assumption-row'];
  if (HALF_WIDTH_ROW_LABELS.has(label)) {
    classes.push('assumption-row--half');
  }
  return classes.join(' ');
}

function valueClassNames(totalVariants: number): string {
  const classes = ['assumption-row__values'];
  if (totalVariants > 1) {
    classes.push('assumption-row__values--multi');
  }
  return classes.join(' ');
}

function sectionClassNames(sectionId: string): string {
  if (sectionId === ALLOCATION_SECTION_ID) {
    return 'assumption-group assumption-group--allocation';
  }
  return 'assumption-group';
}

function sectionBodyClassNames(sectionId: string): string {
  if (sectionId === ALLOCATION_SECTION_ID) {
    return 'assumption-group__body assumption-group__body--allocation';
  }
  return 'assumption-group__body';
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
  const [draftValue, setDraftValue] = useState<string | null>(null);
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
  const inputValue = draftValue ?? getDisplayInputValue(displayValue);
  const minDisplayValue = variant.min === null ? undefined : toDisplayValue(variant, variant.min);
  const maxDisplayValue = variant.max === null ? undefined : toDisplayValue(variant, variant.max);
  const suffix = getInputSuffix(variant);

  function handleNumberChange(rawValue: string): void {
    setDraftValue(rawValue);
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      onControlChange(variant.sheetCell, toModelValue(variant, parsed));
    }
  }

  function commitDraft(rawValue: string): void {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      onControlChange(variant.sheetCell, toModelValue(variant, parsed));
    }
    setDraftValue(null);
  }

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
          min={minDisplayValue}
          max={maxDisplayValue}
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
          min={minDisplayValue}
          max={maxDisplayValue}
          step={getDisplayStep(variant)}
          value={inputValue}
          onFocus={() => setDraftValue(getDisplayInputValue(displayValue))}
          onChange={(event) => handleNumberChange(event.target.value)}
          onBlur={(event) => commitDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitDraft((event.target as HTMLInputElement).value);
              (event.target as HTMLInputElement).blur();
            }
          }}
        />
        {suffix && <span className="assumption-value__suffix">{suffix}</span>}
      </label>
    </div>
  );
}

function AllocationGuidance({ controls }: { controls: AssumptionControlView[] }) {
  const byCell = useMemo(() => {
    const map = new Map<string, number>();
    controls.forEach((control) => {
      map.set(control.sheetCell, control.value);
    });
    return map;
  }, [controls]);

  const lowSum = (byCell.get('C23') ?? 0) + (byCell.get('C24') ?? 0) + (byCell.get('C25') ?? 0);
  const highSum = (byCell.get('D23') ?? 0) + (byCell.get('D24') ?? 0) + (byCell.get('D25') ?? 0);
  const lowOffTarget = Math.abs(lowSum - 1) > 0.001;
  const highOffTarget = Math.abs(highSum - 1) > 0.001;

  return (
    <div className="allocation-guidance" role="note">
      <p>For each domestic value capture assumption, domestic, consumer, and foreign/cost shares should sum to 100%.</p>
      <div className="allocation-guidance__totals">
        <p className={lowOffTarget ? 'allocation-guidance__total allocation-guidance__total--off' : 'allocation-guidance__total allocation-guidance__total--ok'}>
          <span
            className={lowOffTarget ? 'allocation-guidance__badge allocation-guidance__badge--off' : 'allocation-guidance__badge allocation-guidance__badge--ok'}
            aria-hidden="true"
          >
            {lowOffTarget ? '\u2717' : '\u2713'}
          </span>
          High domestic value capture total: {(lowSum * 100).toFixed(1)}%
        </p>
        <p className={highOffTarget ? 'allocation-guidance__total allocation-guidance__total--off' : 'allocation-guidance__total allocation-guidance__total--ok'}>
          <span
            className={highOffTarget ? 'allocation-guidance__badge allocation-guidance__badge--off' : 'allocation-guidance__badge allocation-guidance__badge--ok'}
            aria-hidden="true"
          >
            {highOffTarget ? '\u2717' : '\u2713'}
          </span>
          Low domestic value capture total: {(highSum * 100).toFixed(1)}%
        </p>
      </div>
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

      <div className="assumptions-groups">
        {sections.map((section) => {
          const isAllocationSection = section.id === ALLOCATION_SECTION_ID;
          return (
            <details key={section.id} open={openSections.has(section.id)} className={sectionClassNames(section.id)}>
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  toggleSection(section.id);
                }}
              >
                {section.title}
              </summary>
              <div className={sectionBodyClassNames(section.id)}>
                {isAllocationSection ? <AllocationGuidance controls={controls} /> : null}
                {section.rows.map((row) => (
                  <article key={row.id} className={rowClassNames(row.label)}>
                    <div className="assumption-row__main">
                      <h4>{row.label}</h4>
                      {row.additionalInfo ? <p className="assumption-row__info">{row.additionalInfo}</p> : null}
                    </div>
                    <div className={valueClassNames(row.variants.length)}>
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
          );
        })}
      </div>
    </section>
  );
}

