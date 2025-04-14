/**
 * API User Scatter Component
 * 
 * A specialized scatter plot component for visualizing user sequences
 * and their similarities to reference sequences.
 */

import * as d3 from 'd3';

/**
 * Create a scatter plot for user sequence visualization
 * @param {string} containerId - ID of the container element
 * @param {Array} data - Data points including user sequence and similar sequences
 * @param {Object} options - Configuration options
 * @returns {Object} Scatter plot component with methods for interaction
 */
function createUserScatterPlot(containerId, data, options = {}) {
  // Default configuration
  const config = {
    width: 600,
    height: 400,
    margin: { top: 20, right: 20, bottom: 40, left: 40 },
    transitionDuration: 500,
    pointRadius: 5,
    userPointRadius: 8,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    selectedIndex: -1,
    onPointClick: null,
    showLabels: false,
    ...options
  };

  // Get container and set dimensions
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return null;
  }

  // Set dimensions based on container
  config.width = container.clientWidth;
  config.height = container.clientHeight || 400;

  // Calculate inner dimensions
  const innerWidth = config.width - config.margin.left - config.margin.right;
  const innerHeight = config.height - config.margin.top - config.margin.bottom;

  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height)
    .attr('viewBox', [0, 0, config.width, config.height])
    .attr('style', 'max-width: 100%; height: auto;');

  // Create main group element
  const g = svg
    .append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`);

  // Add x-axis
  const xAxisGroup = g
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`);

  // Add y-axis
  const yAxisGroup = g.append('g').attr('class', 'y-axis');

  // Add axis labels
  g.append('text')
    .attr('class', 'x-axis-label')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 35)
    .attr('text-anchor', 'middle')
    .text('UMAP Dimension 1');

  g.append('text')
    .attr('class', 'y-axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -30)
    .attr('text-anchor', 'middle')
    .text('UMAP Dimension 2');

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
    .style('z-index', '10');

  // Create a group for similarity connections
  const connectionsGroup = g.append('g').attr('class', 'connections-group');
  
  // Create a group for data points
  const pointsGroup = g.append('g').attr('class', 'points-group');
  
  // Create a group for the legend
  const legendGroup = svg
    .append('g')
    .attr('class', 'legend-group')
    .attr('transform', `translate(${config.width - 120}, 20)`);

  // Initialize scales with placeholder domains
  const xScale = d3.scaleLinear().range([0, innerWidth]);
  const yScale = d3.scaleLinear().range([innerHeight, 0]);

  // Function to update the scatter plot with new data
  function updateScatterPlot(newData, updateOptions = {}) {
    // Merge update options with config
    Object.assign(config, updateOptions);

    // Filter out data points without valid coordinates
    const validData = newData.filter((d) => 
      (d.x != null && d.y != null) || 
      (d.X != null && d.Y != null)
    );
    
    console.log(`Updating user scatter plot with ${validData.length} valid points`);

    // Normalize coordinate names (some use x,y others use X,Y)
    const normalizedData = validData.map(d => ({
      ...d,
      x: d.x !== undefined ? d.x : d.X,
      y: d.y !== undefined ? d.y : d.Y
    }));

    // Update scales
    const xExtent = d3.extent(normalizedData, (d) => d.x);
    const yExtent = d3.extent(normalizedData, (d) => d.y);
    
    // Add padding to the domains
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);

    // Update axes
    xAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisBottom(xScale));

    yAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisLeft(yScale));

    // DATA JOIN - Select all points
    const points = pointsGroup.selectAll('.scatter-point').data(normalizedData, d => d.id);

    // EXIT - Remove points that no longer have data
    points
      .exit()
      .transition()
      .duration(config.transitionDuration)
      .attr('r', 0)
      .remove();

    // ENTER - Create new points
    const newPoints = points
      .enter()
      .append('circle')
      .attr('class', 'scatter-point')
      .attr('data-id', d => d.id)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0)
      .style('fill', (d) => getPointColor(d))
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer');

    // Add labels if enabled
    if (config.showLabels) {
      pointsGroup.selectAll('.point-label').remove();
      
      pointsGroup.selectAll('.point-label')
        .data(normalizedData.filter(d => d.isUserSequence || d.similarity > 0.9))
        .enter()
        .append('text')
        .attr('class', 'point-label')
        .attr('x', d => xScale(d.x) + 8)
        .attr('y', d => yScale(d.y) + 4)
        .text(d => d.isUserSequence ? 'Your Sequence' : 
              (d.id ? d.id.substring(0, 8) : ''))
        .style('font-size', '10px')
        .style('pointer-events', 'none');
    }

    // UPDATE + ENTER - Update existing and new points
    points
      .merge(newPoints)
      .transition()
      .duration(config.transitionDuration)
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', (d) => d.isUserSequence ? config.userPointRadius : config.pointRadius)
      .style('fill', (d) => getPointColor(d))
      .style('stroke', (d) => d.isUserSequence ? '#000' : '#fff')
      .style('stroke-width', (d) => d.isUserSequence ? 2 : 1);

    // Add event listeners
    newPoints
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.isUserSequence ? config.userPointRadius + 2 : config.pointRadius + 2);

        tooltip
          .style('opacity', 0.9)
          .html(getTooltipContent(d))
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', d.isUserSequence ? config.userPointRadius : config.pointRadius);

        tooltip.style('opacity', 0);
      })
      .on('click', function (event, d) {
        if (typeof config.onPointClick === 'function') {
          config.onPointClick(d);
        }
      });
  }

  // Function to get tooltip content
  function getTooltipContent(point) {
    const metadata = point.metadata || {};
    
    // For user sequence
    if (point.isUserSequence) {
      return `
        <div class="user-sequence-tooltip">
          <h4>Your Sequence</h4>
          <p><strong>ID:</strong> ${point.id || 'N/A'}</p>
          <p><strong>Coordinates:</strong> (${point.x.toFixed(2)}, ${point.y.toFixed(2)})</p>
        </div>
      `;
    }
    
    // For similar sequences
    const similarity = point.similarity !== undefined 
      ? `<p><strong>Similarity:</strong> ${(point.similarity * 100).toFixed(2)}%</p>` 
      : '';
    
    const date = metadata.first_date || point.first_date || 'Unknown';
    const country = metadata.first_country || point.first_country || 'Unknown';
    
    return `
      <div class="similar-sequence-tooltip">
        <h4>Similar Sequence</h4>
        <p><strong>ID:</strong> ${point.id || 'N/A'}</p>
        <p><strong>Accession:</strong> ${point.accession || 'N/A'}</p>
        <p><strong>Country:</strong> ${country}</p>
        <p><strong>Date:</strong> ${date}</p>
        ${similarity}
        <p><strong>Coordinates:</strong> (${point.x.toFixed(2)}, ${point.y.toFixed(2)})</p>
      </div>
    `;
  }

  // Function to determine point color
  function getPointColor(d) {
    if (d.isUserSequence) {
      return '#ff3860'; // User sequence is highlighted in red
    }
    
    if (d.similarity !== undefined) {
      // Color based on similarity - green gradient
      return d3.interpolateGreens(d.similarity);
    }
    
    // Default coloring by country
    const country = d.country || d.first_country || 'Unknown';
    return config.colorScale(country);
  }

  // Function to add similarity connections
  function addSimilarityConnections(userSequence, similarSequences) {
    if (!userSequence || !similarSequences || !similarSequences.length) {
      console.warn('Cannot add similarity connections: missing data');
      return;
    }
    
    // Remove existing connections
    connectionsGroup.selectAll('.similarity-connection').remove();
    
    // Add new connections
    connectionsGroup.selectAll('.similarity-connection')
      .data(similarSequences)
      .enter()
      .append('line')
      .attr('class', 'similarity-connection')
      .attr('data-sequence-id', d => d.id)
      .attr('x1', xScale(userSequence.x))
      .attr('y1', yScale(userSequence.y))
      .attr('x2', d => xScale(d.x))
      .attr('y2', d => yScale(d.y))
      .attr('stroke', d => d3.interpolateReds(d.similarity || 0.5))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '3,3');
  }

  // Function to add a legend
  function addLegend() {
    // Clear existing legend
    legendGroup.selectAll('*').remove();
    
    // Add legend title
    legendGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .text('Legend');
    
    // Create legend items
    const legendItems = [
      { label: 'Your Sequence', color: '#ff3860', isUser: true },
      { label: 'High Similarity', color: d3.interpolateGreens(0.9) },
      { label: 'Medium Similarity', color: d3.interpolateGreens(0.6) },
      { label: 'Low Similarity', color: d3.interpolateGreens(0.3) }
    ];
    
    const legendItem = legendGroup.selectAll('.legend-item')
      .data(legendItems)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20 + 20})`);
    
    // Add color squares
    legendItem.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', d => d.isUser ? 6 : 0)
      .attr('ry', d => d.isUser ? 6 : 0)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.isUser ? '#000' : 'none')
      .attr('stroke-width', d => d.isUser ? 1 : 0);
    
    // Add text labels
    legendItem.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('font-size', '10px')
      .text(d => d.label);
    
    // Add connection example
    legendGroup.append('g')
      .attr('transform', `translate(0, ${legendItems.length * 20 + 30})`)
      .call(g => {
        g.append('text')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('Connections:');
        
        g.append('line')
          .attr('x1', 0)
          .attr('y1', 20)
          .attr('x2', 40)
          .attr('y2', 20)
          .attr('stroke', d3.interpolateReds(0.7))
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.8)
          .attr('stroke-dasharray', '3,3');
        
        g.append('text')
          .attr('x', 50)
          .attr('y', 23)
          .attr('font-size', '10px')
          .text('Similarity');
      });
  }

  // Function to highlight a specific point
  function highlightPoint(pointId) {
    // Reset all points
    pointsGroup.selectAll('.scatter-point')
      .transition()
      .duration(200)
      .attr('r', d => d.isUserSequence ? config.userPointRadius : config.pointRadius)
      .style('stroke-width', d => d.isUserSequence ? 2 : 1);
    
    // Highlight the selected point
    pointsGroup.selectAll(`.scatter-point[data-id="${pointId}"]`)
      .transition()
      .duration(200)
      .attr('r', config.pointRadius + 3)
      .style('stroke-width', 2);
    
    // Highlight the connection if it exists
    connectionsGroup.selectAll(`.similarity-connection[data-sequence-id="${pointId}"]`)
      .transition()
      .duration(200)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 1);
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight || 400;

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight]);

    // Update dimensions
    config.width = newWidth;
    config.height = newHeight;
    
    const innerWidth = config.width - config.margin.left - config.margin.right;
    const innerHeight = config.height - config.margin.top - config.margin.bottom;

    // Update scales
    xScale.range([0, innerWidth]);
    yScale.range([innerHeight, 0]);

    // Update axes
    xAxisGroup
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    yAxisGroup.call(d3.axisLeft(yScale));

    // Update axis labels
    svg.select('.x-axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35);

    svg.select('.y-axis-label')
      .attr('x', -innerHeight / 2);

    // Update legend position
    legendGroup.attr('transform', `translate(${config.width - 120}, 20)`);

    // Update points
    pointsGroup.selectAll('.scatter-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y));
    
    // Update connections
    connectionsGroup.selectAll('.similarity-connection')
      .attr('x1', d => xScale(d.source?.x || 0))
      .attr('y1', d => yScale(d.source?.y || 0))
      .attr('x2', d => xScale(d.x))
      .attr('y2', d => yScale(d.y));
  }

  // Add resize listener
  window.addEventListener('resize', handleResize);

  // Initial update with provided data
  if (data && data.length > 0) {
    updateScatterPlot(data);
  }

  // Return the public API
  return {
    updateScatterPlot,
    addSimilarityConnections,
    addLegend,
    highlightPoint,
    svg,
    g,
    xScale,
    yScale,
    handleResize,
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize);
      tooltip.remove();
    },
  };
}

export { createUserScatterPlot };
