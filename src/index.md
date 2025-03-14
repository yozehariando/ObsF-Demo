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
      <button id="api-button" class="btn btn-primary">Generate Random Mutation</button>
      <button id="reset-button" class="btn btn-outline">Reset Data</button>
    </div>
  </div>
</div>

```js
// Initialize the map visualization
function initMap() {
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) {
    console.error("Map container not found");
    return () => {};
  }
  
  const containerWidth = mapContainer.clientWidth || 600;
  const containerHeight = mapContainer.clientHeight || 400;
  
  console.log("Map container dimensions:", containerWidth, containerHeight);
  
  // Create SVG
  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, containerWidth, containerHeight])
    .attr("style", "background-color: #f0f0f0;") // Add background to see the container
    .attr("preserveAspectRatio", "xMidYMid meet");
  
  // Create a group for the map
  const g = svg.append("g");
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  
  svg.call(zoom);
  
  // Create a projection focused on Southeast Asia but zoomed out a bit
  const projection = d3.geoMercator()
    .center([110, 5]) // Center on Southeast Asia (longitude, latitude)
    .scale(containerWidth * 0.8) // Reduced scale to zoom out
    .translate([containerWidth / 2, containerHeight / 2]);
  
  // Create a path generator
  const path = d3.geoPath().projection(projection);
  
  // Draw the world map
  g.append("g")
    .selectAll("path")
    .data(topojson.feature(worldMap, worldMap.objects.countries).features)
    .join("path")
    .attr("fill", "#ddd")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("d", path);
  
  // Create a group for the points
  const pointsGroup = g.append("g");
  
  // Function to update the map with current data
  function updateMap() {
    // Filter out points with invalid coordinates
    const validPoints = state.currentData.filter(d => 
      d.latitude !== null && d.longitude !== null && 
      !isNaN(d.latitude) && !isNaN(d.longitude)
    );
    
    console.log(`Rendering ${validPoints.length} valid data points for map`);
    
    // Update points
    const points = pointsGroup.selectAll("circle")
      .data(validPoints, d => d.index);
    
    // Remove old points
    points.exit().remove();
    
    // Add new points
    const enterPoints = points.enter()
      .append("circle")
      .attr("r", 5)
      .attr("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.index === state.selectedIndex ? 10 : 7)
          .attr("stroke-width", 2);
        
        tooltip.transition()
          .duration(200)
          .style("opacity", 0.9);
        
        tooltip.html(`
          <strong>Mutation:</strong> ${d.DNA_mutation_code}<br>
          <strong>Significance:</strong> ${d.random_float.toFixed(3)}<br>
          <strong>Location:</strong> ${d.latitude}, ${d.longitude}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.index === state.selectedIndex ? 8 : 5)
          .attr("stroke-width", d.index === state.selectedIndex ? 2 : 1);
        
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        selectPoint(d.index);
      });
    
    // Update all points (new and existing)
    pointsGroup.selectAll("circle")
      .attr("cx", d => {
        const coords = projection([d.longitude, d.latitude]);
        return coords ? coords[0] : 0;
      })
      .attr("cy", d => {
        const coords = projection([d.longitude, d.latitude]);
        return coords ? coords[1] : 0;
      })
      .attr("fill", d => d.index === state.selectedIndex ? "#ff3333" : mutationColorScale(d.random_float))
      .attr("stroke", d => d.index === state.selectedIndex ? "#ff3333" : "#fff")
      .attr("stroke-width", d => d.index === state.selectedIndex ? 2 : 1)
      .attr("r", d => d.index === state.selectedIndex ? 8 : 5);
  }
  
  // Initial render
  updateMap();
  
  // Return the update function
  return updateMap;
}

