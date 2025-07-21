export const FLAVOR_COLORS = {
  // Theme colors for light mode
  bodyBg: '#f0fdf4',
  
  // Theme colors for dark mode
  bodyBgDark: '#0c1910',
  
  // Theme colors for light mode
  cardBorderColor: '#bbf7d0',
  
  // Theme colors for dark mode
  cardBorderColorDark: '#1a2e23',
  
  // Status colors
  danger: '#ef4444',
  info: '#06b6d4',
  
  // Primary brand colors - Default green theme (matching screenshot)
  primary: '#00d97e',
  primaryDark: '#00c76b',
  
  // Rainbow colors - Green themed
  rainbow1: '#10b981',
  rainbow2: '#00d97e', 
  rainbow3: '#34d399',
  rainbow4: '#6ee7b7',
  rainbow5: '#a7f3d0',
  
  // Status colors
  success: '#00d97e',
  warning: '#f59e0b',
} as const;

export type FlavorColors = typeof FLAVOR_COLORS; 