---
theme: dashboard
toc: false
---

# Zika Virus Phylogenetic Analysis - (before play timeline feature)

This visualization shows the evolutionary relationships of Zika virus samples and their geographic distribution.

```js
import * as d3 from "d3";
import * as topojson from "topojson-client";
```

```js
// Load the Nextstrain JSON data
const auspiceData = await FileAttachment("data/zika-tree.json").json();
console.log("Loaded Auspice data:", auspiceData);

// Load the metadata
const metadata = await FileAttachment("data/zika-authors.tsv").tsv();
console.log("Loaded metadata:", metadata);

// Load world map data
const worldMapData = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");

// Process the tree data from Auspice JSON
function processTreeData(data) {
  // Extract the tree structure
  const tree = data.tree;
  
  // Function to recursively process nodes
  function processNode(node, depth = 0) {
    const processed = {
      name: node.name || "unnamed",
      branch_length: node.branch_length || 0,
      node_attrs: node.node_attrs || {},
      depth: depth
    };
    
    // Add children if they exist
    if (node.children && node.children.length > 0) {
      processed.children = node.children.map(child => processNode(child, depth + 1));
    }
    
    return processed;
  }
  
  return processNode(tree);
}

// Process the geographic data
function processGeoData(data) {
  const geoData = [];
  
  // Function to recursively extract location data from nodes
  function extractLocations(node) {
    // Check if this node has location data
    if (node.node_attrs && node.node_attrs.country) {
      const country = node.node_attrs.country.value;
      // Only add leaf nodes (samples) to the map
      if (!node.children) {
        geoData.push({
          name: node.name,
          country: country,
          // You might need to add coordinates based on country
          // This is a simplification - real data would have actual coordinates
          coordinates: getCountryCoordinates(country)
        });
      }
    }
    
    // Process children
    if (node.children) {
      node.children.forEach(extractLocations);
    }
  }
  
  extractLocations(data.tree);
  return geoData;
}

// Helper function to get approximate coordinates for countries
// In a real implementation, you would use actual coordinates from the data
function getCountryCoordinates(country) {
  const countryCoords = {
    "Thailand": [100.9925, 15.8700],
    "Singapore": [103.8198, 1.3521],
    "French Polynesia": [-149.4068, -17.6797],
    "American Samoa": [-170.7020, -14.2710],
    "Brazil": [-51.9253, -14.2350],
    "Ecuador": [-78.1834, -1.8312],
    "Colombia": [-74.2973, 4.5709],
    "Venezuela": [-66.5897, 6.4238],
    "Panama": [-80.7821, 8.5380],
    "Nicaragua": [-85.2072, 12.8654],
    "Honduras": [-86.2419, 15.1994],
    "Guatemala": [-90.2308, 15.7835],
    "Puerto Rico": [-66.5901, 18.2208],
    "Dominican Republic": [-70.1627, 18.7357],
    "USA": [-95.7129, 37.0902]
  };
  
  return countryCoords[country] || [0, 0];
}

// Process the data
const treeData = processTreeData(auspiceData);
const geoData = processGeoData(auspiceData);

// Create a shared state object to manage interactions
const state = {
  selectedNode: null,
  hoveredNode: null,
  treeLayout: "linear", // "linear" or "radial"
  sortBy: "default", // "default", "ascending", "descending", "country"
  labelAlign: "right", // "right" or "left"
  hoveredCountry: null
};

// Function to update the state and trigger visualization updates
function updateState(newState) {
  Object.assign(state, newState);
  
  // Update visualizations based on state changes
  if (state.selectedNode) {
    highlightNodeOnMap(state.selectedNode);
    highlightNodeOnTree(state.selectedNode);
  } else if (state.hoveredCountry) {
    // Highlight all nodes from a country
    highlightCountryOnMap(state.hoveredCountry);
    highlightCountryOnTree(state.hoveredCountry);
  } else {
    // Reset highlighting if no node is selected or hovered
    resetHighlighting();
  }
}

// Function to highlight a node on the map
function highlightNodeOnMap(nodeName) {
  // First, find the node data to get its location
  const nodeData = geoData.find(d => d.name === nodeName);
  if (!nodeData) return;
  
  // Get the sample count for this location
  const locationKey = `${nodeData.country}-${nodeData.coordinates[0]}-${nodeData.coordinates[1]}`;
  const sampleCounts = {};
  geoData.forEach(d => {
    const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
    sampleCounts[key] = (sampleCounts[key] || 0) + 1;
  });
  const count = sampleCounts[locationKey] || 1;
  
  // Create a radius scale
  const maxCount = Math.max(...Object.values(sampleCounts));
  const radiusScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 15]);
  
  // Highlight the node
  d3.select("#map-container svg")
    .selectAll("circle")
    .each(function(d) {
      if (!d) return; // Skip if data is undefined
      
      const isSelected = d.name === nodeName;
      const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const pointCount = sampleCounts[key] || 1;
      
      d3.select(this)
        .attr("r", isSelected ? radiusScale(pointCount) * 1.5 : radiusScale(pointCount))
        .attr("stroke-width", isSelected ? 2.5 : 1.5)
        .attr("opacity", isSelected ? 1 : 0.9);
    });
}

// Function to reset all highlighting
function resetHighlighting() {
  // Reset map highlighting
  const sampleCounts = {};
  geoData.forEach(d => {
    const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
    sampleCounts[key] = (sampleCounts[key] || 0) + 1;
  });
  
  const maxCount = Math.max(...Object.values(sampleCounts));
  const radiusScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 15]);
  
  d3.select("#map-container svg")
    .selectAll("circle")
    .each(function(d) {
      if (!d) return; // Skip if data is undefined
      
      const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const pointCount = sampleCounts[key] || 1;
      
      d3.select(this)
        .attr("r", radiusScale(pointCount))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.9);
    });
  
  // Reset transmission lines
  d3.select("#map-container svg")
    .selectAll(".transmission-line")
    .attr("stroke-opacity", 0.6)
    .each(function() {
      const line = d3.select(this);
      const tooltipText = line.on("mouseover").toString();
      const countMatch = tooltipText.match(/Count: (\d+)/);
      const count = countMatch ? parseInt(countMatch[1]) : 1;
      
      line.attr("stroke-width", Math.min(1 + Math.log(count), 3));
    });
  
  // Reset tree nodes
  d3.select("#tree-container svg")
    .selectAll(".node")
    .attr("r", d => d.children ? 2 : 3)
    .attr("stroke-width", 0.5)
    .attr("opacity", 1); // Reset opacity to full
    
  // Reset tree labels with updated font size
  d3.select("#tree-container svg")
    .selectAll(".node-label")
    .attr("font-weight", "normal")
    .attr("font-size", "10px") // Updated font size
    .attr("opacity", 1);
    
  // Reset tree branches
  d3.select("#tree-container svg")
    .selectAll(".branch")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.7); // Reset to default opacity
}

// Function to highlight a node on the tree
function highlightNodeOnTree(nodeName) {
  d3.select("#tree-container svg")
    .selectAll(".node")
    .attr("r", d => {
      if (!d || !d.data) return d.children ? 2 : 3;
      return d.data.name === nodeName ? 6 : (d.children ? 2 : 3);
    })
    .attr("stroke-width", d => {
      if (!d || !d.data) return 0.5;
      return d.data.name === nodeName ? 2 : 0.5;
    });
    
  // Also highlight the label
  d3.select("#tree-container svg")
    .selectAll(".node-label")
    .attr("font-weight", d => {
      if (!d || !d.data) return "normal";
      return d.data.name === nodeName ? "bold" : "normal";
    })
    .attr("font-size", d => {
      if (!d || !d.data) return "10px"; // Updated font size
      return d.data.name === nodeName ? "12px" : "10px"; // Updated font sizes
    });
}

// Function to highlight all nodes from a specific country on the map
function highlightCountryOnMap(country) {
  // Get the sample counts
  const sampleCounts = {};
  geoData.forEach(d => {
    const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
    sampleCounts[key] = (sampleCounts[key] || 0) + 1;
  });
  
  const maxCount = Math.max(...Object.values(sampleCounts));
  const radiusScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 15]);
  
  // Highlight all nodes from the country
  d3.select("#map-container svg")
    .selectAll("circle")
    .each(function(d) {
      if (!d) return; // Skip if data is undefined
      
      const isFromCountry = d.country === country;
      const key = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const pointCount = sampleCounts[key] || 1;
      
      d3.select(this)
        .attr("r", isFromCountry ? radiusScale(pointCount) * 1.3 : radiusScale(pointCount))
        .attr("stroke-width", isFromCountry ? 2 : 1.5)
        .attr("opacity", isFromCountry ? 1 : 0.5); // Dim other countries
    });
    
  // Also highlight transmission lines involving this country
  d3.select("#map-container svg")
    .selectAll(".transmission-line")
    .each(function() {
      const line = d3.select(this);
      const lineData = line.datum();
      
      // Extract countries from the tooltip text if data is not available
      let isInvolved = false;
      const tooltipText = line.on("mouseover").toString();
      if (tooltipText.includes(`${country} →`) || tooltipText.includes(`→ ${country}`)) {
        isInvolved = true;
      }
      
      line
        .attr("stroke-opacity", isInvolved ? 0.9 : 0.2)
        .attr("stroke-width", function() {
          const currentWidth = parseFloat(line.attr("stroke-width"));
          return isInvolved ? currentWidth * 1.5 : currentWidth;
        });
    });
}

// Function to highlight all nodes from a specific country on the tree
function highlightCountryOnTree(country) {
  // Highlight all nodes from the country
  d3.select("#tree-container svg")
    .selectAll(".node")
    .each(function(d) {
      if (!d || !d.data) return;
      
      // Check if this node is from the specified country
      const nodeCountry = d.data.node_attrs && d.data.node_attrs.country ? 
                         d.data.node_attrs.country.value : null;
      
      const isFromCountry = nodeCountry === country;
      
      // Also check if this node is part of a branch leading to the country
      let isPartOfBranch = false;
      if (d.children) {
        // Check if any descendants are from this country
        function checkDescendants(node) {
          if (!node) return false;
          
          const country = node.data.node_attrs && node.data.node_attrs.country ? 
                         node.data.node_attrs.country.value : null;
                         
          if (country === country) return true;
          
          if (node.children) {
            return node.children.some(checkDescendants);
          }
          
          return false;
        }
        
        isPartOfBranch = d.children.some(checkDescendants);
      }
      
      const shouldHighlight = isFromCountry || isPartOfBranch;
      
      d3.select(this)
        .attr("r", shouldHighlight ? (d.children ? 3 : 5) : (d.children ? 2 : 3))
        .attr("stroke-width", shouldHighlight ? 1.5 : 0.5)
        .attr("opacity", shouldHighlight ? 1 : 0.5); // Dim other nodes
    });
    
  // Also highlight the labels
  d3.select("#tree-container svg")
    .selectAll(".node-label")
    .each(function(d) {
      if (!d || !d.data) return;
      
      const nodeCountry = d.data.node_attrs && d.data.node_attrs.country ? 
                         d.data.node_attrs.country.value : null;
      
      const isFromCountry = nodeCountry === country;
      
      d3.select(this)
        .attr("font-weight", isFromCountry ? "bold" : "normal")
        .attr("font-size", isFromCountry ? "10px" : "10px")
        .attr("opacity", isFromCountry ? 1 : 0.5); // Dim other labels
    });
    
  // Highlight branches leading to nodes from this country
  d3.select("#tree-container svg")
    .selectAll(".branch")
    .each(function(d) {
      if (!d || !d.target || !d.target.data) return;
      
      const nodeCountry = d.target.data.node_attrs && d.target.data.node_attrs.country ? 
                         d.target.data.node_attrs.country.value : null;
      
      const isFromCountry = nodeCountry === country;
      
      // Also check if this branch leads to the country
      let leadsToCountry = false;
      if (d.target.children) {
        function checkDescendants(node) {
          if (!node) return false;
          
          const nodeCountry = node.data.node_attrs && node.data.node_attrs.country ? 
                             node.data.node_attrs.country.value : null;
                             
          if (nodeCountry === country) return true;
          
          if (node.children) {
            return node.children.some(checkDescendants);
          }
          
          return false;
        }
        
        leadsToCountry = d.target.children.some(checkDescendants);
      }
      
      const shouldHighlight = isFromCountry || leadsToCountry;
      
      d3.select(this)
        .attr("stroke-width", shouldHighlight ? 2 : 1)
        .attr("stroke-opacity", shouldHighlight ? 1 : 0.3); // Dim other branches
    });
}
```

