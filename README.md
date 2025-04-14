# DNA Mutation Analysis Dashboard (DEMO)

This is an [Observable Framework](https://observablehq.com/framework/) application for visualizing and analyzing DNA mutation data. The dashboard provides interactive visualizations including geographic distribution maps and mutation clustering scatter plots.

## Getting Started

To install the required dependencies, run:

```bash
npm install
```

Then, to start the local preview server, run:

```bash
npm run dev
```

Visit <http://localhost:3000> to preview the dashboard.

For more information about Observable Framework, see the [official documentation](https://observablehq.com/framework/getting-started).

## Project Structure

```text
.
├─ src
│  ├─ components
│  │  ├─ api
│  │  │  ├─ api-service.js          # API integration services
│  │  │  ├─ api-job-tracker.js      # Job tracking system
│  │  │  ├─ api-upload-component.js # File upload handling
│  │  │  ├─ api-similarity-service.js # Similarity search
│  │  │  └─ api-results-processor.js # Data processing
│  │  ├─ api-map-component.js       # API-specific map visualization
│  │  ├─ api-scatter-component.js   # API-specific scatter plot
│  │  ├─ api-user-scatter-component.js # User sequence visualization
│  │  ├─ data-service.js            # Data loading and processing
│  │  ├─ event-handlers.js          # Event handling for UI interactions
│  │  ├─ map-component.js           # Geographic visualization component
│  │  ├─ scatter-component.js       # Scatter plot visualization component
│  │  └─ ui-utils.js                # UI utility functions
│  ├─ data                          # Data files and loaders
│  ├─ styles                        # CSS stylesheets
│  ├─ dashboard.md                  # API integration dashboard
│  ├─ index.md                      # Main dashboard page
│  ├─ map.md                        # Detailed map visualization page
│  ├─ scatter-plot.md               # Detailed scatter plot visualization page
│  └─ phylogenetic.md               # Phylogenetic analysis page
├─ .gitignore
├─ observablehq.config.js           # App configuration
├─ package.json
└─ README.md
```

## Key Features

- **Interactive Map**: Geographic visualization of mutation data with zoom and pan capabilities
- **Scatter Plot**: Clustering visualization of mutations based on genetic properties
- **Data Integration**: Ability to fetch data from API endpoints or upload CSV files
- **FASTA Analysis**: Upload and analysis of FASTA sequence files
- **Similarity Search**: Find and visualize similar sequences in the reference database
- **Job Tracking**: Monitor progress of asynchronous analysis jobs
- **Responsive Design**: Visualizations adapt to different screen sizes
- **Modular Architecture**: Components can be reused across different pages

## JavaScript Development Patterns

The project uses several Observable Framework-specific coding patterns and styles:

### Component Pattern

- **Self-contained visualization components**: Each visualization (map, scatter plot) is implemented as a factory function returning an object with update methods
- **D3.js update pattern**: Components use D3's enter/update/exit pattern for efficient DOM updates
- **Configuration via options objects**: Components accept optional configuration parameters with sensible defaults

```javascript
function createUmapScatterPlot(containerId, data, options = {}) {
  // Default config with overrides from options
  const config = {
    width: 600,
    height: 400,
    // other defaults...
    ...options
  };
  
  // Component implementation...
  
  return {
    updateScatterPlot,
    highlightPoint,
    // other public methods...
  };
}
```

### Observable Framework Integration

- **Reactive data flow**: Components respond to state changes without requiring manual DOM manipulation
- **Live code execution**: JavaScript in Markdown files runs directly in the browser
- **Modular imports**: Clean separation of concerns through ES module imports
- **Layout with CSS grid**: Responsive dashboard layout using Observable's built-in grid classes

```markdown
<div class="grid grid-cols-2 gap-4">
  <div class="card">
    <!-- Component container -->
  </div>
</div>
```

```javascript
// JavaScript executes directly in the markdown
import { createMap } from "./components/map-component.js";
const map = createMap("map-container", options);
```

## Visualization Components

### Map Component

The map visualization displays the geographic distribution of DNA mutations, with points colored by mutation significance. Features include:

- Interactive zooming and panning
- Tooltips with detailed information
- Color-coded mutation points

### Scatter Plot Component

The scatter plot shows clustering of mutations based on their genetic properties. Features include:

- Interactive selection of data points
- Zoom and pan capabilities
- Color-coded points based on mutation significance

## Data Sources

The dashboard can load data from multiple sources:

1. **Built-in datasets**: Included sample data for demonstration
2. **API endpoints**: Fetch real-time data from backend services
3. **File upload**: Import custom CSV data files
4. **Random generation**: Generate synthetic data for testing

## Command Reference

| Command | Description |
| ------- | ----------- |
| `npm install` | Install or reinstall dependencies |
| `npm run dev` | Start local preview server |
| `npm run build` | Build static site, generating `./dist` |
| `npm run deploy` | Deploy app to Observable |
| `npm run clean` | Clear local data loader cache |
| `npm run observable` | Run commands like `observable help` |

## Using Observable for Visualization

This project leverages Observable Framework's powerful visualization capabilities, including:

- Reactive programming model for automatic updates
- Integration with D3.js for custom visualizations
- Plot library for simplified chart creation
- Interactive controls for data exploration

## License

[Include appropriate license information here]

## Documentation

The project documentation is organized as follows:

- **`doc/implementation-plan.md`** - Comprehensive implementation plan covering all phases, architecture, and future development items
- **`doc/phase-status.md`** - Current implementation status, progress tracking, and pending features

The previous documentation files (`api-integration-plan.md` and `phase-2-implementation-plan.md`) have been consolidated into these new documents for better maintainability.
