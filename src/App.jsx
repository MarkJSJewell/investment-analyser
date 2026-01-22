import React, { useState, createContext, useContext, useEffect } from 'react';
import StockInput from './components/StockInput';
import ComparisonSelector from './components/ComparisonSelector';
import PortfolioChart from './components/PortfolioChart';
import SummaryTable from './components/SummaryTable';
import IndexConstituents from './components/IndexConstituents';
import PredictionsCard from './components/PredictionsCard';
import NewsPanel from './components/NewsPanel';
import DividendPanel from './components/DividendPanel';
import BondPanel from './components/BondPanel';
import MarketScanner from './components/MarketScanner';
import TradeAnalyzer from './components/TradeAnalyzer';
import { fetchQuote, fetchHistoricalData, fetchAnalystData } from './services/api';
import { calculateDCA, buildChartData } from './utils/calculations';

export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// Cache Key for Main Dashboard
const STORAGE_KEY = 'inv_app_growth_state';

function App() {
  const [activeTab, setActiveTab] = useState('growth');
  
  // 1. Initialize state with Lazy Initializers (Check localStorage first)
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).stocks : [{ symbol: '', status: 'idle', name: '' }];
  });
  
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).startDate : oneYearAgo;
  });
  
  const [investmentAmount, setInvestmentAmount] = useState(500);
  const [investmentMode, setInvestmentMode] = useState('monthly');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  
  // Additional State
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [investmentDay, setInvestmentDay] = useState(1);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [selectedCommodities, setSelectedCommodities] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState([]);
  const [selectedBonds, setSelectedBonds] = useState([]);
  
  // Results State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analystData, setAnalystData] = useState({});
  const [loadingAnalyst, setLoadingAnalyst] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const theme = {
    bg: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : 'white',
    text: darkMode ? '#e8e8e8' : '#333',
    textMuted: darkMode ? '#a0a0a0' : '#666',
    border: darkMode ? '#2a2a4a' : '#e0e0e0',
    inputBg: darkMode ? '#1a1a2e' : 'white',
    headerBg: darkMode ? '#0f0f1a' : 'white',
    hoverBg: darkMode ? '#2a2a4a' : '#f8f9fa',
    primary: '#1A73E8',
    activeTab: darkMode ? '#2a2a4a' : '#E8F0FE'
  };

  // 2. Save state on change
  useEffect(() => {
    const stateToSave = { stocks, startDate, investmentAmount, investmentMode, reinvestDividends };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [stocks, startDate, investmentAmount, investmentMode, reinvestDividends]);

  const addStock = () => stocks.length < 10 && setStocks([...stocks, { symbol: '', status: 'idle', name: '' }]);
  const removeStock = (index) => stocks.length > 1 && setStocks(stocks.filter((_, i) => i !== index));
  const updateStock = (index, value) => { const n = [...stocks]; n[index] = { symbol: value.toUpperCase(), status: 'idle', name: '' }; setStocks(n); };
  
  const toggleIndex = (s) => setSelectedIndexes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleCommodity = (s) => setSelectedCommodities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleCrypto = (s) => setSelectedCrypto(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleBond = (s) => setSelectedBonds(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const validateStock = async (index) => {
    const stock = stocks[index];
    if (!stock.symbol.trim()) return;
    const n = [...stocks]; n[index] = { ...stock, status: 'validating' }; setStocks(n);
    try {
      const r = await fetchQuote(stock.symbol);
      const u = [...stocks]; 
      if (r.valid) {
        u[index] = { symbol: r.symbol || stock.symbol, status: 'valid', name: r.name };
      } else {
        u[index] = { ...stock, status: 'invalid', name: r.error || 'Invalid' };
      }
      setStocks(u);
    } catch { const u = [...stocks]; u[index] = { ...stock, status: 'invalid', name: 'Could not validate' }; setStocks(u); }
  };

  const runAnalysis = async () => {
    setLoading(true); setError(null); setResults(null); setAnalystData({});
    try {
      const validStocks = stocks.filter(s => s.symbol.trim());
      const allSymbols = [...validStocks.map(s => s.symbol), ...selectedIndexes, ...selectedCrypto, ...selectedBonds, ...selectedCommodities];
      if (allSymbols.length === 0) throw new Error('Please enter at least one stock symbol');
      
      const analysisResults = {};
      for (const symbol of allSymbols) {
        try {
          const priceData = await fetchHistoricalData(symbol, startDate, endDate);
          if (priceData.length === 0) throw new Error(`No data for ${symbol}`);
          analysisResults[symbol] = calculateDCA(priceData, investmentAmount, investmentDay, investmentMode, startDate, reinvestDividends);
        } catch (err) { analysisResults[symbol] = { error: err.message }; }
      }
      const chartData = buildChartData(analysisResults, allSymbols, investmentMode, investmentAmount);
      setResults({ analysis: analysisResults, chartData, allSymbols });
      
      setLoadingAnalyst(true);
      const analystResults = {};
      for (const symbol of allSymbols) { 
        try { const d = await fetchAnalystData(symbol); if (d) analystResults[symbol] = d; } catch (e) { console.log(e); }
      }
      setAnalystData(analystResults); 
      setLoadingAnalyst(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const TabButton = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 24px',
        background: activeTab === id ? theme.activeTab : 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? `3px solid ${theme.primary}` : '3px solid transparent',
        color: activeTab === id ? theme.primary : theme.textMuted,
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  // --- THIS IS THE VARIABLE THAT WAS MISSING ---
  const inputStyle = { padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px', outline: 'none', width: '100%', background: theme.inputBg, color: theme.text };

  return (
    <ThemeContext.Provider value={{ darkMode, theme }}>
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
        <header style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, padding: '0 24px' }}>
          <div style={{ maxWidth: '1900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{ fontSize: '24px' }}>📈</span> Investment Calculator
            </h1>
            
            {/* 3. Navigation Tabs */}
            <div style={{ display: 'flex', height: '100%' }}>
              <TabButton id="growth" icon="🚀" label="Growth & Returns" />
              <TabButton id="dividends" icon="💰" label="Dividend Income" />
              <TabButton id="bonds" icon="🏛️" label="Fixed Income" />
              <TabButton id="movers" icon="⚡"