<div class="grid grid-cols-1 gap-4 mb-4">
  <div class="card p-4">
    <h2 class="mb-2">Tree Controls</h2>
    <div class="flex flex-wrap gap-2">
      <div>
        <label class="mr-2">Layout:</label>
        <select id="layout-select" class="p-1 border rounded">
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>
      </div>
      <div>
        <label class="mr-2">Sort by:</label>
        <select id="sort-select" class="p-1 border rounded">
          <option value="default">Default</option>
          <option value="ascending">Node Name (A-Z)</option>
          <option value="descending">Node Name (Z-A)</option>
          <option value="country">Country</option>
        </select>
      </div>
      <div>
        <label class="mr-2">Labels:</label>
        <select id="label-align-select" class="p-1 border rounded">
          <option value="right">Right-aligned</option>
          <option value="left">Left-aligned</option>
        </select>
      </div>
      <button id="reset-tree-btn" class="px-2 py-1 bg-blue-100 border rounded">Reset View</button>
    </div>
  </div>
</div>

<div class="grid grid-cols-2 gap-4">
  <div class="card p-4">
    <h2 class="mb-4">Phylogenetic Tree</h2>
    <div id="tree-container" style="width: 100%; height: 600px; overflow: auto;"></div>
  </div>
  <div class="card p-4">
    <h2 class="mb-4">Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 600px; position: relative; overflow: hidden;"></div>
  </div>
