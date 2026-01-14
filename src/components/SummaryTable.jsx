import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent, getSymbolColor, getSymbolName } from '../utils/formatters';

// Helper for Large Numbers (Billions/Trillions)
const formatLargeNumber = (num) => {
  if (!num) return '-';
  if (num >= 1.0e+12) return `$${(num / 1.0e+12).toFixed(2)}T`;
  if (num >= 1.0e+9) return `$${(num / 1.0e+9).toFixed(2)}B`;
  if (num >= 1.0e+6) return `$${(num / 1.0e+6).toFixed(2)}M`;
  return formatCurrency(num);
};

const SummaryTable = ({ allSymbols, analysis, stocks, analystData, loadingAnalyst, theme = {} }) => {
  const [sortColumn, setSortColumn] = useState('return');
  const [sortDirection, setSortDirection] = useState('desc');

  // Default theme values
  const cardBg = theme.cardBg || 'white';
  const text = theme.text || '#333';
  const textMuted = theme.textMuted || '#666';
  const border = theme.border || '#e0e0e0';

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedSymbols = useMemo(() => {
    const validSymbols = allSymbols.filter(s => !analysis[s].error);
    
    return [...validSymbols].sort((a, b) => {
      const dataA = analysis[a];
      const dataB = analysis[b];
      const analystA = analystData?.[a];
      const analystB = analystData?.[b];
      
      let valueA, valueB;
      
      switch (sortColumn) {
        case 'asset':
          valueA = getSymbolName(a).toLowerCase();
          valueB = getSymbolName(b).toLowerCase();
          return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        case 'firstTrade':
          valueA = dataA.firstTradeDate ? new Date(dataA.firstTradeDate).getTime() : 0;
          valueB = dataB.firstTradeDate ? new Date(dataB.firstTradeDate).getTime() : 0;
          break;
        case 'invested':
          valueA = dataA.totalInvested;
          valueB = dataB.totalInvested;
          break;
        case 'final':
          valueA = dataA.finalValue;
          valueB = dataB.finalValue;
          break;
        case 'dividends':
          valueA = dataA.totalDividends || 0;
          valueB = dataB.totalDividends || 0;
          break;
        case 'gainLoss':
          valueA = dataA.finalValue - dataA.totalInvested;
          valueB = dataB.finalValue - dataB.totalInvested;
          break;
        case 'return':
          valueA = dataA.returnPercent;
          valueB = dataB.returnPercent;
          break;
        case 'aum': // NEW: Sort by AUM
          valueA = analystA?.totalAssets || 0;
          valueB = analystB?.totalAssets || 0;
          break;
        case 'momentum': // NEW: Sort by Trend
          valueA = analystA?.currentPrice && analystA?.fiftyDayAverage 
            ? ((analystA.currentPrice - analystA.fiftyDayAverage) / analystA.fiftyDayAverage) : -999;
          valueB = analystB?.currentPrice && analystB?.fiftyDayAverage 
            ? ((analystB.currentPrice - analystB.fiftyDayAverage) / analystB.fiftyDayAverage) : -999;
          break;
        case 'target':
          valueA = analystA?.targetMean || 0;
          valueB = analystB?.targetMean || 0;
          break;
        case 'upside':
          valueA = analystA?.targetMean && analystA?.currentPrice 
            ? ((analystA.targetMean - analystA.currentPrice) / analystA.currentPrice * 100) : -999;
          valueB = analystB?.targetMean && analystB?.currentPrice 
            ? ((analystB.targetMean - analystB.currentPrice) / analystB.currentPrice * 100) : -999;
          break;
        case 'rating':
          const ratingOrder = { 'strong_buy': 5, 'buy': 4, 'hold': 3, 'sell': 2, 'strong_sell': 1 };
          valueA = ratingOrder[analystA?.recommendation] || 0;
          valueB = ratingOrder[analystB?.recommendation] || 0;
          break;
        case 'fmv':
          valueA = analystA?.fmvEstimate || 0;
          valueB = analystB?.fmvEstimate || 0;
          break;
        case 'fmvUpside':
          valueA = analystA?.fmvEstimate && analystA?.currentPrice 
            ? ((analystA.fmvEstimate - analystA.currentPrice) / analystA.currentPrice * 100) : -999;
          valueB = analystB?.fmvEstimate && analystB?.currentPrice 
            ? ((analystB.fmvEstimate - analystB.currentPrice) / analystB.currentPrice * 100) : -999;
          break;
        case 'earnings':
          valueA = analystA?.earningsDate ? new Date(analystA.earningsDate).getTime() : 9999999999999;
          valueB = analystB?.earningsDate ? new Date(analystB.earningsDate).getTime() : 9999999999999;
          break;
        default:
          valueA = dataA.returnPercent;
          valueB = dataB.returnPercent;
      }
      
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }, [allSymbols, analysis, analystData, sortColumn, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const validSymbols = allSymbols.filter(s => !analysis[s].error);
    return validSymbols.reduce((acc, symbol) => {
      const data = analysis[symbol];
      acc.invested += data.totalInvested;
      acc.finalValue += data.finalValue;
      acc.dividends += data.totalDividends || 0;
      acc.gainLoss += (data.finalValue - data.totalInvested);
      return acc;
    }, { invested: 0, finalValue: 0, dividends: 0, gainLoss: 0 });
  }, [allSymbols, analysis]);

  const totalReturn = totals.invested > 0 ? ((totals.finalValue - totals.invested) / totals.invested * 100) : 0;

  const SortHeader = ({ column, children, align = 'right' }) => (
    <th 
      onClick={() => handleSort(column)}
      style={{ 
        textAlign: align, 
        padding: '10px 12px', 
        color: '#666', 
        fontWeight: '500', 
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontSize: '12px',
        background: sortColumn === column ? '#f0f0f0' : 'transparent'
      }}
    >
      {children}
      <span style={{ marginLeft: '4px', opacity: sortColumn === column ? 1 : 0.3 }}>
        {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );

  const getRatingColor = (rating) => {
    if (!rating) return '#666';
    if (rating.includes('buy')) return '#2E7D32';
    if (rating.includes('sell')) return '#C62828';
    return '#E65100';
  };

  const renderAnalystBar = (data) => {
    if (!data) return null;
    const total = (data.strongBuy || 0) + (data.buy || 0) + (data.hold || 0) + (data.sell || 0) + (data.strongSell || 0);
    if (total === 0) return <span style={{ color: '#999', fontSize: '11px' }}>-</span>;
    
    return (
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
        {data.strongBuy > 0 && <div style={{ flex: data.strongBuy, background: '#0d7d0d' }} />}
        {data.buy > 0 && <div style={{ flex: data.buy, background: '#34A853' }} />}
        {data.hold > 0 && <div style={{ flex: data.hold, background: '#FBBC04' }} />}
        {data.sell > 0 && <div style={{ flex: data.sell, background: '#EA4335' }} />}
        {data.strongSell > 0 && <div style={{ flex: data.strongSell, background: '#9d0d0d' }} />}
      </div>
    );
  };

  return (
    <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${border}`, padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', color: text }}>Summary Comparison</h2>
        {loadingAnalyst && <span style={{ fontSize: '11px', color: textMuted }}>Loading analyst data...</span>}
        {!loadingAnalyst && Object.keys(analystData).length === 0 && (
          <span style={{ fontSize: '11px', color: '#E65100' }} title="Analyst data only available for stocks, not indexes/crypto/commodities">⚠️ Analyst data unavailable</span>
        )}
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <SortHeader column="asset" align="left">Asset</SortHeader>
              <SortHeader column="firstTrade">First Trade</SortHeader>
              <SortHeader column="invested">Invested</SortHeader>
              <SortHeader column="final">Final Value</SortHeader>
              <SortHeader column="dividends">Dividends</SortHeader>
              <SortHeader column="gainLoss">Gain/Loss</SortHeader>
              <SortHeader column="return">Return</SortHeader>
              
              {/* NEW COLUMNS */}
              <SortHeader column="aum">Total AUM</SortHeader>
              <SortHeader column="momentum">Trend (Hot?)</SortHeader>
              
              <SortHeader column="target">Target</SortHeader>
              <SortHeader column="upside">Upside</SortHeader>
              <SortHeader column="fmv">FMV</SortHeader>
              <SortHeader column="fmvUpside">FMV Δ</SortHeader>
              <SortHeader column="earnings">Earnings</SortHeader>
              <th style={{ textAlign: 'center', padding: '10px 12px', color: '#666', fontWeight: '500', fontSize: '12px' }}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedSymbols.map(symbol => {
              const data = analysis[symbol];
              const analyst = analystData?.[symbol];
              const gainLoss = data.finalValue - data.totalInvested;
              const upside = analyst?.targetMean && analyst?.currentPrice 
                ? ((analyst.targetMean - analyst.currentPrice) / analyst.currentPrice * 100) 
                : null;
              const fmvUpside = analyst?.fmvEstimate && analyst?.currentPrice 
                ? ((analyst.fmvEstimate - analyst.currentPrice) / analyst.currentPrice * 100) 
                : null;
              
              // AUM Logic
              const hasAum = analyst?.totalAssets && analyst.totalAssets > 0;
              
              // Trend/Hotness Logic (Price vs 50d Avg)
              const priceTrend = analyst?.currentPrice && analyst?.fiftyDayAverage 
                ? ((analyst.currentPrice - analyst.fiftyDayAverage) / analyst.fiftyDayAverage * 100) 
                : null;
              
              // Define "Hot" as > 5% above 50d avg, "Cold" as < -5%
              const isHot = priceTrend > 5; 
              const isCold = priceTrend < -5;

              // Format earnings date
              const formatEarningsDate = (dateStr) => {
                if (!dateStr) return null;
                const date = new Date(dateStr);
                const today = new Date();
                const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
                const formatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                return { formatted, diffDays, isPast: diffDays < 0 };
              };
              
              const earnings = formatEarningsDate(analyst?.earningsDate);
              
              return (
                <tr key={symbol} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getSymbolColor(symbol, stocks), flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>{getSymbolName(symbol)}</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>{symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: '#666', fontSize: '12px' }}>
                    {data.firstTradeDate ? new Date(data.firstTradeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>{formatCurrency(data.totalInvested)}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '500' }}>{formatCurrency(data.finalValue)}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: data.totalDividends > 0 ? '#34A853' : '#999' }}>
                    {data.totalDividends > 0 ? formatCurrency(data.totalDividends) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: gainLoss >= 0 ? '#2E7D32' : '#C62828' }}>
                    {formatCurrency(gainLoss)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      background: data.returnPercent >= 0 ? '#E8F5E9' : '#FFEBEE', 
                      color: data.returnPercent >= 0 ? '#2E7D32' : '#C62828' 
                    }}>
                      {formatPercent(data.returnPercent)}
                    </span>
                  </td>

                  {/* NEW: AUM Column */}
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: '500', color: hasAum ? text : textMuted }}>
                     {formatLargeNumber(analyst?.totalAssets)}
                  </td>

                  {/* NEW: Trend/Hotness Column */}
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {priceTrend !== null ? (
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                         <span style={{ 
                           color: isHot ? '#2E7D32' : (isCold ? '#C62828' : text),
                           fontWeight: isHot ? 'bold' : 'normal',
                           fontSize: '12px'
                         }}>
                           {isHot ? '🔥 ' : ''}{priceTrend > 0 ? '+' : ''}{priceTrend.toFixed(1)}%
                         </span>
                         <span style={{ fontSize: '10px', color: textMuted }}>vs 50d Avg</span>
                       </div>
                    ) : '-'}
                  </td>

                  <td style={{ textAlign: 'right', padding: '10px 12px', color: '#666' }}>
                    {analyst?.targetMean ? `$${analyst.targetMean.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {upside !== null ? (
                      <span style={{ 
                        color: upside >= 0 ? '#2E7D32' : '#C62828',
                        fontWeight: '500'
                      }}>
                        {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {analyst?.fmvEstimate ? (
                      <span title={analyst.fmvMethod ? `Method: ${analyst.fmvMethod}` : ''} style={{ color: '#666', cursor: analyst.fmvMethod ? 'help' : 'default' }}>
                        ${analyst.fmvEstimate.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {fmvUpside !== null ? (
                      <span style={{ 
                        color: fmvUpside >= 0 ? '#2E7D32' : '#C62828',
                        fontWeight: '500'
                      }}>
                        {fmvUpside >= 0 ? '+' : ''}{fmvUpside.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {earnings ? (
                      <span style={{ 
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: earnings.isPast ? '#f5f5f5' : (earnings.diffDays <= 14 ? '#FFF3E0' : '#E3F2FD'),
                        color: earnings.isPast ? '#999' : (earnings.diffDays <= 14 ? '#E65100' : '#1565C0')
                      }} title={earnings.diffDays >= 0 ? `In ${earnings.diffDays} days` : 'Past'}>
                        {earnings.formatted}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {renderAnalystBar(analyst)}
                      {analyst?.recommendation && (
                        <span style={{ 
                          fontSize: '9px', 
                          textTransform: 'uppercase',
                          color: getRatingColor(analyst.recommendation),
                          fontWeight: '600'
                        }}>
                          {analyst.recommendation.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8f9fa', fontWeight: '600' }}>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}>
                <strong>TOTAL ({sortedSymbols.length} assets)</strong>
              </td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ textAlign: 'right', padding: '12px', borderTop: '2px solid #ddd' }}>{formatCurrency(totals.invested)}</td>
              <td style={{ textAlign: 'right', padding: '12px', borderTop: '2px solid #ddd' }}>{formatCurrency(totals.finalValue)}</td>
              <td style={{ textAlign: 'right', padding: '12px', borderTop: '2px solid #ddd', color: totals.dividends > 0 ? '#34A853' : '#999' }}>
                {totals.dividends > 0 ? formatCurrency(totals.dividends) : '-'}
              </td>
              <td style={{ textAlign: 'right', padding: '12px', borderTop: '2px solid #ddd', color: totals.gainLoss >= 0 ? '#2E7D32' : '#C62828' }}>
                {formatCurrency(totals.gainLoss)}
              </td>
              <td style={{ textAlign: 'right', padding: '12px', borderTop: '2px solid #ddd' }}>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '4px', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  background: totalReturn >= 0 ? '#E8F5E9' : '#FFEBEE', 
                  color: totalReturn >= 0 ? '#2E7D32' : '#C62828' 
                }}>
                  {formatPercent(totalReturn)}
                </span>
              </td>
              {/* Spacer cells for new columns */}
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
              <td style={{ padding: '12px', borderTop: '2px solid #ddd' }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
