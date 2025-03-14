---
theme: dashboard
toc: false
---

# DNA Mutation Map

```js
import * as d3 from "d3";
import * as topojson from "topojson-client";
```

```js
// Load DNA mutation data using FileAttachment (will use the data loader)
const initialData = await FileAttachment("data/mutations.json").json();
console.log(`Loaded ${initialData.length} data points from JSON`);

// Load world map TopoJSON
const worldMap = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");

// Create a color scale for mutation values
const mutationColorScale = d3.scaleSequential()
  .domain([0, 1])  // Values range from 0 to 1
  .interpolator(d3.interpolateViridis);  // Using Viridis color scheme which works well for scientific data

// Store current data in a mutable object
const state = {
  currentData: initialData,
  apiCallCount: 0
};

// Mock API call function with random locations in Southeast Asia
async function fetchAPIData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Increment API call counter
  state.apiCallCount++;
  
  // Define Southeast Asia bounding box (approximate)
  const bounds = {
    latMin: -10,  // Southern Indonesia
    latMax: 38,   // Northern Japan/Korea
    lonMin: 95,   // Western Myanmar
    lonMax: 145   // Eastern Japan
  };
  
  // Generate 5-10 random points
  const numPoints = 5 + Math.floor(Math.random() * 6);
  const result = [];
  
  // DNA mutation codes (base patterns)
  const baseMutations = ["G>A", "T>C", "A>G", "C>T", "G>T", "A>C", "T>G", "C>A", "G>C", "T>A"];
  
  for (let i = 0; i < numPoints; i++) {
    // Generate random position within bounds
    const latitude = bounds.latMin + Math.random() * (bounds.latMax - bounds.latMin);
    const longitude = bounds.lonMin + Math.random() * (bounds.lonMax - bounds.lonMin);
    
    // Generate random mutation code
    const position = 1000 + Math.floor(Math.random() * 4000);
    const mutationType = baseMutations[Math.floor(Math.random() * baseMutations.length)];
    const mutationCode = `c.${position}${mutationType}`;
    
    // Generate random value
    const value = 0.5 + Math.random() * 0.5; // Values between 0.5 and 1.0
    
    // Create data point
    result.push({
      index: 1000 + (state.apiCallCount * 100) + i,
      latitude,
      longitude,
      DNA_mutation_code: mutationCode,
      random_float: value
    });
  }
  
  return result;
}

// Create UI controls
function createControls() {
  const container = document.createElement("div");
  container.className = "controls";
  container.style.position = "absolute";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.display = "flex";
  container.style.gap = "10px";
  container.style.alignItems = "center";
  
  // Data counter
  const counter = document.createElement("div");
  counter.id = "data-counter";
  counter.textContent = `${state.currentData.length} mutations`;
  counter.style.fontWeight = "bold";
  counter.style.marginRight = "10px";
  
  // API button
  const apiButton = document.createElement("button");
  apiButton.textContent = "Fetch API Data";
  apiButton.className = "btn btn-sm btn-primary";
  apiButton.onclick = async () => {
    apiButton.disabled = true;
    apiButton.textContent = "Loading...";
    try {
      const apiData = await fetchAPIData();
      // We'll handle this in the main code
      document.dispatchEvent(new CustomEvent('api-data-loaded', { detail: apiData }));
      apiButton.textContent = "Fetch API Data";
    } catch (error) {
      console.error("API fetch error:", error);
      alert("Error fetching API data");
      apiButton.textContent = "Retry API";
    }
    apiButton.disabled = false;
  };
  
  // Upload button and hidden file input
  const uploadButton = document.createElement("button");
  uploadButton.textContent = "Upload CSV";
  uploadButton.className = "btn btn-sm btn-secondary";
  
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".csv";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        // Parse CSV data
        const csvData = d3.csvParse(e.target.result, d => ({
          index: +d.index || state.currentData.length + parseInt(Math.random() * 1000),
          latitude: +d.latitude,
          longitude: +d.longitude,
          DNA_mutation_code: d.DNA_mutation_code,
          random_float: +d.random_float || Math.random()
        }));
        
        // Dispatch event with the data
        document.dispatchEvent(new CustomEvent('csv-data-loaded', { detail: csvData }));
        
        // Show success message
        alert(`Successfully loaded ${csvData.length} data points`);
      } catch (error) {
        console.error("Error parsing uploaded file:", error);
        alert("Error parsing file. Please ensure it's a valid CSV with the correct format.");
      }
    };
    
    reader.readAsText(file);
  });
  
  uploadButton.onclick = () => fileInput.click();
  
  // Reset button
  const resetButton = document.createElement("button");
  resetButton.textContent = "Reset";
  resetButton.className = "btn btn-sm btn-outline";
  resetButton.onclick = () => {
    document.dispatchEvent(new CustomEvent('reset-data'));
  };
  
  container.appendChild(counter);
  container.appendChild(apiButton);
  container.appendChild(uploadButton);
  container.appendChild(fileInput);
  container.appendChild(resetButton);
  
  return container;
}

// Create legend
function createLegend() {
  const container = document.createElement("div");
  
  const legendWrapper = document.createElement("div");
  legendWrapper.style.display = "flex";
  legendWrapper.style.justifyContent = "center";
  legendWrapper.style.marginTop = "10px";
  
  const legendInner = document.createElement("div");
  legendInner.style.display = "flex";
  legendInner.style.alignItems = "center";
  
  const minLabel = document.createElement("span");
  minLabel.textContent = "0.0";
  
  const gradient = document.createElement("div");
  gradient.style.width = "200px";
  gradient.style.height = "20px";
  gradient.style.margin = "0 10px";
  gradient.style.background = `linear-gradient(to right, 
    ${mutationColorScale(0)}, ${mutationColorScale(0.25)}, ${mutationColorScale(0.5)}, 
    ${mutationColorScale(0.75)}, ${mutationColorScale(1)})`;
  
  const maxLabel = document.createElement("span");
  maxLabel.textContent = "1.0";
  
  const description = document.createElement("div");
  description.style.textAlign = "center";
  description.style.fontSize = "0.9em";
  description.style.marginTop = "5px";
  description.textContent = "Mutation significance value";
  
  legendInner.appendChild(minLabel);
  legendInner.appendChild(gradient);
  legendInner.appendChild(maxLabel);
  legendWrapper.appendChild(legendInner);
  
  container.appendChild(legendWrapper);
  container.appendChild(description);
  
  return container;
}
```

