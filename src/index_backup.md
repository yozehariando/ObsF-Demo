---
theme: dashboard
toc: false
---

# DNA Mutation Analysis Dashboard

```js
import * as d3 from "d3";
import * as topojson from "topojson-client";
```

```js
// Load both datasets
const geoData = await FileAttachment("data/fake_latlon.csv").csv({ typed: true });
const scatterData = await FileAttachment("data/makeblob.csv").csv({ typed: true });

console.log(`Loaded ${geoData.length} geographic data points`);
console.log(`Loaded ${scatterData.length} scatter plot data points`);

// Log the first few records of each dataset to debug
console.log("Sample geo data:", geoData.slice(0, 3));
console.log("Sample scatter data:", scatterData.slice(0, 3));

// Check the property names in the scatter data
const scatterKeys = Object.keys(scatterData[0] || {});
console.log("Scatter data properties:", scatterKeys);

// Create a joined dataset by matching on index
const combinedData = geoData.map(geo => {
  // Find matching scatter data
  const scatter = scatterData.find(s => +s.index === +geo.index);
  
  // Create combined data point with correct property names
  return {
    ...geo,
    // Try different property name variations
    X: scatter ? (scatter.X !== undefined ? +scatter.X : 
                 scatter.x !== undefined ? +scatter.x : null) : null,
    Y: scatter ? (scatter.Y !== undefined ? +scatter.Y : 
                 scatter.y !== undefined ? +scatter.y : null) : null
  };
});

console.log(`Created ${combinedData.length} combined data points`);
console.log("Sample combined data point:", combinedData[0]);

// Check how many points have valid X and Y values
const validPoints = combinedData.filter(d => 
  d.X !== null && d.Y !== null && 
  !isNaN(d.X) && !isNaN(d.Y)
);
console.log(`Found ${validPoints.length} points with valid X and Y values`);
if (validPoints.length > 0) {
  console.log("Sample valid point:", validPoints[0]);
}

// Load world map TopoJSON
const worldMap = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");

// Create a color scale for mutation values
const mutationColorScale = d3.scaleSequential()
  .domain([0, 1])  // Values range from 0 to 1
  .interpolator(d3.interpolateViridis);  // Using Viridis color scheme which works well for scientific data

// Store current data and UI state in a mutable object
const state = {
  currentData: combinedData,
  selectedIndex: null,
  apiCallCount: 0
};

// Create tooltip that will be shared between visualizations
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #ddd")
  .style("border-radius", "3px")
  .style("padding", "10px")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Function to generate X,Y coordinates for scatter plot based on existing data distribution
function generateScatterCoordinates() {
  // Get valid data points with X,Y coordinates
  const validData = state.currentData.filter(d => 
    d.X !== null && d.Y !== null && 
    !isNaN(d.X) && !isNaN(d.Y)
  );
  
  // Default values if we can't determine the extent
  let x = Math.random() * 2 - 1;  // Default to [-1, 1] range
  let y = Math.random() * 2 - 1;  // Default to [-1, 1] range
  
  if (validData.length > 0) {
    const xExtent = d3.extent(validData, d => d.X);
    const yExtent = d3.extent(validData, d => d.Y);
    
    if (xExtent[0] !== undefined && xExtent[1] !== undefined) {
      x = xExtent[0] + Math.random() * (xExtent[1] - xExtent[0]);
    }
    
    if (yExtent[0] !== undefined && yExtent[1] !== undefined) {
      y = yExtent[0] + Math.random() * (yExtent[1] - yExtent[0]);
    }
  }
  
  return { X: x, Y: y };
}

// Function to fetch data from API
async function fetchAPIData() {
  try {
    // Call the real API endpoint
    const response = await fetch("https://be.asiapgi.dev/obs-f-demo");
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Process the data to match our expected format
    return data.map(item => {
      // Generate X,Y coordinates for scatter plot
      const { X, Y } = generateScatterCoordinates();
      
      return {
        index: 2000 + state.apiCallCount++,
        latitude: +item.latitude || 0,
        longitude: +item.longitude || 0,
        DNA_mutation_code: item.DNA_mutation_code || `c.${Math.floor(Math.random() * 5000)}G>A`,
        random_float: +item.random_float || Math.random(),
        X, // Add generated X coordinate
        Y  // Add generated Y coordinate
      };
    });
  } catch (error) {
    console.error("Error fetching API data:", error);
    alert(`Failed to fetch data: ${error.message}`);
    return []; // Return empty array on error
  }
}

// Function to process CSV data
function processCSVData(csvData) {
  return csvData.map((row, i) => {
    // Generate X,Y coordinates if not present
    let X = row.X !== undefined ? +row.X : (row.x !== undefined ? +row.x : null);
    let Y = row.Y !== undefined ? +row.Y : (row.y !== undefined ? +row.y : null);
    
    // If X or Y is missing or invalid, generate new coordinates
    if (X === null || Y === null || isNaN(X) || isNaN(Y)) {
      const coords = generateScatterCoordinates();
      X = coords.X;
      Y = coords.Y;
    }
    
    return {
      index: 3000 + i,
      latitude: +row.latitude || 0,
      longitude: +row.longitude || 0,
      DNA_mutation_code: row.DNA_mutation_code || `c.${Math.floor(Math.random() * 5000)}G>A`,
      random_float: +row.random_float || Math.random(),
      X,
      Y
    };
  });
}
```

