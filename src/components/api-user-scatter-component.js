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
    crossHighlight: null, // Function to highlight points in other components
    ...options
  };

  // Validate inputs
  if (!containerId) {
    console.error("No container ID provided to createUserScatterPlot");
    return null;
  }

  // Get container and set dimensions
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return null;
  }

  // Log container properties
  console.log(`Container found: #${containerId}, dimensions: ${container.clientWidth}x${container.clientHeight}`);

  // Set dimensions based on container
  config.width = container.clientWidth || config.width;
  config.height = container.clientHeight || config.height;

  console.log(`Using dimensions: ${config.width}x${config.height}`);

  // Validate data
  if (!data) {
    console.warn("No data provided to createUserScatterPlot");
    data = [];
  }

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
    .attr('style', 'max-width: 100%; height: auto; display: block; border: 1px solid #eee;');

  // Add debug rectangle to visualize the SVG area
  svg.append('rect')
    .attr('width', config.width)
    .attr('height', config.height)
    .attr('fill', '#f9f9f9')
    .attr('stroke', '#ddd');
  
  console.log(`Created SVG with dimensions ${config.width}x${config.height}`);

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

    console.log(`Updating user scatter plot with ${newData?.length || 0} data points:`, newData);
    console.log("Raw points data sample:", newData?.slice(0, 3));

    if (!newData || newData.length === 0) {
      console.warn('No data provided for user scatter plot update');
      return;
    }

    // Filter out data points without valid coordinates
    const validData = newData.filter((d) => {
      const hasX = d.x != null || d.X != null;
      const hasY = d.y != null || d.Y != null;
      const result = hasX && hasY;
      if (!result) {
        console.warn('Point missing coordinates:', d);
      }
      return result;
    });
    
    console.log(`Found ${validData.length} valid points with coordinates out of ${newData.length} total`);
    console.log("Valid data sample:", validData.slice(0, 3));

    // Normalize coordinate names (some use x,y others use X,Y)
    const normalizedData = validData.map(d => {
      // Make a copy of the data point
      const point = { ...d };
      
      // Normalize coordinate names
      point.x = d.x !== undefined ? d.x : d.X;
      point.y = d.y !== undefined ? d.y : d.Y;
      
      return point;
    });
    
    console.log('Normalized data sample:', normalizedData.slice(0, 3));
    console.log('Normalized coordinates check:', normalizedData.slice(0, 3).map(d => ({id: d.id, x: d.x, y: d.y})));

    if (normalizedData.length === 0) {
      console.warn('No valid points with coordinates found after filtering');
      return;
    }

    // Update scales
    const xExtent = d3.extent(normalizedData, (d) => d.x);
    const yExtent = d3.extent(normalizedData, (d) => d.y);
    
    console.log(`Coordinate ranges: X [${xExtent[0]}, ${xExtent[1]}], Y [${yExtent[0]}, ${yExtent[1]}]`);
    
    // Add padding to the domains
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);
    
    console.log(`Scale domains set to: X [${xScale.domain()[0]}, ${xScale.domain()[1]}], Y [${yScale.domain()[0]}, ${yScale.domain()[1]}]`);

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
    
    console.log(`DATA JOIN: ${points.size()} existing points, ${points.enter().size()} entering, ${points.exit().size()} exiting`);

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
      .attr('cx', (d) => {
        const x = xScale(d.x);
        if (isNaN(x)) console.warn('Invalid x coordinate for point:', d);
        return isNaN(x) ? 0 : x;
      })
      .attr('cy', (d) => {
        const y = yScale(d.y);
        if (isNaN(y)) console.warn('Invalid y coordinate for point:', d);
        return isNaN(y) ? 0 : y;
      })
      .attr('r', (d) => d.isUserSequence ? config.userPointRadius : config.pointRadius)
      .style('fill', (d) => getPointColor(d))
      .style('stroke', (d) => d.isUserSequence ? '#000' : '#fff')
      .style('stroke-width', (d) => d.isUserSequence ? 2 : 1);

    // Make sure points are visible immediately
    newPoints
      .attr('r', 0)
      .transition()
      .duration(config.transitionDuration)
      .attr('r', (d) => {
        // Use larger, more visible points with guaranteed minimum size
        const radius = d.isUserSequence ? config.userPointRadius + 2 : config.pointRadius + 2;
        return Math.max(radius, 6); // Ensure minimum radius for visibility
      })
      .style('fill', (d) => getPointColor(d))
      .style('stroke', (d) => d.isUserSequence ? '#000' : '#fff')
      .style('stroke-width', (d) => d.isUserSequence ? 2 : 1);
    
    // Force immediate rendering of points for debugging
    pointsGroup.selectAll('.scatter-point')
      .each(function(d) {
        const point = d3.select(this);
        console.log(`Rendering point at (${point.attr('cx')}, ${point.attr('cy')}) with r=${point.attr('r')}`, d);
      });

    // Add event listeners to all points (both new and existing)
    pointsGroup.selectAll('.scatter-point')
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

  // Function to get point color based on user sequence or similarity
  function getPointColor(d) {
    if (d.isUserSequence) {
      // If we have multiple user sequences, use different colors
      if (d.sequenceIndex !== undefined) {
        const userColors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'];
        return userColors[d.sequenceIndex % userColors.length];
      }
      return '#e41a1c'; // Default red for user sequence
    } else if (d.similarity !== undefined) {
      // Color based on similarity score
      const similarityScale = d3.scaleLinear()
        .domain([0.7, 1.0])
        .range(['#fdae61', '#1a9850']);
      return similarityScale(d.similarity);
    } else {
      // Default color
      return '#999';
    }
  }

  // Function to add similarity connections
  function addSimilarityConnections(userSequence, similarSequences, options = {}) {
    console.log("Adding similarity connections:", { 
      userSequence: { id: userSequence.id, x: userSequence.x, y: userSequence.y }, 
      similarCount: similarSequences.length,
      firstSimilar: similarSequences[0] ? { id: similarSequences[0].id, x: similarSequences[0].x, y: similarSequences[0].y } : null
    });
    
    if (!userSequence || !similarSequences || !similarSequences.length) {
      console.warn('Cannot add similarity connections: missing data');
      return;
    }
    
    // Ensure userSequence has normalized coordinates
    const userX = userSequence.x !== undefined ? userSequence.x : userSequence.X;
    const userY = userSequence.y !== undefined ? userSequence.y : userSequence.Y;
    
    if (userX === undefined || userY === undefined) {
      console.warn('User sequence missing valid coordinates:', userSequence);
      return;
    }
    
    // Default options
    const connectionOptions = {
      lineColor: options.lineColor || 'rgba(255, 0, 0, 0.5)',
      lineWidth: options.lineWidth || 1,
      lineOpacity: options.lineOpacity || 0.7,
      ...options
    };
    
    console.log(`Drawing connections from user sequence at (${userX}, ${userY}) to ${similarSequences.length} similar sequences`);
    
    // Remove existing connections for this user sequence
    connectionsGroup.selectAll(`.similarity-connection[data-source-id="${userSequence.id}"]`).remove();
    
    // Add new connections one by one with logging
    similarSequences.forEach((seq, i) => {
      // Get normalized coordinates for the target sequence
      const seqX = seq.x !== undefined ? seq.x : (seq.X !== undefined ? seq.X : (seq.coordinates ? seq.coordinates[0] : undefined));
      const seqY = seq.y !== undefined ? seq.y : (seq.Y !== undefined ? seq.Y : (seq.coordinates ? seq.coordinates[1] : undefined));
      
      if (seqX === undefined || seqY === undefined) {
        console.warn(`Similar sequence ${seq.id || i} missing coordinates`, seq);
        return; // Skip this sequence
      }
      
      const targetX = xScale(seqX);
      const targetY = yScale(seqY);
      const sourceX = xScale(userX);
      const sourceY = yScale(userY);
      
      if (isNaN(targetX) || isNaN(targetY) || isNaN(sourceX) || isNaN(sourceY)) {
        console.warn(`Invalid coordinates after scaling for connection ${i}:`, 
          { source: { x: userX, y: userY, scaled: { x: sourceX, y: sourceY } }, 
            target: { x: seqX, y: seqY, scaled: { x: targetX, y: targetY } } });
        return; // Skip this connection
      }
      
      console.log(`Drawing connection ${i}: (${sourceX}, ${sourceY}) -> (${targetX}, ${targetY})`);
      
      // Add the connection line
      connectionsGroup.append('line')
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
        .attr('stroke-dasharray', '3,3');
    });
      
    console.log(`Added ${similarSequences.length} connections`);
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

  // Function to highlight a point by ID in this visualization
  function highlightPoint(pointId, highlight = true) {
    console.log(`Attempting to highlight point in user UMAP with ID: ${pointId}`);
    
    // Find the point with the matching ID - try different fields
    const point = pointsGroup.select(`.scatter-point[data-id="${pointId}"]`);
    
    if (!point.empty()) {
      console.log(`Found matching point with ID ${pointId} in user UMAP`);
      
      point
        .transition()
        .duration(200)
        .attr('r', highlight ? 
          (d => d.isUserSequence ? config.userPointRadius * 1.5 : config.pointRadius * 1.5) : 
          (d => d.isUserSequence ? config.userPointRadius : config.pointRadius))
        .style('stroke', highlight ? '#000' : '#fff')
        .style('stroke-width', highlight ? 2 : 1);
      
      // If we have a cross-highlight function, call it
      if (config.crossHighlight && typeof config.crossHighlight === 'function') {
        config.crossHighlight(pointId, highlight);
      }
      
      return true;
    } else {
      // Try searching by data instead of attribute if not found by data-id
      const allPoints = pointsGroup.selectAll('.scatter-point');
      
      const matchingPointByData = allPoints.filter(d => {
        return (
          d.id === pointId || 
          d.accession === pointId || 
          d.index === pointId ||
          d.DNA_mutation_code === pointId
        );
      });
      
      if (!matchingPointByData.empty()) {
        console.log(`Found matching point with ID ${pointId} by data in user UMAP`);
        
        matchingPointByData
          .transition()
          .duration(200)
          .attr('r', highlight ? 
            (d => d.isUserSequence ? config.userPointRadius * 1.5 : config.pointRadius * 1.5) : 
            (d => d.isUserSequence ? config.userPointRadius : config.pointRadius))
          .style('stroke', highlight ? '#000' : '#fff')
          .style('stroke-width', highlight ? 2 : 1);
        
        // If we have a cross-highlight function, call it
        if (config.crossHighlight && typeof config.crossHighlight === 'function') {
          config.crossHighlight(pointId, highlight);
        }
        
        return true;
      } else {
        console.log(`No point found with ID ${pointId} in user UMAP`);
      }
    }
    
    return false;
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

  // Function to clear all data and reset the visualization
  function clearVisualization() {
    console.log("Clearing user scatter visualization");
    
    // Remove all points
    pointsGroup.selectAll('.scatter-point').remove();
    
    // Remove all labels
    pointsGroup.selectAll('.point-label').remove();
    
    // Remove all connections
    connectionsGroup.selectAll('.similarity-connection').remove();
    
    // Reset axes to default domains
    xScale.domain([-10, 10]);
    yScale.domain([-10, 10]);
    
    // Update axes
    xAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisBottom(xScale));

    yAxisGroup
      .transition()
      .duration(config.transitionDuration)
      .call(d3.axisLeft(yScale));
      
    console.log("User scatter visualization cleared");
    
    return true;
  }

  // Return public API
  return {
    updateScatterPlot,
    highlightPoint,
    addSimilarityConnections: (userSequence, similarSequences, options) => 
      addSimilarityConnections(userSequence, similarSequences, options),
    setData: updateScatterPlot, // Alias for consistency
    setCrossHighlightFunction: (fn) => { config.crossHighlight = fn; },
    clearVisualization,
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