<div class="grid grid-cols-1">
  <div class="card" style="position: relative;">
    <h2>DNA Mutation Geographic Distribution</h2>
    <h3>Southeast Asia Region</h3>
    ${createControls()}
    <div id="map-container" style="width: 100%; height: 500px; overflow: hidden;"></div>
    ${createLegend()}
  </div>
</div>

```js
// Create the map
const mapContainer = document.getElementById("map-container");
const containerWidth = mapContainer.clientWidth;
const containerHeight = mapContainer.clientHeight;

// Create SVG with responsive dimensions
const svg = d3.select(mapContainer)
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", [0, 0, containerWidth, containerHeight])
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

// Define projection - focused on Southeast Asia where our data points are
const projection = d3.geoMercator()
  .scale(containerWidth / 2)
  .center([110, 5])  // Center on Southeast Asia
  .translate([containerWidth / 2, containerHeight / 2]);

// Draw country outlines
g.append("path")
  .datum(topojson.feature(worldMap, worldMap.objects.countries))
  .attr("fill", "#f8f9fa")
  .attr("d", d3.geoPath(projection));

// Draw country boundaries
g.append("path")
  .datum(topojson.mesh(worldMap, worldMap.objects.countries))
  .attr("fill", "none")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 0.5)
  .attr("d", d3.geoPath(projection));

// Create tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #ddd")
  .style("border-radius", "3px")
  .style("padding", "10px")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Function to update the map with new data
function updateMap(newData) {
  // Update current data reference
  state.currentData = newData;
  
  // Update data counter
  const counter = document.getElementById("data-counter");
  if (counter) {
    counter.textContent = `${state.currentData.length} mutations`;
  }
  
  // Clear existing circles
  g.selectAll("g.mutation-point").remove();
  
  // Draw new mutations as circles
  state.currentData.forEach(mutation => {
    const [x, y] = projection([mutation.longitude, mutation.latitude]);
    
    // Skip if projection returns null or NaN
    if (x === null || y === null || isNaN(x) || isNaN(y)) return;
    
    // Circle size based on value
    const radius = Math.sqrt(mutation.random_float) * 10;
    
    // Create group for each mutation
    const mutationGroup = g.append("g")
      .attr("class", "mutation-point")
      .attr("transform", `translate(${x}, ${y})`)
      .attr("cursor", "pointer")
      .on("mouseover", function(event) {
        // Show tooltip
        tooltip.style("opacity", 1)
          .html(`
            <strong>Mutation: ${mutation.DNA_mutation_code}</strong><br>
            Value: ${mutation.random_float.toFixed(3)}<br>
            Location: ${mutation.latitude.toFixed(2)}, ${mutation.longitude.toFixed(2)}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        
        // Highlight circle
        d3.select(this).select("circle")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        // Hide tooltip
        tooltip.style("opacity", 0);
        
        // Remove highlight
        d3.select(this).select("circle")
          .attr("stroke-width", 1);
      });
    
    // Draw circle
    mutationGroup.append("circle")
      .attr("r", radius)
      .attr("fill", mutationColorScale(mutation.random_float))
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("opacity", 0.7);  // Add some transparency to handle overlaps
  });
}

// Initialize the map with the precomputed data
updateMap(initialData);

// Set up event listeners for the controls
document.addEventListener('api-data-loaded', (event) => {
  const apiData = event.detail;
  updateMap([...state.currentData, ...apiData]);
});

document.addEventListener('csv-data-loaded', (event) => {
  const csvData = event.detail;
  updateMap([...state.currentData, ...csvData]);
});

document.addEventListener('reset-data', () => {
  updateMap(initialData);
});

// Handle window resize
window.addEventListener("resize", () => {
  const newWidth = mapContainer.clientWidth;
  const newHeight = mapContainer.clientHeight;
  
  // Update viewBox
  svg.attr("viewBox", [0, 0, newWidth, newHeight]);
  
  // Update projection
  projection
    .scale(newWidth / 2)
    .translate([newWidth / 2, newHeight / 2]);
  
  // Redraw paths
  g.selectAll("path").attr("d", d3.geoPath(projection));
  
  // Redraw all points with updated projection
  updateMap(state.currentData);
});
```
