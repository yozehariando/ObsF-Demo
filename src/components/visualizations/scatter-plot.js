/**
 * API-specific scatter plot component
 * A standalone implementation for UMAP visualization, showing user sequence in context.
 */

import * as d3 from 'd3'
// No longer need topojson here if it was only for the old legend
// import * as topojson from 'topojson-client'; // REMOVED if unused

/**
 * Create a UMAP-specific scatter plot
 * @param {string} containerId - ID of the container element
 * @param {Array} data - Initial UMAP data points (can be empty)
 * @param {Object} options - Configuration options
 * @returns {Object} Scatter plot component API
 */
export function createUmapScatterPlot(containerId, data = [], options = {}) {
  // Default data to empty array
  console.log(`Creating UMAP scatter plot for ${containerId}`)

  // Default options
  const defaults = {
    width: null,
    height: null,
    // Adjusted margins for potential info panel below
    margin: { top: 20, right: 20, bottom: 60, left: 60 },
    xLabel: 'UMAP Dimension 1',
    yLabel: 'UMAP Dimension 2',
    pointRadius: 5,
    userPointRadius: 10, // Increased from 7 to 10 for better visibility
    colors: {
      // Define colors for different point types
      user: '#FF5722', // Orange
      top10: '#E91E63', // Pink/Red
      other: '#9E9E9E', // Grey
      highlight: '#2196F3', // Blue for hover/selection highlight
      stroke: '#FFFFFF', // White stroke for points
    },
    onPointClick: null,
    transitionDuration: 300,
    crossHighlight: null,
  }

  // Merge provided options with defaults
  const config = { ...defaults, ...options }
  // Deep merge colors if provided in options
  if (options.colors) {
    config.colors = { ...defaults.colors, ...options.colors }
  }

  // Get the container element
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }
  // Ensure container is ready for SVG
  container.style.position = container.style.position || 'relative' // Needed for tooltip positioning

  // --- SVG Setup ---
  let width = config.width || container.clientWidth
  let height = config.height || container.clientHeight

  // Calculate inner dimensions
  let innerWidth = width - config.margin.left - config.margin.right
  let innerHeight = height - config.margin.top - config.margin.bottom

  // Clear previous SVG if any
  d3.select(container).select('svg').remove()

  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create main group with margins
  const g = svg
    .append('g')
    .attr('class', 'umap-content')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // Create scales (initial, will be updated with data)
  const xScale = d3.scaleLinear().range([0, innerWidth])
  const yScale = d3.scaleLinear().range([innerHeight, 0])

  // Create axes generators
  const xAxis = d3.axisBottom(xScale)
  const yAxis = d3.axisLeft(yScale)

  // Add axis groups
  const xAxisGroup = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  const yAxisGroup = g.append('g').attr('class', 'y-axis')

  // Add axis labels
  const xLabel = g
    .append('text')
    .attr('class', 'x-label axis-label')
    .attr('text-anchor', 'middle')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + config.margin.bottom - 15) // Position below axis
    .text(config.xLabel)

  const yLabel = g
    .append('text')
    .attr('class', 'y-label axis-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -config.margin.left + 20) // Position left of axis
    .text(config.yLabel)

  // Add styling for axis labels
  svg.append('style').text(`
    .axis-label {
        font-size: 12px;
        fill: #555;
    }
    .tooltip-content {
        font-family: sans-serif;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        max-width: 300px;
        pointer-events: none; /* Ensure tooltip doesn't block mouse events */
    }
    .tooltip-content h4 { margin: 0 0 5px 0; font-size: 12px; }
    .tooltip-content p { margin: 2px 0; }
    `)

  // Create tooltip (using standard div)
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip-content') // Use a specific class
    .style('position', 'absolute')
    .style('visibility', 'hidden') // Start hidden
    .style('opacity', 0) // Start transparent
    .style('transition', 'opacity 0.2s ease-out')

  // --- ADD Connections Group ---
  const connectionsGroup = g.append('g').attr('class', 'connections-group')

  // --- ADD Points Group --- (Good practice to group points)
  const pointsGroup = g.append('g').attr('class', 'points-group')

  // --- Legend Group ---
  const legendGroup = g
    .append('g')
    .attr('class', 'umap-legend')
    .attr('transform', `translate(${innerWidth - 120}, 10)`) // Initial position (adjust as needed)

  // --- ADD Label Group ---
  const labelsGroup = g.append('g').attr('class', 'labels-group')

  /**
   * Update the scatter plot with new data and optionally a user sequence.
   * @param {Array} similarData - Array of similar sequence data points.
   * @param {Object|null} userSequence - The user's sequence data point (optional).
   * @param {Object} updateOptions - Options specific to this update.
   */
  function updateScatterPlot(
    similarData = [],
    userSequence = null,
    updateOptions = {}
  ) {
    // Merge update options with config if needed
    Object.assign(config, updateOptions)

    // Filter data first
    const validSimilarData = similarData.filter(
      (d) => d && d.x != null && d.y != null
    )
    const top10SimilarData = validSimilarData.filter((d) => d.isTop10)
    const otherSimilarData = validSimilarData.filter((d) => !d.isTop10)
    const userData =
      userSequence && userSequence.x != null && userSequence.y != null
        ? [userSequence]
        : []

    // Combine ALL valid points for scale domains
    const allValidPoints = [...userData, ...validSimilarData]

    console.log(
      `Updating scatter plot: User=${userData.length}, Top10=${top10SimilarData.length}, Other=${otherSimilarData.length}`
    )

    // Clear previous empty state message if it exists
    g.select('.empty-state-message').remove()

    if (allValidPoints.length === 0) {
      console.warn('No valid data points for scatter plot')
      // Optionally show an empty state message
      g.append('text')
        .attr('class', 'empty-state-message')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#aaa')
        .text('No data to display.')
      return // Exit if no data
    }

    // --- Update Scales ---
    const xExtent = d3.extent(allValidPoints, (d) => d.x)
    const yExtent = d3.extent(allValidPoints, (d) => d.y)

    // Add padding to extents
    const xRange = xExtent[1] - xExtent[0]
    const yRange = yExtent[1] - yExtent[0]
    const xPadding = xRange === 0 ? 1 : xRange * 0.1 // Avoid 0 range, add 10% padding
    const yPadding = yRange === 0 ? 1 : yRange * 0.1

    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding])

    // --- Update Axes ---
    xAxisGroup.transition().duration(config.transitionDuration).call(xAxis)
    yAxisGroup.transition().duration(config.transitionDuration).call(yAxis)

    // --- DRAWING ORDER ---

    // 1. Other Similar Points (Grey)
    const otherPoints = pointsGroup
      .selectAll('.other-similar-point')
      .data(otherSimilarData, (d) => d.id)

    otherPoints
      .exit()
      .transition('exit-other')
      .duration(config.transitionDuration / 2)
      .attr('r', 0)
      .remove()

    const enterOtherPoints = otherPoints
      .enter()
      .append('circle')
      .attr('class', 'scatter-point other-similar-point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0)
      .style('stroke', config.colors.stroke)
      .style('stroke-width', 0.5) // Thinner stroke for less emphasis
      .style('cursor', 'pointer')
      .attr('data-id', (d) => d.id)

    const mergedOtherPoints = enterOtherPoints.merge(otherPoints)

    mergedOtherPoints
      .style('fill', config.colors.other)
      .transition('update-other')
      .duration(config.transitionDuration)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', config.pointRadius)
      .style('fill-opacity', 0.5) // Apply transparency

    applyEventHandlers(mergedOtherPoints) // Apply handlers

    // 2. Top 10 Similar Points (Red)
    const top10Points = pointsGroup
      .selectAll('.top10-similar-point')
      .data(top10SimilarData, (d) => d.id)

    top10Points
      .exit()
      .transition('exit-top10')
      .duration(config.transitionDuration / 2)
      .attr('r', 0)
      .remove()

    const enterTop10Points = top10Points
      .enter()
      .append('circle')
      .attr('class', 'scatter-point top10-similar-point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0)
      .style('stroke', config.colors.stroke)
      .style('stroke-width', 1)
      .style('cursor', 'pointer')
      .attr('data-id', (d) => d.id)

    const mergedTop10Points = enterTop10Points.merge(top10Points)

    mergedTop10Points
      .style('fill', config.colors.top10)
      .transition('update-top10')
      .duration(config.transitionDuration)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', config.pointRadius)
      .style('fill-opacity', 0.8) // Less transparent

    applyEventHandlers(mergedTop10Points) // Apply handlers

    // 3. User Point (Orange)
    const userPoint = pointsGroup
      .selectAll('.user-point')
      .data(userData, (d) => d.id)

    userPoint
      .exit()
      .transition('exit-user')
      .duration(config.transitionDuration / 2)
      .attr('r', 0)
      .remove()

    const enterUserPoint = userPoint
      .enter()
      .append('circle')
      .attr('class', 'scatter-point user-point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0)
      .style('stroke', config.colors.stroke) // White stroke initially
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .attr('data-id', (d) => d.id)

    const mergedUserPoint = enterUserPoint.merge(userPoint)

    mergedUserPoint
      .style('fill', config.colors.user)
      .transition('update-user')
      .duration(config.transitionDuration)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', config.userPointRadius)
      .style('fill-opacity', 0.9)

    applyEventHandlers(mergedUserPoint) // Apply handlers

    // 4. Draw Connections (User -> Top 10)
    addSimilarityConnections(userSequence, top10SimilarData) // Connect only to top 10

    // 5. Add Labels for Top 10
    const labels = labelsGroup
      .selectAll('.point-label')
      .data(top10SimilarData, (d) => d.id) // Bind labels only to top 10

    labels
      .exit()
      .transition('exit-label')
      .duration(config.transitionDuration / 2)
      .style('opacity', 0)
      .remove()

    const enterLabels = labels
      .enter()
      .append('text')
      .attr('class', 'point-label')
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y) - config.pointRadius - 4) // Position above point
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-weight', 'bold')
      .style('fill', '#333') // Dark grey label text
      .style('stroke', 'white') // Add white outline for visibility
      .style('stroke-width', '0.5px')
      .style('paint-order', 'stroke')
      .style('pointer-events', 'none')
      .style('opacity', 0) // Start transparent

    const mergedLabels = enterLabels.merge(labels)

    mergedLabels
      .transition('update-label')
      .duration(config.transitionDuration)
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y) - config.pointRadius - 4) // Adjust position based on final point location
      .text((d) => `${(d.similarity * 100).toFixed(0)}%`) // Display percentage
      .style('opacity', 1) // Fade in

    // Update Legend
    addOrUpdateLegend()
  }

  /**
   * Applies common event handlers (mouseover, mousemove, mouseout, click) to a D3 selection of points.
   * @param {d3.Selection} selection - The D3 selection of circle elements.
   */
  function applyEventHandlers(selection) {
    selection
      .on('mouseover', function (event, d) {
        const pointElement = d3.select(this)
        const isUser = pointElement.classed('user-point')
        const isTop10 = pointElement.classed('top10-similar-point')
        const baseRadius = isUser ? config.userPointRadius : config.pointRadius

        pointElement.raise() // Bring to front immediately

        pointElement
          .transition('mouseover')
          .duration(100)
          .attr('r', baseRadius + 2) // Increase size on hover
          .style('stroke', config.colors.highlight)
          .style('stroke-width', 2)
          .style('fill-opacity', 1.0)

        tooltip
          .style('opacity', 1)
          .style('visibility', 'visible')
          .html(getTooltipContent(d))

        // Trigger cross-highlight
        if (config.crossHighlight) config.crossHighlight(d.id, true)

        // Highlight connections if it's the user point being hovered
        if (isUser) {
          connectionsGroup
            .selectAll('.similarity-connection')
            .transition('highlight-conn')
            .duration(100)
            .style('stroke', '#555') // Darken connections
            .style('stroke-width', 1.5)
            .style('opacity', 0.6)
        }
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', event.pageX + 15 + 'px')
          .style('top', event.pageY - 10 + 'px')
      })
      .on('mouseout', function (event, d) {
        const pointElement = d3.select(this)
        const isUser = pointElement.classed('user-point')
        const isTop10 = pointElement.classed('top10-similar-point')
        const baseRadius = isUser ? config.userPointRadius : config.pointRadius
        const baseOpacity = isUser ? 0.9 : isTop10 ? 0.8 : 0.5
        const baseStroke = config.colors.stroke
        const baseStrokeWidth = isUser ? 1.5 : isTop10 ? 1 : 0.5

        pointElement
          .transition('mouseout')
          .duration(100)
          .attr('r', baseRadius)
          .style('stroke', baseStroke)
          .style('stroke-width', baseStrokeWidth)
          .style('fill-opacity', baseOpacity)

        tooltip.style('opacity', 0).style('visibility', 'hidden')

        // Trigger cross-highlight
        if (config.crossHighlight) config.crossHighlight(d.id, false)

        // Reset connection style if user point was hovered
        if (isUser) {
          connectionsGroup
            .selectAll('.similarity-connection')
            .transition('unhighlight-conn')
            .duration(100)
            .style('stroke', '#999') // Reset color
            .style('stroke-width', 1) // Reset width
            .style('opacity', 0.4) // Reset opacity
        }
      })
      .on('click', function (event, d) {
        console.log('Clicked point:', d)
        if (typeof config.onPointClick === 'function') {
          config.onPointClick(d)
        }
        // Example persistent highlight on click (could add/remove a 'selected' class)
        highlightPoint(d.id, true, { strokeColor: '#000000', strokeWidth: 2.5 }) // Use black stroke for selection?
        // Ensure clicked point stays on top
        d3.select(this).raise()
      })
  }

  /**
   * Generates HTML content for the tooltip.
   * @param {Object} pointData - The data object for the hovered point.
   * @returns {string} HTML string for the tooltip.
   */
  function getTooltipContent(pointData) {
    const metadata = pointData.metadata || {}
    const label =
      pointData.label || pointData.accession || pointData.id || 'N/A'
    const country = metadata.country || metadata.first_country || 'N/A'
    const year =
      metadata.first_year || (metadata.years && metadata.years[0]) || 'N/A'
    const host = metadata.host || 'N/A'
    const isolationSource = metadata.isolation_source || 'N/A' // Get isolation source
    const similarity =
      pointData.similarity != null
        ? (pointData.similarity * 100).toFixed(1) + '%'
        : 'N/A'
    // const distance =
    //   pointData.distance != null ? pointData.distance.toFixed(3) : 'N/A'

    let title = 'Similar Sequence'
    if (pointData.isUserSequence) title = 'Your Sequence'
    else if (pointData.isTop10) title = 'Top 10 Similar'

    return `
      <h4>${title}</h4>
      <p><strong>Label:</strong> ${label}</p>
      <p><strong>Similarity:</strong> ${similarity}</p>
      <p><strong>Country:</strong> ${country}</p>
      <p><strong>Year:</strong> ${year}</p>
      <p><strong>Host:</strong> ${host}</p>
      <p><strong>Isolation Source:</strong> ${isolationSource}</p>
      <p><strong>Coords:</strong> (${pointData.x?.toFixed(
        2
      )}, ${pointData.y?.toFixed(2)})</p>
    `
  }

  /**
   * Draws lines connecting the user sequence to similar sequences.
   * @param {Object} userSequence - The user sequence data object.
   * @param {Array} sequencesToConnect - Array of similar sequence data objects (should be Top 10).
   * @param {Object} options - Styling options for lines.
   */
  function addSimilarityConnections(
    userSequence,
    sequencesToConnect, // This is the parameter we should use
    options = {}
  ) {
    console.log(
      `Adding similarity connections to ${
        sequencesToConnect?.length || 0
      } points...`
    )

    // Clear existing connections first
    connectionsGroup.selectAll('.similarity-connection').remove()

    if (
      !userSequence ||
      !sequencesToConnect || // Use the parameter directly
      sequencesToConnect.length === 0 ||
      userSequence.x == null ||
      userSequence.y == null
    ) {
      console.warn(
        'Cannot add connections: missing user sequence, similar sequences, or user coordinates.'
      )
      return
    }

    const connectionOptions = {
      lineColor: '#999', // Default grey
      lineWidth: 1,
      lineOpacity: 0.4,
      maxConnections: 10, // Limit lines to top N (e.g., top 10)
      ...options,
    }

    // Get user coordinates scaled
    const sourceX = xScale(userSequence.x)
    const sourceY = yScale(userSequence.y)

    if (isNaN(sourceX) || isNaN(sourceY)) {
      console.warn('Invalid scaled coordinates for user sequence.')
      return
    }

    // Take only the top N similar sequences (assuming they are already sliced)
    const sequencesToPlot = sequencesToConnect.slice(
      // Use the parameter
      0,
      connectionOptions.maxConnections
    )

    // --- Iterate over the sliced array ---
    sequencesToPlot.forEach((seq, i) => {
      if (seq.x == null || seq.y == null) {
        console.warn(
          `Skipping connection for sequence ${i} due to missing coordinates.`
        )
        return
      }
      const targetX = xScale(seq.x)
      const targetY = yScale(seq.y)

      if (isNaN(targetX) || isNaN(targetY)) {
        console.warn(`Invalid scaled coordinates for similar sequence ${i}.`)
        return
      }

      connectionsGroup
        .append('line')
        .attr('class', 'similarity-connection')
        .attr('data-source-id', userSequence.id)
        .attr('data-target-id', seq.id)
        .attr('x1', sourceX)
        .attr('y1', sourceY)
        .attr('x2', targetX)
        .attr('y2', targetY)
        .attr('stroke', connectionOptions.lineColor)
        .attr('stroke-width', connectionOptions.lineWidth)
        .attr('stroke-opacity', 0) // Start transparent
        .transition(`enter-conn-${i}`)
        .delay(i * 10) // Stagger entry
        .duration(200)
        .attr('stroke-opacity', connectionOptions.lineOpacity) // Fade in
    })
    // --- Use the correct count ---
    console.log(`Added ${sequencesToPlot.length} connection lines.`)
  }

  // --- ADD Legend Function ---
  /**
   * Creates or updates the legend within the SVG.
   */
  function addOrUpdateLegend() {
    legendGroup.selectAll('*').remove() // Clear previous legend items

    const legendItemsData = [
      {
        label: 'Your Sequence',
        color: config.colors.user,
        type: 'circle',
        radius: config.userPointRadius / 2,
      }, // Adjust radius for legend symbol
      {
        label: 'Top 10 Similar',
        color: config.colors.top10,
        type: 'circle',
        radius: config.pointRadius / 1.5,
      },
      {
        label: 'Similar (11-100)',
        color: config.colors.other,
        type: 'circle',
        radius: config.pointRadius / 1.5,
      },
      { label: 'Connection', color: '#999', type: 'line' }, // Match connection color
    ]

    const legendItem = legendGroup
      .selectAll('.legend-item')
      .data(legendItemsData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`) // Vertical spacing

    // Draw Symbols (Circles or Lines)
    legendItem.each(function (d) {
      const itemGroup = d3.select(this)
      if (d.type === 'circle') {
        itemGroup
          .append('circle')
          .attr('cx', 10) // Position symbol horizontally
          .attr('cy', 5) // Position symbol vertically
          .attr('r', d.radius || 5)
          .style('fill', d.color)
          .style('fill-opacity', d.label.includes('11-100') ? 0.5 : 0.9) // Match point opacity
      } else if (d.type === 'line') {
        itemGroup
          .append('line')
          .attr('x1', 0)
          .attr('y1', 5)
          .attr('x2', 20) // Line length
          .attr('y2', 5)
          .style('stroke', d.color)
          .style('stroke-width', 1.5)
          .style('stroke-opacity', 0.6)
      }
    })

    // Add Text Labels
    legendItem
      .append('text')
      .attr('x', 28) // Position text next to symbol
      .attr('y', 9) // Align text vertically
      .style('font-size', '10px')
      .style('fill', '#333')
      .text((d) => d.label)
  }

  /**
   * Handles window resize events.
   */
  function handleResize() {
    width = container.clientWidth
    height = container.clientHeight
    innerWidth = width - config.margin.left - config.margin.right
    innerHeight = height - config.margin.top - config.margin.bottom

    // Update SVG viewbox
    svg.attr('viewBox', [0, 0, width, height])

    // Update scales range
    xScale.range([0, innerWidth])
    yScale.range([innerHeight, 0])

    // Update axes
    xAxisGroup.attr('transform', `translate(0,${innerHeight})`).call(xAxis)
    yAxisGroup.call(yAxis)

    // Update axis labels position
    xLabel
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + config.margin.bottom - 15)
    yLabel.attr('x', -innerHeight / 2).attr('y', -config.margin.left + 20)

    // Update points position
    pointsGroup
      .selectAll('.scatter-point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))

    // --- Update Label Positions ---
    labelsGroup
      .selectAll('.point-label')
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y) - config.pointRadius - 4)

    // --- Update Connection Lines ---
    // Re-drawing might be simplest if coordinates change significantly
    // For now, let's assume addSimilarityConnections is called again on next updateScatterPlot
    // Or, store connection data and update lines here:
    connectionsGroup
      .selectAll('.similarity-connection')
      .attr('x1', xScale(userSequence?.x)) // Need access to userSequence or store coords
      .attr('y1', yScale(userSequence?.y))
      .attr('x2', (d) => xScale(d.x)) // Requires data bound to lines or re-lookup
      .attr('y2', (d) => yScale(d.y))
    // TODO: A more robust resize would require re-calling addSimilarityConnections
    // or storing the necessary data to recalculate line endpoints.

    // --- Update Legend Position ---
    legendGroup.attr('transform', `translate(${innerWidth - 120}, 10)`)
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Initialize with data if provided
  if (data && data.length > 0) {
    // Adapt initial call if needed - assuming data here is only similarData
    // User sequence is passed later via updateScatterPlot
    updateScatterPlot(data, options.initialUserSequence || null, options)
  }

  // --- Initialize Legend ---
  addOrUpdateLegend() // Create initial legend

  /**
   * Highlights or unhighlights a specific point by ID.
   * @param {string} pointId - The ID of the point to highlight.
   * @param {boolean} highlight - True to highlight, false to unhighlight.
   * @param {Object} highlightOptions - Optional styling for highlight (e.g., strokeColor, radius).
   */
  function highlightPoint(pointId, highlight = true, highlightOptions = {}) {
    console.log(`Scatter Highlight: ID=${pointId}, Highlight=${highlight}`)
    const pointElement = pointsGroup.select(
      `.scatter-point[data-id="${pointId}"]`
    )

    if (!pointElement.empty()) {
      const d = pointElement.datum()
      const isUser = d.isUserSequence
      const baseRadius = isUser ? config.userPointRadius : config.pointRadius
      const baseStroke = config.colors.stroke
      const baseStrokeWidth = 1
      const baseOpacity = 0.8

      const highlightRadius = highlightOptions.radius || baseRadius + 2
      const highlightStroke =
        highlightOptions.strokeColor || config.colors.highlight
      const highlightStrokeWidth = highlightOptions.strokeWidth || 2
      const highlightOpacity = 1.0

      pointElement
        .transition(`highlight-${highlight}`)
        .duration(150)
        .attr('r', highlight ? highlightRadius : baseRadius)
        .style('stroke', highlight ? highlightStroke : baseStroke)
        .style(
          'stroke-width',
          highlight ? highlightStrokeWidth : baseStrokeWidth
        )
        .style('fill-opacity', highlight ? highlightOpacity : baseOpacity)

      // If unhighlighting, restore original fill color
      if (!highlight) {
        pointElement.style('fill', (dd) => {
          if (dd.isUserSequence) return config.colors.user
          if (dd.isTop10) return config.colors.top10
          return config.colors.other
        })
      }

      // Bring highlighted point to front
      if (highlight) {
        pointElement.raise()
      }

      return true
    } else {
      console.log(`Point ${pointId} not found in this scatter plot.`)
      return false
    }
  }

  /**
   * Clears all visual highlights from points.
   */
  function clearHighlights() {
    g.selectAll('.scatter-point.highlighted') // Assuming a 'highlighted' class is added on click
      .dispatch('mouseout') // Trigger mouseout to revert temporary styles

    g.selectAll('.scatter-point')
      .classed('selected', false) // Remove selection class if used
      .transition('clear-highlight')
      .duration(200)
      .attr('r', (d) =>
        d.isUserSequence ? config.userPointRadius : config.pointRadius
      )
      .style('stroke', config.colors.stroke)
      .style('stroke-width', 1)
      .style('fill-opacity', 0.8)
      .style('fill', (d) => {
        // Restore original color
        if (d.isUserSequence) return config.colors.user
        if (d.isTop10) return config.colors.top10
        return config.colors.other
      })
    console.log('Cleared all highlights in scatter plot.')
  }

  /**
   * Sets the function to be called for cross-highlighting.
   * @param {Function} fn - The callback function (receives pointId, highlightState).
   */
  function setCrossHighlightFunction(fn) {
    config.crossHighlight = fn
  }

  // Return the public API
  return {
    updateScatterPlot,
    highlightPoint,
    clearHighlights,
    setCrossHighlightFunction,
    addSimilarityConnections, // Expose the connections function if needed externally
    container, // Expose container DOM element
    svg: svg.node(), // Expose SVG DOM element
    g: g.node(), // Expose main group DOM element
    xScale, // Expose scales if needed externally
    yScale,
    handleResize, // Allow external trigger if needed
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
      svg.remove() // Remove the SVG element itself
      console.log(`Scatter plot ${containerId} destroyed.`)
    },
  }
}