</div>

```js
// Initialize the phylogenetic tree visualization
function initializeTree() {
  const treeContainer = document.getElementById("tree-container");
  if (!treeContainer) return;
  
  // Clear any existing content
  treeContainer.innerHTML = "";
  
  // Get initial dimensions
  const width = treeContainer.clientWidth;
  let height = treeContainer.clientHeight;
  
  // Count the number of leaf nodes to determine if we need more height
  const leafCount = countLeafNodes(treeData);
  
  // Calculate minimum height needed (14px per leaf node for compact spacing)
  const minHeightNeeded = leafCount * 14 + 60; // Reduced from 20px to 14px per node
  
  // Adjust container height if needed
  if (minHeightNeeded > height) {
    height = minHeightNeeded;
    treeContainer.style.height = `${height}px`;
    console.log(`Adjusted tree container height to ${height}px for ${leafCount} leaf nodes`);
  }
  
  // Create SVG with adjusted height
  const svg = d3.select(treeContainer)
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  // Add a reset zoom button
  const resetButton = d3.select(treeContainer)
    .append("button")
    .attr("class", "reset-button")
    .style("position", "absolute")
    .style("top", "10px")
    .style("right", "10px")
    .style("padding", "5px 10px")
    .style("background", "#f8f9fa")
    .style("border", "1px solid #ddd")
    .style("border-radius", "3px")
    .style("cursor", "pointer")
    .style("display", "none") // Initially hidden
    .style("opacity", "0.8")
    .style("z-index", "100") // Ensure button is above SVG
    .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
    .text("Reset Zoom")
    .on("click", (event) => {
      resetZoom();
      event.stopPropagation(); // Prevent event from bubbling up
    });
  
  // Add height indicator for debugging
  const heightIndicator = d3.select(treeContainer)
    .append("div")
    .attr("class", "height-indicator")
    .style("position", "absolute")
    .style("bottom", "5px")
    .style("right", "5px")
    .style("padding", "3px 6px")
    .style("background", "rgba(0,0,0,0.05)")
    .style("border-radius", "3px")
    .style("font-size", "10px")
    .style("color", "#666")
    .style("z-index", "100")
    .text(`Height: ${height}px | Leaves: ${leafCount}`);
  
  // Create a group for the tree that will be transformed during zoom
  const g = svg.append("g");
  
  // Define margins to ensure tree fits properly
  const margin = {
    top: 30,
    right: 220, // Adjusted for better label visibility
    bottom: 30,
    left: 30  // Reduced from 50 to 30 to push tree more to the left
  };
  
  // Create a hierarchical layout
  const root = d3.hierarchy(treeData);
  
  // Apply sorting based on the current state
  applySorting(root);
  
  // Set up the tree layout
  let treeLayout;
  
  if (state.treeLayout === "linear") {
    // Calculate tree dimensions accounting for margins
    const treeWidth = width - margin.left - margin.right;
    const treeHeight = height - margin.top - margin.bottom;
    
    // Create a tree layout with dimensions - use more width to extend closer to labels
    treeLayout = d3.tree()
      .size([treeHeight, treeWidth * 0.9]) // Increased from 0.85 to 0.9 to extend tree width
      .separation((a, b) => {
        // Reduced separation for more compact tree
        return (a.parent === b.parent ? 0.8 : 1) / Math.max(1, a.depth * 0.8);
      });
    
    // Position the tree group
    g.attr("transform", `translate(${margin.left}, ${margin.top})`);
  } else {
    // Radial tree layout
    const radius = Math.min(width, height) / 2 - 100;
    
    treeLayout = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => {
        return (a.parent === b.parent ? 1 : 2) / a.depth;
      });
    
    // Position the tree group in the center
    g.attr("transform", `translate(${width / 2}, ${height / 2})`);
  }
  
  // Apply the layout to the hierarchy
  treeLayout(root);
  
  // Add a time axis if we're in linear layout
  if (state.treeLayout === "linear") {
    // Get the tree dimensions from the current layout
    const treeWidth = width - margin.left - margin.right;
    const treeHeight = height - margin.top - margin.bottom;
    
    // Extract the date range from the data
    const dateRange = getDateRange(auspiceData);
    if (dateRange) {
      // Create a time scale
      const timeScale = d3.scaleTime()
        .domain([dateRange.min, dateRange.max])
        .range([0, treeWidth * 0.9]); // Adjusted to match tree width
      
      // Create an axis at the bottom of the tree
      const timeAxis = d3.axisBottom(timeScale)
        .ticks(5)
        .tickFormat(d3.timeFormat("%Y-%m"));
      
      // Add the axis to the visualization
      g.append("g")
        .attr("class", "time-axis")
        .attr("transform", `translate(0, ${treeHeight + 10})`)
        .call(timeAxis)
        .selectAll("text")
        .attr("font-size", "10px") // Increased from 9px
        .attr("font-family", "sans-serif")
        .attr("fill", "#666");
      
      // Add a label for the time axis
      g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${treeWidth * 0.45}, ${treeHeight + 40})`)
        .attr("font-size", "11px") // Increased from 10px
        .attr("font-family", "sans-serif")
        .attr("fill", "#666")
        .text("Collection Date");
    }
  }
  
  // Create links between nodes
  let linkGenerator;
  
  if (state.treeLayout === "linear") {
    // Orthogonal (zigzag) link generator for linear layout
    linkGenerator = d => {
      const source = d.source;
      const target = d.target;
      
      // Calculate midpoint for the horizontal segment
      const midX = (source.y + target.y) / 2;
      
      // Create a path with right angles (zigzag)
      return `
        M${source.y},${source.x}
        H${midX}
        V${target.x}
        H${target.y}
      `;
    };
  } else {
    // Radial link generator
    linkGenerator = d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y);
  }
  
  // Draw the links
  g.selectAll(".link")
    .data(root.links())
    .join("path")
    .attr("class", "link")
    .attr("d", linkGenerator)
    .attr("fill", "none")
    .attr("stroke", d => {
      // Color links based on target node's country if available
      if (d.target.data.node_attrs && d.target.data.node_attrs.country) {
        const country = d.target.data.node_attrs.country.value;
        return getCountryColor(country);
      }
      return "#ccc";
    })
    .attr("stroke-width", 1.2)
    .attr("stroke-opacity", 0.7);
  
  // Draw the nodes
  g.selectAll(".node")
    .data(root.descendants())
    .join("circle")
    .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
    .attr("transform", d => {
      if (state.treeLayout === "linear") {
        return `translate(${d.y},${d.x})`;
      } else {
        const x = Math.cos(d.x - Math.PI / 2) * d.y;
        const y = Math.sin(d.x - Math.PI / 2) * d.y;
        return `translate(${x},${y})`;
      }
    })
    .attr("r", d => d.children ? 2 : 3)
    .attr("fill", d => {
      // Color nodes based on country if available
      if (d.data.node_attrs && d.data.node_attrs.country) {
        const country = d.data.node_attrs.country.value;
        return getCountryColor(country);
      }
      return "#999";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      // Highlight on hover
      d3.select(event.currentTarget)
        .attr("r", d.children ? 3 : 4)
        .attr("stroke-width", 1.5);
      
      // Show tooltip with node information
      const tooltip = d3.select(".tooltip");
      if (tooltip.empty()) {
        d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "white")
          .style("border", "1px solid #ddd")
          .style("border-radius", "3px")
          .style("padding", "10px")
          .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
          .style("pointer-events", "none")
          .style("opacity", 0);
      }
      
      const tooltipContent = `
        <strong>${d.data.name}</strong><br/>
        ${d.data.node_attrs && d.data.node_attrs.country ? 
          `Country: ${d.data.node_attrs.country.value}<br/>` : ''}
        ${d.data.branch_length ? 
          `Branch Length: ${d.data.branch_length.toFixed(5)}<br/>` : ''}
        ${d.children ? 
          `Descendants: ${d.descendants().length - 1}` : ''}
      `;
      
      d3.select(".tooltip")
        .html(tooltipContent)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition()
        .duration(200)
        .style("opacity", 0.9);
      
      // Update state to highlight corresponding map point
      if (!d.children) { // Only for leaf nodes
        updateState({ hoveredNode: d.data.name });
      }
    })
    .on("mouseout", (event, d) => {
      // Reset on mouseout
      d3.select(event.currentTarget)
        .attr("r", d.children ? 2 : 3)
        .attr("stroke-width", 0.5);
      
      // Hide tooltip
      d3.select(".tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0);
      
      // Clear hover state
      updateState({ hoveredNode: null });
    })
    .on("click", (event, d) => {
      // If it's a leaf node, select it and highlight on map
      if (!d.children) {
        updateState({ selectedNode: d.data.name });
        event.stopPropagation(); // Prevent event from bubbling up
      } else {
        // For internal nodes, zoom to subtree
        zoomToSubtree(d);
      }
    });
  
  // Create a group for the connector lines
  const connectorGroup = g.append("g").attr("class", "connector-lines");
  
  // Create labels for leaf nodes with improved positioning
  if (state.treeLayout === "linear") {
    // Set default label alignment to right if not specified
    if (!state.labelAlign) {
      state.labelAlign = "right";
    }
    
    // Create linear layout labels
    const leafLabels = g.selectAll(".node-label")
      .data(root.leaves())
      .join("text")
      .attr("class", "node-label")
      .attr("dy", 3)
      .attr("x", d => d.y + 8) // Add some padding between node and label
      .attr("y", d => d.x)
      .text(d => {
        // Truncate long names for better display
        const name = d.data.name;
        return name.length > 30 ? name.substring(0, 27) + "..." : name;
      })
      .attr("text-anchor", "start")
      .attr("font-size", "10px") // Increased from 8px to 10px
      .attr("font-family", "sans-serif")
      .attr("fill", d => {
        // Color labels based on country if available
        if (d.data.node_attrs && d.data.node_attrs.country) {
          const country = d.data.node_attrs.country.value;
          return getCountryColor(country);
        }
        return "#666";
      })
      .attr("data-name", d => d.data.name); // Add data attribute for easier selection

    // If right-aligned, create a clean column of labels at the right edge
    if (state.labelAlign === "right") {
      // Get container width and calculate right edge position
      const containerWidth = treeContainer.clientWidth;
      const rightEdge = containerWidth - margin.right + 40; // Moved 20px closer to tree (from 20 to 40)
      
      // Get the maximum y-coordinate (tree depth)
      const maxY = d3.max(root.leaves(), d => d.y);
      
      // Calculate label positions - use the tree's natural order
      const labelData = [];
      
      // Collect all leaf nodes in the order they appear in the tree
      const leaves = root.leaves();
      
      // Create label data in the same order as the tree leaves
      leaves.forEach(d => {
        // Get country for grouping
        const country = d.data.node_attrs && d.data.node_attrs.country ? 
                        d.data.node_attrs.country.value : "";
        
        labelData.push({
          element: d3.select(g.selectAll(".node-label").filter(n => n.data.name === d.data.name).node()),
          originalY: d.x,
          y: d.x,
          x: d.y,
          data: d,
          country: country,
          name: d.data.name,
          node: d3.select(g.selectAll(".node--leaf").filter(n => n.data.name === d.data.name).node())
        });
      });
      
      // Position all labels at the same horizontal position (right edge)
      labelData.forEach(label => {
        if (label.element.empty()) return; // Skip if element not found
        
        label.element
          .attr("x", rightEdge)
          .attr("text-anchor", "start"); // Start anchor for phylotree.js style
      });
      
      // First pass: calculate positions without moving nodes
      for (let i = 1; i < labelData.length; i++) {
        const label = labelData[i];
        const prevLabel = labelData[i-1];
        
        if (label.element.empty() || prevLabel.element.empty()) continue;
        
        const minSpacing = 12; // Reduced from 16px to 12px for more compact layout
        
        if (label.y < prevLabel.y + minSpacing) {
          label.y = prevLabel.y + minSpacing;
        } else {
          // Keep original position if no overlap
          label.y = label.originalY;
        }
      }
      
      // Second pass: update both labels and nodes
      labelData.forEach(label => {
        if (label.element.empty()) return; // Skip if element not found
        
        // Update label position
        label.element.attr("y", label.y);
        
        // Update node position if it exists
        if (!label.node.empty()) {
          // Get the current transform
          const transform = label.node.attr("transform");
          if (transform) {
            // Extract current x position
            const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
            if (match && match.length >= 3) {
              const x = parseFloat(match[1]);
              // Apply new transform with updated y position
              label.node.attr("transform", `translate(${x},${label.y})`);
              
              // Also update the node's data for correct connector lines
              const nodeData = label.node.datum();
              if (nodeData) {
                nodeData.x = label.y;
              }
            }
          }
        }
      });
      
      // Remove any existing connector lines
      connectorGroup.selectAll("*").remove();
      
      // Create connector lines in dotted style - shorter now
      labelData.forEach(label => {
        if (label.element.empty()) return; // Skip if element not found
        
        // Get country color for the connector
        let lineColor = "#aaa";
        if (label.data.data.node_attrs && label.data.data.node_attrs.country) {
          const country = label.data.data.node_attrs.country.value;
          lineColor = getCountryColor(country);
        }
        
        // Create a shorter straight dotted line from node to label
        connectorGroup.append("line")
          .attr("class", "connector-line")
          .attr("x1", label.x)
          .attr("y1", label.y)
          .attr("x2", rightEdge - 4)
          .attr("y2", label.y)
          .attr("stroke", lineColor)
          .attr("stroke-width", 0.8)
          .attr("stroke-dasharray", "2,2")
          .attr("opacity", 0.7);
        
        // Add a small dot at the end of the connector line
        connectorGroup.append("circle")
          .attr("class", "connector-dot")
          .attr("cx", rightEdge - 4)
          .attr("cy", label.y)
          .attr("r", 2.5)
          .attr("fill", lineColor)
          .attr("opacity", 0.9);
      });
      
      // Redraw the links to match the new node positions
      g.selectAll(".link").remove();
      
      // Create updated links
      g.selectAll(".link")
        .data(root.links())
        .join("path")
        .attr("class", "link")
        .attr("d", d => {
          const source = d.source;
          const target = d.target;
          
          // Calculate midpoint for the horizontal segment
          const midX = (source.y + target.y) / 2;
          
          // Create a path with right angles (zigzag)
          return `
            M${source.y},${source.x}
            H${midX}
            V${target.x}
            H${target.y}
          `;
        })
        .attr("fill", "none")
        .attr("stroke", d => {
          // Color links based on target node's country if available
          if (d.target.data.node_attrs && d.target.data.node_attrs.country) {
            const country = d.target.data.node_attrs.country.value;
            return getCountryColor(country);
          }
          return "#ccc";
        })
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0.7);
    }
  } else if (state.treeLayout === "radial") {
    // Radial layout labels
    g.selectAll(".node-label")
      .data(root.leaves())
      .join("text")
      .attr("class", "node-label")
      .attr("dy", ".31em")
      .attr("transform", d => {
        const angle = d.x * 180 / Math.PI;
        const rotation = angle < 180 ? angle - 90 : angle + 90;
        const x = Math.cos(d.x) * (d.y + 8);
        const y = Math.sin(d.x) * (d.y + 8);
        return `translate(${x},${y}) rotate(${rotation})`;
      })
      .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
      .text(d => {
        // Truncate long names for better display
        const name = d.data.name;
        return name.length > 20 ? name.substring(0, 17) + "..." : name;
      })
      .attr("font-size", "10px")
      .attr("font-family", "sans-serif")
      .attr("fill", d => {
        // Color labels based on country if available
        if (d.data.node_attrs && d.data.node_attrs.country) {
          const country = d.data.node_attrs.country.value;
          return getCountryColor(country);
        }
        return "#666";
      })
      .attr("opacity", 0.9);
  }
  
  // Create tooltip if it doesn't exist
  let tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "3px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
      .style("font-family", "sans-serif")
      .style("font-size", "12px");
  }
  
  function showTooltip(event, html) {
    tooltip.html(html)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .transition()
      .duration(200)
      .style("opacity", 0.9);
  }
  
  function hideTooltip() {
    tooltip.transition()
      .duration(500)
      .style("opacity", 0);
  }
  
  // Zoom functionality
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
      
      // Show reset button when zoomed in
      if (event.transform.k > 1.1) {
        resetButton.style("display", "block");
      } else if (event.transform.k < 1.1) {
        resetButton.style("display", "none");
      }
      
      // Update connector lines if they exist
      if (state.treeLayout === "linear" && state.labelAlign === "right") {
        g.selectAll(".connector-line").each(function() {
          // The connector lines will automatically transform with the group
          // No additional updates needed
        });
      }
    });
  
  svg.call(zoom);
  
  // Add click handler to background for resetting zoom
  svg.on("click", () => {
    resetZoom();
  });
  
  // Function to zoom to a specific subtree
  function zoomToSubtree(d) {
    // Show the reset button
    resetButton.style("display", "block");
    
    // Calculate the bounds of the subtree
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Include the selected node and all its descendants
    const nodesToInclude = [d, ...d.descendants()];
    
    nodesToInclude.forEach(node => {
      if (state.treeLayout === "linear") {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      } else {
        // For radial layout, convert polar to cartesian
        const x = Math.cos(node.x - Math.PI / 2) * node.y;
        const y = Math.sin(node.x - Math.PI / 2) * node.y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });
    
    // Add some padding
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    
    // Calculate center and scale
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate scale to fit the subtree
    const scale = Math.min(
      width / (maxX - minX),
      height / (maxY - minY),
      3 // Maximum zoom level
    ) * 0.9; // 90% to add some margin
    
    // Apply zoom transform
    if (state.treeLayout === "linear") {
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(margin.left - centerY * scale, margin.top + (height / 2 - centerX * scale)).scale(scale)
        );
    } else {
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2 - centerX * scale, height / 2 - centerY * scale).scale(scale)
        );
    }
  }
  
  // Function to reset zoom
  function resetZoom() {
    if (state.treeLayout === "linear") {
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(margin.left, margin.top).scale(1)
        );
    } else {
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
        );
    }
    
    // Hide the reset button
    resetButton.style("display", "none");
  }
  
  // Function to apply sorting based on the current state
  function applySorting(root) {
    switch (state.sortBy) {
      case "ascending":
        root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
        break;
      case "descending":
        root.sort((a, b) => d3.descending(a.data.name, b.data.name));
        break;
      case "country":
        // Enhanced country sorting similar to Nextstrain
        root.sort((a, b) => {
          // Get country information
          const countryA = a.data.node_attrs && a.data.node_attrs.country ? a.data.node_attrs.country.value : "";
          const countryB = b.data.node_attrs && b.data.node_attrs.country ? b.data.node_attrs.country.value : "";
          
          // First sort by country
          const countryComparison = d3.ascending(countryA, countryB);
          if (countryComparison !== 0) return countryComparison;
          
          // If countries are the same, sort by name
          return d3.ascending(a.data.name, b.data.name);
        });
        break;
      case "branch_length":
        root.sort((a, b) => d3.descending(a.data.branch_length || 0, b.data.branch_length || 0));
        break;
      case "ladderized":
        ladderizeTree(root);
        break;
      default:
        // Nextstrain-style sorting - group by country and maintain tree structure
        root.sort((a, b) => {
          // Get country information
          const countryA = a.data.node_attrs && a.data.node_attrs.country ? a.data.node_attrs.country.value : "";
          const countryB = b.data.node_attrs && b.data.node_attrs.country ? b.data.node_attrs.country.value : "";
          
          // If both have country information, sort by country
          if (countryA && countryB) {
            const countryComparison = d3.ascending(countryA, countryB);
            if (countryComparison !== 0) return countryComparison;
          }
          
          // If one has children and the other doesn't, the one with children goes first
          if (a.children && !b.children) return -1;
          if (!a.children && b.children) return 1;
          
          // If both have children or both don't, sort by number of descendants
          const aCount = a.descendants().length;
          const bCount = b.descendants().length;
          if (aCount !== bCount) return bCount - aCount;
          
          // If still tied, sort by name
          return d3.ascending(a.data.name, b.data.name);
        });
        
        // Apply ladderization after the initial sort
        ladderizeTree(root);
        break;
    }
  }
  
  // Function to ladderize the tree (organize branches to reduce crossings)
  function ladderizeTree(node) {
    if (!node.children) return;
    
    // First ladderize all children
    node.children.forEach(ladderizeTree);
    
    // Then sort children by the number of leaves (descending)
    node.children.sort((a, b) => {
      const aLeaves = a.leaves().length;
      const bLeaves = b.leaves().length;
      return bLeaves - aLeaves;
    });
  }
  
  // Store references for later use
  treeContainer._zoomFunction = zoom;
  treeContainer._resetZoom = resetZoom;
}

