// Map visualization component for DNA mutation data
import * as d3 from 'd3'
import * as topojson from 'topojson-client'

// Function to create and initialize the map visualization
export async function createMap(containerId, options = {}) {
  // Default options
  const defaults = {
    width: null, // Will be determined from container
    height: null, // Will be determined from container
    center: [110, 5], // Southeast Asia
    scale: null, // Will be calculated based on width
    colorScale: d3
      .scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateViridis),
  }

  // Merge provided options with defaults
  const config = { ...defaults, ...options }

  // Get the container element
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }

  // Get actual dimensions from container
  const width = config.width || container.clientWidth
  const height = config.height || container.clientHeight

  // Calculate scale if not provided
  if (!config.scale) {
    config.scale = width / 1.5
  }

  // Load world map TopoJSON if not provided
  let worldMap = config.worldMap
  if (!worldMap) {
    worldMap = await d3.json(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    )
  }

  // Create SVG with proper dimensions
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create a group for the map elements
  const g = svg.append('g')

  // Create a projection for the map
  const projection = d3
    .geoMercator()
    .scale(config.scale)
    .center(config.center)
    .translate([width / 2, height / 2])

  // Create a path generator
  const path = d3.geoPath(projection)

  // Draw the world map
  g.append('path')
    .datum(topojson.feature(worldMap, worldMap.objects.countries))
    .attr('d', path)
    .attr('fill', '#f0f0f0')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5)

  // Add zoom behavior for dragging
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Create tooltip
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #ddd')
    .style('border-radius', '3px')
    .style('padding', '10px')
    .style('pointer-events', 'none')
    .style('opacity', 0)

  // Function to update the map with new data
  function updateMap(data, options = {}) {
    // Default update options
    const updateDefaults = {
      colorScale: config.colorScale,
      selectedIndex: null,
      onPointClick: null,
    }

    // Merge provided options with defaults
    const updateConfig = { ...updateDefaults, ...options }

    // Clear existing points
    g.selectAll('.map-point').remove()

    // Draw new points
    data.forEach((d) => {
      // Skip points without valid coordinates
      if (isNaN(d.latitude) || isNaN(d.longitude)) return

      // Convert lat/lon to x/y coordinates
      const [x, y] = projection([d.longitude, d.latitude])

      // Skip if projection returns null (point is outside the map)
      if (x === null || y === null || isNaN(x) || isNaN(y)) return

      // Determine if this point is selected
      const isSelected = d.index === updateConfig.selectedIndex

      // Create a group for the point
      const pointGroup = g
        .append('g')
        .attr('class', 'map-point')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer')

      // Add the circle
      pointGroup
        .append('circle')
        .attr('r', isSelected ? 8 : 5)
        .attr('fill', updateConfig.colorScale(d.random_float))
        .attr('stroke', isSelected ? '#ff0000' : '#333')
        .attr('stroke-width', isSelected ? 2 : 1)
        .attr('opacity', 0.7)
        .on('mouseover', function (event) {
          // Increase size on hover
          d3.select(this)
            .attr('r', isSelected ? 10 : 7)
            .attr('stroke-width', isSelected ? 3 : 2)

          // Show tooltip
          tooltip
            .style('opacity', 1)
            .html(
              `
              <strong>${d.DNA_mutation_code || 'Unknown'}</strong><br>
              Value: ${d.random_float.toFixed(3)}<br>
              Location: ${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}
            `
            )
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 28 + 'px')
        })
        .on('mouseout', function () {
          // Restore original size
          d3.select(this)
            .attr('r', isSelected ? 8 : 5)
            .attr('stroke-width', isSelected ? 2 : 1)

          // Hide tooltip
          tooltip.style('opacity', 0)
        })
        .on('click', function () {
          // Call click handler if provided
          if (typeof updateConfig.onPointClick === 'function') {
            updateConfig.onPointClick(d)
          }
        })
    })
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight])

    // Update projection
    projection.scale(newWidth / 1.5).translate([newWidth / 2, newHeight / 2])

    // Redraw paths
    g.selectAll('path').attr('d', d3.geoPath(projection))
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Return the public API
  return {
    updateMap,
    projection,
    svg,
    g,
    handleResize,
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
    },
  }
}
