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
      <span id="min-date-display">2013</span>
      <span id="max-date-display">2016</span>
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

// Helper function to get color for a country
function getCountryColor(nodeName) {
  // Extract country from node name if possible
  let country = null;
  
  if (nodeName.includes("Thailand")) country = "Thailand";
  else if (nodeName.includes("SG_")) country = "Singapore";
  else if (nodeName.includes("PF")) country = "French Polynesia";
  else if (nodeName.includes("American_Samoa")) country = "American Samoa";
  else if (nodeName.includes("Brazil")) country = "Brazil";
  else if (nodeName.includes("Colombia")) country = "Colombia";
  else if (nodeName.includes("Dominican_Republic")) country = "Dominican Republic";
  else if (nodeName.includes("Ecuador")) country = "Ecuador";
  else if (nodeName.includes("Guatemala")) country = "Guatemala";
  else if (nodeName.includes("Haiti")) country = "Haiti";
  else if (nodeName.includes("Honduras")) country = "Honduras";
  else if (nodeName.includes("Jamaica")) country = "Jamaica";
  else if (nodeName.includes("Martinique")) country = "Martinique";
  else if (nodeName.includes("Mexico")) country = "Mexico";
  else if (nodeName.includes("Nicaragua")) country = "Nicaragua";
  else if (nodeName.includes("Panama")) country = "Panama";
  else if (nodeName.includes("Puerto_Rico")) country = "Puerto Rico";
  else if (nodeName.includes("USA")) country = "USA";
  else if (nodeName.includes("Venezuela")) country = "Venezuela";
  
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

// Helper function to extract country from node name
function getCountryFromName(nodeName) {
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

// Helper function to extract year from node name
function extractYearFromName(nodeName) {
  if (!nodeName) return null;
  
  // Try to find a date pattern in the node name (YYYY-MM-DD)
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const match = nodeName.match(datePattern);
  
  if (match) {
    return parseInt(match[0].substring(0, 4));
  }
  
  // If no direct date, try to extract just the year
  const yearPattern = /\d{4}/;
  const yearMatch = nodeName.match(yearPattern);
  
  if (yearMatch) {
    return parseInt(yearMatch[0]);
  }
  
  return null;
}

// Function to create the tree visualization
async function initializeTree() {
  try {
    // Load the tree data from local file
    const auspiceData = await FileAttachment("data/zika-tree.json").json();
    console.log("Loaded tree data:", auspiceData);
    
    // Process the tree data
    function processTreeData(data) {
      // Extract the tree structure
      const tree = data.tree;
      
      // Function to recursively process nodes
      function processNode(node, depth = 0) {
        const processed = {
          name: node.name || "unnamed",
          branch_length: node.branch_length || 0,
          node_attrs: node.node_attrs || {},
          depth: depth,
          year: extractYearFromNodeAttrs(node)
        };
        
        // Add children if they exist
        if (node.children && node.children.length > 0) {
          processed.children = node.children.map(child => processNode(child, depth + 1));
        }
        
        return processed;
      }
      
      return processNode(tree);
    }
    
    // Helper function to extract year from node attributes
    function extractYearFromNodeAttrs(node) {
      if (node.node_attrs && node.node_attrs.num_date && node.node_attrs.num_date.value) {
        return Math.floor(node.node_attrs.num_date.value);
      }
      
      // If no num_date attribute, try to extract from name
      return extractYearFromName(node.name);
    }
    
    // Process the tree data
    const treeData = processTreeData(auspiceData);
    console.log("Processed tree data:", treeData);
    
    // Create a D3 hierarchy from the tree data
    const hierarchy = d3.hierarchy(treeData);
    
    // Set up the tree container
    const treeContainer = document.getElementById("tree-container");
    treeContainer.innerHTML = "";
    
    // Set up dimensions
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = treeContainer.clientWidth;
    const height = treeContainer.clientHeight;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create the SVG element
    const svg = d3.select("#tree-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create a tree layout
    const treeLayout = d3.tree().size([innerHeight, innerWidth]);
    
    // Apply the layout to the hierarchy
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
      .style("fill", d => getCountryColor(d.data.name))
      .style("stroke", "#555")
      .style("stroke-width", 1);
    
    // Add labels to leaf nodes
    nodes.filter(d => !d.children)
      .append("text")
      .attr("x", 8)
      .attr("y", 3)
      .style("font-size", "8px")
      .text(d => d.data.name.length > 25 ? d.data.name.substring(0, 25) + "..." : d.data.name);
    
    // Create a tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");
    
    // Add hover effects to nodes
    nodes.on("mouseover", function(event, d) {
      d3.select(this).select("circle")
        .transition()
        .duration(200)
        .attr("r", 6);
      
      // Show tooltip
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      // Format tooltip content
      let content = `<strong>Name:</strong> ${d.data.name}<br>`;
      content += `<strong>Country:</strong> ${getCountryFromName(d.data.name)}<br>`;
      if (d.data.year) {
        content += `<strong>Year:</strong> ${d.data.year}<br>`;
      }
      
      tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).select("circle")
        .transition()
        .duration(200)
        .attr("r", 4);
      
      // Hide tooltip
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
    
    // Extract all years from the tree
    const years = [];
    treeData2.descendants().forEach(node => {
      if (node.data.year) {
        years.push(node.data.year);
      }
    });
    
    // If no years found, use default range
    let minYear = 2013;
    let maxYear = 2016;
    
    if (years.length > 0) {
      minYear = Math.min(...years);
      maxYear = Math.max(...years);
    }
    
    console.log("Year range:", minYear, "to", maxYear);
    
    // Set up timeline
    const timelineSlider = document.getElementById("timeline-slider");
    const timelineTicks = document.getElementById("timeline-ticks");
    const minHandle = document.getElementById("min-handle");
    const maxHandle = document.getElementById("max-handle");
    const timelineWindow = document.getElementById("timeline-window");
    const minDateDisplay = document.getElementById("min-date-display");
    const maxDateDisplay = document.getElementById("max-date-display");
    const playPauseBtn = document.getElementById("play-pause-btn");
    const speedSelect = document.getElementById("animation-speed");
    
    // Create a scale for the timeline
    const timeScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, timelineSlider.clientWidth]);
    
    // Create ticks for the timeline
    const tickValues = d3.range(minYear, maxYear + 1);
    
    // Create SVG for ticks
    const ticksSvg = d3.select("#timeline-ticks")
      .append("svg")
      .attr("width", timelineSlider.clientWidth)
      .attr("height", 20);
    
    // Add ticks
    ticksSvg.selectAll(".timeline-tick")
      .data(tickValues)
      .enter()
      .append("line")
      .attr("class", "timeline-tick")
      .attr("x1", d => timeScale(d))
      .attr("y1", 0)
      .attr("x2", d => timeScale(d))
      .attr("y2", 6)
      .attr("stroke", "#666");
    
    // Add tick labels
    ticksSvg.selectAll(".timeline-tick-label")
      .data(tickValues)
      .enter()
      .append("text")
      .attr("class", "timeline-tick-label")
      .attr("x", d => timeScale(d))
      .attr("y", 16)
      .text(d => d);
    
    // Set up timeline state
    const timelineState = {
      playing: false,
      currentMinYear: minYear,
      currentMaxYear: minYear + Math.ceil((maxYear - minYear) / 3), // Start with about 1/3 of the range
      minYear: minYear,
      maxYear: maxYear,
      animationId: null
    };
    
    // Update min and max date displays
    minDateDisplay.textContent = timelineState.currentMinYear;
    maxDateDisplay.textContent = timelineState.currentMaxYear;
    
    // Function to update visualization based on timeline
    function updateVisualization() {
      const minYear = timelineState.currentMinYear;
      const maxYear = timelineState.currentMaxYear;
      
      // Update nodes
      nodes.style("opacity", d => {
        if (!d.data.year) return 0.2;
        return (d.data.year >= minYear && d.data.year <= maxYear) ? 1 : 0.2;
      });
      
      // Update links
      links.style("opacity", d => {
        const sourceYear = d.source.data.year;
        const targetYear = d.target.data.year;
        
        if (!sourceYear || !targetYear) return 0.2;
        
        // Show link if either source or target is in the time window
        return (sourceYear >= minYear && sourceYear <= maxYear) || 
               (targetYear >= minYear && targetYear <= maxYear) ? 1 : 0.2;
      });
    }
    
    // Set up drag behavior for min handle
    let isDraggingMin = false;
    
    minHandle.addEventListener("mousedown", () => {
      isDraggingMin = true;
    });
    
    // Set up drag behavior for max handle
    let isDraggingMax = false;
    
    maxHandle.addEventListener("mousedown", () => {
      isDraggingMax = true;
    });
    
    // Handle mouse move for both handles
    document.addEventListener("mousemove", (event) => {
      if (!isDraggingMin && !isDraggingMax) return;
      
      // Stop animation if dragging
      if (timelineState.playing) {
        timelineState.playing = false;
        playPauseBtn.textContent = "▶ Play";
        clearTimeout(timelineState.animationId);
      }
      
      // Get mouse position relative to timeline
      const rect = timelineSlider.getBoundingClientRect();
      const x = Math.max(0, Math.min(timelineSlider.clientWidth, event.clientX - rect.left));
      
      // Convert to year
      const year = Math.round(timeScale.invert(x));
      
      if (isDraggingMin) {
        // Update min year (but don't go past max year)
        timelineState.currentMinYear = Math.min(year, timelineState.currentMaxYear - 1);
        minDateDisplay.textContent = timelineState.currentMinYear;
        
        // Update handle position
        const newPos = timeScale(timelineState.currentMinYear);
        minHandle.style.left = `${newPos}px`;
        
        // Update window
        timelineWindow.style.left = `${newPos}px`;
        timelineWindow.style.width = `${timeScale(timelineState.currentMaxYear) - newPos}px`;
      } else if (isDraggingMax) {
        // Update max year (but don't go before min year)
        timelineState.currentMaxYear = Math.max(year, timelineState.currentMinYear + 1);
        maxDateDisplay.textContent = timelineState.currentMaxYear;
        
        // Update handle position
        const newPos = timeScale(timelineState.currentMaxYear);
        maxHandle.style.left = `${newPos}px`;
        
        // Update window
        timelineWindow.style.width = `${newPos - timeScale(timelineState.currentMinYear)}px`;
      }
      
      // Update visualization
      updateVisualization();
    });
    
    // Handle mouse up to stop dragging
    document.addEventListener("mouseup", () => {
      isDraggingMin = false;
      isDraggingMax = false;
    });
    
    // Function to advance the time window during animation
    function advanceTimeWindow() {
      if (!timelineState.playing) return;
      
      // Calculate window size
      const windowSize = timelineState.currentMaxYear - timelineState.currentMinYear;
      
      // Advance by 1 year
      timelineState.currentMinYear += 0.5;
      timelineState.currentMaxYear += 0.5;
      
      // If we've reached the end, loop back to the beginning
      if (timelineState.currentMaxYear > maxYear) {
        timelineState.currentMinYear = minYear;
        timelineState.currentMaxYear = minYear + windowSize;
      }
      
      // Update displays
      minDateDisplay.textContent = Math.floor(timelineState.currentMinYear);
      maxDateDisplay.textContent = Math.floor(timelineState.currentMaxYear);
      
      // Update handle positions
      const newMinPos = timeScale(timelineState.currentMinYear);
      const newMaxPos = timeScale(timelineState.currentMaxYear);
      
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
    const initialMinPos = timeScale(timelineState.currentMinYear);
    const initialMaxPos = timeScale(timelineState.currentMaxYear);
    
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

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", initializeTree);
initializeTree(); // Also try immediately in case we're already loaded