<div class="grid grid-cols-2 gap-4">
  <div class="card">
    <h2>Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 400px; overflow: hidden;"></div>
  </div>
  <div class="card">
    <h2>Mutation Characteristics</h2>
    <div id="scatter-container" style="width: 100%; height: 400px; overflow: hidden;"></div>
  </div>
</div>

<div class="grid grid-cols-1 gap-4 mt-4">
  <div class="card">
    <h2>Mutation Details</h2>
    <div id="details-panel" class="p-4">
      <p class="text-center text-gray-500">Select a mutation point to view details</p>
    </div>
  </div>
</div>

<div class="grid grid-cols-1 gap-4 mt-4">
  <div class="card">
    <h2>Add New Mutation Data</h2>
    <div class="p-4 flex justify-between">
      <button id="api-button" class="btn btn-primary">Fetch API Data</button>
      <button id="upload-button" class="btn btn-secondary">Upload CSV</button>
      <button id="random-button" class="btn btn-success">Generate Random</button>
      <button id="reset-button" class="btn btn-outline">Reset Data</button>
      <input type="file" id="file-input" accept=".csv" style="display: none;">
    </div>
  </div>
</div>

```js
// Function to select a point by index
function selectPoint(index) {
  state.selectedIndex = index;
  updateDetailsPanel();
  
  // Update visualizations to highlight the selected point
  if (typeof window.updateMap === 'function') window.updateMap();
  if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
}

// Function to update the details panel with selected point info
function updateDetailsPanel() {
  const detailsPanel = document.getElementById("details-panel");
  if (!detailsPanel) return;
  
  // If no point is selected, show default message
  if (state.selectedIndex === null) {
    detailsPanel.innerHTML = `<p class="text-center text-gray-500">Select a mutation point to view details</p>`;
    return;
  }
  
  // Find the selected data point
  const point = state.currentData.find(d => d.index === state.selectedIndex);
  if (!point) {
    detailsPanel.innerHTML = `<p class="text-center text-gray-500">Selected point not found</p>`;
    return;
  }
  
  // Create a bar chart for the mutation value
  const barWidth = 200;
  const barHeight = 30;
  const valueWidth = Math.max(5, barWidth * point.random_float);
  
  // Determine significance text based on value
  let significanceText = "";
  if (point.random_float > 0.7) {
    significanceText = "High significance - potential clinical relevance";
  } else if (point.random_float > 0.4) {
    significanceText = "Moderate significance - further investigation needed";
  } else {
    significanceText = "Low significance - likely benign variant";
  }
  
  // Create HTML for details panel with grid layout
  detailsPanel.innerHTML = `
    <h3 style="color: #ff3333; margin-bottom: 15px; font-weight: bold;">${point.DNA_mutation_code}</h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <p><strong>Index:</strong> ${point.index}</p>
        <p><strong>Location:</strong> ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}</p>
        <p><strong>Coordinates:</strong> X=${point.X.toFixed(4)}, Y=${point.Y.toFixed(4)}</p>
      </div>
      
      <div>
        <p><strong>Mutation Significance:</strong></p>
        <div style="margin: 10px 0;">
          <svg width="${barWidth}" height="${barHeight}">
            <rect width="${barWidth}" height="${barHeight}" fill="#f0f0f0" rx="5" ry="5"></rect>
            <rect width="${valueWidth}" height="${barHeight}" fill="${mutationColorScale(point.random_float)}" rx="5" ry="5"></rect>
            <text x="${valueWidth / 2}" y="${barHeight / 2 + 5}" 
                  fill="${point.random_float > 0.5 ? 'white' : 'black'}" 
                  text-anchor="middle" font-size="14px">
              ${point.random_float.toFixed(3)}
            </text>
          </svg>
        </div>
        <p style="font-size: 0.9rem; margin-top: 5px;">${significanceText}</p>
      </div>
    </div>
  `;
}

// Initialize the map visualization
function initMap() {
  const mapContainer = document.getElementById("map-container");
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  
  // Create SVG
  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
  
  // Create a group for the map elements
  const g = svg.append("g");
  
  // Create a projection for Southeast Asia
  const projection = d3.geoMercator()
    .scale(width / 1.5)
    .center([110, 5])  // Center on Southeast Asia
    .translate([width / 2, height / 2]);
  
  // Create a path generator
  const path = d3.geoPath(projection);
  
  // Draw the world map
  g.append("path")
    .datum(topojson.feature(worldMap, worldMap.objects.countries))
    .attr("d", path)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 0.5);
  
  // Add zoom behavior for dragging
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  
  svg.call(zoom);
  
  // Function to update the map with current data
  function updateMap() {
    // Remove existing points
    g.selectAll(".map-point").remove();
    
    // Add points for each data point
    state.currentData.forEach(d => {
      // Skip points without valid coordinates
      if (isNaN(d.latitude) || isNaN(d.longitude)) return;
      
      // Convert lat/lon to x/y coordinates
      const [x, y] = projection([d.longitude, d.latitude]);
      
      // Skip if projection returns null (point is outside the map)
      if (x === null || y === null) return;
      
      // Determine if this point is selected
      const isSelected = d.index === state.selectedIndex;
      
      // Create point
      g.append("circle")
        .attr("class", "map-point")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", isSelected ? 8 : 5)
        .attr("fill", isSelected ? "#ff3333" : mutationColorScale(d.random_float))
        .attr("stroke", isSelected ? "#ff3333" : "#333")
        .attr("stroke-width", isSelected ? 2 : 1)
        .attr("opacity", 0.8)
        .attr("cursor", "pointer")
        .on("mouseover", function(event) {
          // Enlarge point on hover
          d3.select(this)
            .attr("r", isSelected ? 10 : 7)
            .attr("stroke-width", 2);
          
          // Show tooltip
          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${d.DNA_mutation_code}</strong><br>
              Value: ${d.random_float.toFixed(3)}<br>
              Location: ${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          // Restore original size
          d3.select(this)
            .attr("r", isSelected ? 8 : 5)
            .attr("stroke-width", isSelected ? 2 : 1);
          
          // Hide tooltip
          tooltip.style("opacity", 0);
        })
        .on("click", function() {
          // Select this point
          selectPoint(d.index);
        });
    });
  }
  
  // Initial update
  updateMap();
  
  // Return the update function
  return updateMap;
}

// Initialize the scatter plot visualization
function initScatterPlot() {
  const scatterContainer = document.getElementById("scatter-container");
  if (!scatterContainer) return;
  
  // Clear any existing content
  scatterContainer.innerHTML = "";
  
  // Get container dimensions
  const containerWidth = scatterContainer.clientWidth;
  const containerHeight = scatterContainer.clientHeight;
  
  // Create margins
  const margin = {top: 20, right: 30, bottom: 40, left: 50};
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  
  // Create SVG element
  const svg = d3.select(scatterContainer)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight);
  
  // Create a group for the scatter plot with margins
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Get valid data points with X and Y values
  const validData = state.currentData.filter(d => 
    d.X !== null && d.Y !== null && 
    !isNaN(d.X) && !isNaN(d.Y)
  );
  
  // Create scales
  const xExtent = d3.extent(validData, d => d.X);
  const yExtent = d3.extent(validData, d => d.Y);
  
  // Add some padding to the extents
  const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
  const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
  
  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
    .range([height, 0]);
  
  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  
  // Add x-axis
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);
  
  // Add y-axis
  g.append("g")
    .attr("class", "y-axis")
    .call(yAxis);
  
  // Add axis labels
  g.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .text("X Coordinate");
  
  g.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("Y Coordinate");
  
  // Function to update the scatter plot with current data
  function updateScatterPlot() {
    // Get valid data points with X and Y values
    const validData = state.currentData.filter(d => 
      d.X !== null && d.Y !== null && 
      !isNaN(d.X) && !isNaN(d.Y)
    );
    
    // Update scales with new data
    const xExtent = d3.extent(validData, d => d.X);
    const yExtent = d3.extent(validData, d => d.Y);
    
    // Add some padding to the extents
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);
    
    // Update axes
    g.select(".x-axis").transition().duration(500).call(xAxis);
    g.select(".y-axis").transition().duration(500).call(yAxis);
    
    // Remove existing points
    g.selectAll(".scatter-point").remove();
    
    // Add points for each data point
    validData.forEach(d => {
      // Determine if this point is selected
      const isSelected = d.index === state.selectedIndex;
      
      // Create point
      g.append("circle")
        .attr("class", "scatter-point")
        .attr("cx", xScale(d.X))
        .attr("cy", yScale(d.Y))
        .attr("r", isSelected ? 8 : 5)
        .attr("fill", isSelected ? "#ff3333" : mutationColorScale(d.random_float))
        .attr("stroke", isSelected ? "#ff3333" : "#333")
        .attr("stroke-width", isSelected ? 2 : 1)
        .attr("opacity", 0.8)
        .attr("cursor", "pointer")
        .on("mouseover", function(event) {
          // Enlarge point on hover
          d3.select(this)
            .attr("r", isSelected ? 10 : 7)
            .attr("stroke-width", 2);
          
          // Show tooltip
          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${d.DNA_mutation_code}</strong><br>
              Value: ${d.random_float.toFixed(3)}<br>
              Coordinates: X=${d.X.toFixed(4)}, Y=${d.Y.toFixed(4)}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          // Restore original size
          d3.select(this)
            .attr("r", isSelected ? 8 : 5)
            .attr("stroke-width", isSelected ? 2 : 1);
          
          // Hide tooltip
          tooltip.style("opacity", 0);
        })
        .on("click", function() {
          // Select this point
          selectPoint(d.index);
        });
    });
  }
  
  // Initial update
  updateScatterPlot();
  
  // Return the update function
  return updateScatterPlot;
}

// Function to generate a random mutation
async function generateRandomMutation() {
  // Generate random location in Southeast Asia
  const latitude = -15 + Math.random() * 40;  // -15 to 25
  const longitude = 80 + Math.random() * 50;  // 80 to 130
  
  // Generate random mutation code
  const mutationCode = `c.${Math.floor(Math.random() * 5000)}${['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]}>` +
                      `${['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]}`;
  
  // Generate random value
  const value = Math.random();
  
  // Generate random X,Y coordinates for scatter plot
  const { X: x, Y: y } = generateScatterCoordinates();
  
  // Create new data point
  const newPoint = {
    index: 1000 + state.apiCallCount++,
    latitude,
    longitude,
    DNA_mutation_code: mutationCode,
    random_float: value,
    X: x,
    Y: y
  };
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return newPoint;
}

// Initialize visualizations and store update functions
window.updateMap = initMap();
window.updateScatterPlot = initScatterPlot();
updateDetailsPanel();

// Set up event handlers
document.getElementById("api-button")?.addEventListener("click", async function() {
  this.disabled = true;
  this.textContent = "Loading...";
  
  try {
    const apiData = await fetchAPIData();
    
    // Add to current data
    state.currentData = [...state.currentData, ...apiData];
    
    // Update visualizations
    if (typeof window.updateMap === 'function') window.updateMap();
    if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
    
    // Show success message
    alert(`Successfully loaded ${apiData.length} data points from API`);
  } catch (error) {
    console.error("Error fetching API data:", error);
  } finally {
    this.disabled = false;
    this.textContent = "Fetch API Data";
  }
});

document.getElementById("upload-button")?.addEventListener("click", function() {
  // Trigger file input click
  document.getElementById("file-input")?.click();
});

document.getElementById("file-input")?.addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Parse CSV data
      const csvData = d3.csvParse(e.target.result);
      const processedData = processCSVData(csvData);
      
      // Add to current data
      state.currentData = [...state.currentData, ...processedData];
      
      // Update visualizations
      if (typeof window.updateMap === 'function') window.updateMap();
      if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
      
      // Show success message
      alert(`Successfully loaded ${processedData.length} data points from CSV`);
    } catch (error) {
      console.error("Error parsing uploaded file:", error);
      alert("Error parsing file. Please ensure it's a valid CSV with the correct format.");
    }
  };
  
  reader.readAsText(file);
});

