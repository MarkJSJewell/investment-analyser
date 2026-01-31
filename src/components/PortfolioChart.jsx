import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { getColor } from '../utils/colors'; // <--- THIS WAS MISSING

const PortfolioChart = ({ chartData, allSymbols, stocks, theme }) => {
  return (
    <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '20px', marginBottom: '20px', height: '500px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', color: theme.text, marginBottom: '20px' }}>Portfolio Value Over Time <span style={{ fontSize: '12px', fontWeight: 'normal', color: theme.textMuted }}>(dividends reinvested)</span></h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(str) => {
              const date = new Date(str);
              return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }}
            stroke="#999"
            fontSize={12}
            minTickGap={50}
          />
          <YAxis 
            tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`}
            stroke="#999"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => new Date(label).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Line type="monotoneX" dataKey="Total Invested" stroke="#9ca3af" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          
          {allSymbols.map((symbol, index) => (
            <Line
              key={symbol}
              type="monotoneX"
              dataKey={symbol}
              name={symbol}
              stroke={getColor(index)} // <--- This function call was causing the crash
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;