// Initialize the scatter plot visualization
function initScatterPlot() {
  const scatterContainer = document.getElementById("scatter-container");
  if (!scatterContainer) {
    console.error("Scatter plot container not found");
    return () => {};
  }
  
  const containerWidth = scatterContainer.clientWidth || 600;
  const containerHeight = scatterContainer.clientHeight || 400;
  
  console.log("Scatter container dimensions:", containerWidth, containerHeight);
  
  // Set margins
  const margin = {top: 40, right: 30, bottom: 50, left: 60};
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.select(scatterContainer)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, containerWidth, containerHeight])
    .attr("style", "background-color: #f8f8f8;")
    .attr("preserveAspectRatio", "xMidYMid meet");
  
  // Create a group for the scatter plot with margins
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .extent([[0, 0], [width, height]])
    .on("zoom", (event) => {
      g.attr("transform", `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`);
      gx.call(xAxis.scale(event.transform.rescaleX(x)));
      gy.call(yAxis.scale(event.transform.rescaleY(y)));
    });
  
  svg.call(zoom);
  
  // Create scales
  const x = d3.scaleLinear()
    .range([0, width]);
  
  const y = d3.scaleLinear()
    .range([height, 0]);
  
  // Create axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y);
  
  // Add axes groups
  const gx = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(${margin.left},${containerHeight - margin.bottom})`)
    .call(xAxis);
  
  const gy = svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(yAxis);
  
  // Add axis labels
  svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", containerWidth / 2)
    .attr("y", containerHeight - 10)
    .text("Mutation Characteristic X");
  
  svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -containerHeight / 2)
    .attr("y", 15)
    .text("Mutation Characteristic Y");
  
  // Create a group for the points
  const pointsGroup = g.append("g");
  
  // Function to update the scatter plot with current data
  function updateScatterPlot() {
    // Filter out points with invalid coordinates
    const validPoints = state.currentData.filter(d => 
      d.X !== null && d.Y !== null && 
      !isNaN(d.X) && !isNaN(d.Y)
    );
    
    console.log(`Found ${validPoints.length} valid data points for scatter plot`);
    
    if (validPoints.length === 0) {
      console.warn("No valid data points for scatter plot");
      return;
    }
    
    // Update scales with the data
    const xExtent = d3.extent(validPoints, d => d.X);
    const yExtent = d3.extent(validPoints, d => d.Y);
    
    console.log("X extent:", xExtent);
    console.log("Y extent:", yExtent);
    
    // Check if we have valid extents
    if (xExtent[0] === undefined || yExtent[0] === undefined) {
      console.warn("Invalid data extents for scatter plot");
      return;
    }
    
    x.domain(xExtent).nice();
    y.domain(yExtent).nice();
    
    // Update axes
    gx.call(xAxis);
    gy.call(yAxis);
    
    // Update points
    const points = pointsGroup.selectAll("circle")
      .data(validPoints, d => d.index);
    
    // Remove old points
    points.exit().remove();
    
    // Add new points
    const enterPoints = points.enter()
      .append("circle")
      .attr("r", 5)
      .attr("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.index === state.selectedIndex ? 10 : 7)
          .attr("stroke-width", 2);
        
        tooltip.transition()
          .duration(200)
          .style("opacity", 0.9);
        
        tooltip.html(`
          <strong>Mutation:</strong> ${d.DNA_mutation_code}<br>
          <strong>Significance:</strong> ${d.random_float.toFixed(3)}<br>
          <strong>Coordinates:</strong> (${d.X.toFixed(2)}, ${d.Y.toFixed(2)})
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.index === state.selectedIndex ? 8 : 5)
          .attr("stroke-width", d.index === state.selectedIndex ? 2 : 1);
        
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      })
      .on("click", function(event, d) {
        selectPoint(d.index);
      });
    
    // Update all points (new and existing)
    pointsGroup.selectAll("circle")
      .attr("cx", d => x(d.X))
      .attr("cy", d => y(d.Y))
      .attr("fill", d => d.index === state.selectedIndex ? "#ff3333" : mutationColorScale(d.random_float))
      .attr("stroke", d => d.index === state.selectedIndex ? "#ff3333" : "#fff")
      .attr("stroke-width", d => d.index === state.selectedIndex ? 2 : 1)
      .attr("r", d => d.index === state.selectedIndex ? 8 : 5);
    
    console.log(`Rendering ${validPoints.length} valid data points for scatter plot`);
  }
  
  // Initial render
  updateScatterPlot();
  
  // Return the update function
  return updateScatterPlot;
}

// Function to select a point by index
function selectPoint(index) {
  // Update the selected index
  state.selectedIndex = index;
  
  // Update visualizations
  if (typeof window.updateMap === 'function') window.updateMap();
  if (typeof window.updateScatterPlot === 'function') window.updateScatterPlot();
  
  // Update details panel
  updateDetailsPanel();
}