document.getElementById("random-button")?.addEventListener("click", async function() {
  this.disabled = true;
  this.textContent = "Generating...";
  
  try {
    const newPoint = await generateRandomMutation();
    
    // Add to current data
    state.currentData = [...state.currentData, newPoint];
    
    // Select the new point
    selectPoint(newPoint.index);
    
    // Update visualizations
    if (typeof window.updateMap === 'function') window.updateMap();
    if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
  } catch (error) {
    console.error("Error generating random mutation:", error);
  } finally {
    this.disabled = false;
    this.textContent = "Generate Random";
  }
});

document.getElementById("reset-button")?.addEventListener("click", function() {
  // Reset to original data
  state.currentData = combinedData;
  state.selectedIndex = null;
  state.apiCallCount = 0;
  
  // Update visualizations
  if (typeof window.updateMap === 'function') window.updateMap();
  if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
  updateDetailsPanel();
  
  // Hide tooltip
  tooltip.style("opacity", 0);
});

// Add a legend for the scatter plot
function createLegend() {
  const legendContainer = document.createElement("div");
  legendContainer.style.display = "flex";
  legendContainer.style.justifyContent = "center";
  legendContainer.style.marginTop = "10px";
  
  const legendInner = document.createElement("div");
  legendInner.style.display = "flex";
  legendInner.style.alignItems = "center";
  
  const minLabel = document.createElement("span");
  minLabel.textContent = "0.0";
  minLabel.style.fontSize = "0.8rem";
  
  const gradient = document.createElement("div");
  gradient.style.width = "150px";
  gradient.style.height = "15px";
  gradient.style.margin = "0 10px";
  gradient.style.background = `linear-gradient(to right, 
    ${mutationColorScale(0)}, ${mutationColorScale(0.25)}, ${mutationColorScale(0.5)}, 
    ${mutationColorScale(0.75)}, ${mutationColorScale(1)})`;
  
  const maxLabel = document.createElement("span");
  maxLabel.textContent = "1.0";
  maxLabel.style.fontSize = "0.8rem";
  
  legendInner.appendChild(minLabel);
  legendInner.appendChild(gradient);
  legendInner.appendChild(maxLabel);
  
  legendContainer.appendChild(legendInner);
  
  const description = document.createElement("div");
  description.style.textAlign = "center";
  description.style.fontSize = "0.8rem";
  description.style.marginTop = "3px";
  description.textContent = "Mutation significance value";
  
  const wrapper = document.createElement("div");
  wrapper.appendChild(legendContainer);
  wrapper.appendChild(description);
  
  // Add the legend to the scatter plot card
  const scatterCard = document.querySelector(".card:nth-child(2)");
  if (scatterCard) {
    scatterCard.appendChild(wrapper);
  }
}

// Add the legend to the page
createLegend();