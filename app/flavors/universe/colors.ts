export const FLAVOR_COLORS = {
  // Primary brand colors - Universe lighter orange theme
  primary: '#f97316',
  primaryDark: '#ea580c',
  
  // Rainbow colors - Lighter orange themed
  rainbow1: '#ea580c',
  rainbow2: '#f97316', 
  rainbow3: '#fb923c',
  rainbow4: '#fdba74',
  rainbow5: '#fed7aa',
  
  // Status colors
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  
  // Theme colors for light mode
  bodyBg: '#fff8f1',
  cardBorderColor: '#fed7aa',
  
  // Theme colors for dark mode
  bodyBgDark: '#1c1410',
  cardBorderColorDark: '#2d1b0e',
} as const;

export type FlavorColors = typeof FLAVOR_COLORS; 