// Helper function to count leaf nodes in the tree data
function countLeafNodes(node) {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  
  let count = 0;
  for (const child of node.children) {
    count += countLeafNodes(child);
  }
  
  return count;
}

// Initialize the map visualization
function initializeMap() {
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) return;
  
  // Clear any existing content
  mapContainer.innerHTML = "";
  
  // Get dimensions
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  
  // Count samples by location
  const sampleCounts = {};
  geoData.forEach(d => {
    const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
    sampleCounts[locationKey] = (sampleCounts[locationKey] || 0) + 1;
  });
  
  // Create a radius scale based on sample counts
  const maxCount = Math.max(...Object.values(sampleCounts));
  const radiusScale = d3.scaleSqrt() // Square root scale for area proportional to count
    .domain([1, maxCount])
    .range([5, 15]); // Min radius 5px, max 15px
  
  // Create SVG
  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  // Add arrowhead marker definition
  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#666");
  
  // Create a group for the map
  const g = svg.append("g");
  
  // Create a projection
  const projection = d3.geoNaturalEarth1()
    .scale(width / 5.5)
    .translate([width / 2, height / 2]);
  
  // Create a path generator
  const path = d3.geoPath()
    .projection(projection);
  
  // Draw the world map
  g.append("g")
    .selectAll("path")
    .data(topojson.feature(worldMapData, worldMapData.objects.countries).features)
    .join("path")
    .attr("fill", "#e0e0e0")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("d", path);
  
  // Create a group for transmission lines (add BEFORE points for proper layering)
  const transmissionGroup = g.append("g")
    .attr("class", "transmission-lines");
  
  // Create a map of locations by country
  const locationsByCountry = {};
  
  geoData.forEach(d => {
    const coords = projection(d.coordinates);
    if (coords) {
      if (!locationsByCountry[d.country]) {
        locationsByCountry[d.country] = [];
      }
      
      // Store both original and projected coordinates
      locationsByCountry[d.country].push({
        name: d.name,
        coordinates: d.coordinates,
        projectedCoords: coords
      });
    }
  });
  
  // Extract transmission data from the phylogenetic tree
  const transmissionLines = [];
  
  // Function to extract parent-child relationships from the tree
  function extractRelationships(node, parentCountry = null) {
    if (!node) return;
    
    // Get the country of the current node
    const nodeCountry = node.node_attrs && node.node_attrs.country ? 
                        node.node_attrs.country.value : null;
    
    // If we have both parent and current country and they're different, add a transmission
    if (parentCountry && nodeCountry && parentCountry !== nodeCountry) {
      transmissionLines.push({
        source: parentCountry,
        target: nodeCountry
      });
    }
    
    // Process children
    if (node.children) {
      node.children.forEach(child => {
        extractRelationships(child, nodeCountry || parentCountry);
      });
    }
  }
  
  // Start extraction from the root of the tree
  extractRelationships(auspiceData.tree);
  
  // Count transmissions between each pair of countries
  const transmissionCounts = {};
  
  transmissionLines.forEach(line => {
    const key = `${line.source}-${line.target}`;
    transmissionCounts[key] = (transmissionCounts[key] || 0) + 1;
  });
  
  // Create a curved line generator
  const lineGenerator = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveBasis);
  
  // Draw the transmission lines
  Object.keys(transmissionCounts).forEach(key => {
    const count = transmissionCounts[key];
    const [source, target] = key.split('-');
    
    // Skip if we don't have locations for either country
    if (!locationsByCountry[source] || !locationsByCountry[target]) return;
    
    // Get a representative location for each country
    const sourceLocation = locationsByCountry[source][0];
    const targetLocation = locationsByCountry[target][0];
    
    // Skip if projection failed for either location
    if (!sourceLocation.projectedCoords || !targetLocation.projectedCoords) return;
    
    // Calculate the midpoint with an offset for curvature
    const sx = sourceLocation.projectedCoords[0];
    const sy = sourceLocation.projectedCoords[1];
    const tx = targetLocation.projectedCoords[0];
    const ty = targetLocation.projectedCoords[1];
    
    // Calculate distance and angle
    const dx = tx - sx;
    const dy = ty - sy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    
    // Calculate control point offset (perpendicular to the line)
    const offset = distance / 4; // Adjust for desired curvature
    const mx = (sx + tx) / 2 + Math.cos(angle) * offset;
    const my = (sy + ty) / 2 + Math.sin(angle) * offset;
    
    // Create path points
    const points = [
      [sx, sy],
      [mx, my],
      [tx, ty]
    ];
    
    // Get colors for source and target
    const sourceColor = getCountryColor(source);
    const targetColor = getCountryColor(target);
    const lineColor = d3.interpolateRgb(sourceColor, targetColor)(0.5);
    
    // Calculate stroke width based on count
    const strokeWidth = Math.min(1 + Math.log(count), 3);
    const hoverStrokeWidth = Math.min(2 + Math.log(count), 5);
    
    // Draw the curved line
    transmissionGroup.append("path")
      .attr("d", lineGenerator(points))
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrow)")
      .attr("class", "transmission-line")
      .on("mouseover", function(event) {
        // Highlight on hover
        d3.select(this)
          .attr("stroke-width", hoverStrokeWidth)
          .attr("stroke-opacity", 0.9);
          
        // Show tooltip
        d3.select(".tooltip")
          .html(`<strong>Transmission:</strong><br/>${source} → ${target}<br/>Count: ${count}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .transition()
          .duration(200)
          .style("opacity", 0.9);
      })
      .on("mouseout", function(event) {
        // Reset on mouseout
        d3.select(this)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-opacity", 0.6);
          
        // Hide tooltip
        d3.select(".tooltip")
          .transition()
          .duration(500)
          .style("opacity", 0);
      });
  });
  
  // Create a group for sample points (add AFTER lines for proper layering)
  const pointsGroup = g.append("g")
    .attr("class", "sample-points");
  
  // Add sample points
  pointsGroup.selectAll("circle")
    .data(geoData)
    .join("circle")
    .attr("cx", d => {
      const coords = projection(d.coordinates);
      return coords ? coords[0] : 0;
    })
    .attr("cy", d => {
      const coords = projection(d.coordinates);
      return coords ? coords[1] : 0;
    })
    .attr("r", d => {
      // Calculate radius based on how many samples share this location
      const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const count = sampleCounts[locationKey] || 1;
      return radiusScale(count);
    })
    .attr("fill", d => getCountryColor(d.country))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.9)
    .on("mouseover", (event, d) => {
      // Highlight on hover
      const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const count = sampleCounts[locationKey] || 1;
      
      d3.select(event.currentTarget)
        .attr("r", radiusScale(count) * 1.5)
        .attr("stroke-width", 2.5)
        .attr("opacity", 1);
      
      // Show tooltip with sample count
      const tooltip = d3.select(".tooltip");
      if (tooltip.empty()) {
        d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "white")
          .style("border", "1px solid #ddd")
          .style("border-radius", "3px")
          .style("padding", "10px")
          .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
          .style("pointer-events", "none")
          .style("opacity", 0);
      }
      
      d3.select(".tooltip")
        .html(`<strong>${d.name}</strong><br/>
               Country: ${d.country}<br/>
               Samples: ${count}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition()
        .duration(200)
        .style("opacity", 0.9);
        
      // Update state to highlight corresponding tree nodes from this country
      updateState({ hoveredNode: d.name, hoveredCountry: d.country });
    })
    .on("mouseout", (event, d) => {
      // Reset on mouseout unless this is the selected node
      if (state.selectedNode !== d.name) {
        const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
        const count = sampleCounts[locationKey] || 1;
        
        d3.select(event.currentTarget)
          .attr("r", radiusScale(count))
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.9);
      }
      
      // Hide tooltip
      d3.select(".tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0);
        
      // Clear hover state and reset all highlighting
      updateState({ hoveredNode: null, hoveredCountry: null });
      
      // If no node is selected, ensure we reset all highlighting
      if (!state.selectedNode) {
        resetHighlighting();
      }
    })
    .on("click", (event, d) => {
      // Update selected node
      updateState({ selectedNode: d.name });
      
      // Make the selected node even more prominent
      const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
      const count = sampleCounts[locationKey] || 1;
      
      d3.select(event.currentTarget)
        .attr("r", radiusScale(count) * 1.5)
        .attr("stroke-width", 2.5)
        .attr("opacity", 1);
        
      event.stopPropagation(); // Prevent event from bubbling up
    });

  // Add click handler to clear selection when clicking on the map background
  svg.on("click", () => {
    // Clear the selection state
    updateState({ selectedNode: null });
    
    // Reset all points to default size
    pointsGroup.selectAll("circle")
      .each(function(d) {
        const locationKey = `${d.country}-${d.coordinates[0]}-${d.coordinates[1]}`;
        const count = sampleCounts[locationKey] || 1;
        
        d3.select(this)
          .attr("r", radiusScale(count))
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.9);
      });
  });
}

