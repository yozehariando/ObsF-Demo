/**
 * Map Visualization Component
 * 
 * Creates an interactive world map visualization for the geographic distribution
 * of genetic sequences. Features include zooming, tooltips, and data point highlighting.
 */

// Create map visualization
function createMap(containerId, data = [], options = {}) {
  console.log(`Creating map visualization for container ${containerId} with ${data.length} data points`);
  
  // Default configuration
  const config = {
    width: 800,
    height: 500,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    worldMapUrl: 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json',
    center: [0, 15], // Default center of the map [longitude, latitude]
    scale: 150,
    pointRadius: 4,
    highlightRadius: 6,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    colorBy: 'country',
    tooltipWidth: 200,
    debounceDelay: 250,
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
  const worldMapGroup = g.append("g").attr("class", "world-map");
  const pointsGroup = g.append("g").attr("class", "points-group");
  
  // Set up projection
  const projection = d3.geoMercator()
    .center(config.center)
    .scale(config.scale)
    .translate([
      (config.width - config.margin.left - config.margin.right) / 2,
      (config.height - config.margin.top - config.margin.bottom) / 2
    ]);
  
  // Create path generator
  const path = d3.geoPath().projection(projection);
  
  // Load world map data if not provided
  let worldMapData = options.worldMapData;
  if (!worldMapData) {
    // Fetch the world map data
    d3.json(config.worldMapUrl).then(loadedData => {
      worldMapData = loadedData;
      drawWorldMap();
      drawDataPoints();
    }).catch(error => {
      console.error("Error loading world map data:", error);
      g.append("text")
        .attr("x", (config.width - config.margin.left - config.margin.right) / 2)
        .attr("y", (config.height - config.margin.top - config.margin.bottom) / 2)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .text("Error loading world map data");
    });
  } else {
    drawWorldMap();
    drawDataPoints();
  }
  
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
    .scaleExtent([1, 8])
    .on("zoom", function(event) {
      g.attr("transform", event.transform);
    });
  
  svg.call(zoom);
  
  // Function to draw the world map
  function drawWorldMap() {
    if (!worldMapData) return;
    
    // Draw countries
    worldMapGroup.selectAll("path")
      .data(topojson.feature(worldMapData, worldMapData.objects.countries).features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#e0e0e0")
      .attr("stroke", "#a0a0a0")
      .attr("stroke-width", 0.5);
  }
  
  // Function to draw data points
  function drawDataPoints() {
    // Remove existing points
    pointsGroup.selectAll(".map-point").remove();
    
    if (!data || data.length === 0) {
      // Add placeholder if no data
      g.append("text")
        .attr("x", (config.width - config.margin.left - config.margin.right) / 2)
        .attr("y", (config.height - config.margin.top - config.margin.bottom) / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#999")
        .text(options.emptyMessage || "No data available");
      return;
    }
    
    // Add points
    pointsGroup.selectAll(".map-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "map-point")
      .attr("cx", d => {
        const coords = projection([d.longitude || d.lng, d.latitude || d.lat]);
        return coords ? coords[0] : 0;
      })
      .attr("cy", d => {
        const coords = projection([d.longitude || d.lng, d.latitude || d.lat]);
        return coords ? coords[1] : 0;
      })
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
      { field: 'count', label: 'Count' },
      { field: 'clade', label: 'Clade' },
      { field: 'lineage', label: 'Lineage' }
    ];
    
    metadataFields.forEach(({ field, label }) => {
      if (d[field] !== undefined) {
        content += `<strong>${label}:</strong> ${d[field]}<br>`;
      }
    });
    
    // Add coordinates
    if ((d.latitude !== undefined && d.longitude !== undefined) || 
        (d.lat !== undefined && d.lng !== undefined)) {
      const lat = d.latitude || d.lat;
      const lng = d.longitude || d.lng;
      content += `<strong>Lat:</strong> ${lat.toFixed(2)}, <strong>Lon:</strong> ${lng.toFixed(2)}<br>`;
    }
    
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
  
  // Function to highlight specific points
  function highlightPoints(ids) {
    if (!Array.isArray(ids)) {
      ids = [ids]; // Convert to array if string
    }
    
    pointsGroup.selectAll(".map-point")
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
    pointsGroup.selectAll(".map-point")
      .attr("opacity", 0.8)
      .attr("stroke-width", 1)
      .attr("r", config.pointRadius);
  }
  
  // Setup resize handler using debounce
  let resizeTimer;
  const handleResize = function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      config.width = container.clientWidth;
      config.height = container.clientHeight;
      
      svg.attr("width", config.width)
        .attr("height", config.height);
      
      // Update projection
      projection
        .translate([
          (config.width - config.margin.left - config.margin.right) / 2,
          (config.height - config.margin.top - config.margin.bottom) / 2
        ]);
      
      // Redraw map and points
      if (worldMapData) {
        worldMapGroup.selectAll("path").attr("d", path);
      }
      
      drawDataPoints();
    }, config.debounceDelay);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Function to update data
  function updateData(newData) {
    console.log(`Updating map with ${newData.length} data points`);
    data = newData;
    drawDataPoints();
  }
  
  // Function to clean up
  function cleanup() {
    window.removeEventListener('resize', handleResize);
    if (container && svg) {
      container.removeChild(svg.node());
    }
  }
  
  // Append SVG to container
  container.appendChild(svg.node());
  
  // Return public API
  return {
    updateData: updateData,
    updateMap: updateData, // Alias for compatibility with original component
    highlight: highlightPoints,
    clearHighlights: clearHighlights,
    colorBy: function(property) {
      if (property) {
        config.colorBy = property;
        
        // Update points with new color scheme
        pointsGroup.selectAll(".map-point")
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
window.createMap = createMap; 