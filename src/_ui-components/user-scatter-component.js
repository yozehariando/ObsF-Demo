/**
 * User Scatter Component
 * 
 * A simplified scatter plot component for visualizing user sequences
 * and their similarities to reference sequences.
 */

// Create user scatter plot
function createUserScatterPlot(containerId, data = [], options = {}) {
  console.log(`Creating user scatter plot for container ${containerId} with ${data.length} data points`);
  
  // Default configuration
  const config = {
    width: 600,
    height: 400,
    margin: { top: 20, right: 20, bottom: 40, left: 40 },
    transitionDuration: 500,
    pointRadius: 5,
    userPointRadius: 8,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
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
  
  console.log(`Using dimensions: ${config.width}x${config.height}`);

  // Calculate inner dimensions
  const innerWidth = config.width - config.margin.left - config.margin.right;
  const innerHeight = config.height - config.margin.top - config.margin.bottom;

  // Create SVG
  const svg = d3.create("svg")
    .attr("width", config.width)
    .attr("height", config.height);
  
  // Create group for the plot
  const g = svg.append("g")
    .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
  
  // Create scales (default domains if no data)
  const xScale = d3.scaleLinear()
    .domain(data.length > 0 ? d3.extent(data, d => d.x || d.X) : [-10, 10])
    .range([0, innerWidth]);
  
  const yScale = d3.scaleLinear()
    .domain(data.length > 0 ? d3.extent(data, d => d.y || d.Y) : [-10, 10])
    .range([innerHeight, 0]);
  
  // Add axes
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));
  
  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
  
  // Add axis labels
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 35)
    .text("UMAP Dimension 1");
  
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -35)
    .text("UMAP Dimension 2");
  
  // Create a group for the points
  const pointsGroup = g.append("g").attr("class", "points-group");
  
  // Add notice if no data
  if (data.length === 0) {
    g.append("text")
      .attr("class", "empty-notice")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .style("font-size", "14px")
      .style("fill", "#999")
      .text("Upload a sequence to see it plotted here");
  } else {
    // Add points if data exists
    updatePoints(data);
  }
  
  // Append SVG to container
  container.appendChild(svg.node());
  
  // Function to update points
  function updatePoints(pointsData) {
    // Remove empty notice if it exists
    g.select(".empty-notice").remove();
    
    // Process data - ensure we have x/y coordinates
    const processedData = pointsData.map(point => {
      return {
        ...point,
        x: point.x !== undefined ? point.x : (point.X !== undefined ? point.X : 0),
        y: point.y !== undefined ? point.y : (point.Y !== undefined ? point.Y : 0),
        isUserSequence: point.isUserSequence || point.isUserSeq || false
      };
    });
    
    console.log(`Rendering ${processedData.length} points in user scatter plot`);
    
    // Join data to points
    const points = pointsGroup.selectAll("circle")
      .data(processedData, d => d.id || d.accession);
    
    // Remove exiting points
    points.exit()
      .transition()
      .duration(config.transitionDuration)
      .attr("r", 0)
      .remove();
    
    // Update existing points
    points
      .transition()
      .duration(config.transitionDuration)
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", d => d.isUserSequence ? config.userPointRadius : config.pointRadius)
      .attr("fill", d => d.isUserSequence ? "#e63946" : config.colorScale(d.country || d.region || d.clade || "default"));
    
    // Add new points
    points.enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 0)
      .attr("fill", d => d.isUserSequence ? "#e63946" : config.colorScale(d.country || d.region || d.clade || "default"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", d.isUserSequence ? config.userPointRadius + 2 : config.pointRadius + 2)
          .attr("stroke-width", 2);
        
        // Show tooltip
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
            .style("opacity", 0);
        }
        
        d3.select("body").select(".tooltip")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .style("opacity", 1)
          .html(getTooltipContent(d));
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", d => d.isUserSequence ? config.userPointRadius : config.pointRadius)
          .attr("stroke-width", 1.5);
        
        d3.select("body").select(".tooltip")
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        if (options.onPointClick) {
          options.onPointClick(d);
        }
      })
      .transition()
      .duration(config.transitionDuration)
      .attr("r", d => d.isUserSequence ? config.userPointRadius : config.pointRadius);
  }
  
  // Helper to generate tooltip content
  function getTooltipContent(d) {
    let content = `<strong>ID:</strong> ${d.id || d.accession || 'Unknown'}<br>`;
    
    if (d.country || d.region) {
      content += `<strong>Location:</strong> ${d.country || d.region}<br>`;
    }
    
    if (d.similarity !== undefined) {
      content += `<strong>Similarity:</strong> ${(d.similarity * 100).toFixed(1)}%<br>`;
    }
    
    if (d.isUserSequence) {
      content += `<strong>Type:</strong> User Sequence<br>`;
    }
    
    return content;
  }
  
  // Public API
  return {
    updateData: function(newData) {
      console.log(`Updating user scatter plot with ${newData.length} data points`);
      
      if (newData.length > 0) {
        // Update scales with new domains
        const xExtent = d3.extent(newData, d => d.x || d.X);
        const yExtent = d3.extent(newData, d => d.y || d.Y);
        
        console.log(`New domains: X [${xExtent[0]}, ${xExtent[1]}], Y [${yExtent[0]}, ${yExtent[1]}]`);
        
        // Add padding to domains
        const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        
        xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
        yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);
        
        // Update axes
        g.select(".x-axis")
          .transition()
          .duration(config.transitionDuration)
          .call(d3.axisBottom(xScale));
        
        g.select(".y-axis")
          .transition()
          .duration(config.transitionDuration)
          .call(d3.axisLeft(yScale));
      }
      
      // Update points
      updatePoints(newData);
    },
    
    highlight: function(ids) {
      pointsGroup.selectAll("circle")
        .attr("opacity", d => ids.includes(d.id || d.accession) ? 1 : 0.3)
        .attr("stroke-width", d => ids.includes(d.id || d.accession) ? 2 : 1);
    },
    
    clearHighlights: function() {
      pointsGroup.selectAll("circle")
        .attr("opacity", 0.8)
        .attr("stroke-width", 1.5);
    }
  };
}

// Expose globally
window.createUserScatterPlot = createUserScatterPlot; 