// Function to update the details panel
function updateDetailsPanel() {
  const detailsPanel = document.getElementById("details-panel");
  if (!detailsPanel) return;
  
  // Clear the panel
  detailsPanel.innerHTML = "";
  
  // If no point is selected, show a message
  if (state.selectedIndex === null) {
    detailsPanel.innerHTML = `<p class="text-center text-gray-500">Select a mutation point to view details</p>`;
    return;
  }
  
  // Find the selected point
  const selectedPoint = state.currentData.find(d => d.index === state.selectedIndex);
  if (!selectedPoint) {
    detailsPanel.innerHTML = `<p class="text-center text-gray-500">Selected point not found</p>`;
    return;
  }
  
  // Create a title
  const title = document.createElement("h3");
  title.textContent = `Mutation: ${selectedPoint.DNA_mutation_code}`;
  title.style.color = "#ff3333";
  title.style.marginBottom = "15px";
  title.style.textAlign = "center";
  detailsPanel.appendChild(title);
  
  // Create a grid for the details
  const detailsGrid = document.createElement("div");
  detailsGrid.style.display = "grid";
  detailsGrid.style.gridTemplateColumns = "1fr 1fr";
  detailsGrid.style.gap = "10px";
  detailsGrid.style.marginTop = "10px";
  
  // Add details to the grid
  const details = [
    { label: "Index", value: selectedPoint.index },
    { label: "Latitude", value: selectedPoint.latitude },
    { label: "Longitude", value: selectedPoint.longitude },
    { label: "Mutation Code", value: selectedPoint.DNA_mutation_code },
    { label: "Significance", value: selectedPoint.random_float.toFixed(3) },
    { label: "X Coordinate", value: selectedPoint.X?.toFixed(3) || "N/A" },
    { label: "Y Coordinate", value: selectedPoint.Y?.toFixed(3) || "N/A" }
  ];
  
  details.forEach(detail => {
    const detailItem = document.createElement("div");
    
    const label = document.createElement("strong");
    label.textContent = `${detail.label}: `;
    
    const value = document.createTextNode(detail.value);
    
    detailItem.appendChild(label);
    detailItem.appendChild(value);
    
    detailsGrid.appendChild(detailItem);
  });
  
  // Create a color bar to visualize the mutation value
  const colorBar = document.createElement("div");
  colorBar.style.width = "100%";
  colorBar.style.height = "20px";
  colorBar.style.background = `linear-gradient(to right, 
    ${mutationColorScale(0)}, ${mutationColorScale(0.25)}, ${mutationColorScale(0.5)}, 
    ${mutationColorScale(0.75)}, ${mutationColorScale(1)})`;
  colorBar.style.position = "relative";
  colorBar.style.marginTop = "10px";
  colorBar.style.marginBottom = "5px";
  colorBar.style.borderRadius = "3px";
  
  // Add a marker for the current value
  const marker = document.createElement("div");
  marker.style.position = "absolute";
  marker.style.width = "4px";
  marker.style.height = "24px";
  marker.style.backgroundColor = "#ff3333";
  marker.style.top = "-2px";
  marker.style.left = `${selectedPoint.random_float * 100}%`;
  marker.style.transform = "translateX(-50%)";
  
  colorBar.appendChild(marker);
  
  // Create a container for the color bar
  const colorBarContainer = document.createElement("div");
  colorBarContainer.style.marginTop = "20px";
  colorBarContainer.style.marginBottom = "10px";
  colorBarContainer.style.display = "flex";
  colorBarContainer.style.flexDirection = "column";
  colorBarContainer.style.alignItems = "center";
  
  const colorBarLabel = document.createElement("div");
  colorBarLabel.textContent = "Mutation Significance";
  colorBarLabel.style.marginBottom = "5px";
  colorBarLabel.style.fontWeight = "bold";
  
  colorBarContainer.appendChild(colorBarLabel);
  colorBarContainer.appendChild(colorBar);
  
  detailsPanel.appendChild(colorBarContainer);
  detailsPanel.appendChild(detailsGrid);
}

// Function to generate a random mutation (simulating an API call)
async function generateRandomMutation() {
  // Increment API call counter
  state.apiCallCount++;
  
  // Generate random latitude and longitude focused on Southeast Asia (wider range)
  const latitude = (Math.random() * 40 - 15).toFixed(4); // Range from -15 to 25
  const longitude = (Math.random() * 50 + 80).toFixed(4); // Range from 80 to 130
  
  // Generate random mutation code
  const position = 1000 + Math.floor(Math.random() * 4000);
  const baseMutations = ["G>A", "T>C", "A>G", "C>T", "G>T", "A>C", "T>G", "C>A", "G>C", "T>A"];
  const mutationType = baseMutations[Math.floor(Math.random() * baseMutations.length)];
  const mutationCode = `c.${position}${mutationType}`;
  
  // Generate random value
  const value = 0.5 + Math.random() * 0.5; // Values between 0.5 and 1.0
  
  // Generate random x,y for scatter plot
  // Use the range of existing data to make it fit in with the current distribution
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
  
  // Create new data point
  const newPoint = {
    index: 1000 + state.apiCallCount,
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
    this.textContent = "Generate Random Mutation";
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