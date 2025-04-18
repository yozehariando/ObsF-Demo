# ObsF Demo - Refactored Dashboard

This project contains a refactored, modular implementation of the DNA sequence visualization dashboard.

## Project Structure

The codebase has been organized into a modular structure:

```
src/
├── dashboard.md                   # Original dashboard code (preserved for reference)
├── dashboard-new.md               # Refactored dashboard with modular imports
├── visualization/                 # Visualization components
│   ├── umap-visualization.js      # Core visualization functionality
│   ├── tooltip-formatter.js       # Tooltip creation and formatting
│   ├── legend-builder.js          # Legend creation and styling
│   └── point-styler.js            # Point color and size functions
├── data-processing/               # Data handling modules
│   ├── sequence-matcher.js        # Sequence matching algorithms
│   ├── cache-manager.js           # UMAP data cache management
│   ├── debug-integration.js       # Debug utilities integration
│   └── coordinate-mapper.js       # Coordinate transformation logic
├── ui-components/                 # UI element modules
│   ├── details-panel.js           # Sequence details panel
│   ├── hover-effects.js           # Interactive hover behaviors
│   └── highlight-manager.js       # Cross-panel highlighting
└── utils/                         # Utility functions
    ├── dom-utils.js               # DOM manipulation helpers
    └── debug-utils.js             # Debug and development utilities
```

## Getting Started

1. Use `dashboard-new.md` for the refactored implementation
2. `dashboard.md` is preserved for reference but will be deprecated

## Documentation

- **Refactoring Plan**: `doc/refactoring/plan.md`
- **Summary Report**: `doc/refactoring/summary-report.md`

## Module Overview

### Visualization Layer

- **umap-visualization.js**: Core functions for creating and updating UMAP visualizations
- **tooltip-formatter.js**: Formatting and rendering tooltips for data points
- **legend-builder.js**: Creates standardized legends for visualizations
- **point-styler.js**: Functions for styling points based on data attributes

### Data Processing Layer

- **sequence-matcher.js**: Algorithms for finding sequence matches in the data cache
- **cache-manager.js**: Manages the UMAP data cache and provides inspection tools
- **coordinate-mapper.js**: Utilities for transforming and scaling coordinates
- **debug-integration.js**: Integration of debugging utilities

### UI Components Layer

- **details-panel.js**: Displays details about user sequences and similar sequences
- **highlight-manager.js**: Manages cross-panel highlighting of sequences
- **hover-effects.js**: Manages interactive hover behaviors between visualizations

### Utilities Layer

- **dom-utils.js**: Helper functions for DOM manipulation
- **debug-utils.js**: Utilities for debugging and development

## Developer Notes

- All modules use ES6 import/export syntax
- Backward compatibility is maintained with global function registration
- See `dashboard-new.md` for initialization and integration of modules

## Recommended Development Workflow

1. Make changes to individual modules rather than dashboard files directly
2. Test changes in `dashboard-new.md`
3. Follow the modular pattern when adding new functionality
4. Refer to the refactoring documentation for architectural guidance
