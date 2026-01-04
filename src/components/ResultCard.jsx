import React from 'react';
import { formatCurrency, formatPercent, getSymbolColor, getSymbolName } from '../utils/formatters';

const ResultCard = ({ symbol, data, analyst, loadingAnalyst, stocks }) => {
  const color = getSymbolColor(symbol, stocks);
  const name = getSymbolName(symbol);

  const renderAnalystBar = (analystData) => {
    const total = analystData.strongBuy + analystData.buy + analystData.hold + analystData.sell + analystData.strongSell;
    if (total === 0) return null;
    
    return (
      <div className="analyst-bar">
        {analystData.strongBuy > 0 && <div style={{ width: `${(analystData.strongBuy/total)*100}%`, background: '#0d7d0d' }} />}
        {analystData.buy > 0 && <div style={{ width: `${(analystData.buy/total)*100}%`, background: '#34A853' }} />}
        {analystData.hold > 0 && <div style={{ width: `${(analystData.hold/total)*100}%`, background: '#FBBC04' }} />}
        {analystData.sell > 0 && <div style={{ width: `${(analystData.sell/total)*100}%`, background: '#EA4335' }} />}
        {analystData.strongSell > 0 && <div style={{ width: `${(analystData.strongSell/total)*100}%`, background: '#9d0d0d' }} />}
      </div>
    );
  };

  if (data.error) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderTop: `4px solid ${color}`
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>{name}</div>
        <div style={{ fontSize: '13px', color: '#C62828', marginTop: '8px' }}>
          Error: {data.error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      padding: '20px',
      borderTop: `4px solid ${color}`
    }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{name}</div>
      <div style={{ fontSize: '28px', fontWeight: '500', color: '#202124' }}>
        {formatCurrency(data.finalValue)}
      </div>
      <div style={{
        display: 'inline-block',
        marginTop: '8px',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '500',
        background: data.returnPercent >= 0 ? '#E8F5E9' : '#FFEBEE',
        color: data.returnPercent >= 0 ? '#2E7D32' : '#C62828'
      }}>
        {formatPercent(data.returnPercent)}
      </div>
      <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
        <div>Invested: {formatCurrency(data.totalInvested)}</div>
        <div>Gain/Loss: {formatCurrency(data.finalValue - data.totalInvested)}</div>
        {data.totalDividends > 0 && (
          <div style={{ color: '#34A853' }}>Dividends reinvested: {formatCurrency(data.totalDividends)}</div>
        )}
      </div>
      
      {analyst && (
        <div className="analyst-card">
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
            Market Info {analyst.exchange && <span style={{ fontWeight: '400', color: '#666' }}>({analyst.exchange})</span>}
          </div>
          
          {(analyst.fiftyTwoWeekLow || analyst.fiftyTwoWeekHigh) && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>52-Week Range</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#666' }}>${analyst.fiftyTwoWeekLow?.toFixed(2)}</span>
                <div style={{ flex: 1, height: '6px', background: '#e0e0e0', borderRadius: '3px', position: 'relative' }}>
                  {analyst.currentPrice && analyst.fiftyTwoWeekLow && analyst.fiftyTwoWeekHigh && (
                    <div style={{
                      position: 'absolute',
                      left: `${Math.min(100, Math.max(0, ((analyst.currentPrice - analyst.fiftyTwoWeekLow) / (analyst.fiftyTwoWeekHigh - analyst.fiftyTwoWeekLow)) * 100))}%`,
                      top: '-2px',
                      width: '10px',
                      height: '10px',
                      background: color,
                      borderRadius: '50%',
                      transform: 'translateX(-50%)'
                    }} />
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#666' }}>${analyst.fiftyTwoWeekHigh?.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          {(analyst.fiftyDayAverage || analyst.twoHundredDayAverage) && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '11px' }}>
              {analyst.fiftyDayAverage && (
                <div><span style={{ color: '#666' }}>50-Day: </span><span style={{ fontWeight: '500' }}>${analyst.fiftyDayAverage.toFixed(2)}</span></div>
              )}
              {analyst.twoHundredDayAverage && (
                <div><span style={{ color: '#666' }}>200-Day: </span><span style={{ fontWeight: '500' }}>${analyst.twoHundredDayAverage.toFixed(2)}</span></div>
              )}
            </div>
          )}
          
          {(analyst.trailingPE || analyst.dividendYield || analyst.beta) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px', fontSize: '11px' }}>
              {analyst.trailingPE && <div><span style={{ color: '#666' }}>P/E: </span><span style={{ fontWeight: '500' }}>{analyst.trailingPE.toFixed(2)}</span></div>}
              {analyst.dividendYield && <div><span style={{ color: '#666' }}>Yield: </span><span style={{ fontWeight: '500', color: '#34A853' }}>{(analyst.dividendYield * 100).toFixed(2)}%</span></div>}
              {analyst.beta && <div><span style={{ color: '#666' }}>Beta: </span><span style={{ fontWeight: '500' }}>{analyst.beta.toFixed(2)}</span></div>}
            </div>
          )}
          
          {(analyst.strongBuy + analyst.buy + analyst.hold + analyst.sell + analyst.strongSell) > 0 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '11px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>Analyst Ratings</div>
              {renderAnalystBar(analyst)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                <span>Buy: {analyst.strongBuy + analyst.buy}</span>
                <span>Hold: {analyst.hold}</span>
                <span>Sell: {analyst.sell + analyst.strongSell}</span>
              </div>
            </div>
          )}
          
          {analyst.targetMean && (
            <div style={{ marginTop: '8px', fontSize: '11px' }}>
              <span style={{ color: '#666' }}>Target: </span>
              <span style={{ fontWeight: '500' }}>${analyst.targetMean.toFixed(2)}</span>
              {analyst.currentPrice && (
                <span style={{ 
                  marginLeft: '8px',
                  color: analyst.targetMean > analyst.currentPrice ? '#34A853' : '#EA4335',
                  fontWeight: '500'
                }}>
                  {analyst.targetMean > analyst.currentPrice ? '↑' : '↓'}
                  {Math.abs(((analyst.targetMean - analyst.currentPrice) / analyst.currentPrice) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {loadingAnalyst && !analyst && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>Loading market data...</div>
      )}
    </div>
  );
};

export default ResultCard;
