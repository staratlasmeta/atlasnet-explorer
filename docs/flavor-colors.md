# Flavor Color System

This explorer supports different color themes for different flavors (variants) of the application. Each flavor can have its own primary colors, rainbow palettes, and theme colors.

## How It Works

The color system works at build time using the `NEXT_PUBLIC_FLAVOR` environment variable:

1. **Color Definitions**: Each flavor has a `colors.ts` file in `app/flavors/{flavor}/colors.ts`
2. **Build-Time Generation**: The build process generates `app/scss/_flavor-colors.scss` with the appropriate colors
3. **SCSS Integration**: The generated file is imported into the main SCSS variables
4. **React Integration**: Components can access colors using the `useFlavorColors()` hook

## Available Flavors

- **default**: Original Solana cyan theme (`#32feff`)
- **universe**: Blue theme (`#4c7cf0`) 
- **atlasnet**: Orange/gold theme (`#ff8c00`)
- **zink**: Purple theme (`#8b5cf6`)
- **localnet**: Green theme (`#00d97e`)
- **universe-local**: Blue theme (same as universe)

## Usage

### Environment Variable

Set the flavor when building or running:

```bash
# Build with universe flavor
NEXT_PUBLIC_FLAVOR=universe npm run build

# Run dev with atlasnet flavor  
NEXT_PUBLIC_FLAVOR=atlasnet npm run dev

# Default flavor if not specified
npm run build  # Uses 'default' flavor
```

### In React Components

```tsx
import { useFlavorColors } from '@/app/hooks/useFlavorColors';

function MyComponent() {
  const colors = useFlavorColors();
  
  return (
    <div style={{ backgroundColor: colors.primary }}>
      Themed content
    </div>
  );
}
```

### In SCSS

The generated variables are automatically available:

```scss
.my-class {
  color: $primary;
  background: $rainbow-1;
  border: 1px solid $card-border-color;
}
```

## Adding a New Flavor

1. **Create color configuration**:
   ```bash
   # Create app/flavors/myflavor/colors.ts
   ```

2. **Define colors**:
   ```typescript
   export const FLAVOR_COLORS = {
     primary: '#ff0000',
     primaryDark: '#cc0000',
     rainbow1: '#ff4444',
     // ... other colors
   } as const;
   ```

3. **Create cluster configuration** (if needed):
   ```bash
   # Create app/flavors/myflavor/cluster.ts
   ```

4. **Build with new flavor**:
   ```bash
   NEXT_PUBLIC_FLAVOR=myflavor npm run build
   ```

## Color Properties

Each flavor must define these color properties:

### Core Colors
- `primary`: Main brand color
- `primaryDark`: Darker variant of primary
- `rainbow1` through `rainbow5`: Gradient colors

### Status Colors  
- `success`: Success state color
- `warning`: Warning state color
- `danger`: Error state color
- `info`: Info state color

### Theme Colors
- `bodyBg`: Light theme background
- `cardBorderColor`: Light theme borders
- `bodyBgDark`: Dark theme background  
- `cardBorderColorDark`: Dark theme borders

## Build Process

The color generation happens automatically:

1. `npm run generate-colors` - Generates SCSS from flavor colors
2. `npm run prebuild` - Auto-runs color generation before build
3. `npm run predev` - Auto-runs color generation before dev

The generated `_flavor-colors.scss` file should not be edited manually as it gets regenerated on each build.

## Docker Builds

When building with Docker, pass the flavor as a build argument:

```dockerfile
ARG FLAVOR=default
ENV FLAVOR=$FLAVOR
RUN NEXT_PUBLIC_FLAVOR=$FLAVOR pnpm build
```

```bash
docker build --build-arg FLAVOR=universe .
``` 