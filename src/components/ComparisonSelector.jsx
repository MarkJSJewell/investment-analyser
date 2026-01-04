import React, { useState } from 'react';
import { INDEX_OPTIONS, COMMODITY_OPTIONS, CRYPTO_OPTIONS, BOND_OPTIONS } from '../constants';

const ComparisonSelector = ({ selectedIndexes, selectedCommodities, selectedCrypto, selectedBonds, onToggleIndex, onToggleCommodity, onToggleCrypto, onToggleBond }) => {
  const [showIndexes, setShowIndexes] = useState(true);
  const [showCrypto, setShowCrypto] = useState(false);
  const [showBonds, setShowBonds] = useState(false);
  const [showCommodities, setShowCommodities] = useState(false);

  const renderButton = (item, isSelected, onClick) => {
    const color = item.color;
    const isLightColor = ['#FFD700', '#FAFAFA', '#E5E4E2', '#CED0DD', '#A0A0A0', '#87CEEB', '#F4D03F', '#D4AC0D', '#00FFA3'].includes(color);
    
    return (
      <button
        key={item.symbol}
        onClick={() => onClick(item.symbol)}
        style={{
          padding: '4px 8px',
          margin: '2px',
          borderRadius: '12px',
          border: isSelected ? (isLightColor ? '2px solid #999' : 'none') : '1px solid #ddd',
          background: isSelected ? color : 'white',
          color: isSelected ? (isLightColor ? '#333' : '#fff') : '#333',
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: isSelected ? '600' : '400',
          transition: 'all 0.2s'
        }}
      >
        {item.name}
      </button>
    );
  };

  const renderRegion = (label, region) => {
    const items = INDEX_OPTIONS.filter(i => i.region === region);
    if (items.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>{label}:</span>
        {items.map(idx => renderButton(idx, selectedIndexes.includes(idx.symbol), onToggleIndex))}
      </div>
    );
  };

  const renderCommodityCategory = (label, category) => {
    const items = COMMODITY_OPTIONS.filter(c => c.category === category);
    if (items.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>{label}:</span>
        {items.map(comm => renderButton(comm, selectedCommodities.includes(comm.symbol), onToggleCommodity))}
      </div>
    );
  };

  const renderBondCategory = (label, category) => {
    const items = BOND_OPTIONS.filter(b => b.category === category);
    if (items.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>{label}:</span>
        {items.map(bond => renderButton(bond, selectedBonds?.includes(bond.symbol), onToggleBond))}
      </div>
    );
  };

  const selectedCount = selectedIndexes.length + selectedCommodities.length + (selectedCrypto?.length || 0) + (selectedBonds?.length || 0);

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
          Compare With
          {selectedCount > 0 && <span style={{ fontSize: '11px', color: '#1A73E8', marginLeft: '6px' }}>({selectedCount})</span>}
        </label>
      </div>
      
      {/* Indexes Section */}
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={() => setShowIndexes(!showIndexes)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '4px 0', 
            cursor: 'pointer', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{showIndexes ? '▼' : '▶'}</span>
          <span>Market Indexes</span>
          {selectedIndexes.length > 0 && <span style={{ color: '#1A73E8' }}>({selectedIndexes.length})</span>}
        </button>
        
        {showIndexes && (
          <div style={{ marginLeft: '12px', marginTop: '4px' }}>
            {renderRegion('US', 'US')}
            {renderRegion('EU', 'EU')}
            {renderRegion('Asia', 'Asia')}
            {renderRegion('ME', 'ME')}
          </div>
        )}
      </div>

      {/* Crypto Section */}
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={() => setShowCrypto(!showCrypto)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '4px 0', 
            cursor: 'pointer', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{showCrypto ? '▼' : '▶'}</span>
          <span>Crypto</span>
          {selectedCrypto?.length > 0 && <span style={{ color: '#1A73E8' }}>({selectedCrypto.length})</span>}
        </button>
        
        {showCrypto && (
          <div style={{ marginLeft: '12px', marginTop: '4px' }}>
            {CRYPTO_OPTIONS.map(crypto => renderButton(crypto, selectedCrypto?.includes(crypto.symbol), onToggleCrypto))}
          </div>
        )}
      </div>

      {/* Bonds Section */}
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={() => setShowBonds(!showBonds)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '4px 0', 
            cursor: 'pointer', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{showBonds ? '▼' : '▶'}</span>
          <span>Bonds</span>
          {selectedBonds?.length > 0 && <span style={{ color: '#1A73E8' }}>({selectedBonds.length})</span>}
        </button>
        
        {showBonds && (
          <div style={{ marginLeft: '12px', marginTop: '4px' }}>
            {renderBondCategory('US', 'US')}
            {renderBondCategory('UK', 'UK')}
            {renderBondCategory('EU', 'EU')}
          </div>
        )}
      </div>
      
      {/* Commodities Section */}
      <div>
        <button 
          onClick={() => setShowCommodities(!showCommodities)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '4px 0', 
            cursor: 'pointer', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{showCommodities ? '▼' : '▶'}</span>
          <span>Commodities</span>
          {selectedCommodities.length > 0 && <span style={{ color: '#1A73E8' }}>({selectedCommodities.length})</span>}
        </button>
        
        {showCommodities && (
          <div style={{ marginLeft: '12px', marginTop: '4px' }}>
            {renderCommodityCategory('Metals', 'Metals')}
            {renderCommodityCategory('Energy', 'Energy')}
            {renderCommodityCategory('Agri', 'Agri')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonSelector;
