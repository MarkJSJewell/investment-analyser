import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

const PortfolioChart = ({ chartData, allSymbols, stocks, theme }) => {
  if (!chartData || chartData.length === 0) return null;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          padding: '12px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '12px'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: theme.text }}>
            {new Date(label).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, marginBottom: '4px' }}>
              <span style={{ fontWeight: '500' }}>
                {entry.name === 'Total Invested' ? 'Total Invested' : entry.name}:
              </span>
              <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const colors = ['#1A73E8', '#9333EA', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899', '#8B5CF6'];

  return (
    <div style={{
      background: theme.cardBg,
      borderRadius: '8px',
      border: `1px solid ${theme.border}`,
      padding: '20px',
      marginBottom: '20px',
      height: '500px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '500', color: theme.text }}>
        Portfolio Value Over Time <span style={{ fontSize: '12px', color: theme.textMuted, fontWeight: 'normal' }}>(dividends reinvested)</span>
      </h3>
      
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#1A73E8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={(str) => {
              const d = new Date(str);
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }}
            stroke={theme.textMuted}
            fontSize={11}
            tickMargin={10}
            minTickGap={30}
          />
          
          {/* LEFT Axis */}
          <YAxis 
            yAxisId="primary"
            tickFormatter={(val) => val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`}
            stroke={theme.textMuted}
            fontSize={11}
            width={45}
          />

          {/* RIGHT Axis (Mirrors Left) */}
          <YAxis 
            yAxisId="primary" 
            orientation="right"
            tickFormatter={(val) => val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`}
            stroke={theme.textMuted}
            fontSize={11}
            width={45}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />

          {/* Bind all Data to "primary" axis so both YAxes scale identically */}
          <Area
            yAxisId="primary"
            type="stepAfter"
            dataKey="totalInvested"
            name="Total Invested"
            stroke="#9ca3af"
            strokeDasharray="5 5"
            fill="transparent"
            strokeWidth={2}
          />

          {allSymbols.map((symbol, index) => {
            const stock = stocks.find(s => s.symbol === symbol);
            return (
              <Line
                yAxisId="primary"
                key={symbol}
                type="monotoneX"
                dataKey={symbol}
                name={symbol}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            );
          })}

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;
