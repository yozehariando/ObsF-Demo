/**
 * Custom visualizations for API data
 */

import * as d3 from 'd3'
import { calculateUmapBounds } from './api-utils.js'

/**
 * Configure map component to display UMAP coordinates
 * @param {Object} mapComponent - Existing map component
 * @param {Array} data - UMAP data
 */
function configureMapForUmap(mapComponent, data) {
  // We need to use the existing updateMap method but with our UMAP data
  // The existing component expects data in a specific format, which we've already
  // transformed in the api-service.js file

  console.log(
    'Configuring map for UMAP visualization with',
    data.length,
    'points'
  )

  // Create a custom color scale for UMAP data based on country
  const countries = [
    ...new Set(
      data
        .filter((d) => d.country && d.country !== 'Unknown')
        .map((d) => d.country)
    ),
  ]
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(countries)

  // Update the map with our data
  // We're using the existing updateMap method, but with a custom colorScale function
  mapComponent.updateMap(data, {
    colorScale: (d) =>
      d.isUmapData
        ? colorScale(d.country || 'Unknown')
        : d3.interpolateViridis(d.random_float),
    onPointClick: (point) => {
      console.log('Selected UMAP point:', point)
      // Dispatch a custom event that our dashboard can listen for
      const event = new CustomEvent('umap-point-selected', { detail: point })
      document.dispatchEvent(event)
    },
  })
}

/**
 * Add grid lines to the map to indicate UMAP coordinate space
 * @param {Object} mapComponent - Map component
 * @param {Object} bounds - UMAP bounds
 */
function addUmapGridToMap(mapComponent, bounds) {
  const gridLines = []
  const gridStep = Math.ceil((bounds.xMax - bounds.xMin) / 10)

  // Add vertical grid lines
  for (
    let x = Math.floor(bounds.xMin);
    x <= Math.ceil(bounds.xMax);
    x += gridStep
  ) {
    gridLines.push({
      type: 'line',
      coordinates: [
        [x, bounds.yMin],
        [x, bounds.yMax],
      ],
      style: {
        color: '#cccccc',
        opacity: 0.5,
        weight: 1,
      },
      label: `x=${x}`,
    })
  }

  // Add horizontal grid lines
  for (
    let y = Math.floor(bounds.yMin);
    y <= Math.ceil(bounds.yMax);
    y += gridStep
  ) {
    gridLines.push({
      type: 'line',
      coordinates: [
        [bounds.xMin, y],
        [bounds.xMax, y],
      ],
      style: {
        color: '#cccccc',
        opacity: 0.5,
        weight: 1,
      },
      label: `y=${y}`,
    })
  }

  mapComponent.addOverlays(gridLines)
}

/**
 * Update scatter plot with UMAP data
 * @param {Object} scatterComponent - Existing scatter plot component
 * @param {Array} data - UMAP data
 */
function updateScatterPlotWithUmap(scatterComponent, data) {
  console.log('Updating scatter plot with UMAP data:', data.length, 'points')

  // Create a custom color scale for UMAP data based on country
  const countries = [
    ...new Set(
      data
        .filter((d) => d.country && d.country !== 'Unknown')
        .map((d) => d.country)
    ),
  ]
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(countries)

  // Update the scatter plot with our data
  scatterComponent.updateScatterPlot(data, {
    xLabel: 'UMAP Dimension 1',
    yLabel: 'UMAP Dimension 2',
    colorScale: (d) =>
      d.isUmapData
        ? colorScale(d.country || 'Unknown')
        : d3.interpolateViridis(d.random_float),
    onPointClick: (point) => {
      console.log('Selected UMAP point:', point)
      // Dispatch a custom event that our dashboard can listen for
      const event = new CustomEvent('umap-point-selected', { detail: point })
      document.dispatchEvent(event)
    },
    tooltipContent: (d) => (d.isUmapData ? createUmapTooltip(d) : null),
  })

  // Remove any existing country legend
  const existingLegend = document.querySelector('.country-legend')
  if (existingLegend) {
    existingLegend.remove()
  }
}

/**
 * Create tooltip content for UMAP data point
 * @param {Object} point - UMAP data point
 * @returns {string} HTML content for tooltip
 */
function createUmapTooltip(point) {
  if (!point || !point.metadata) {
    return `
      <div class="umap-tooltip">
        <h4>Sequence Information</h4>
        <p>No data available</p>
      </div>
    `
  }

  const metadata = point.metadata || {}
  const date = metadata.first_year || point.year || 'Unknown'

  return `
    <div class="umap-tooltip">
      <h4>Sequence Information</h4>
      <p><strong>Accession:</strong> ${point.DNA_mutation_code || 'N/A'}</p>
      <p><strong>Country:</strong> ${metadata.first_country || 'Unknown'}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>UMAP Coordinates:</strong> (${point.X?.toFixed(2) || 'N/A'}, ${
    point.Y?.toFixed(2) || 'N/A'
  })</p>
    </div>
  `
}

export { configureMapForUmap, updateScatterPlotWithUmap, createUmapTooltip }
