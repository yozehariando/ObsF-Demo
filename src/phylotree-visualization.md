---
theme: dashboard
toc: false
---

# Zika Virus Phylogenetic Tree Visualization

<div class="card">
  <div class="card-title">Phylogenetic Tree</div>
  <div class="flex flex-wrap gap-2 mb-2">
    <div>
      <label class="mr-2">Layout:</label>
      <select id="tree-layout-select" class="p-1 border rounded">
        <option value="linear">Linear</option>
        <option value="radial">Radial</option>
      </select>
    </div>
    <div>
      <label class="mr-2">Sort by:</label>
      <select id="tree-sort-select" class="p-1 border rounded">
        <option value="default">Default</option>
        <option value="ascending">Node Name (A-Z)</option>
        <option value="descending">Node Name (Z-A)</option>
        <option value="country">Country</option>
      </select>
    </div>
    <button id="reset-tree-btn" class="px-2 py-1 bg-blue-100 border rounded">Reset View</button>
  </div>
  <div id="tree-container" style="width: 100%; height: 500px;"></div>
  
  <div class="mt-4">
    <div class="flex justify-between items-center mb-2">
      <h3>Timeline Control</h3>
      <div class="flex items-center">
        <button id="play-pause-btn" class="px-2 py-1 bg-blue-100 border rounded mr-2">▶ Play</button>
        <select id="animation-speed" class="p-1 border rounded">
          <option value="slow">Slow</option>
          <option value="medium" selected>Medium</option>
          <option value="fast">Fast</option>
        </select>
      </div>
    </div>
    <div id="timeline-slider" class="w-full h-12 bg-gray-100 rounded relative">
      <div id="timeline-track" class="absolute left-0 right-0 h-2 bg-gray-300 top-5"></div>
      <div id="timeline-window" class="absolute h-full bg-blue-200 opacity-50" style="left: 10%; width: 20%;"></div>
      <div id="min-handle" class="absolute top-0 h-12 w-4 bg-blue-500 rounded cursor-ew-resize" style="left: 10%;"></div>
      <div id="max-handle" class="absolute top-0 h-12 w-4 bg-blue-500 rounded cursor-ew-resize" style="left: 30%;"></div>
      <div id="timeline-ticks" class="absolute left-0 right-0 top-8 h-4"></div>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span id="min-date-display">Jan 2013</span>
      <span id="max-date-display">Dec 2016</span>
    </div>
  </div>
</div>

```js
// Load D3.js v7
const d3Script = document.createElement("script");
d3Script.src = "https://d3js.org/d3.v7.min.js";
document.head.appendChild(d3Script);
await new Promise(resolve => d3Script.onload = resolve);

// Add CSS for the visualization
const style = document.createElement('style');
style.textContent = `
  .node circle {
    fill: #999;
    stroke: #555;
    stroke-width: 1px;
  }
  
  .node text {
    font: 10px sans-serif;
  }
  
  .link {
    fill: none;
    stroke: #555;
    stroke-width: 1px;
  }
  
  .tooltip {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    pointer-events: none;
    opacity: 0;
    z-index: 1000;
  }
  
  .timeline-tick {
    stroke: #666;
    stroke-width: 1px;
  }
  
  .timeline-tick-label {
    font-size: 10px;
    text-anchor: middle;
  }
  
  #min-handle, #max-handle {
    z-index: 10;
  }
