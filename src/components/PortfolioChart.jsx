import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { getColor } from '../utils/colors';

const PortfolioChart = ({ chartData, allSymbols, stocks, theme }) => {
  if (!chartData || chartData.length === 0) return null;

  return (
    <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '20px', color: theme.text }}>
        Portfolio Value Over Time <span style={{ fontSize: '12px', color: theme.textMuted, fontWeight: 'normal' }}>(dividends reinvested)</span>
      </h2>
      
      <div style={{ height: '400px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
            
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
              stroke={theme.textMuted}
              fontSize={12}
              minTickGap={50}
            />
            
            <YAxis 
              tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
              stroke={theme.textMuted}
              fontSize={12}
            />
            
            <Tooltip
              contentStyle={{ background: theme.cardBg, borderColor: theme.border, color: theme.text }}
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            />
            
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* 1. Total Invested Area (Grey Dashed) */}
            <Area
              type="monotone"
              dataKey="totalInvested"
              name="Total Invested"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorInvested)"
            />

            {/* 2. Individual Stock Lines */}
            {allSymbols.map((symbol, index) => {
              // Find matching color from stock input if available, else use utility
              return (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  name={symbol}
                  stroke={getColor(index)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={true} // VITAL: Connects gaps in data (common in commodities)
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PortfolioChart;