// Helper function to get color for a country
function getCountryColor(country) {
  const colorMap = {
    "Thailand": "#511EA8",
    "Singapore": "#4334BF",
    "French Polynesia": "#4041C7",
    "American Samoa": "#3F50CC",
    "Brazil": "#56A0AF",
    "Ecuador": "#63AC99",
    "Colombia": "#6BB18E",
    "Venezuela": "#86BB6E",
    "Panama": "#A4BE56",
    "Nicaragua": "#AFBD4F",
    "Honduras": "#B9BC4A",
    "Guatemala": "#CCB742",
    "Puerto Rico": "#E68234",
    "Dominican Republic": "#E4632E",
    "USA": "#DC2F24"
  };
  
  return colorMap[country] || "#999";
}

// Set up event listeners for the controls
function setupControls() {
  // Layout selector
  const layoutSelect = document.getElementById("layout-select");
  if (layoutSelect) {
    layoutSelect.addEventListener("change", (event) => {
      updateState({ treeLayout: event.target.value });
      initializeTree();
    });
    
    // Set initial value if not already set
    if (!layoutSelect.value) {
      layoutSelect.value = state.treeLayout || "linear";
    }
  }
  
  // Sort selector
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (event) => {
      updateState({ sortBy: event.target.value });
      initializeTree();
    });
    
    // Set initial value if not already set
    if (!sortSelect.value) {
      sortSelect.value = state.sortBy || "default";
    }
  }
  
  // Label alignment selector
  const labelAlignSelect = document.getElementById("label-align-select");
  if (labelAlignSelect) {
    labelAlignSelect.addEventListener("change", (event) => {
      updateState({ labelAlign: event.target.value });
      initializeTree();
    });
    
    // Set initial value to right if not already set
    if (!labelAlignSelect.value) {
      labelAlignSelect.value = state.labelAlign || "right";
    }
  }
  
  // Reset button
  const resetBtn = document.getElementById("reset-tree-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const treeContainer = document.getElementById("tree-container");
      if (treeContainer && treeContainer._resetZoom) {
        treeContainer._resetZoom();
      }
    });
  }
}

