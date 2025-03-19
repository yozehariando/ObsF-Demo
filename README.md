# DNA Mutation Analysis Dashboard (DEMO)

This is an [Observable Framework](https://observablehq.com/framework/) application for visualizing and analyzing DNA mutation data. The dashboard provides interactive visualizations including geographic distribution maps and mutation clustering scatter plots.

## Getting Started

To install the required dependencies, run:

```
npm install
```

Then, to start the local preview server, run:

```
npm run dev
```

Visit <http://localhost:3000> to preview the dashboard.

For more information about Observable Framework, see the [official documentation](https://observablehq.com/framework/getting-started).

## Project Structure

```
.
├─ src
│  ├─ components
│  │  ├─ data-service.js        # Data loading and processing
│  │  ├─ event-handlers.js      # Event handling for UI interactions
│  │  ├─ map-component.js       # Geographic visualization component
│  │  ├─ scatter-component.js   # Scatter plot visualization component
│  │  └─ ui-utils.js            # UI utility functions
│  ├─ data
│  │  ├─ fake_latlon.csv        # Geographic location data
│  │  ├─ makeblob.csv           # Scatter plot data
│  │  └─ mutations.json         # Mutation data
│  ├─ index.md                  # Main dashboard page
│  ├─ map.md                    # Detailed map visualization page
│  └─ scatter-plot.md           # Detailed scatter plot visualization page
├─ .gitignore
├─ observablehq.config.js       # App configuration
├─ package.json
└─ README.md
```

## Key Features

- **Interactive Map**: Geographic visualization of mutation data with zoom and pan capabilities
- **Scatter Plot**: Clustering visualization of mutations based on genetic properties
- **Data Integration**: Ability to fetch data from API endpoints or upload CSV files
- **Responsive Design**: Visualizations adapt to different screen sizes
- **Modular Architecture**: Components can be reused across different pages

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
