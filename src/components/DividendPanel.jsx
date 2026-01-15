import React, { useState, useEffect } from 'react';
import { fetchAnalystData } from '../services/api';
import { DIVIDEND_LISTS } from '../utils/marketDefaults';
import { fetchAnalystData } from '../services/api';
import { formatCurrency, formatPercent } from '../utils/formatters';

// Helper for strict sequential delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const DividendPanel = ({ theme }) => {
  const [targetIncome, setTargetIncome] = useState(1000);
  const [activeMarket, setActiveMarket] = useState('US Aristocrats');
  const [customSymbol, setCustomSymbol] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(''); // New: Show what's loading

  useEffect(() => {
    loadMarketData(DIVIDEND_LISTS[activeMarket]);
  }, [activeMarket]);

const loadMarketData = async (symbols) => {
    setLoading(true);
    setData([]); 
    const results = [];
    
    for (const symbol of symbols) {
      try {
        setProgress(`Loading ${symbol}...`);
        
        // 1. Fetch data
        const info = await fetchAnalystData(symbol);
        
        // 2. Extra safety pause: 2 seconds per stock
        // This ensures the 429/401 error has time to clear on the server
        await wait(2000); 

        if (info && info.dividendYield) {
          results.push({
            symbol: symbol,
            name: info.name,
            price: info.currentPrice,
            yield: info.dividendYield,
            yieldDisplay: info.dividendYield * 100
          });
          setData([...results].sort((a, b) => b.yield - a.yield));
        }
      } catch (e) {
        console.warn(`Failed to fetch ${symbol}`, e);
      }
    }
    
    setLoading(false);
    setProgress('');
  };
  
  const addCustomStock = async () => {
    if (!customSymbol) return;
    setLoading(true);
    setProgress(`Finding ${customSymbol}...`);
    const info = await fetchAnalystData(customSymbol.toUpperCase());
    if (info && info.dividendYield) {
      const newItem = {
        symbol: customSymbol.toUpperCase(),
        name: info.name,
        price: info.currentPrice,
        yield: info.dividendYield,
        yieldDisplay: info.dividendYield * 100
      };
      setData(prev => [...prev, newItem].sort((a, b) => b.yield - a.yield));
      setCustomSymbol('');
    }
    setLoading(false);
    setProgress('');
  };

  const calculateInvestmentNeeded = (yieldDecimal) => {
    if (!yieldDecimal || yieldDecimal === 0) return 0;
    const annualTarget = targetIncome * 12;
    return annualTarget / yieldDecimal;
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh' }}>
      
      {/* Controls Header */}
      <div style={{ 
        display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px', 
        background: theme.cardBg, padding: '20px', borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme.textMuted }}>
            Target Monthly Income
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💵</span>
            <input 
              type="number" 
              value={targetIncome} 
              onChange={e => setTargetIncome(Number(e.target.value))}
              style={{ 
                fontSize: '20px', padding: '8px', borderRadius: '6px', 
                border: `1px solid ${theme.border}`, width: '150px',
                background: theme.inputBg, color: theme.text
              }} 
            />
            <span style={{ color: theme.textMuted }}>/ month</span>
          </div>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme.textMuted }}>
            Select Market
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.keys(DIVIDEND_LISTS).map(market => (
              <button
                key={market}
                onClick={() => !loading && setActiveMarket(market)}
                disabled={loading}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: loading ? 'wait' : 'pointer',
                  background: activeMarket === market ? '#1A73E8' : theme.hoverBg,
                  color: activeMarket === market ? 'white' : theme.text,
                  opacity: loading && activeMarket !== market ? 0.5 : 1
                }}
              >
                {market}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme.textMuted }}>
            Add Specific Stock
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              placeholder="e.g. MO, BATS.L" 
              value={customSymbol}
              onChange={e => setCustomSymbol(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, flex: 1, background: theme.inputBg, color: theme.text }}
            />
            <button 
              onClick={addCustomStock}
              disabled={loading}
              style={{ padding: '8px 16px', background: '#34A853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Loading Status */}
      {loading && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#E3F2FD', borderRadius: '8px', color: '#1565C0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="spinner">⏳</span> {progress} 
          <span style={{ fontSize: '12px', opacity: 0.8 }}>(Fetching sequentially to prevent rate limits)</span>
        </div>
      )}

      {/* Main Bar Chart Visualization */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {data.map((item) => {
          const investmentNeeded = calculateInvestmentNeeded(item.yield);
          
          return (
            <div key={item.symbol} style={{ 
              background: theme.cardBg, padding: '15px', borderRadius: '8px', 
              border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '20px'
            }}>
              {/* Stock Info */}
              <div style={{ width: '150px', flexShrink: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.symbol}</div>
                <div style={{ fontSize: '12px', color: theme.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ 
                  marginTop: '4px', display: 'inline-block', padding: '2px 6px', 
                  borderRadius: '4px', background: '#E8F5E9', color: '#2E7D32', fontSize: '12px', fontWeight: '600' 
                }}>
                  Yield: {formatPercent(item.yieldDisplay)}
                </div>
              </div>

              {/* Bar Chart Area */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: theme.textMuted }}>
                  <span>Investment Required for {formatCurrency(targetIncome)}/mo</span>
                  <strong style={{ color: theme.text, fontSize: '16px' }}>{formatCurrency(investmentNeeded)}</strong>
                </div>
                <div style={{ width: '100%', height: '12px', background: theme.hoverBg, borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #34A853, #1A73E8)',
                    opacity: Math.max(0.2, item.yield * 10) 
                  }} />
                </div>
              </div>

              {/* Shares Needed */}
              <div style={{ width: '120px', textAlign: 'right', borderLeft: `1px solid ${theme.border}`, paddingLeft: '15px' }}>
                <div style={{ fontSize: '11px', color: theme.textMuted }}>Shares Needed</div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>
                  {Math.ceil(investmentNeeded / item.price).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        
        {!loading && data.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>
             Select a market or add a stock to see dividend analysis.
          </div>
        )}
      </div>
    </div>
  );
};

export default DividendPanel;
