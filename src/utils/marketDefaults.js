// src/utils/marketDefaults.js

export const DIVIDEND_LISTS = {
  'US Aristocrats': ['O', 'T', 'KO', 'JNJ', 'PG', 'MMM', 'FRT'],
  'UK High Yield': ['LGEN.L', 'NG.L', 'BATS.L', 'IMB.L', 'VOD.L', 'RIO.L'],
  'High Yield ETFs': ['SCHD', 'VYM', 'JEPI', 'VIG', 'DGRO']
};

export const BOND_LISTS = {
  'Government Yields': ['^TNX', '^FVX', '^IRX', '^TYX'], // US Treasury Yields
  'Corporate Bond ETFs': ['LQD', 'HYG', 'VCSH', 'VCIT'], // Investment Grade & High Yield
  'Total Bond Market': ['BND', 'AGG', 'BNDX'] // Aggregate Bond Funds
};

export const getAssetName = (symbol) => {
  const map = {
    '^TNX': 'US 10-Year Treasury',
    '^FVX': 'US 5-Year Treasury',
    '^IRX': 'US 13-Week Bill',
    '^TYX': 'US 30-Year Treasury',
    'LQD': 'Inv. Grade Corporate Bond',
    'HYG': 'High Yield Corp Bond',
    'O': 'Realty Income Corp',
    'T': 'AT&T Inc.',
    'NG.L': 'National Grid',
    'LGEN.L': 'Legal & General',
  };
  return map[symbol] || symbol;
};
