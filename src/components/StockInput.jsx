import React from 'react';
import { getColor } from '../utils/colors'; // <--- THIS WAS MISSING

const StockInput = ({ stocks, onUpdate, onRemove, onAdd, onValidate, theme }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textMuted }}>Portfolio Assets</h3>
      {stocks.map((stock, index) => (
        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
          {/* Color Dot */}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getColor(index), // <--- Caused crash without import
            flexShrink: 0
          }} />
          
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={stock.symbol}
              onChange={(e) => onUpdate(index, e.target.value)}
              onBlur={() => onValidate(index)}
              placeholder="Symbol (e.g. AAPL)"
              style={{
                width: '100%',
                padding: '10px',
                paddingRight: '30px',
                borderRadius: '4px',
                border: `1px solid ${stock.status === 'invalid' ? '#ef4444' : theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                outline: 'none',
                boxSizing: 'border-box' // Prevents padding from breaking layout
              }}
            />
            {stock.status === 'validating' && (
              <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px' }}>⏳</span>
            )}
            {stock.status === 'valid' && (
              <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px' }}>✅</span>
            )}
          </div>
          
          {stocks.length > 1 && (
            <button
              onClick={() => onRemove(index)}
              style={{
                padding: '10px',
                background: '#FFEBEE',
                color: '#C62828',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      
      {stocks.length < 10 && (
        <button
          onClick={onAdd}
          style={{
            marginTop: '5px',
            padding: '8px 16px',
            background: 'transparent',
            border: `1px dashed ${theme.border}`,
            color: theme.textMuted,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            width: '100%'
          }}
        >
          + Add Asset
        </button>
      )}
    </div>
  );
};

export default StockInput;
