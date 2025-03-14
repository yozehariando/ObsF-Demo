---
theme: dashboard
toc: false
---

# DNA Mutation Map (working 1)

```js
import * as d3 from "d3";
import * as topojson from "topojson-client";
```

```js
// Load DNA mutation data using FileAttachment (will use the data loader)
const mutationData = await FileAttachment("data/mutations.json").json();

// Load world map TopoJSON
const worldMap = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");

// Create a color scale for mutation values
const mutationColorScale = d3.scaleSequential()
  .domain([0, 1])  // Values range from 0 to 1
  .interpolator(d3.interpolateViridis);  // Using Viridis color scheme which works well for scientific data

// Group mutations by type (first letter of mutation code)
const mutationTypes = d3.groups(mutationData, d => d.DNA_mutation_code.split('.')[1][0]);

// Create legend HTML
const legendHTML = html`
  <div style="display: flex; justify-content: center; margin-top: 10px;">
    <div style="display: flex; align-items: center;">
      <span>0.0</span>
      <div style="width: 200px; height: 20px; margin: 0 10px; background: linear-gradient(to right, 
        ${mutationColorScale(0)}, ${mutationColorScale(0.25)}, ${mutationColorScale(0.5)}, 
        ${mutationColorScale(0.75)}, ${mutationColorScale(1)});"></div>
      <span>1.0</span>
    </div>
  </div>
  <div style="text-align: center; font-size: 0.9em; margin-top: 5px;">
    Mutation significance value
  </div>
`;
```

<div class="grid grid-cols-1">
  <div class="card">
    <h2>DNA Mutation Geographic Distribution</h2>
    <h3>Southeast Asia Region</h3>
    <div id="map-container" style="width: 100%; height: 500px; overflow: hidden;"></div>
    ${legendHTML}
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

// Draw mutations as circles
mutationData.forEach(mutation => {
  const [x, y] = projection([mutation.longitude, mutation.latitude]);
  
  // Circle size based on value
  const radius = Math.sqrt(mutation.random_float) * 10;
  
  // Create group for each mutation
  const mutationGroup = g.append("g")
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
  
  // Reposition circles
  mutationData.forEach((mutation, i) => {
    const [x, y] = projection([mutation.longitude, mutation.latitude]);
    g.selectAll("g").filter((d, j) => j === i)
      .attr("transform", `translate(${x}, ${y})`);
  });
});
```