`;
document.head.appendChild(style);

// Helper functions for country colors and names
function getCountryColor(nodeName) {
  // Extract country from node name if possible
  let country = getCountryFromName(nodeName);
  
  // Return color based on country
  switch (country) {
    case "Thailand": return "#511EA8";
    case "Singapore": return "#4334BF";
    case "French Polynesia": return "#4041C7";
    case "American Samoa": return "#3F50CC";
    case "Brazil": return "#56A0AF";
    case "Ecuador": return "#63AC99";
    case "Colombia": return "#6BB18E";
    case "Venezuela": return "#86BB6E";
    case "Panama": return "#A4BE56";
    case "Nicaragua": return "#AFBD4F";
    case "Honduras": return "#B9BC4A";
    case "Guatemala": return "#CCB742";
    case "Puerto Rico": return "#E68234";
    case "Dominican Republic": return "#E4632E";
    case "USA": return "#DC2F24";
    default: return "#999999";
  }
}

function getCountryFromName(nodeName) {
  if (!nodeName) return "Unknown";
  
  if (nodeName.includes("Thailand")) return "Thailand";
  else if (nodeName.includes("SG_")) return "Singapore";
  else if (nodeName.includes("PF")) return "French Polynesia";
  else if (nodeName.includes("American_Samoa")) return "American Samoa";
  else if (nodeName.includes("Brazil")) return "Brazil";
  else if (nodeName.includes("Colombia")) return "Colombia";
  else if (nodeName.includes("Dominican_Republic")) return "Dominican Republic";
  else if (nodeName.includes("Ecuador")) return "Ecuador";
  else if (nodeName.includes("Guatemala")) return "Guatemala";
  else if (nodeName.includes("Haiti")) return "Haiti";
  else if (nodeName.includes("Honduras")) return "Honduras";
  else if (nodeName.includes("Jamaica")) return "Jamaica";
  else if (nodeName.includes("Martinique")) return "Martinique";
  else if (nodeName.includes("Mexico")) return "Mexico";
  else if (nodeName.includes("Nicaragua")) return "Nicaragua";
  else if (nodeName.includes("Panama")) return "Panama";
  else if (nodeName.includes("Puerto_Rico")) return "Puerto Rico";
  else if (nodeName.includes("USA")) return "USA";
  else if (nodeName.includes("Venezuela")) return "Venezuela";
  else return "Unknown";
}

// Format date for display (e.g., "Jan 2015")
function formatDate(date) {
  if (!date) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Extract date from node attributes or name
function extractDateFromNodeAttrs(node) {
  // First try to get date from num_date attribute
  if (node.node_attrs && node.node_attrs.num_date && node.node_attrs.num_date.value) {
    const decimalDate = node.node_attrs.num_date.value;
    return decimalToDate(decimalDate);
  }
  
  // If no num_date attribute, try to extract from name
  return extractDateFromName(node.name);
}

// Convert decimal year to Date object
function decimalToDate(decimal) {
  const year = Math.floor(decimal);
  const remainder = decimal - year;
  const millisInYear = 365.25 * 24 * 60 * 60 * 1000;
  const millisFromStartOfYear = remainder * millisInYear;
  const dateObj = new Date(year, 0, 1);
  dateObj.setMilliseconds(dateObj.getMilliseconds() + millisFromStartOfYear);
  return dateObj;
}

// Extract date from node name
function extractDateFromName(nodeName) {
  if (!nodeName) return null;
  
  // Try to find a date pattern in the node name (YYYY-MM-DD)
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const match = nodeName.match(datePattern);
  
  if (match) {
    return new Date(match[0]);
  }
  
  // If no direct date, try to extract just the year
  const yearPattern = /\d{4}/;
  const yearMatch = nodeName.match(yearPattern);
  
  if (yearMatch) {
    // Assume middle of the year if only year is available
    return new Date(yearMatch[0] + "-07-01");
  }
  
  return null;
}

// Convert Date to decimal year
function dateToDecimal(date) {
  if (!date) return null;
  
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const millisInYear = endOfYear - startOfYear;
  const millisSinceStartOfYear = date - startOfYear;
  
  return year + (millisSinceStartOfYear / millisInYear);
}

// Main function to initialize the tree
async function initializeTree() {
  try {
    // Load the tree data
    const auspiceData = await FileAttachment("data/zika-tree.json").json();
    console.log("Loaded Auspice data:", auspiceData);
    
    // Process the tree data
    const treeData = processTreeData(auspiceData.tree);
    
    // Set up the tree container
    const container = document.getElementById("tree-container");
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = container.clientWidth;
    const height = container.clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Clear any existing SVG
    d3.select(container).selectAll("svg").remove();
    
    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create a hierarchy from the tree data
    const hierarchy = d3.hierarchy(treeData);
    
    // Create a tree layout
    const treeLayout = d3.tree().size([innerHeight, innerWidth]);
    
    // Apply the layout
    const treeData2 = treeLayout(hierarchy);
    
    // Create links
    const links = svg.selectAll(".link")
      .data(treeData2.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));
    
    // Create nodes
    const nodes = svg.selectAll(".node")
      .data(treeData2.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);
    
    // Add circles to nodes
    nodes.append("circle")
      .attr("r", 4)
      .style("fill", d => getCountryColor(d.data.name));
    
    // Add labels to leaf nodes
    nodes.filter(d => !d.children)
      .append("text")
      .attr("dy", ".31em")
      .attr("x", 8)
      .attr("text-anchor", "start")
      .text(d => d.data.name.split("/").pop())
      .style("font-size", "8px");
    
    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");
    
    // Add tooltip behavior
    nodes.on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      
      const country = getCountryFromName(d.data.name);
      const date = d.data.date ? formatDate(d.data.date) : "Unknown";
      
      tooltip.html(`
        <strong>Name:</strong> ${d.data.name}<br>
        <strong>Country:</strong> ${country}<br>
        <strong>Date:</strong> ${date}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
    
    // Process dates for all nodes
    const allDates = [];
    treeData2.descendants().forEach(node => {
      // Try to extract date from node attributes or name
      const date = extractDateFromNodeAttrs(node.data);
      node.data.date = date;
      
      if (date) {
        allDates.push(date);
      }
    });
    
    // Find min and max dates
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Convert to decimal years for easier animation
    const minDecimal = dateToDecimal(minDate);
    const maxDecimal = dateToDecimal(maxDate);
    
    console.log("Date range:", formatDate(minDate), "to", formatDate(maxDate));
    
    // Set up timeline elements
    const timelineSlider = document.getElementById("timeline-slider");
    const timelineTrack = document.getElementById("timeline-track");
    const timelineWindow = document.getElementById("timeline-window");
    const minHandle = document.getElementById("min-handle");
    const maxHandle = document.getElementById("max-handle");
    const minDateDisplay = document.getElementById("min-date-display");
    const maxDateDisplay = document.getElementById("max-date-display");
    const timelineTicks = document.getElementById("timeline-ticks");
    const playPauseBtn = document.getElementById("play-pause-btn");
    const speedSelect = document.getElementById("animation-speed");
    
    // Create a scale for the timeline
    const timeScale = d3.scaleLinear()
      .domain([minDecimal, maxDecimal])
      .range([0, timelineSlider.clientWidth]);
    
    // Add ticks to the timeline
    const tickValues = [];
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    
    // Add quarterly ticks
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month += 3) {
        const tickDate = new Date(year, month, 1);
        const tickDecimal = dateToDecimal(tickDate);
        
        if (tickDecimal >= minDecimal && tickDecimal <= maxDecimal) {
          tickValues.push({
            date: tickDate,
            decimal: tickDecimal,
            major: month === 0  // Major tick for January
          });
        }
      }
    }
    
    // Create SVG for ticks
    const ticksSvg = d3.select(timelineTicks)
      .append("svg")
      .attr("width", timelineSlider.clientWidth)
      .attr("height", 20);
    
    // Add tick marks
    ticksSvg.selectAll(".timeline-tick")
      .data(tickValues)
      .enter()
      .append("line")
      .attr("class", "timeline-tick")
      .attr("x1", d => timeScale(d.decimal))
      .attr("y1", 0)
      .attr("x2", d => timeScale(d.decimal))
      .attr("y2", d => d.major ? 10 : 5)
      .style("stroke", "#666")
      .style("stroke-width", d => d.major ? 1.5 : 0.5);
    
    // Add labels for major ticks (January of each year)
    ticksSvg.selectAll(".timeline-tick-label")
      .data(tickValues.filter(d => d.major))
      .enter()
      .append("text")
      .attr("class", "timeline-tick-label")
      .attr("x", d => timeScale(d.decimal))
      .attr("y", 20)
      .text(d => d.date.getFullYear())
      .style("font-size", "9px");
    
    // Set up timeline state
    const timelineState = {
      currentMinDate: new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * 0.1),
      currentMaxDate: new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) * 0.3),
      currentMinDecimal: minDecimal + (maxDecimal - minDecimal) * 0.1,
      currentMaxDecimal: minDecimal + (maxDecimal - minDecimal) * 0.3,
      playing: false,
      animationId: null
    };
    
    // Update min/max date displays
    minDateDisplay.textContent = formatDate(timelineState.currentMinDate);
    maxDateDisplay.textContent = formatDate(timelineState.currentMaxDate);
    
    // Function to update visualization based on current timeline window
    function updateVisualization() {
      // Update node opacity based on date
      nodes.style("opacity", d => {
        if (!d.data.date) return 0.2;
        
        const nodeTime = d.data.date.getTime();
        const minTime = timelineState.currentMinDate.getTime();
        const maxTime = timelineState.currentMaxDate.getTime();
        
        return (nodeTime >= minTime && nodeTime <= maxTime) ? 1 : 0.2;
      });
      
      // Update link opacity based on target node date
      links.style("opacity", d => {
        if (!d.target.data.date) return 0.2;
        
        const nodeTime = d.target.data.date.getTime();
        const minTime = timelineState.currentMinDate.getTime();
        const maxTime = timelineState.currentMaxDate.getTime();
        
        return (nodeTime >= minTime && nodeTime <= maxTime) ? 1 : 0.2;
      });
    }
    
    // Variables to track dragging state
    let draggingMin = false;
    let draggingMax = false;
    
    // Handle mouse down on handles
    minHandle.addEventListener("mousedown", () => {
      draggingMin = true;
    });
    
    maxHandle.addEventListener("mousedown", () => {
      draggingMax = true;
    });
    
    // Handle mouse move for dragging
    document.addEventListener("mousemove", (event) => {
      if (!draggingMin && !draggingMax) return;
      
      // Get mouse position relative to timeline
      const rect = timelineSlider.getBoundingClientRect();
      const x = event.clientX - rect.left;
      
      // Convert to decimal year
      const decimal = timeScale.invert(x);
      
      if (draggingMin) {
        // Ensure min doesn't go past max - 3 months
        const minLimit = timelineState.currentMaxDecimal - 0.25; // Approx 3 months
        timelineState.currentMinDecimal = Math.min(minLimit, decimal);
        timelineState.currentMinDecimal = Math.max(minDecimal, timelineState.currentMinDecimal);
        
        // Convert decimal back to date
        timelineState.currentMinDate = decimalToDate(timelineState.currentMinDecimal);
        
        // Update display
        minDateDisplay.textContent = formatDate(timelineState.currentMinDate);
        
        // Update handle position
        const newPos = timeScale(timelineState.currentMinDecimal);
        minHandle.style.left = `${newPos}px`;
        timelineWindow.style.left = `${newPos}px`;
        timelineWindow.style.width = `${timeScale(timelineState.currentMaxDecimal) - newPos}px`;
        
        // Update visualization
        updateVisualization();
      }
      
      if (draggingMax) {
        // Ensure max doesn't go before min + 3 months
        const maxLimit = timelineState.currentMinDecimal + 0.25; // Approx 3 months
        timelineState.currentMaxDecimal = Math.max(maxLimit, decimal);
        timelineState.currentMaxDecimal = Math.min(maxDecimal, timelineState.currentMaxDecimal);
        
        // Convert decimal back to date
        timelineState.currentMaxDate = decimalToDate(timelineState.currentMaxDecimal);
        
        // Update display
        maxDateDisplay.textContent = formatDate(timelineState.currentMaxDate);
        
        // Update handle position
        const newPos = timeScale(timelineState.currentMaxDecimal);
        maxHandle.style.left = `${newPos}px`;
        timelineWindow.style.width = `${newPos - timeScale(timelineState.currentMinDecimal)}px`;
        
        // Update visualization
        updateVisualization();
      }
    });
    
    // Handle mouse up to stop dragging
    document.addEventListener("mouseup", () => {
      draggingMin = false;
      draggingMax = false;
    });
    
    // Function to advance the time window during animation
    function advanceTimeWindow() {
      if (!timelineState.playing) return;
      
      // Calculate window size
      const windowSize = timelineState.currentMaxDecimal - timelineState.currentMinDecimal;
      
      // Advance by 0.05 year (about 2-3 weeks) for smoother animation
      timelineState.currentMinDecimal += 0.05;
      timelineState.currentMaxDecimal += 0.05;
      
      // Check if we've reached the end
      if (timelineState.currentMaxDecimal > maxDecimal) {
        // Reset to beginning
        timelineState.currentMinDecimal = minDecimal;
        timelineState.currentMaxDecimal = minDecimal + windowSize;
      }
      
      // Convert decimals back to dates
      timelineState.currentMinDate = decimalToDate(timelineState.currentMinDecimal);
      timelineState.currentMaxDate = decimalToDate(timelineState.currentMaxDecimal);
      
      // Update displays
      minDateDisplay.textContent = formatDate(timelineState.currentMinDate);
      maxDateDisplay.textContent = formatDate(timelineState.currentMaxDate);
      
      // Update handle positions
      const newMinPos = timeScale(timelineState.currentMinDecimal);
      const newMaxPos = timeScale(timelineState.currentMaxDecimal);
      
      minHandle.style.left = `${newMinPos}px`;
      maxHandle.style.left = `${newMaxPos}px`;
      timelineWindow.style.left = `${newMinPos}px`;
      timelineWindow.style.width = `${newMaxPos - newMinPos}px`;
      
      // Update visualization
      updateVisualization();
      
      // Schedule next frame
      const speed = getAnimationSpeed();
      timelineState.animationId = setTimeout(advanceTimeWindow, speed);
    }
    
    // Function to get animation speed from dropdown
    function getAnimationSpeed() {
      const speedValue = speedSelect.value;
      switch (speedValue) {
        case "slow": return 1000;
        case "fast": return 250;
        default: return 500; // medium
      }
    }
    
    // Set up play/pause button
    playPauseBtn.addEventListener("click", () => {
      timelineState.playing = !timelineState.playing;
      
      if (timelineState.playing) {
        playPauseBtn.textContent = "⏸ Pause";
        advanceTimeWindow();
      } else {
        playPauseBtn.textContent = "▶ Play";
        clearTimeout(timelineState.animationId);
      }
    });
    
    // Set up speed selector
    speedSelect.addEventListener("change", () => {
      if (timelineState.playing) {
        // Restart animation with new speed
        clearTimeout(timelineState.animationId);
        advanceTimeWindow();
      }
    });
    
    // Set up layout selector
    d3.select("#tree-layout-select").on("change", function() {
      const layout = this.value;
      
      if (layout === "radial") {
        // Create a radial tree layout
        const radialLayout = d3.tree()
          .size([2 * Math.PI, Math.min(innerWidth, innerHeight) / 2]);
        
        // Apply the layout
        const radialData = radialLayout(hierarchy);
        
        // Update node positions
        nodes.transition()
          .duration(750)
          .attr("transform", d => {
            const x = radialData.descendants().find(n => n.data.name === d.data.name).x;
            const y = radialData.descendants().find(n => n.data.name === d.data.name).y;
            return `translate(${y * Math.cos(x - Math.PI / 2) + innerWidth / 2},${y * Math.sin(x - Math.PI / 2) + innerHeight / 2})`;
          });
        
        // Update links
        links.transition()
          .duration(750)
          .attr("d", d3.linkRadial()
            .angle(d => {
              const node = radialData.descendants().find(n => n.data.name === d.target.data.name);
              return node.x;
            })
            .radius(d => {
              const node = radialData.descendants().find(n => n.data.name === d.target.data.name);
              return node.y;
            })
          )
          .attr("transform", `translate(${innerWidth / 2},${innerHeight / 2})`);
      } else {
        // Revert to linear layout
        nodes.transition()
          .duration(750)
          .attr("transform", d => `translate(${d.y},${d.x})`);
        
        links.transition()
          .duration(750)
          .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x))
          .attr("transform", null);
      }
    });
    
    // Set up sort selector
    d3.select("#tree-sort-select").on("change", function() {
      const sortBy = this.value;
      
      if (sortBy === "ascending") {
        hierarchy.sort((a, b) => a.data.name.localeCompare(b.data.name));
      } else if (sortBy === "descending") {
        hierarchy.sort((a, b) => b.data.name.localeCompare(a.data.name));
      } else if (sortBy === "country") {
        hierarchy.sort((a, b) => {
          const countryA = getCountryFromName(a.data.name);
          const countryB = getCountryFromName(b.data.name);
          return countryA.localeCompare(countryB) || a.data.name.localeCompare(b.data.name);
        });
      } else {
        // Default sorting (as in the original tree)
        hierarchy.sort(null);
      }
      
      // Reapply the layout
      const newTreeData = treeLayout(hierarchy);
      
      // Update node positions
      nodes.transition()
        .duration(750)
        .attr("transform", d => {
          const newNode = newTreeData.descendants().find(n => n.data.name === d.data.name);
          return `translate(${newNode.y},${newNode.x})`;
        });
      
      // Update links
      links.transition()
        .duration(750)
        .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
    });
    
    // Set up reset button
    d3.select("#reset-tree-btn").on("click", function() {
      // Reset to default layout
      const defaultTreeData = treeLayout(hierarchy);
      
      // Update node positions
      nodes.transition()
        .duration(750)
        .attr("transform", d => {
          const defaultNode = defaultTreeData.descendants().find(n => n.data.name === d.data.name);
          return `translate(${defaultNode.y},${defaultNode.x})`;
        });
      
      // Update links
      links.transition()
        .duration(750)
        .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
    });
    
    // Initialize timeline positions
    const initialMinPos = timeScale(timelineState.currentMinDecimal);
    const initialMaxPos = timeScale(timelineState.currentMaxDecimal);
    
    minHandle.style.left = `${initialMinPos}px`;
    maxHandle.style.left = `${initialMaxPos}px`;
    timelineWindow.style.left = `${initialMinPos}px`;
    timelineWindow.style.width = `${initialMaxPos - initialMinPos}px`;
    
    // Initial visualization update
    updateVisualization();
    
    console.log("Tree visualization initialized successfully");
    return true;
  } catch (error) {
    console.error("Error creating tree visualization:", error);
    return false;
  }
}

// Helper function to process tree data
function processTreeData(node) {
  // Create a simplified node object
  const processed = {
    name: node.name || "unnamed",
    branch_length: node.branch_length || 0,
    node_attrs: node.node_attrs || {}
  };
  
  // Add children if they exist
  if (node.children && node.children.length > 0) {
    processed.children = node.children.map(child => processTreeData(child));
  }
  
  return processed;
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", initializeTree);
initializeTree(); // Also try immediately in case we're already loaded