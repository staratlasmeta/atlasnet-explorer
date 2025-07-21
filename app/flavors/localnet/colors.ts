export const FLAVOR_COLORS = {
  // Primary brand colors - Localnet dark blue theme
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  
  // Rainbow colors - Dark blue themed
  rainbow1: '#1e3a8a',
  rainbow2: '#1e40af', 
  rainbow3: '#2563eb',
  rainbow4: '#3b82f6',
  rainbow5: '#60a5fa',
  
  // Status colors
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  
  // Theme colors for light mode
  bodyBg: '#eff6ff',
  cardBorderColor: '#bfdbfe',
  
  // Theme colors for dark mode
  bodyBgDark: '#0f1629',
  cardBorderColorDark: '#1e3a8a',
} as const;

export type FlavorColors = typeof FLAVOR_COLORS; 