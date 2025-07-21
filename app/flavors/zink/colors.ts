export const FLAVOR_COLORS = {
  // Primary brand colors - Zink bright green/cyan theme (matching screenshot)
  primary: '#00ff88',
  primaryDark: '#00e67a',
  
  // Rainbow colors - Bright green/cyan themed
  rainbow1: '#00cc6a',
  rainbow2: '#00ff88', 
  rainbow3: '#1aff99',
  rainbow4: '#33ffaa',
  rainbow5: '#4dffbb',
  
  // Status colors
  success: '#00ff88',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  
  // Theme colors for light mode
  bodyBg: '#f0fffb',
  cardBorderColor: '#ccffee',
  
  // Theme colors for dark mode
  bodyBgDark: '#001a0f',
  cardBorderColorDark: '#003322',
} as const;

export type FlavorColors = typeof FLAVOR_COLORS; 