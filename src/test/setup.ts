import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

function mockComponent(testId: string) {
  return ({ children }: any) => React.createElement('div', { 'data-testid': testId }, children);
}

vi.mock('recharts', () => ({
  ResponsiveContainer: mockComponent('recharts-responsive-container'),
  LineChart: mockComponent('recharts-line-chart'),
  BarChart: mockComponent('recharts-bar-chart'),
  CartesianGrid: mockComponent('recharts-cartesian-grid'),
  XAxis: mockComponent('recharts-x-axis'),
  YAxis: mockComponent('recharts-y-axis'),
  Tooltip: mockComponent('recharts-tooltip'),
  Customized: mockComponent('recharts-customized'),
  Legend: mockComponent('recharts-legend'),
  Line: mockComponent('recharts-line'),
  LabelList: mockComponent('recharts-label-list'),
  Bar: mockComponent('recharts-bar'),
}));

class ResizeObserverMock {
  observe() {
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

beforeEach(() => {
  window.localStorage.clear();
  (window as any).ResizeObserver = ResizeObserverMock;
});

afterEach(() => {
  cleanup();
});
