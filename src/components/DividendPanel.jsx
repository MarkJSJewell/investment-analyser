// src/components/DividendPanel.jsx
import React, { useState, useEffect } from 'react';
import { fetchAnalystData } from '../services/api';
import { DIVIDEND_LISTS } from '../utils/marketDefaults';
import { formatCurrency, formatPercent } from '../utils/formatters';

const DividendPanel = ({ theme }) => {
  const [targetIncome, setTargetIncome] = useState(1000); // Monthly target
  const [activeMarket, setActiveMarket] = useState('US Aristocrats');
  const [customSymbol, setCustomSymbol] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load data when market changes
  useEffect(() => {
    loadMarketData(DIVIDEND_LISTS[activeMarket]);
  }, [activeMarket]);

  const loadMarketData = async (symbols) => {
    setLoading(true);
    const results = [];
    
    // Fetch sequentially to prevent 429 errors
    for (const symbol of symbols) {
      try {
        const info = await fetchAnalystData(symbol);
        if (info && info.dividendYield) {
          results.push({
            symbol: symbol,
            name: info.name,
            price: info.currentPrice,
            yield: info.dividendYield, // Decimal (e.g., 0.05 for 5%)
            yieldDisplay: info.dividendYield * 100
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch ${symbol}`, e);
      }
    }
    
    // Sort by Highest Yield (which means Lowest Investment Needed)
    setData(results.sort((a, b) => b.yield - a.yield));
    setLoading(false);
  };

  const addCustomStock = async () => {
    if (!customSymbol) return;
    setLoading(true);
    const info = await fetchAnalystData(customSymbol.toUpperCase());
    if (info && info.dividendYield) {
      const newItem = {
        symbol: customSymbol.toUpperCase(),
        name: info.name,
        price: info.currentPrice,
        yield: info.dividendYield,
        yieldDisplay: info.dividendYield * 100
      };
      // Add to list and re-sort
      setData(prev => [...prev, newItem].sort((a, b) => b.yield - a.yield));
      setCustomSymbol('');
    }
    setLoading(false);
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
                border: `1px solid ${theme.border}`, width: '150px' 
              }} 
            />
            <span style={{ color: theme.textMuted }}>/ month</span>
          </div>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: theme.textMuted }}>
            Select Market
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.keys(DIVIDEND_LISTS).map(market => (
              <button
                key={market}
                onClick={() => setActiveMarket(market)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  background: activeMarket === market ? '#1A73E8' : theme.hoverBg,
                  color: activeMarket === market ? 'white' : theme.text
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
              style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, flex: 1 }}
            />
            <button 
              onClick={addCustomStock}
              disabled={loading}
              style={{ padding: '8px 16px', background: '#34A853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Visualization */}
      {loading && data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Loading dividend data...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {data.map((item) => {
            const investmentNeeded = calculateInvestmentNeeded(item.yield);
            // Dynamic bar width calculation (relative to highest investment needed in the list is tricky, 
            // easier to map inverse of yield since higher yield = shorter bar needed)
            
            // We want shorter bars to be BETTER (less investment needed).
            // So we'll visualize the "Investment Required" directly.
            
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
                    {/* The bar length is arbitrary here since we compare relative values, 
                        but to make it look like a "progress" bar, we can just fill it 
                        and change color based on how "affordable" it is */}
                    <div style={{ 
                      width: '100%', // Full width bar for "Cost"
                      height: '100%', 
                      background: 'linear-gradient(90deg, #34A853, #1A73E8)',
                      opacity: Math.max(0.2, item.yield * 10) // Higher yield = darker/more solid bar
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
        </div>
      )}
    </div>
  );
};

export default DividendPanel;
