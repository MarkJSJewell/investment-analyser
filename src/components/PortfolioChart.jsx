import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatYAxis, getSymbolColor, getSymbolName, getXAxisTicks, formatXAxisLabel, getChartDomain, getYAxisTicks } from '../utils/formatters';

const PortfolioChart = ({ chartData, allSymbols, stocks }) => {
  if (!chartData || chartData.length === 0) return null;

  const domain = getChartDomain(chartData);
  const yTicks = getYAxisTicks(chartData);
  const xTicks = getXAxisTicks(chartData);

  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '20px' }}>
        Portfolio Value Over Time
        <span style={{ fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '12px' }}>(dividends reinvested)</span>
      </h2>
      <div style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              {allSymbols.map(symbol => (
                <linearGradient key={symbol} id={`grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getSymbolColor(symbol, stocks)} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={getSymbolColor(symbol, stocks)} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(val) => formatXAxisLabel(val, chartData)} ticks={xTicks} tickMargin={8} />
            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(val) => formatYAxis(val, domain[1])} domain={domain} ticks={yTicks} />
            <Tooltip formatter={(value, name) => [formatCurrency(value), getSymbolName(name)]} labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} />
            <Legend formatter={(value) => getSymbolName(value)} />
            <Area type="monotone" dataKey="invested" stroke="#999" strokeWidth={2} strokeDasharray="5 5" fill="none" name="Total Invested" />
            {allSymbols.map(symbol => (
              <Area key={symbol} type="monotone" dataKey={symbol} stroke={getSymbolColor(symbol, stocks)} strokeWidth={2} fill={`url(#grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')})`} name={symbol} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioChart;
