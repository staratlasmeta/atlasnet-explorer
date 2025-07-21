// Dynamic color imports based on flavor
const flavor = process.env.NEXT_PUBLIC_FLAVOR || 'default';

// Import the appropriate flavor colors
let flavorColors;

switch (flavor) {
  case 'zink':
    flavorColors = require('../flavors/zink/colors');
    break;
  case 'atlasnet':
    flavorColors = require('../flavors/atlasnet/colors');
    break;
  case 'universe':
    flavorColors = require('../flavors/universe/colors');
    break;
  case 'universe-local':
    flavorColors = require('../flavors/universe-local/colors');
    break;
  case 'localnet':
    flavorColors = require('../flavors/localnet/colors');
    break;
  case 'default':
  default:
    flavorColors = require('../flavors/default/colors');
    break;
}

export const FLAVOR_COLORS = flavorColors.FLAVOR_COLORS;
export type FlavorColors = typeof FLAVOR_COLORS; 