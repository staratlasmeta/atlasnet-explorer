import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flavor = process.env.NEXT_PUBLIC_FLAVOR || 'default';

// Dynamically import the flavor colors
async function generateFlavorScss() {
  try {
    const colorsPath = path.resolve(__dirname, `../flavors/${flavor}/colors.ts`);
    
    // Read the colors file and extract the FLAVOR_COLORS
    const colorsContent = fs.readFileSync(colorsPath, 'utf8');
    
    // Parse the colors from the TypeScript file
    // This is a simple regex-based parser for the specific format we're using
    const colorMatches = colorsContent.match(/(\w+):\s*'([^']+)'/g);
    
    if (!colorMatches) {
      throw new Error(`Could not parse colors from ${colorsPath}`);
    }
    
    const colors = {};
    colorMatches.forEach(match => {
      const [, key, value] = match.match(/(\w+):\s*'([^']+)'/);
      colors[key] = value;
    });
    
    // Generate SCSS variables
    const scssContent = `//
// _flavor-colors.scss
// Auto-generated from flavor: ${flavor}
// DO NOT EDIT THIS FILE DIRECTLY
//

// Primary colors
$primary: ${colors.primary} !default;
$primary-dark: ${colors.primaryDark} !default;

// Rainbow colors  
$rainbow-1: ${colors.rainbow1} !default;
$rainbow-2: ${colors.rainbow2} !default;
$rainbow-3: ${colors.rainbow3} !default;
$rainbow-4: ${colors.rainbow4} !default;
$rainbow-5: ${colors.rainbow5} !default;

// Status colors
$success: ${colors.success} !default;
$warning: ${colors.warning} !default;
$danger: ${colors.danger} !default;
$info: ${colors.info} !default;

// Theme colors
$body-bg: ${colors.bodyBg} !default;
$card-border-color: ${colors.cardBorderColor} !default;

// Dark theme colors
$body-bg-dark: ${colors.bodyBgDark} !default;
$card-border-color-dark: ${colors.cardBorderColorDark} !default;

// Utility classes with flavor colors
.text-rainbow {
    background: linear-gradient(0.3turn, ${colors.rainbow1}, ${colors.rainbow5});
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.bg-rainbow {
    background: linear-gradient(0.3turn, ${colors.rainbow1}, ${colors.rainbow5});
}

.bg-rainbow-1 { background: ${colors.rainbow1}; }
.bg-rainbow-2 { background: ${colors.rainbow2}; }
.bg-rainbow-3 { background: ${colors.rainbow3}; }
.bg-rainbow-4 { background: ${colors.rainbow4}; }
.bg-rainbow-5 { background: ${colors.rainbow5}; }

.text-rainbow-1 { color: ${colors.rainbow1}; }
.text-rainbow-2 { color: ${colors.rainbow2}; }
.text-rainbow-3 { color: ${colors.rainbow3}; }
.text-rainbow-4 { color: ${colors.rainbow4}; }
.text-rainbow-5 { color: ${colors.rainbow5}; }
`;
    
    // Write the generated SCSS file
    const outputPath = path.resolve(__dirname, '../scss/_flavor-colors.scss');
    fs.writeFileSync(outputPath, scssContent);
    
    console.log(`✅ Generated flavor colors for: ${flavor}`);
    console.log(`📁 Output: ${outputPath}`);
    
  } catch (error) {
    console.error(`❌ Error generating flavor colors:`, error);
    process.exit(1);
  }
}

// Run the generation
generateFlavorScss(); 