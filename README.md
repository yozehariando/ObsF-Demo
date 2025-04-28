# DNA Sequence Similarity Dashboard

This project implements a modular dashboard for visualizing user-uploaded DNA sequences and their similarity to sequences in a reference database. It is built using the Observable Framework.

## Project Focus

The primary application is **`src/index.md`**. This file integrates various modular components (UI, data fetching, visualizations) to provide a user-driven workflow: upload a FASTA sequence, see its UMAP projection, and explore the geographic distribution and details of the most similar sequences found in the database.

The files `src/phylogenetic.md` and `src/phylotree-visualization.md` are separate, standalone examples demonstrating phylogenetic tree rendering and related visualizations. They are **not** part of the main `src/index.md` application flow.

## Project Structure

The codebase has been organized into a modular structure:

```
src/
├── index.md                     # <<< MAIN APPLICATION DASHBOARD >>>
├── phylogenetic.md              # Standalone phylogenetic example
├── phylotree-visualization.md   # Standalone phylotree example
│
├── components/                  # Reusable components for index.md
│   ├── data/                    # Data fetching, processing, caching
│   │   ├── api-job-tracker.js
│   │   ├── api-service.js
│   │   └── api-similarity-service.js
│   ├── ui/                      # UI elements (modals, messages, etc.)
│   │   ├── api-upload-component.js
│   │   ├── dom-utils.js          # (Includes details panel update logic)
│   │   ├── loading-indicator.js
│   │   ├── message-handler.js
│   │   ├── status-manager.js
│   │   └── styles/
│   │       └── ui-components.css # Shared CSS styles
│   └── visualizations/          # Visualization modules
│       ├── api-map-component.js # Contextual reference map
│       ├── scatter-plot.js      # Contextual UMAP plot
│       └── user-geo-map.js      # Top 10 geographic map
│
└── utils/                         # General utility functions (if any separate ones exist)
    └── ...(placeholder)          # (Currently, most utils are within components)

doc/                               # Documentation
├── ... (other docs)

data/                              # Example/static data (e.g., for phylogenetic examples)
├── zika-authors.tsv
└── zika-tree.json
```

## Getting Started

### Prerequisites

-   Node.js and npm (or Yarn) installed.

### Running Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
2.  **Start the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the Observable Framework preview server, typically at `http://127.0.0.1:3000/`. The server provides live previews as you make changes.

3.  **Open the Dashboard:** Navigate to `http://127.0.0.1:3000/` (or the port shown in the terminal) in your web browser. This will load `src/index.md`.

4.  **Explore Other Examples:**
    -   Phylogenetic Map + Tree: `http://127.0.0.1:3000/phylogenetic`
    -   Phylotree Visualization: `http://127.0.0.1:3000/phylotree-visualization`

## Documentation

-   **Observable Framework Documentation:** [https://observablehq.com/framework/](https://observablehq.com/framework/)

## Core Components (Used in `src/index.md`)

### Data Layer (`src/components/data/`)

-   **api-service.js**: Handles API calls for sequence upload, job status, UMAP projection, and similarity search.
-   **api-similarity-service.js**: Manages fetching and caching the full reference dataset (`window.apiCache`). Includes logic (`findAllMatchesInCache`) to find reference sequences by accession number.
-   **api-job-tracker.js**: Provides UI feedback for background analysis jobs.

### UI Layer (`src/components/ui/`)

-   **api-upload-component.js**: Provides the FASTA file upload modal.
-   **dom-utils.js**: Contains helpers, including `updateDetailsPanel` for displaying sequence information.
-   **loading-indicator.js**: Shows/hides loading overlays.
-   **message-handler.js**: Displays success, error, and warning messages.
-   **status-manager.js**: Manages and displays status updates (potentially used by job tracker).
-   **styles/ui-components.css**: Shared CSS styles for UI elements and layout.

### Visualization Layer (`src/components/visualizations/`)

-   **scatter-plot.js (`createUmapScatterPlot`)**: Renders the main contextual UMAP, displaying the user sequence and similar sequences.
-   **api-map-component.js (`createApiMap`)**: Displays the geographic distribution of the Top 100 similar reference sequences, grouped by country.
-   **user-geo-map.js (`createUserGeoMap`)**: Displays the specific geographic locations (with jittering) of the Top 10 most similar sequences and the user sequence placeholder.

### Cross-Cutting Concerns (Mainly in `src/index.md`)

-   **State Management**: A simple `state` object in `src/index.md` holds application state (data, component references, etc.).
-   **Event Handling & Orchestration**: `src/index.md` handles button clicks, job polling (`setupJobPolling`), job completion (`handleJobCompletion`), and coordinates updates across components.
-   **Cross-Highlighting**: Logic within `src/index.md` (`setupCrossHighlighting`, `highlightSequence`, `setupPointHoverEffects`) manages interactions between the UMAP, maps, and details panel.

## Developer Notes

-   Focus development and review on **`src/index.md`** and the modules within `src/components/`.
-   Modules use ES6 import/export syntax.
-   Follow the modular pattern when adding new functionality related to the main dashboard.

## Recommended Development Workflow

1.  Make changes to individual modules within `src/components/` or the main orchestration logic in `src/index.md`.
2.  Test changes by running `npm run dev` (or `yarn dev`) and viewing the application in the browser.
3.  Refer to relevant documentation (Observable Framework docs and project-specific docs) for architectural guidance.
