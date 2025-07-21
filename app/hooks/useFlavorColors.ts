import { FLAVOR_COLORS } from '@utils/colors';

/**
 * Hook to access the current flavor's color palette
 * This uses the webpack alias to resolve the correct flavor colors at build time
 */
export function useFlavorColors() {
  return FLAVOR_COLORS;
}

/**
 * Utility function to get a specific color from the current flavor
 */
export function getFlavorColor(colorKey: keyof typeof FLAVOR_COLORS) {
  return FLAVOR_COLORS[colorKey];
} 