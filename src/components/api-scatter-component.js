/**
 * API-specific scatter plot component
 * A standalone implementation for UMAP visualization
 */

import * as d3 from 'd3'

/**
 * Create a UMAP-specific scatter plot
 * @param {string} containerId - ID of the container element
 * @param {Array} data - UMAP data points
 * @param {Object} options - Configuration options
 * @returns {Object} Scatter plot component with update method
 */
function createUmapScatterPlot(containerId, data, options = {}) {
  console.log(`Creating UMAP scatter plot with ${data?.length || 0} points`)

  // Default options
  const defaults = {
    width: null, // Will be determined from container
    height: null, // Will be determined from container
    margin: { top: 40, right: 40, bottom: 120, left: 60 }, // Increased bottom margin for legend
    xLabel: 'X',
    yLabel: 'Y',
    colorScale: null, // Will be created based on countries
    onPointClick: null,
    transitionDuration: 500,
    crossHighlight: null, // Function to highlight points in other visualizations
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

  // Calculate inner dimensions (accounting for margins)
  const innerWidth = width - config.margin.left - config.margin.right
  const innerHeight = height - config.margin.top - config.margin.bottom

  // Create SVG with proper dimensions
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create a group for the scatter plot with margins
  const g = svg
    .append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // Create scales (initial, will be updated with data)
  const xScale = d3.scaleLinear().range([0, innerWidth])
  const yScale = d3.scaleLinear().range([innerHeight, 0])

  // Create axes
  const xAxis = d3.axisBottom(xScale)
  const yAxis = d3.axisLeft(yScale)

  // Add x-axis
  const xAxisGroup = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  // Add y-axis
  const yAxisGroup = g.append('g').attr('class', 'y-axis')

  // Add axis labels
  g.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 30)
    .text(config.xLabel)

  g.append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -40)
    .text(config.yLabel)

  // Create a group for the legend - positioned just below the X-axis label with 10px space
  const legendGroup = svg
    .append('g')
    .attr('class', 'legend-group')
    .attr(
      'transform',
      `translate(${config.margin.left},${config.margin.top + innerHeight + 40})`
    )

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
    .style('z-index', '10')

  // Function to update the scatter plot with new data
  function updateScatterPlot(newData, updateOptions = {}) {
    // Merge update options with config
    Object.assign(config, updateOptions)

    // Filter out data points without valid coordinates
    const validData = newData.filter((d) => d.X != null && d.Y != null)
    console.log(`Updating scatter plot with ${validData.length} valid points`)

    if (validData.length === 0) {
      console.warn('No valid data points for scatter plot')
      return
    }

    // Update scales based on data
    const xExtent = d3.extent(validData, (d) => d.X)
    const yExtent = d3.extent(validData, (d) => d.Y)

    // Add some padding to the extents
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05

    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding])

    // Update axes
    xAxisGroup.transition().duration(config.transitionDuration).call(xAxis)
    yAxisGroup.transition().duration(config.transitionDuration).call(yAxis)

    // Create color scale based on countries if not provided
    if (!config.colorScale) {
      const countries = Array.from(
        new Set(validData.map((d) => d.country || d.first_country || 'Unknown'))
      )
        .filter((country) => country !== 'Unknown')
        .sort()

      config.colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(countries)
    }

    // Create country legend
    const countries = Array.from(
      new Set(validData.map((d) => d.country || d.first_country || 'Unknown'))
    )
      .filter((country) => country !== 'Unknown')
      .sort()

    createCountryLegend(countries, config.colorScale)

    // DATA JOIN - Select all points and bind data
    const points = g
      .selectAll('.scatter-point')
      .data(validData, (d) => d.index || d.accession)

    // EXIT - Remove points that no longer have data
    points
      .exit()
      .transition()
      .duration(config.transitionDuration)
      .attr('r', 0)
      .remove()

    // ENTER - Create new points
    const newPoints = points
      .enter()
      .append('circle')
      .attr('class', 'scatter-point')
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))
      .attr('r', 0)
      .style('fill', (d) => {
        const country = d.country || d.first_country || 'Unknown'
        return country !== 'Unknown' ? config.colorScale(country) : '#999'
      })
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')

    // UPDATE - Update existing points
    newPoints
      .merge(points)
      .transition()
      .duration(config.transitionDuration)
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))
      .attr('r', (d) => (d.index === config.selectedIndex ? 8 : 5))
      .style('fill', (d) => {
        const country = d.country || d.first_country || 'Unknown'
        return country !== 'Unknown' ? config.colorScale(country) : '#999'
      })
      .style('stroke', (d) =>
        d.index === config.selectedIndex ? '#000' : '#fff'
      )
      .style('stroke-width', (d) => (d.index === config.selectedIndex ? 2 : 1))

    // Add event handlers to all points
    g.selectAll('.scatter-point')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.index === config.selectedIndex ? 10 : 7)

        tooltip.style('opacity', 1).html(getTooltipContent(d))
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', event.pageX + 15 + 'px')
          .style('top', event.pageY - 28 + 'px')
      })
      .on('mouseout', function () {
        const d = d3.select(this).datum()
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.index === config.selectedIndex ? 8 : 5)

        tooltip.style('opacity', 0)
      })
      .on('click', function (event, d) {
        if (typeof config.onPointClick === 'function') {
          config.onPointClick(d)
        }
      })
  }

  // Function to get tooltip content
  function getTooltipContent(point) {
    const metadata = point.metadata || {}
    const date =
      metadata.first_year || point.year || point.first_date || 'Unknown'
    const country =
      metadata.first_country ||
      point.country ||
      point.first_country ||
      'Unknown'

    return `
      <div style="min-width: 200px;">
        <h4 style="margin-top: 0; margin-bottom: 8px; color: #333;">Sequence Information</h4>
        <p style="margin: 4px 0;"><strong>Accession:</strong> ${
          point.DNA_mutation_code || point.accession || 'N/A'
        }</p>
        <p style="margin: 4px 0;"><strong>Country:</strong> ${country}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Coordinates:</strong> (${
          point.X?.toFixed(2) || 'N/A'
        }, ${point.Y?.toFixed(2) || 'N/A'})</p>
      </div>
    `
  }

  // Function to create country legend
  function createCountryLegend(countries, colorScale) {
    // Clear existing legend
    legendGroup.selectAll('*').remove()

    // Add legend title
    legendGroup
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .text('Countries')

    // Create legend items
    const legendItems = legendGroup
      .selectAll('.legend-item')
      .data(['Unknown', ...countries])
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => {
        // Calculate position for legend items (in rows if needed)
        const itemsPerRow = Math.min(5, countries.length + 1)
        const itemWidth = innerWidth / itemsPerRow
        const row = Math.floor(i / itemsPerRow)
        const col = i % itemsPerRow
        return `translate(${col * itemWidth}, ${row * 20 + 20})`
      })

    // Add color squares
    legendItems
      .append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('fill', (d) => (d === 'Unknown' ? '#999' : colorScale(d)))

    // Add text labels
    legendItems
      .append('text')
      .attr('x', 15)
      .attr('y', 9)
      .attr('font-size', '10px')
      .text((d) => d)
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight])

    // Calculate new inner dimensions
    const newInnerWidth = newWidth - config.margin.left - config.margin.right
    const newInnerHeight = newHeight - config.margin.top - config.margin.bottom

    // Update scales
    xScale.range([0, newInnerWidth])
    yScale.range([newInnerHeight, 0])

    // Update axes
    xAxisGroup.attr('transform', `translate(0,${newInnerHeight})`).call(xAxis)
    yAxisGroup.call(yAxis)

    // Update axis labels
    g.select('.x-label')
      .attr('x', newInnerWidth / 2)
      .attr('y', newInnerHeight + 30)

    g.select('.y-label').attr('x', -newInnerHeight / 2)

    // Update points
    g.selectAll('.scatter-point')
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))

    // Update legend position
    legendGroup.attr(
      'transform',
      `translate(${config.margin.left},${
        config.margin.top + newInnerHeight + 40
      })`
    )
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Initialize with data if provided
  if (data && data.length > 0) {
    updateScatterPlot(data, options)
  }

  // Add a function to highlight a point
  function highlightPoint(pointId, highlight = true, highlightOptions = {}) {
    console.log(`Attempting to highlight point in reference UMAP with ID: ${pointId}`);
    
    const points = g.selectAll('.scatter-point');
    
    // Find the point with the matching ID - try different ID formats
    const matchingPoint = points.filter(d => {
      // Check all possible ID fields
      return (
        d.id === pointId || 
        d.accession === pointId || 
        d.index === pointId ||
        d.DNA_mutation_code === pointId
      );
    });
    
    if (!matchingPoint.empty()) {
      console.log(`Found matching point with ID ${pointId} in reference UMAP:`, matchingPoint.datum());
      
      // Highlight the point
      matchingPoint
        .transition()
        .duration(200)
        .attr('r', highlight ? (highlightOptions.radius || 8) : 5)
        .style('stroke', highlight ? (highlightOptions.strokeColor || '#000') : '#fff')
        .style('stroke-width', highlight ? (highlightOptions.strokeWidth || 2) : 1)
        .style('fill', highlight && highlightOptions.color ? highlightOptions.color : null);
      
      // If we have a cross-highlight function, call it
      if (config.crossHighlight && typeof config.crossHighlight === 'function') {
        config.crossHighlight(pointId, highlight);
      }
      
      return true;
    } else {
      console.log(`No point found with ID ${pointId} in reference UMAP`);
    }
    
    return false;
  }
  
  // Function to clear all highlights
  function clearHighlights() {
    g.selectAll('.scatter-point')
      .transition()
      .duration(200)
      .attr('r', 5)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('fill', d => {
        const country = d.country || d.first_country || 'Unknown';
        return country !== 'Unknown' ? config.colorScale(country) : '#999';
      });
  }
  
  // Set cross-highlight function
  function setCrossHighlightFunction(fn) {
    config.crossHighlight = fn;
  }

  // Return the public API
  return {
    updateScatterPlot,
    highlightPoint,
    clearHighlights,
    setCrossHighlightFunction,
    svg,
    g,
    xScale,
    yScale,
    handleResize,
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
    },
  }
}

export { createUmapScatterPlot }
