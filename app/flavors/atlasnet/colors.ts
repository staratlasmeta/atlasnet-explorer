export const FLAVOR_COLORS = {
  // Primary brand colors - Atlasnet original cyan theme
  primary: '#32feff',
  primaryDark: '#32feff',
  
  // Rainbow colors - Original cyan themed
  rainbow1: '#fa62fc',
  rainbow2: '#be84e8', 
  rainbow3: '#79abd2',
  rainbow4: '#38d0bd',
  rainbow5: '#32feff',
  
  // Status colors
  success: '#19be56',
  warning: '#d83aeb',
  danger: '#b45be1',
  info: '#43b5c5',
  
  // Theme colors for light mode
  bodyBg: '#f9fdfc',
  cardBorderColor: '#e5ebe9',
  
  // Theme colors for dark mode
  bodyBgDark: '#161b19',
  cardBorderColorDark: '#282d2b',
} as const;

export type FlavorColors = typeof FLAVOR_COLORS; 