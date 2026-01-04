// Index options organized by region
export const INDEX_OPTIONS = [
  // US
  { symbol: '^GSPC', name: 'S&P 500', color: '#9C27B0', region: 'US' },
  { symbol: '^DJI', name: 'Dow Jones', color: '#E91E63', region: 'US' },
  { symbol: '^IXIC', name: 'NASDAQ', color: '#00BCD4', region: 'US' },
  { symbol: '^RUT', name: 'Russell 2000', color: '#795548', region: 'US' },
  // Europe
  { symbol: '^FTSE', name: 'FTSE 100', color: '#3F51B5', region: 'EU' },
  { symbol: '^GDAXI', name: 'DAX', color: '#FF9800', region: 'EU' },
  { symbol: '^FCHI', name: 'CAC 40', color: '#009688', region: 'EU' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50', color: '#8BC34A', region: 'EU' },
  // Asia Pacific
  { symbol: '^N225', name: 'Nikkei 225', color: '#F44336', region: 'Asia' },
  { symbol: '^HSI', name: 'Hang Seng', color: '#FF5722', region: 'Asia' },
  { symbol: '000001.SS', name: 'Shanghai', color: '#D32F2F', region: 'Asia' },
  { symbol: '^AXJO', name: 'ASX 200', color: '#1976D2', region: 'Asia' },
  { symbol: '^KS11', name: 'KOSPI', color: '#7B1FA2', region: 'Asia' },
  { symbol: '^TWII', name: 'Taiwan', color: '#C2185B', region: 'Asia' },
  { symbol: '^BSESN', name: 'Sensex', color: '#F57C00', region: 'Asia' },
  { symbol: '^STI', name: 'Straits Times', color: '#0288D1', region: 'Asia' },
  // Middle East
  { symbol: '^TA125.TA', name: 'Tel Aviv 125', color: '#0D47A1', region: 'ME' },
  { symbol: '^TASI.SR', name: 'Tadawul', color: '#1B5E20', region: 'ME' },
];

// Cryptocurrency options
export const CRYPTO_OPTIONS = [
  { symbol: 'BTC-USD', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH-USD', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'SOL-USD', name: 'Solana', color: '#00FFA3' },
];

// Bond options organized by country
export const BOND_OPTIONS = [
  // US Treasury
  { symbol: '^IRX', name: 'US 3M T-Bill', color: '#1565C0', category: 'US' },
  { symbol: '^FVX', name: 'US 5Y Treasury', color: '#1976D2', category: 'US' },
  { symbol: '^TNX', name: 'US 10Y Treasury', color: '#1E88E5', category: 'US' },
  { symbol: '^TYX', name: 'US 30Y Treasury', color: '#2196F3', category: 'US' },
  // UK Gilts (using ETFs as proxies)
  { symbol: 'IGLS.L', name: 'UK Gilts ETF', color: '#C62828', category: 'UK' },
  { symbol: 'IGLT.L', name: 'UK Long Gilts', color: '#D32F2F', category: 'UK' },
  // Germany/EU
  { symbol: 'IS0L.DE', name: 'Euro Govt Bond', color: '#F57C00', category: 'EU' },
  { symbol: 'EUN4.DE', name: 'Euro Corp Bond', color: '#FF9800', category: 'EU' },
];

// Commodity options organized by category
export const COMMODITY_OPTIONS = [
  // Precious Metals
  { symbol: 'GC=F', name: 'Gold', color: '#FFD700', category: 'Metals' },
  { symbol: 'SI=F', name: 'Silver', color: '#A0A0A0', category: 'Metals' },
  { symbol: 'PL=F', name: 'Platinum', color: '#E5E4E2', category: 'Metals' },
  { symbol: 'PA=F', name: 'Palladium', color: '#CED0DD', category: 'Metals' },
  { symbol: 'HG=F', name: 'Copper', color: '#B87333', category: 'Metals' },
  // Energy
  { symbol: 'CL=F', name: 'Crude Oil (WTI)', color: '#333333', category: 'Energy' },
  { symbol: 'BZ=F', name: 'Brent Crude', color: '#4A4A4A', category: 'Energy' },
  { symbol: 'NG=F', name: 'Natural Gas', color: '#87CEEB', category: 'Energy' },
  { symbol: 'RB=F', name: 'Gasoline', color: '#DC143C', category: 'Energy' },
  // Agriculture
  { symbol: 'ZC=F', name: 'Corn', color: '#F4D03F', category: 'Agri' },
  { symbol: 'ZW=F', name: 'Wheat', color: '#D4AC0D', category: 'Agri' },
  { symbol: 'ZS=F', name: 'Soybeans', color: '#7D6608', category: 'Agri' },
  { symbol: 'KC=F', name: 'Coffee', color: '#6F4E37', category: 'Agri' },
  { symbol: 'CC=F', name: 'Cocoa', color: '#3E2723', category: 'Agri' },
  { symbol: 'SB=F', name: 'Sugar', color: '#FAFAFA', category: 'Agri' },
];

// Stock colors - distinct from indexes and commodities (10 colors)
export const STOCK_COLORS = ['#1A73E8', '#D93025', '#188038', '#FF5722', '#673AB7', '#00ACC1', '#F4511E', '#7CB342', '#5E35B1', '#FB8C00'];
