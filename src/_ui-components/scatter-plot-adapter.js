/**
 * Scatter Plot Adapter
 * 
 * This file adapts the existing scatter plot component to fix initialization issues.
 * It ensures scales are properly initialized before they're used.
 */

// Create an improved scatter plot that handles initialization better
function createUmapScatterPlot(containerId, data = [], options = {}) {
  console.log(`Creating robust scatter plot for container ${containerId} with ${data.length} data points`);
  
  // Default configuration
  const config = {
    width: 800,
    height: 600,
    margin: { top: 40, right: 40, bottom: 60, left: 60 },
    pointRadius: 3,
    highlightRadius: 5,
    transitionDuration: 500,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    colorBy: 'country', // Default property to use for coloring
    tooltipWidth: 200,
    debounceDelay: 250,
    maxPointsWithLabels: 100,
    ...options
  };

  // Get container and validate
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return null;
  }

  // Clear container
  container.innerHTML = '';
  
  // Set dimensions based on container
  config.width = container.clientWidth || config.width;
  config.height = container.clientHeight || config.height;
  
  // Computed properties
  const innerWidth = config.width - config.margin.left - config.margin.right;
  const innerHeight = config.height - config.margin.top - config.margin.bottom;
  
  // Create SVG
  const svg = d3.create("svg")
    .attr("width", config.width)
    .attr("height", config.height);
  
  // Add title if provided
  if (options.title) {
    svg.append("text")
      .attr("x", config.width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(options.title);
  }
  
  // Create main group with margins
  const g = svg.append("g")
    .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
  
  // Create groups for different elements
  const axesGroup = g.append("g").attr("class", "axes");
  const pointsGroup = g.append("g").attr("class", "points-group");
  const labelsGroup = g.append("g").attr("class", "labels-group");
  
  // Always create scales with default domains - important to prevent initialization errors
  const xScale = d3.scaleLinear()
    .domain([-10, 10]) // Default domain
    .range([0, innerWidth]);
  
  const yScale = d3.scaleLinear()
    .domain([-10, 10]) // Default domain
    .range([innerHeight, 0]);
  
  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  
  // Add axes
  const xAxisElement = axesGroup.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);
  
  const yAxisElement = axesGroup.append("g")
    .attr("class", "y-axis")
    .call(yAxis);
  
  // Add axis labels
  axesGroup.append("text")
    .attr("class", "x-axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text(options.xLabel || "UMAP 1");
  
  axesGroup.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text(options.yLabel || "UMAP 2");
  
  // Create tooltip
  const tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "10px")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000)
      .style("max-width", `${config.tooltipWidth}px`);
  }
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .on("zoom", function(event) {
      // Update the transform of the main group
      g.attr("transform", `translate(${event.transform.x + config.margin.left},${
        event.transform.y + config.margin.top}) scale(${event.transform.k})`);
      
      // Update the axes with the new scales
      xAxisElement.call(xAxis.scale(event.transform.rescaleX(xScale)));
      yAxisElement.call(yAxis.scale(event.transform.rescaleY(yScale)));
      
      // Update point radius based on zoom
      pointsGroup.selectAll(".point")
        .attr("r", config.pointRadius / Math.sqrt(event.transform.k));
    });
  
  svg.call(zoom);
  
  // Setup resize handler using debounce
  let resizeTimer;
  const handleResize = function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      config.width = container.clientWidth;
      config.height = container.clientHeight;
      
      svg.attr("width", config.width)
        .attr("height", config.height);
      
      const newInnerWidth = config.width - config.margin.left - config.margin.right;
      const newInnerHeight = config.height - config.margin.top - config.margin.bottom;
      
      xScale.range([0, newInnerWidth]);
      yScale.range([newInnerHeight, 0]);
      
      xAxisElement
        .attr("transform", `translate(0,${newInnerHeight})`)
        .call(xAxis);
      
      yAxisElement.call(yAxis);
      
      axesGroup.select(".x-axis-label")
        .attr("x", newInnerWidth / 2)
        .attr("y", newInnerHeight + 40);
      
      axesGroup.select(".y-axis-label")
        .attr("x", -newInnerHeight / 2);
      
      // Update points
      updatePoints();
    }, config.debounceDelay);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Function to update scales based on data
  function updateScales(pointsData) {
    if (!pointsData || pointsData.length === 0) {
      // Keep default scales if no data
      return;
    }
    
    // Get min/max values
    const xExtent = d3.extent(pointsData, d => d.x);
    const yExtent = d3.extent(pointsData, d => d.y);
    
    // Skip if we don't have valid extents
    if (!xExtent[0] || !xExtent[1] || !yExtent[0] || !yExtent[1]) {
      return;
    }
    
    // Set domains with 5% padding
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;
    
    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);
    
    // Update axes
    xAxisElement.call(xAxis);
    yAxisElement.call(yAxis);
  }
  
  // Function to update points
  function updatePoints() {
    // Remove existing points
    pointsGroup.selectAll(".point").remove();
    labelsGroup.selectAll(".point-label").remove();
    
    // If no data, add placeholder
    if (!data || data.length === 0) {
      g.append("text")
        .attr("class", "empty-notice")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#999")
        .text(options.emptyMessage || "No data available");
      return;
    }
    
    // Remove empty notice if exists
    g.select(".empty-notice").remove();
    
    // Add new points
    pointsGroup.selectAll(".point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", config.pointRadius)
      .attr("fill", d => {
        const value = d[config.colorBy] || 'unknown';
        return config.colorScale(value);
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", config.highlightRadius)
          .attr("stroke-width", 2);
        
        d3.select("body").select(".tooltip")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .style("opacity", 1)
          .html(getTooltipContent(d));
        
        // Call custom event handler if defined
        if (options.onPointHover) {
          options.onPointHover(d);
        }
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", config.pointRadius)
          .attr("stroke-width", 1);
        
        d3.select("body").select(".tooltip")
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        if (options.onPointClick) {
          options.onPointClick(d);
        }
      });
    
    // Add labels if enabled and not too many points
    if (options.showLabels && data.length <= config.maxPointsWithLabels) {
      labelsGroup.selectAll(".point-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "point-label")
        .attr("x", d => xScale(d.x) + 5)
        .attr("y", d => yScale(d.y) - 5)
        .text(d => d.id || d.accession || '')
        .style("font-size", "10px")
        .style("pointer-events", "none");
    }
  }
  
  // Helper to generate tooltip content
  function getTooltipContent(d) {
    let content = '';
    
    // ID or accession
    if (d.id || d.accession) {
      content += `<strong>ID:</strong> ${d.id || d.accession}<br>`;
    }
    
    // Add metadata fields
    const metadataFields = [
      { field: 'country', label: 'Country' },
      { field: 'region', label: 'Region' },
      { field: 'clade', label: 'Clade' },
      { field: 'lineage', label: 'Lineage' }
    ];
    
    metadataFields.forEach(({ field, label }) => {
      if (d[field]) {
        content += `<strong>${label}:</strong> ${d[field]}<br>`;
      }
    });
    
    // Add UMAP coordinates
    content += `<strong>UMAP 1:</strong> ${d.x.toFixed(3)}<br>`;
    content += `<strong>UMAP 2:</strong> ${d.y.toFixed(3)}<br>`;
    
    // If we have custom fields
    if (options.tooltipFields) {
      options.tooltipFields.forEach(field => {
        if (d[field.name] !== undefined) {
          content += `<strong>${field.label || field.name}:</strong> ${d[field.name]}<br>`;
        }
      });
    }
    
    return content;
  }
  
  // Apply the initial scales based on data
  updateScales(data);
  
  // Initial render
  updatePoints();
  
  // Append SVG to container
  container.appendChild(svg.node());
  
  // Function to highlight specific points
  function highlightPoints(ids) {
    if (!Array.isArray(ids)) {
      ids = [ids]; // Convert to array if string
    }
    
    pointsGroup.selectAll(".point")
      .attr("opacity", d => {
        const id = d.id || d.accession;
        return ids.includes(id) ? 1 : 0.3;
      })
      .attr("stroke-width", d => {
        const id = d.id || d.accession;
        return ids.includes(id) ? 2 : 1;
      })
      .attr("r", d => {
        const id = d.id || d.accession;
        return ids.includes(id) ? config.highlightRadius : config.pointRadius;
      });
  }
  
  // Function to clear highlights
  function clearHighlights() {
    pointsGroup.selectAll(".point")
      .attr("opacity", 0.8)
      .attr("stroke-width", 1)
      .attr("r", config.pointRadius);
  }
  
  // Function to clean up
  function cleanup() {
    window.removeEventListener('resize', handleResize);
    if (container && svg) {
      container.removeChild(svg.node());
    }
  }
  
  // Public API
  return {
    updateData: function(newData) {
      console.log(`Updating scatter plot with ${newData?.length || 0} data points`);
      // Store the new data
      data = newData || [];
      // First update scales with the new data
      updateScales(data);
      // Then update the points
      updatePoints();
    },
    
    highlight: highlightPoints,
    clearHighlights: clearHighlights,
    
    colorBy: function(property) {
      if (property) {
        config.colorBy = property;
        
        // Update points with new color scheme
        pointsGroup.selectAll(".point")
          .attr("fill", d => {
            const value = d[config.colorBy] || 'unknown';
            return config.colorScale(value);
          });
      }
      return config.colorBy;
    },
    
    resetView: function() {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    },
    
    cleanup: cleanup
  };
}

// Expose globally
window.createUmapScatterPlot = createUmapScatterPlot; 