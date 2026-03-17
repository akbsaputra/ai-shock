import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App interactions', () => {
  it('toggles the assumptions sidebar from the left panel rail', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Model Assumptions' })).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: 'Hide assumptions' });
    fireEvent.click(toggleButton);

    expect(screen.queryByRole('heading', { name: 'Model Assumptions' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show assumptions' })).toBeInTheDocument();
  });

  it('keeps summary table hidden by default and toggles it on demand', () => {
    render(<App />);

    expect(screen.queryByRole('heading', { name: 'Summary Table' })).not.toBeInTheDocument();

    const toggle = screen.getByLabelText('Show Summary Table');
    fireEvent.click(toggle);

    expect(screen.getByRole('heading', { name: 'Summary Table' })).toBeInTheDocument();
  });

  it('changes impact filter selection in the chart controls', () => {
    render(<App />);

    const impactGroup = screen.getByRole('group', { name: 'Impact focus' });
    const mediumButton = within(impactGroup).getByRole('button', { name: 'Medium' });
    const allButton = within(impactGroup).getByRole('button', { name: 'All impact' });

    expect(allButton).toHaveClass('segmented__button--active');
    fireEvent.click(mediumButton);
    expect(mediumButton).toHaveClass('segmented__button--active');
  });

  it('shows legend labels in impact/market power format and keeps them visible', () => {
    render(<App />);

    expect(screen.getByText(/Legend format:/i)).toBeInTheDocument();
    expect(screen.getByText(/impact\/market power/i)).toBeInTheDocument();

    const laborChartCard = screen.getByRole('heading', { name: 'Labor Income Tax' }).closest('article');
    expect(laborChartCard).not.toBeNull();

    const chart = laborChartCard as HTMLElement;
    const baselineLegend = within(chart).getByRole('button', { name: /^baseline$/i });
    const lowLowLegend = within(chart).getByRole('button', { name: /^low\/low$/i });
    const highHighLegend = within(chart).getByRole('button', { name: /^high\/high$/i });
    const medLowLegend = within(chart).getByRole('button', { name: /^med\/low$/i });

    expect(baselineLegend).toBeInTheDocument();
    expect(lowLowLegend).toBeInTheDocument();
    expect(highHighLegend).toBeInTheDocument();

    fireEvent.click(lowLowLegend);
    fireEvent.click(highHighLegend);

    expect(lowLowLegend).toHaveClass('chart-card__series-item--active');
    expect(highHighLegend).toHaveClass('chart-card__series-item--active');
    expect(medLowLegend).not.toHaveClass('chart-card__series-item--active');

    ['Benefit Spending', 'Capital Income Tax', 'Net Fiscal Impact'].forEach((title) => {
      const summaryCard = screen.getByRole('heading', { name: title }).closest('article');
      expect(summaryCard).not.toBeNull();
      expect(within(summaryCard as HTMLElement).getByRole('button', { name: /^baseline$/i })).toBeInTheDocument();
    });
  });

  it('shows displacement notes next to the Changes chart title and short x-axis scenario labels', () => {
    render(<App />);

    const changesCard = screen
      .getByRole('heading', { name: /Changes in Total Tax Revenue and Net Fiscal Impact over 10 years/i })
      .closest('article');
    expect(changesCard).not.toBeNull();

    const chart = changesCard as HTMLElement;
    expect(within(chart).getByText(/Displacement: low 12%, med 30%, high 48%\./i)).toBeInTheDocument();
  });

  it('switches scenario tabs while preserving shared row labels', () => {
    render(<App />);

    const tabButton = screen.getAllByRole('tab', { name: /High impact\s*\/\s*High market power/i })[0];
    fireEvent.click(tabButton);

    expect(tabButton).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Impact on labor income tax')).toBeInTheDocument();
  });

  it('groups scenario-specific assumptions and edits percentages in 0-100 units', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand all sections' }));

    expect(screen.getByText('Displacement rate in exposed sector')).toBeInTheDocument();
    expect(screen.queryByText('Displacement rate in exposed sector (low)')).not.toBeInTheDocument();
    expect(screen.queryByText('displacement_rate_low/med/high')).not.toBeInTheDocument();

    const lowInput = screen.getByRole('spinbutton', {
      name: /Displacement rate in exposed sector Low number/i,
    });

    expect(lowInput).toHaveValue(20);
    fireEvent.change(lowInput, { target: { value: '25' } });
    expect(lowInput).toHaveValue(25);

    const valueCell = lowInput.closest('.assumption-value');
    expect(valueCell).not.toBeNull();
    expect(within(valueCell as HTMLElement).getByText('%')).toBeInTheDocument();

    const slider = within(valueCell as HTMLElement).getByRole('slider', {
      name: /Displacement rate in exposed sector Low slider/i,
    });
    expect(slider).toHaveValue('25');
  });

  it('allows editing current tax shares independently', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand all sections' }));

    const currentTaxSection = screen.getByText('Current tax shares').closest('details');
    expect(currentTaxSection).not.toBeNull();

    const laborTaxInput = within(currentTaxSection as HTMLElement).getByRole('spinbutton', {
      name: /Labor income tax number/i,
    });
    const capitalTaxInput = within(currentTaxSection as HTMLElement).getByRole('spinbutton', {
      name: /Capital income tax number/i,
    });

    fireEvent.change(laborTaxInput, { target: { value: '50' } });
    fireEvent.change(capitalTaxInput, { target: { value: '20' } });

    expect(laborTaxInput).toHaveValue(50);
    expect(capitalTaxInput).toHaveValue(20);
  });
});