// Initialize state with default values if not set
function initializeState() {
  if (!state.treeLayout) {
    state.treeLayout = "linear";
  }
  
  if (!state.labelAlign) {
    state.labelAlign = "right"; // Set right alignment as default
  }
  
  if (!state.sortBy) {
    state.sortBy = "default";
  }
}

// Initialize visualizations when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeState();
  initializeTree();
  initializeMap();
  setupControls();
});

// Also try to initialize immediately in case we're already loaded
initializeState();
initializeTree();
initializeMap();
setupControls();

// Add a new sort option to the UI
document.addEventListener("DOMContentLoaded", () => {
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    // Add a ladderized option if it doesn't exist
    if (!Array.from(sortSelect.options).some(opt => opt.value === "ladderized")) {
      const option = document.createElement("option");
      option.value = "ladderized";
      option.text = "Ladderized (Balanced Tree)";
      sortSelect.add(option);
    }
  }
});

// Helper function to extract date range from Auspice data
function getDateRange(data) {
  // Check if we have date information
  if (!data.tree || !data.tree.node_attrs || !data.tree.node_attrs.num_date) {
    return null;
  }
  
  // Extract all dates from the tree
  const dates = [];
  
  function extractDates(node) {
    if (node.node_attrs && node.node_attrs.num_date) {
      const date = node.node_attrs.num_date.value;
      // Convert decimal year to Date object
      const year = Math.floor(date);
      const remainder = date - year;
      const millisInYear = 365.25 * 24 * 60 * 60 * 1000;
      const millisFromStartOfYear = remainder * millisInYear;
      const dateObj = new Date(year, 0, 1);
      dateObj.setMilliseconds(dateObj.getMilliseconds() + millisFromStartOfYear);
      dates.push(dateObj);
    }
    
    if (node.children) {
      node.children.forEach(extractDates);
    }
  }
  
  extractDates(data.tree);
  
  if (dates.length === 0) {
    return null;
  }
  
  // Find min and max dates
  return {
    min: new Date(Math.min(...dates.map(d => d.getTime()))),
    max: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}
