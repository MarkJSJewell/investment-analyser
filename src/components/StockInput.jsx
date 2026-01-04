import React from 'react';
import { STOCK_COLORS } from '../constants';

const StockInput = ({ stocks, onUpdate, onRemove, onAdd, onValidate }) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontWeight: '500', color: '#333' }}>Stock Symbols (1-10)</label>
        <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#1A73E8' }}>
          🔍 Look up tickers
        </a>
      </div>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', lineHeight: '1.4' }}>
        <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: '3px' }}>AAPL</code> US · 
        <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px' }}>VOD.L</code> UK · 
        <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px' }}>BMW.DE</code> EU
      </div>
      
      {stocks.map((stock, index) => (
        <div key={index} style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ 
              width: '4px', 
              height: '38px', 
              background: STOCK_COLORS[index], 
              borderRadius: '2px' 
            }} />
            <input
              type="text"
              value={stock.symbol}
              onChange={(e) => onUpdate(index, e.target.value)}
              onBlur={() => onValidate(index)}
              placeholder="e.g., AAPL or VOD.L"
              className={
                stock.status === 'valid' ? 'stock-valid' : 
                stock.status === 'invalid' ? 'stock-invalid' : 
                stock.status === 'validating' ? 'stock-validating' : ''
              }
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {stocks.length > 1 && (
              <button 
                onClick={() => onRemove(index)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '18px', 
                  color: '#999' 
                }}
              >
                ×
              </button>
            )}
          </div>
          
          {stock.status === 'valid' && stock.name && (
            <div style={{ fontSize: '11px', color: '#34A853', marginLeft: '12px', marginTop: '2px' }}>
              ✓ {stock.name}
            </div>
          )}
          {stock.status === 'invalid' && (
            <div style={{ fontSize: '11px', color: '#EA4335', marginLeft: '12px', marginTop: '2px' }}>
              ✗ {stock.name}
            </div>
          )}
          {stock.status === 'validating' && (
            <div style={{ fontSize: '11px', color: '#FBBC04', marginLeft: '12px', marginTop: '2px' }}>
              Validating...
            </div>
          )}
        </div>
      ))}
      
      {stocks.length < 10 && (
        <button 
          onClick={onAdd}
          style={{ 
            background: 'none', 
            border: '1px dashed #ccc', 
            borderRadius: '4px', 
            padding: '8px', 
            width: '100%', 
            color: '#1A73E8', 
            cursor: 'pointer', 
            marginTop: '4px' 
          }}
        >
          + Add Another Stock
        </button>
      )}
    </div>
  );
};

export default StockInput;
