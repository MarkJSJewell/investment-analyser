import React, { useState } from 'react';
import { fetchHistoricalData } from '../services/api';
import { findBestAndWorstTrades } from '../utils/tradeAlgorithms';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, Legend } from 'recharts';

const TradeAnalyzer = ({ theme }) => {
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const history = await fetchHistoricalData(symbol.toUpperCase(), startDate, endDate);
      const analysis = findBestAndWorstTrades(history);
      setResult({ history, ...analysis, symbol: symbol.toUpperCase() });
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', background: theme.bg }}>
      <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>⏱️ Perfect Timer Analysis</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Ticker</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
          </div>
          <button onClick={analyze} disabled={loading} style={{ padding: '8px 20px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '36px' }}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Best Trade Card */}
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', padding: '15px', borderRadius: '8px', color: '#166534' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🏆 Best Possible Trade</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatPercent(result.bestTrade.percent)} Profit</div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <div>Buy: <strong>{result.bestTrade.buyDate}</strong> @ {formatCurrency(result.bestTrade.buyPrice)}</div>
                <div>Sell: <strong>{result.bestTrade.sellDate}</strong> @ {formatCurrency(result.bestTrade.sellPrice)}</div>
                <div>Gain: {formatCurrency(result.bestTrade.profit)} per share</div>
              </div>
            </div>

            {/* Worst Trade Card */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '15px', borderRadius: '8px', color: '#991B1B' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>⚠️ Worst Possible Trade</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatPercent(result.worstTrade.percent)} Loss</div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <div>Buy: <strong>{result.worstTrade.buyDate}</strong> @ {formatCurrency(result.worstTrade.buyPrice)}</div>
                <div>Sell: <strong>{result.worstTrade.sellDate}</strong> @ {formatCurrency(result.worstTrade.sellPrice)}</div>
                <div>Loss: {formatCurrency(result.worstTrade.profit)} per share</div>
              </div>
            </div>
          </div>

          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString()} minTickGap={30} fontSize={12} stroke={theme.textMuted} />
                <YAxis domain={['auto', 'auto']} fontSize={12} stroke={theme.textMuted} tickFormatter={val => `$${val}`} />
                <Tooltip contentStyle={{ background: theme.cardBg, borderColor: theme.border }} formatter={(val) => [formatCurrency(val), 'Price']} />
                <Legend />
                <Line type="monotone" dataKey="price" stroke={theme.primary} dot={false} strokeWidth={2} name={result.symbol} />
                
                {/* Annotations for Best Trade */}
                <ReferenceDot x={result.bestTrade.buyDate} y={result.bestTrade.buyPrice} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
                <ReferenceDot x={result.bestTrade.sellDate} y={result.bestTrade.sellPrice} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
                
                {/* Annotations for Worst Trade */}
                <ReferenceDot x={result.worstTrade.buyDate} y={result.worstTrade.buyPrice} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
                <ReferenceDot x={result.worstTrade.sellDate} y={result.worstTrade.sellPrice} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeAnalyzer;
