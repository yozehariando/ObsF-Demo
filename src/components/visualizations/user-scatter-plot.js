/**
 * API User Scatter Component
 *
 * A specialized scatter plot component for visualizing user sequences
 * and their similarities to reference sequences.
 */

import * as d3 from 'd3'

/**
 * Create a scatter plot for user sequence visualization
 * @param {string} containerId - ID of the container element
 * @param {Array} data - Data points including user sequence and similar sequences
 * @param {Object} options - Configuration options
 * @returns {Object} Scatter plot component with methods for interaction
 */
export function createUserScatterPlot(containerId, data, options = {}) {
  // Default configuration
  const config = {
    width: 600,
    height: 400,
    margin: { top: 20, right: 1, bottom: 50, left: 5 },
    transitionDuration: 500,
    pointRadius: 5,
    userPointRadius: 8,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    selectedIndex: -1,
    onPointClick: null,
    showLabels: false,
    crossHighlight: null, // Function to highlight points in other components
    ...options,
  }

  // Validate inputs
  if (!containerId) {
    console.error('No container ID provided to createUserScatterPlot')
    return null
  }

  // Get container and set dimensions
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }

  // Log container properties
  console.log(
    `Container found: #${containerId}, dimensions: ${container.clientWidth}x${container.clientHeight}`
  )

  // Set dimensions based on container
  config.width = container.clientWidth || config.width
  config.height = container.clientHeight || config.height

  console.log(`Using dimensions: ${config.width}x${config.height}`)

  // Validate data
  if (!data) {
    console.warn('No data provided to createUserScatterPlot')
    data = []
  }

  // Calculate inner dimensions
  const innerWidth = config.width - config.margin.left - config.margin.right
  const innerHeight = config.height - config.margin.top - config.margin.bottom

  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height)
    .attr('viewBox', [0, 0, config.width, config.height])
    .attr(
      'style',
      'max-width: 100%; height: auto; display: block; border: 1px solid #eee;'
    )

  // Add debug rectangle to visualize the SVG area
  // svg
  //   .append('rect')
  //   .attr('width', config.width)
  //   .attr('height', config.height)
  //   .attr('fill', '#f9f9f9')
  //   .attr('stroke', '#ddd')

  console.log(`Created SVG with dimensions ${config.width}x${config.height}`)

  // Create main group element
  const g = svg
    .append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // Add groups for grid lines
  const xGridGroup = g.append('g').attr('class', 'grid-lines x-grid')
  const yGridGroup = g.append('g').attr('class', 'grid-lines y-grid')

  // Add x-axis
  const xAxisGroup = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  // Add y-axis
  const yAxisGroup = g.append('g').attr('class', 'y-axis')

  // Add axis labels
  g.append('text')
    .attr('class', 'x-axis-label')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 35)
    .attr('text-anchor', 'middle')
    .text('UMAP Dimension 1')

  g.append('text')
    .attr('class', 'y-axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -config.margin.left - 40)
    .attr('text-anchor', 'middle')
    .text('UMAP Dimension 2')

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

  // Create a group for similarity connections
  const connectionsGroup = g.append('g').attr('class', 'connections-group')

  // Create a group for data points
  const pointsGroup = g.append('g').attr('class', 'points-group')

  // Create a group for the legend
  const legendGroup = svg
    .append('g')
    .attr('class', 'legend-group')
    .attr('transform', `translate(${config.width - 120}, 20)`)

  // Initialize scales with placeholder domains
  const xScale = d3.scaleLinear().range([0, innerWidth])
  const yScale = d3.scaleLinear().range([innerHeight, 0])

  // Helper function to draw grid lines
  function drawGridlines() {
    // X grid lines
    xGridGroup
      .selectAll('line')
      .data(xScale.ticks(10))
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', (d) => xScale(d))
      .attr('x2', (d) => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('stroke', '#e0e0e0')
      .style('stroke-width', 0.5)

    // Y grid lines
    yGridGroup
      .selectAll('line')
      .data(yScale.ticks(10))
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .style('stroke', '#e0e0e0')
      .style('stroke-width', 0.5)
  }

  // Helper function for point radius (based on getStandardPointRadius)
  function getPointRadius(d) {
    if (!d) return 4 // Default size
    if (d.isUserSequence) {
      return 7 // User sequence - larger
    } else if (d.matchesUserSequence || d.similarity !== undefined) {
      // Size based on similarity if available
      if (d.similarity !== undefined) {
        // Scale from 4 to 6 based on similarity (0.0 to 1.0) - Adjust multiplier as needed
        return 4 + d.similarity * 2
      }
      return 5 // Default for similar sequences
    }
    // Removed highlighted state logic here, hover/click will handle radius changes
    return 4 // Default size for other points (if any)
  }

  // Function to get point color (based on getStandardPointColor)
  function getPointColor(d) {
    if (!d) return '#999' // Default gray

    if (d.isUserSequence) {
      return '#FF5722' // User Sequence - orange (match emergency vis)
    } else if (d.matchesUserSequence || d.similarity !== undefined) {
      // Use blue for similar sequences (match emergency vis)
      // Can add similarity-based scale later if needed
      return '#3F51B5'
      // Example: Optional similarity-based color scale
      // const similarityScale = d3.scaleLinear()
      //   .domain([0.7, 1.0]) // Adjust domain as needed
      //   .range(['#fee08b', '#1a9641']); // Example yellow to green
      // return similarityScale(d.similarity);
    }
    // Default color based on country if available (optional, can add if needed)
    // if (d.metadata?.country) { ... }

    return '#999' // Default gray for any other case
  }

  // Function to update the scatter plot with new data
  function updateScatterPlot(newData, updateOptions = {}) {
    // Merge update options with config
    Object.assign(config, updateOptions)

    console.log(
      `Updating user scatter plot with ${newData?.length || 0} data points:`,
      newData
    )
    console.log('Raw points data sample:', newData?.slice(0, 3))

    if (!newData || newData.length === 0) {
      console.warn('No data provided for user scatter plot update')
      return
    }

    // Filter out data points without valid coordinates
    const validData = newData.filter((d) => {
      const hasX = d.x != null || d.X != null
      const hasY = d.y != null || d.Y != null
      const result = hasX && hasY
      if (!result) {
        console.warn('Point missing coordinates:', d)
      }
      return result
    })

    console.log(
      `Found ${validData.length} valid points with coordinates out of ${newData.length} total`
    )
    console.log('Valid data sample:', validData.slice(0, 3))

    // Normalize coordinate names (some use x,y others use X,Y)
    const normalizedData = validData.map((d) => {
      // Make a copy of the data point
      const point = { ...d }

      // Normalize coordinate names
      point.x = d.x !== undefined ? d.x : d.X
      point.y = d.y !== undefined ? d.y : d.Y

      return point
    })

    console.log('Normalized data sample:', normalizedData.slice(0, 3))
    console.log(
      'Normalized coordinates check:',
      normalizedData.slice(0, 3).map((d) => ({ id: d.id, x: d.x, y: d.y }))
    )

    if (normalizedData.length === 0) {
      console.warn('No valid points with coordinates found after filtering')
      return
    }

    // Update scales
    const xExtent = d3.extent(normalizedData, (d) => d.x)
    const yExtent = d3.extent(normalizedData, (d) => d.y)

    console.log(
      `Coordinate ranges: X [${xExtent[0]}, ${xExtent[1]}], Y [${yExtent[0]}, ${yExtent[1]}]`
    )

    // Add padding to the domains
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1

    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding])

    console.log(
      `Scale domains set to: X [${xScale.domain()[0]}, ${
        xScale.domain()[1]
      }], Y [${yScale.domain()[0]}, ${yScale.domain()[1]}]`
    )

    // Update axes
    xAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisBottom(xScale))

    yAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisLeft(yScale))

    // Update gridlines after scales are updated
    drawGridlines()

    // DATA JOIN - Select all points
    const points = pointsGroup
      .selectAll('.scatter-point')
      .data(normalizedData, (d) => d.id)

    console.log(
      `DATA JOIN: ${points.size()} existing points, ${points
        .enter()
        .size()} entering, ${points.exit().size()} exiting`
    )

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
      .attr('data-id', (d) => d.id)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0) // Start from 0 radius
      .style('fill', (d) => getPointColor(d))
      .style('fill-opacity', 0.7) // Match emergency vis
      .style('stroke', 'none') // Match emergency vis
      .style('cursor', 'pointer')

    // Add labels if enabled (or always show them like emergency vis?)
    // Let's assume we always show them for now, like emergency vis
    // if (config.showLabels) { // Remove or comment out this condition if labels should always show

    pointsGroup.selectAll('.point-label').remove() // Clear existing first

    pointsGroup
      .selectAll('.point-label')
      // Data: Bind labels to all normalized data points
      .data(normalizedData)
      .enter()
      .append('text')
      .attr('class', 'point-label')
      // Position centered horizontally above the point
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y) - (getPointRadius(d) + 3)) // Position above point based on its radius
      .attr('text-anchor', 'middle') // Center text horizontally
      // Text Content: Show "User Seq" or similarity percentage
      .text((d) => {
        if (d.isUserSequence) return 'User Seq'
        // Show similarity percentage if available
        return d.similarity !== undefined
          ? `${(d.similarity * 100).toFixed(0)}%`
          : ''
      })
      // Styling to match emergency vis
      .style('font-size', '9px') // Match emergency vis style
      .style('fill', (d) => (d.isUserSequence ? '#FF5722' : '#3F51B5')) // Match colors
      .style('font-weight', 'bold')
      .style('stroke', 'white') // Add white outline for better visibility
      .style('stroke-width', '0.5px')
      .style('paint-order', 'stroke') // Ensure stroke is behind fill
      .style('pointer-events', 'none') // Don't interfere with mouse events
    // } // End of conditional config.showLabels block (if you keep it)

    // UPDATE + ENTER - Update existing and new points
    points
      .merge(newPoints)
      .transition()
      .duration(config.transitionDuration)
      .attr('cx', (d) => {
        const x = xScale(d.x)
        if (isNaN(x)) console.warn('Invalid x coordinate for point:', d)
        return isNaN(x) ? 0 : x
      })
      .attr('cy', (d) => {
        const y = yScale(d.y)
        if (isNaN(y)) console.warn('Invalid y coordinate for point:', d)
        return isNaN(y) ? 0 : y
      })
      .attr('r', (d) => getPointRadius(d)) // Use new radius function
      .style('fill', (d) => getPointColor(d)) // Use revised color function
      .style('fill-opacity', 0.7)
      .style('stroke', 'none') // Ensure no stroke by default

    // Make sure points are visible immediately after enter/update transition finishes
    points
      .merge(newPoints)
      .transition()
      .duration(config.transitionDuration)
      .attr('r', (d) => getPointRadius(d)) // Set final radius
      .style('fill', (d) => getPointColor(d)) // Use revised color function
      .style('fill-opacity', 0.7)
      .style('stroke', 'none') // Ensure no stroke by default

    // Force immediate rendering of points for debugging
    pointsGroup.selectAll('.scatter-point').each(function (d) {
      const point = d3.select(this)
      console.log(
        `Rendering point at (${point.attr('cx')}, ${point.attr(
          'cy'
        )}) with r=${point.attr('r')}`,
        d
      )
    })

    // Add event listeners to all points (both new and existing)
    pointsGroup
      .selectAll('.scatter-point')
      .on('mouseover', function (event, d) {
        const point = d3.select(this)
        const currentRadius = getPointRadius(d) // Get base radius

        point
          .transition()
          .duration(100)
          .attr('r', currentRadius + 2) // Increase radius
          .style('stroke', '#2196F3') // Hover color from emergency vis
          .style('stroke-width', '2px')
          .style('fill-opacity', 1) // Make fully opaque

        tooltip
          .style('opacity', 0.9)
          .html(getTooltipContent(d)) // Use updated tooltip content
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px')

        // Highlight connections on hover
        const id = point.attr('data-id')
        if (id) {
          connectionsGroup
            .selectAll(
              `line[data-source-id="${id}"], line[data-target-id="${id}"]`
            )
            .transition()
            .duration(100)
            .style('stroke', '#999') // Match emergency vis connection hover
            .style('stroke-width', '1.5px')
            .style('opacity', '0.8')
        }
      })
      .on('mouseout', function (event, d) {
        const point = d3.select(this)
        const currentRadius = getPointRadius(d) // Get base radius

        // Only revert if not currently highlighted by a click (check stroke)
        if (point.style('stroke') !== 'rgb(255, 87, 34)') {
          // #FF5722
          point
            .transition()
            .duration(100)
            .attr('r', currentRadius) // Revert to original radius
            .style('stroke', 'none')
            .style('fill-opacity', 0.7)

          // Reset connections
          const id = point.attr('data-id')
          if (id) {
            connectionsGroup
              .selectAll(
                `line[data-source-id="${id}"], line[data-target-id="${id}"]`
              )
              .transition()
              .duration(100)
              .style('stroke', '#999') // Original connection color
              .style('stroke-width', 1)
              .style('opacity', 0.4) // Original connection opacity
          }
        }
        tooltip.style('opacity', 0)
      })
      .on('click', function (event, d) {
        if (typeof config.onPointClick === 'function') {
          config.onPointClick(d)
        }
      })
  }

  // Function to get tooltip content (match formatTooltip)
  function getTooltipContent(data) {
    if (!data || !data.id) {
      console.warn('Invalid data for tooltip', data)
      return '<div class="tooltip-content">No data available</div>'
    }

    let tooltipContent = `
      <div class="tooltip-content">
        <div class="tooltip-header" style="margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #eee;">`

    // Customize header based on type
    if (data.isUserSequence) {
      tooltipContent += `
        <div style="color: #FF5722; font-weight: bold; margin-bottom: 3px;">User Sequence</div>
        <strong>${data.label || data.id}</strong>`
    } else {
      // Use Accession or ID for similar sequence title
      tooltipContent += `<strong>${data.accession || data.id}</strong>`
    }

    tooltipContent += `
        </div>
        <div class="tooltip-body" style="font-size: 11px; line-height: 1.4;">`

    // Add sequence type information if it's a similar sequence
    if (data.matchesUserSequence && !data.isUserSequence) {
      tooltipContent += `<div class="tooltip-item" style="color: #3F51B5; font-weight: bold;">Similar Sequence</div>`
    }

    // Coordinates
    const x = data.x !== undefined ? data.x : null
    const y = data.y !== undefined ? data.y : null
    if (x !== null && y !== null) {
      tooltipContent += `<div class="tooltip-item">Coordinates: [${x.toFixed(
        4
      )}, ${y.toFixed(4)}]</div>`
    }

    // Similarity/Distance
    if (data.similarity !== undefined) {
      tooltipContent += `<div class="tooltip-item">Similarity: ${(
        data.similarity * 100
      ).toFixed(1)}%</div>`
    }
    if (data.distance !== undefined) {
      tooltipContent += `<div class="tooltip-item">Distance: ${data.distance.toFixed(
        3
      )}</div>`
    }

    // Metadata section (conditionally add separator)
    const metadata = data.metadata || {}
    const accession = data.accession || metadata.accessions?.[0]
    const country = data.country || metadata.country || metadata.first_country
    const year = data.year || metadata.first_year
    const host = data.host || metadata.host
    const organism = data.organism || metadata.organism
    const lineage = data.lineage || metadata.lineage

    const hasMetadata =
      accession || country || year || host || organism || lineage

    if (hasMetadata) {
      tooltipContent += `<hr style="border: none; border-top: 1px solid #eee; margin: 4px 0;">`
      if (accession && !data.isUserSequence)
        tooltipContent += `<div class="tooltip-item">Accession: ${accession}</div>`
      if (country)
        tooltipContent += `<div class="tooltip-item">Country: ${country}</div>`
      if (year)
        tooltipContent += `<div class="tooltip-item">Year: ${year}</div>`
      if (host)
        tooltipContent += `<div class="tooltip-item">Host: ${host}</div>`
      if (organism)
        tooltipContent += `<div class="tooltip-item">Organism: ${organism}</div>`
      if (lineage)
        tooltipContent += `<div class="tooltip-item">Lineage: ${lineage}</div>`
    }

    // Specific User Sequence Info
    if (data.isUserSequence) {
      if (data.uploadedAt) {
        tooltipContent += `<div class="tooltip-item">Uploaded: ${new Date(
          data.uploadedAt
        ).toLocaleString()}</div>`
      }
      // Add other user-specific fields if available (e.g., sequenceLength)
    }

    tooltipContent += `
        </div>
      </div>
    `

    return tooltipContent
  }

  // Function to add similarity connections
  function addSimilarityConnections(
    userSequence,
    similarSequences,
    options = {}
  ) {
    console.log('Adding similarity connections:', {
      userSequence: {
        id: userSequence.id,
        x: userSequence.x,
        y: userSequence.y,
      },
      similarCount: similarSequences.length,
      firstSimilar: similarSequences[0]
        ? {
            id: similarSequences[0].id,
            x: similarSequences[0].x,
            y: similarSequences[0].y,
          }
        : null,
    })

    if (!userSequence || !similarSequences || !similarSequences.length) {
      console.warn('Cannot add similarity connections: missing data')
      return
    }

    // Ensure userSequence has normalized coordinates
    const userX = userSequence.x !== undefined ? userSequence.x : userSequence.X
    const userY = userSequence.y !== undefined ? userSequence.y : userSequence.Y

    if (userX === undefined || userY === undefined) {
      console.warn('User sequence missing valid coordinates:', userSequence)
      return
    }

    // Default options - MATCH EMERGENCY VIS
    const connectionOptions = {
      lineColor: '#999', // Emergency vis uses grey
      lineWidth: 1, // Emergency vis uses 1
      lineOpacity: 0.4, // Emergency vis uses 0.4
      ...options, // Allow override if needed
    }

    console.log(
      `Drawing connections from user sequence at (${userX}, ${userY}) to ${similarSequences.length} similar sequences`
    )

    // Remove existing connections for this user sequence
    connectionsGroup
      .selectAll(`.similarity-connection[data-source-id="${userSequence.id}"]`)
      .remove()

    // Add new connections one by one with logging
    similarSequences.forEach((seq, i) => {
      // Get normalized coordinates for the target sequence
      const seqX =
        seq.x !== undefined
          ? seq.x
          : seq.X !== undefined
          ? seq.X
          : seq.coordinates
          ? seq.coordinates[0]
          : undefined
      const seqY =
        seq.y !== undefined
          ? seq.y
          : seq.Y !== undefined
          ? seq.Y
          : seq.coordinates
          ? seq.coordinates[1]
          : undefined

      if (seqX === undefined || seqY === undefined) {
        console.warn(`Similar sequence ${seq.id || i} missing coordinates`, seq)
        return // Skip this sequence
      }

      const targetX = xScale(seqX)
      const targetY = yScale(seqY)
      const sourceX = xScale(userX)
      const sourceY = yScale(userY)

      if (
        isNaN(targetX) ||
        isNaN(targetY) ||
        isNaN(sourceX) ||
        isNaN(sourceY)
      ) {
        console.warn(`Invalid coordinates after scaling for connection ${i}:`, {
          source: { x: userX, y: userY, scaled: { x: sourceX, y: sourceY } },
          target: { x: seqX, y: seqY, scaled: { x: targetX, y: targetY } },
        })
        return // Skip this connection
      }

      console.log(
        `Drawing connection ${i}: (${sourceX}, ${sourceY}) -> (${targetX}, ${targetY})`
      )

      // Add the connection line - REMOVE DASHARRAY
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
        .attr('stroke-opacity', connectionOptions.lineOpacity)
    })

    console.log(`Added ${similarSequences.length} connections`)
  }

  // Function to add a legend
  function addLegend() {
    // Clear existing legend
    legendGroup.selectAll('*').remove()

    // Add legend title
    legendGroup
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .text('Legend')

    // Create legend items
    const legendItems = [
      { label: 'Your Sequence', color: '#ff3860', isUser: true },
      { label: 'High Similarity', color: d3.interpolateGreens(0.9) },
      { label: 'Medium Similarity', color: d3.interpolateGreens(0.6) },
      { label: 'Low Similarity', color: d3.interpolateGreens(0.3) },
    ]

    const legendItem = legendGroup
      .selectAll('.legend-item')
      .data(legendItems)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20 + 20})`)

    // Add color squares
    legendItem
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', (d) => (d.isUser ? 6 : 0))
      .attr('ry', (d) => (d.isUser ? 6 : 0))
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => (d.isUser ? '#000' : 'none'))
      .attr('stroke-width', (d) => (d.isUser ? 1 : 0))

    // Add text labels
    legendItem
      .append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('font-size', '10px')
      .text((d) => d.label)

    // Add connection example
    legendGroup
      .append('g')
      .attr('transform', `translate(0, ${legendItems.length * 20 + 30})`)
      .call((g) => {
        g.append('text')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('Connections:')

        g.append('line')
          .attr('x1', 0)
          .attr('y1', 20)
          .attr('x2', 40)
          .attr('y2', 20)
          .attr('stroke', d3.interpolateReds(0.7))
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.8)
          .attr('stroke-dasharray', '3,3')

        g.append('text')
          .attr('x', 50)
          .attr('y', 23)
          .attr('font-size', '10px')
          .text('Similarity')
      })
  }

  // Function to highlight a point by ID in this visualization
  function highlightPoint(pointId, highlight = true) {
    console.log(
      `Attempting to highlight point in user UMAP with ID: ${pointId}`
    )

    // Find the point with the matching ID - try different fields
    const point = pointsGroup.select(`.scatter-point[data-id="${pointId}"]`)

    if (!point.empty()) {
      console.log(`Found matching point with ID ${pointId} in user UMAP`)

      point
        .transition()
        .duration(200)
        .attr(
          'r',
          highlight
            ? (d) =>
                d.isUserSequence
                  ? config.userPointRadius * 1.5
                  : config.pointRadius * 1.5
            : (d) =>
                d.isUserSequence ? config.userPointRadius : config.pointRadius
        )
        .style('stroke', highlight ? '#000' : '#fff')
        .style('stroke-width', highlight ? 2 : 1)

      // If we have a cross-highlight function, call it
      if (
        config.crossHighlight &&
        typeof config.crossHighlight === 'function'
      ) {
        config.crossHighlight(pointId, highlight)
      }

      return true
    } else {
      // Try searching by data instead of attribute if not found by data-id
      const allPoints = pointsGroup.selectAll('.scatter-point')

      const matchingPointByData = allPoints.filter((d) => {
        return (
          d.id === pointId ||
          d.accession === pointId ||
          d.index === pointId ||
          d.DNA_mutation_code === pointId
        )
      })

      if (!matchingPointByData.empty()) {
        console.log(
          `Found matching point with ID ${pointId} by data in user UMAP`
        )

        matchingPointByData
          .transition()
          .duration(200)
          .attr(
            'r',
            highlight
              ? (d) =>
                  d.isUserSequence
                    ? config.userPointRadius * 1.5
                    : config.pointRadius * 1.5
              : (d) =>
                  d.isUserSequence ? config.userPointRadius : config.pointRadius
          )
          .style('stroke', highlight ? '#000' : '#fff')
          .style('stroke-width', highlight ? 2 : 1)

        // If we have a cross-highlight function, call it
        if (
          config.crossHighlight &&
          typeof config.crossHighlight === 'function'
        ) {
          config.crossHighlight(pointId, highlight)
        }

        return true
      } else {
        console.log(`No point found with ID ${pointId} in user UMAP`)
      }
    }

    return false
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight || 400

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight])

    // Update dimensions
    config.width = newWidth
    config.height = newHeight

    const innerWidth = config.width - config.margin.left - config.margin.right
    const innerHeight = config.height - config.margin.top - config.margin.bottom

    // Update scales
    xScale.range([0, innerWidth])
    yScale.range([innerHeight, 0])

    // Update axes
    xAxisGroup
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))

    yAxisGroup.call(d3.axisLeft(yScale))

    // Update axis labels
    svg
      .select('.x-axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)

    svg.select('.y-axis-label').attr('x', -innerHeight / 2)

    // Update legend position
    legendGroup.attr('transform', `translate(${config.width - 120}, 20)`)

    // Update points
    pointsGroup
      .selectAll('.scatter-point')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))

    // Update connections
    connectionsGroup
      .selectAll('.similarity-connection')
      .attr('x1', (d) => xScale(d.source?.x || 0))
      .attr('y1', (d) => yScale(d.source?.y || 0))
      .attr('x2', (d) => xScale(d.x))
      .attr('y2', (d) => yScale(d.y))

    // Redraw gridlines on resize
    drawGridlines()
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Initial update with provided data
  if (data && data.length > 0) {
    updateScatterPlot(data)
  }

  // Function to clear all data and reset the visualization
  function clearVisualization() {
    console.log('Clearing user scatter visualization')

    // Remove all points
    pointsGroup.selectAll('.scatter-point').remove()

    // Remove all labels
    pointsGroup.selectAll('.point-label').remove()

    // Remove all connections
    connectionsGroup.selectAll('.similarity-connection').remove()

    // Reset axes to default domains
    xScale.domain([-10, 10])
    yScale.domain([-10, 10])

    // Update axes
    xAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisBottom(xScale))

    yAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisLeft(yScale))

    console.log('User scatter visualization cleared')

    return true
  }

  // Return public API
  return {
    updateScatterPlot,
    highlightPoint,
    addSimilarityConnections: (userSequence, similarSequences, options) =>
      addSimilarityConnections(userSequence, similarSequences, options),
    setData: updateScatterPlot, // Alias for consistency
    setCrossHighlightFunction: (fn) => {
      config.crossHighlight = fn
    },
    clearVisualization,
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
