# API Map Component Implementation Documentation

## Overview

The API Map component is a specialized visualization for displaying DNA sequence data in a geographic context. It plots data points on a world map, with each point representing a DNA sequence. The component is designed to work with the same UMAP data used by the scatter plot component.

## Implementation Details

### Core Component: `api-map-component.js`

The map is implemented in `api-map-component.js` as a standalone D3.js visualization. The main function `createApiMap()` creates and returns a map component with the following features:

- **World Map Visualization**: Displays a world map with country boundaries
- **Data Points**: Plots DNA sequences as points on the map
- **Country-based Positioning**: Places points based on country of origin
- **Interactive Elements**: Points can be clicked to select specific sequences
- **Tooltips**: Displays detailed information when hovering over points
- **Dynamic Legend**: Shows a scale of bubble sizes representing sequence counts

### Key Features

1. **Geographic Visualization**:
   - Displays a world map using D3's geoEquirectangular projection
   - Includes graticules (grid lines) for better geographic context
   - Places points based on country information when available

2. **Interactivity**:
   - Click events to select points
   - Hover effects with tooltips showing sequence details
   - Points enlarge on hover for better visibility

3. **Visual Elements**:
   - Country boundaries
   - Ocean background
   - Graticule lines
   - Color-coded points based on country of origin
   - Size-coded points based on sequence count per country

4. **Integration**:
   - Communicates with other dashboard components via event handlers
   - Updates when new data is loaded

5. **Legend**:
   - Dynamic bubble size legend showing the scale of sequence counts
   - Five reference points from minimum to maximum count
   - Automatically adjusts based on the data range

## Technical Implementation

The map component uses D3.js and D3-geo for geographic visualization:

- **Projection**: Uses the Equirectangular projection for a balanced world view
- **TopoJSON**: Loads world map data from a TopoJSON file
- **GeoPath**: Converts geographic coordinates to SVG paths
- **Point Placement**: 
  - Uses country information to place points
  - Uses a predefined coordinate list for common countries
  - Standardizes country names for better matching

## Data Handling

The component handles data in the following ways:

1. **Country-based Aggregation**:
   - Sequences are aggregated by country
   - Each country is represented by a single circle
   - Circle size indicates the number of sequences from that country

2. **Country Name Standardization**:
   - Implements a comprehensive mapping of country name variations
   - Handles common abbreviations (USA, UK) and alternative names
   - Ensures consistent placement regardless of input format

3. **Coordinate Mapping**:
   - Uses a predefined list of country coordinates for precise placement
   - Ensures consistent positioning even when map is resized

4. **Color Coding**:
   - Points are colored based on country of origin
   - Uses the same color scale as the scatter plot for consistency

5. **Size Scaling**:
   - Circle sizes are scaled using a square root scale
   - This ensures that area is proportional to sequence count
   - Makes visual comparison more intuitive

## Legend Implementation

The legend provides a visual reference for interpreting circle sizes:

1. **Dynamic Scaling**:
   - Automatically adjusts based on the minimum and maximum sequence counts
   - Shows five reference points distributed across the data range

2. **Reference Points**:
   - First bubble: Minimum count found in any country
   - Third bubble: Half of the maximum count
   - Fifth bubble: Maximum count
   - Second and fourth bubbles: Intermediate values for better distribution

3. **Visual Design**:
   - Compact layout with reduced bubble sizes for better aesthetics
   - Clear labels showing the exact count values
   - Positioned at the bottom of the map with a subtle background

## API

The map component exposes the following API:

```javascript
{
  updateMap,      // Function to update with new data
  svg,            // The SVG element
  g,              // The main graphics group
  projection,     // The map projection function
  handleResize,   // Function to handle window resize
  destroy         // Function to clean up resources
}
```

## Integration with Dashboard

The map is integrated into the dashboard in `dashboard.md`:

1. **Initialization**:
   ```javascript
   state.mapComponent = createApiMap("map-container", transformedData, {
     colorScale: d3.scaleOrdinal(d3.schemeCategory10),
     onPointClick: (point) => {
       selectPoint(point.index);
     }
   });
   ```

2. **Data Updates**:
   The map updates when:
   - New API data is fetched
   - Data is reset
   - A point is selected

3. **Event Handling**:
   - When a point is clicked, it triggers the `selectPoint()` function
   - This updates both the map and other visualizations

## Responsive Design

The component implements responsive behavior:

1. **Window Resizing**:
   - Automatically adjusts to container size changes
   - Maintains proper aspect ratio and positioning

2. **Viewbox Scaling**:
   - Uses SVG viewBox for resolution-independent scaling
   - Ensures the visualization looks good at any size

3. **Legend Repositioning**:
   - Legend position updates with map size changes
   - Maintains consistent spacing and proportions

## Future Improvements

Potential areas for enhancement:

1. **Improved Geographic Data**: Add more precise country coordinates
2. **Region Highlighting**: Highlight countries or regions with high sequence counts
3. **Clustering**: Add visual indicators for areas with many sequences
4. **Alternative Projections**: Allow switching between different map projections
5. **Zoom and Pan**: Add controls to focus on specific regions
6. **Time-based Visualization**: Show the spread of sequences over time
7. **Filtering**: Add controls to filter by country or region
8. **Enhanced Tooltips**: Show more detailed statistics when hovering over countries

## Dependencies

- D3.js v7 or higher
- D3-geo for geographic projections
- TopoJSON for world map data
- Modern browser with SVG support
