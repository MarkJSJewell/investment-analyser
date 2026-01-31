import { INDEX_OPTIONS, COMMODITY_OPTIONS, CRYPTO_OPTIONS, BOND_OPTIONS } from '../constants';

// Format currency
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage
export const formatPercent = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Get symbol display name (Keeps your custom mappings)
export const getSymbolName = (symbol) => {
  const idx = INDEX_OPTIONS.find(i => i.symbol === symbol);
  if (idx) return idx.name;
  
  const crypto = CRYPTO_OPTIONS.find(c => c.symbol === symbol);
  if (crypto) return crypto.name;
  
  const bond = BOND_OPTIONS.find(b => b.symbol === symbol);
  if (bond) return bond.name;
  
  const comm = COMMODITY_OPTIONS.find(c => c.symbol === symbol);
  if (comm) return comm.name;
  
  return symbol;
};

// --- CHART HELPERS (Preserved for custom axis logic) ---

export const formatYAxis = (value, maxValue) => {
  if (maxValue >= 100000) return `$${(value / 1000).toFixed(0)}k`;
  if (maxValue >= 10000) return `$${(value / 1000).toFixed(1)}k`;
  if (maxValue >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

export const getXAxisTicks = (chartData) => {
  if (!chartData || chartData.length === 0) return [];
  const start = new Date(chartData[0].date);
  const end = new Date(chartData[chartData.length - 1].date);
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  
  const ticks = [];
  if (daysDiff <= 45) {
    const interval = daysDiff <= 14 ? 3 : daysDiff <= 31 ? 5 : 7;
    chartData.forEach((point, index) => {
      if (index === 0 || index === chartData.length - 1 || index % interval === 0) ticks.push(point.date);
    });
  } else if (daysDiff <= 180) {
    const seenDates = new Set();
    chartData.forEach((point) => {
      const date = new Date(point.date);
      const day = date.getDate();
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if ((day <= 3 && !seenDates.has(monthKey + '-start')) || ((day >= 14 && day <= 16) && !seenDates.has(monthKey + '-mid'))) {
        ticks.push(point.date);
        seenDates.add(day <= 3 ? monthKey + '-start' : monthKey + '-mid');
      }
    });
  } else {
    const seenMonths = new Set();
    chartData.forEach((point) => {
      const date = new Date(point.date);
      const day = date.getDate();
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!seenMonths.has(monthKey) && day <= 3) {
        ticks.push(point.date);
        seenMonths.add(monthKey);
      }
    });
  }
  return ticks;
};

export const formatXAxisLabel = (dateStr, chartData) => {
  if (!chartData || chartData.length === 0) return '';
  const date = new Date(dateStr);
  const start = new Date(chartData[0].date);
  const end = new Date(chartData[chartData.length - 1].date);
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear().toString().slice(2);
  
  if (daysDiff <= 45) return `${month} ${day}`;
  if (daysDiff <= 365) return day <= 3 ? `${month} '${year}` : `${day}`;
  return `${month} '${year}`;
};

export const getChartDomain = (chartData) => {
  if (!chartData?.length) return [0, 100];
  let maxVal = 0;
  chartData.forEach(point => {
    Object.entries(point).forEach(([key, val]) => {
      if (key !== 'date' && typeof val === 'number') maxVal = Math.max(maxVal, val);
    });
  });
  return [0, getNiceMax(maxVal)];
};

const getNiceMax = (value) => {
  if (value <= 0) return 100;
  const padded = value * 1.1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const normalized = padded / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
};

export const getYAxisTicks = (chartData) => {
  const [min, max] = getChartDomain(chartData);
  const tickCount = 5;
  const step = max / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
  const niceStep = (step / magnitude <= 1 ? 1 : step / magnitude <= 2 ? 2 : step / magnitude <= 2.5 ? 2.5 : step / magnitude <= 5 ? 5 : 10) * magnitude;
  
  const ticks = [];
  for (let i = 0; i <= max; i += niceStep) ticks.push(i);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + niceStep);
  return ticks;
};
