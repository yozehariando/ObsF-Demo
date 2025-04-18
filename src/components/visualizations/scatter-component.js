// Scatter plot visualization component for DNA mutation data
import * as d3 from 'd3'

// Function to create and initialize the scatter plot visualization
export function createScatterPlot(containerId, options = {}) {
  // Default options
  const defaults = {
    width: null, // Will be determined from container
    height: null, // Will be determined from container
    margin: { top: 40, right: 40, bottom: 60, left: 60 },
    xLabel: 'X Dimension',
    yLabel: 'Y Dimension',
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
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle')
    .text(config.xLabel)

  g.append('text')
    .attr('class', 'y-label')
    .attr('x', -innerHeight / 2)
    .attr('y', -40)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text(config.yLabel)

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

  // Function to update the scatter plot with new data
  function updateScatterPlot(data, options = {}) {
    // Default update options
    const updateDefaults = {
      colorScale: config.colorScale,
      selectedIndex: null,
      onPointClick: null,
      transitionDuration: 500,
    }

    // Merge provided options with defaults
    const updateConfig = { ...updateDefaults, ...options }

    // Filter out data points without valid X and Y coordinates
    const validData = data.filter(
      (d) => d.X !== null && d.Y !== null && !isNaN(d.X) && !isNaN(d.Y)
    )

    if (validData.length === 0) {
      console.warn('No valid data points with X and Y coordinates')
      return
    }

    // Update scales with the data
    const xExtent = d3.extent(validData, (d) => d.X)
    const yExtent = d3.extent(validData, (d) => d.Y)

    // Add a small padding to the extents
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05

    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding])

    // Update axes
    xAxisGroup
      .transition()
      .duration(updateConfig.transitionDuration)
      .call(xAxis)
    yAxisGroup
      .transition()
      .duration(updateConfig.transitionDuration)
      .call(yAxis)

    // Data join for points
    const points = g.selectAll('.scatter-point').data(validData, (d) => d.index)

    // Remove old points
    points
      .exit()
      .transition()
      .duration(updateConfig.transitionDuration)
      .attr('r', 0)
      .remove()

    // Add new points
    const pointsEnter = points
      .enter()
      .append('circle')
      .attr('class', 'scatter-point')
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))
      .attr('r', 0)
      .attr('cursor', 'pointer')

    // Update all points (new and existing)
    pointsEnter
      .merge(points)
      .transition()
      .duration(updateConfig.transitionDuration)
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))
      .attr('r', (d) => (d.index === updateConfig.selectedIndex ? 8 : 5))
      .attr('fill', (d) => updateConfig.colorScale(d.random_float))
      .attr('stroke', (d) =>
        d.index === updateConfig.selectedIndex ? '#ff0000' : '#333'
      )
      .attr('stroke-width', (d) =>
        d.index === updateConfig.selectedIndex ? 2 : 1
      )
      .attr('opacity', 0.7)

    // Add event handlers to all points
    g.selectAll('.scatter-point')
      .on('mouseover', function (event, d) {
        // Highlight on hover
        d3.select(this)
          .attr('r', d.index === updateConfig.selectedIndex ? 10 : 7)
          .attr('stroke-width', d.index === updateConfig.selectedIndex ? 3 : 2)

        // Show tooltip
        tooltip
          .style('opacity', 1)
          .html(
            `
            <strong>${d.DNA_mutation_code || 'Unknown'}</strong><br>
            Value: ${d.random_float.toFixed(3)}<br>
            X: ${d.X.toFixed(4)}, Y: ${d.Y.toFixed(4)}
          `
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px')
      })
      .on('mouseout', function (event, d) {
        // Restore original appearance
        d3.select(this)
          .attr('r', d.index === updateConfig.selectedIndex ? 8 : 5)
          .attr('stroke-width', d.index === updateConfig.selectedIndex ? 2 : 1)

        // Hide tooltip
        tooltip.style('opacity', 0)
      })
      .on('click', function (event, d) {
        // Call click handler if provided
        if (typeof updateConfig.onPointClick === 'function') {
          updateConfig.onPointClick(d)
        }
      })
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
      .attr('y', newInnerHeight + 40)

    g.select('.y-label').attr('x', -newInnerHeight / 2)

    // Update points
    g.selectAll('.scatter-point')
      .attr('cx', (d) => xScale(d.X))
      .attr('cy', (d) => yScale(d.Y))
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Return the public API
  return {
    updateScatterPlot,
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

// Function to create a legend for the scatter plot
export function createScatterLegend(container, colorScale) {
  // Create legend container
  const legendContainer = document.createElement('div')
  legendContainer.style.display = 'flex'
  legendContainer.style.justifyContent = 'center'
  legendContainer.style.marginTop = '10px'

  // Create inner container for legend elements
  const legendInner = document.createElement('div')
  legendInner.style.display = 'flex'
  legendInner.style.alignItems = 'center'

  // Add minimum value label
  const minLabel = document.createElement('span')
  minLabel.textContent = '0.0'
  minLabel.style.fontSize = '0.8rem'

  // Create gradient bar
  const gradient = document.createElement('div')
  gradient.style.width = '150px'
  gradient.style.height = '15px'
  gradient.style.margin = '0 10px'
  gradient.style.background = `linear-gradient(to right, 
    ${colorScale(0)}, ${colorScale(0.25)}, ${colorScale(0.5)}, 
    ${colorScale(0.75)}, ${colorScale(1)})`

  // Add maximum value label
  const maxLabel = document.createElement('span')
  maxLabel.textContent = '1.0'
  maxLabel.style.fontSize = '0.8rem'

  // Assemble the legend
  legendInner.appendChild(minLabel)
  legendInner.appendChild(gradient)
  legendInner.appendChild(maxLabel)
  legendContainer.appendChild(legendInner)

  // Add description
  const description = document.createElement('div')
  description.style.textAlign = 'center'
  description.style.fontSize = '0.8rem'
  description.style.marginTop = '3px'
  description.textContent = 'Mutation significance value'

  // Create wrapper and add all elements
  const wrapper = document.createElement('div')
  wrapper.appendChild(legendContainer)
  wrapper.appendChild(description)

  // Add to the provided container
  container.appendChild(wrapper)

  return wrapper
}
