# Scatter Plot Implementation Documentation

## Overview

The scatter plot component is a key visualization in our DNA mutation dashboard. It displays DNA sequences in a 2D UMAP coordinate space, where similar sequences appear closer together. This document outlines the current implementation, features, and integration with the dashboard.

## Implementation Details

### Core Component: `api-scatter-component.js`

The scatter plot is implemented in `api-scatter-component.js` as a standalone D3.js visualization. The main function `createUmapScatterPlot()` creates and returns a scatter plot component with the following features:

- **Responsive Design**: Automatically adjusts to container size and handles window resizing
- **Interactive Elements**: Points can be clicked to select and highlight specific DNA sequences
- **Tooltips**: Displays detailed information when hovering over points
- **Country-based Coloring**: Points are colored based on country of origin
- **Legend**: Shows a color-coded legend of countries below the plot

### Key Features

1. **Data Visualization**:
   - Plots DNA sequences in 2D space using UMAP coordinates (X and Y)
   - Scales automatically to fit the data range with padding
   - Transitions smoothly when data changes

2. **Interactivity**:
   - Click events to select points
   - Hover effects with tooltips showing sequence details
   - Points enlarge on hover for better visibility

3. **Visual Elements**:
   - Axis labels ("X Dimension" and "Y Dimension")
   - Country legend with color coding
   - Selected point highlighting

4. **Integration**:
   - Communicates with other dashboard components via event handlers
   - Updates when new data is loaded

## Integration with Dashboard

The scatter plot is integrated into the dashboard in `dashboard.md`:

1. **Initialization**:
   ```javascript
   state.scatterComponent = createUmapScatterPlot("scatter-container", transformedData, {
     xLabel: "X Dimension",
     yLabel: "Y Dimension",
     onPointClick: (point) => {
       selectPoint(point.index);
     }
   });
   ```

2. **Data Updates**:
   The scatter plot updates when:
   - New API data is fetched
   - Data is reset
   - A point is selected

3. **Event Handling**:
   - When a point is clicked, it triggers the `selectPoint()` function
   - This updates both the scatter plot and other visualizations

## Recent Improvements

Recent work has focused on:

1. **Legend Positioning**: Carefully positioned the "Countries" legend 10px below the X-axis label
2. **Visual Clarity**: Improved the layout to ensure all countries are visible in the legend
3. **Responsive Design**: Enhanced resize handling to maintain proper spacing and layout

## Technical Implementation

The scatter plot uses D3.js for data binding and visualization:

- SVG-based rendering for crisp graphics at any resolution
- D3 scales for mapping data values to visual coordinates
- D3 transitions for smooth animations
- D3 event handling for interactivity

## API

The scatter plot component exposes the following API:

```javascript
{
  updateScatterPlot, // Function to update with new data
  svg,               // The SVG element
  g,                 // The main graphics group
  xScale,            // The X scale function
  yScale,            // The Y scale function
  handleResize,      // Function to handle window resize
  destroy            // Function to clean up resources
}
```

## Data Structure

The scatter plot expects data points with the following structure:

```javascript
{
  X: Number,           // X coordinate (UMAP dimension 1)
  Y: Number,           // Y coordinate (UMAP dimension 2)
  index: Number,       // Unique identifier
  country: String,     // Country of origin
  first_country: String, // Alternative country field
  accession: String,   // Sequence accession number
  year: String,        // Year
  first_date: String,  // Alternative date field
  metadata: Object     // Additional metadata
}
```

## Future Improvements

Potential areas for enhancement:

1. **Performance optimization**: Implement data sampling or WebGL rendering for larger datasets
2. **Filtering capabilities**: Add UI controls to filter points by country, date, or other attributes
3. **Zoom and pan**: Implement zoom and pan functionality for exploring dense regions
4. **Enhanced tooltips**: Add more detailed information and possibly small charts in tooltips
5. **Animation**: Add transitions between different data views
6. **Clustering visualization**: Add visual indicators of cluster boundaries
7. **Search functionality**: Allow searching for specific sequences
8. **Export options**: Add ability to export the visualization as SVG or PNG

## Known Issues

1. Legend positioning may need adjustment on different screen sizes
2. Some countries might not appear in the legend if there are too many
3. Performance may degrade with very large datasets (>10,000 points)

## Dependencies

- D3.js v7 or higher
- Modern browser with SVG support
