---
theme: dashboard
toc: false
---

# Mutation Clustering Scatter Plot

```js
import * as d3 from "d3";
```

```js
// Load blob data for scatter plot
const blobData = await FileAttachment("data/blob-data.json").json();
console.log(`Loaded ${blobData.length} blob data points`);

// Load mutation data to link with blob data
const mutationData = await FileAttachment("data/mutations.json").json();
console.log(`Loaded ${mutationData.length} mutation data points`);

// Create a color scale for mutation values
const mutationColorScale = d3.scaleSequential()
  .domain([0, 1])  // Values range from 0 to 1
  .interpolator(d3.interpolateViridis);  // Using Viridis color scheme

// Store current data in a mutable object
const state = {
  blobData: blobData,
  mutationData: mutationData,
  highlightedIndex: null
};

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
```

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Mutation Clustering Analysis</h2>
    <div id="scatter-container" style="width: 100%; height: 500px; overflow: hidden;"></div>
    <div style="text-align: center; margin-top: 10px;">
      <p>This scatter plot shows the clustering of mutations based on their genetic properties.</p>
      <p>Points are colored by mutation significance value.</p>
    </div>
  </div>
</div>

```js
// Create the scatter plot
const scatterContainer = document.getElementById("scatter-container");
const containerWidth = scatterContainer.clientWidth;
const containerHeight = scatterContainer.clientHeight;

// Create SVG for scatter plot
const svg = d3.select(scatterContainer)
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", [0, 0, containerWidth, containerHeight])
  .attr("preserveAspectRatio", "xMidYMid meet");

// Add margins
const margin = {top: 40, right: 40, bottom: 60, left: 60};
const innerWidth = containerWidth - margin.left - margin.right;
const innerHeight = containerHeight - margin.top - margin.bottom;

// Create a group for the scatter plot with margins
const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create scales
const xScale = d3.scaleLinear()
  .domain(d3.extent(state.blobData, d => d.X))
  .nice()
  .range([0, innerWidth]);

const yScale = d3.scaleLinear()
  .domain(d3.extent(state.blobData, d => d.Y))
  .nice()
  .range([innerHeight, 0]);

// Add axes
const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale);

// Add x-axis
g.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(xAxis);

// Add y-axis
g.append("g")
  .attr("class", "y-axis")
  .call(yAxis);

// Add axis labels
g.append("text")
  .attr("class", "x-label")
  .attr("text-anchor", "middle")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .text("X (Genetic Distance)");

g.append("text")
  .attr("class", "y-label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)")
  .attr("x", -innerHeight / 2)
  .attr("y", -40)
  .text("Y (Expression Level)");

// Add zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.5, 10])
  .on("zoom", (event) => {
    // Update the transform of the main group
    g.attr("transform", `translate(${event.transform.x + margin.left},${event.transform.y + margin.top}) scale(${event.transform.k})`);
    
    // Update axes with new scale
    g.select(".x-axis").call(xAxis.scale(event.transform.rescaleX(xScale)));
    g.select(".y-axis").call(yAxis.scale(event.transform.rescaleY(yScale)));
  });

svg.call(zoom);

// Function to update the scatter plot
function updateScatterPlot() {
  // Clear existing points
  g.selectAll("g.scatter-point").remove();
  
  // Draw points
  state.blobData.forEach(point => {
    // Find corresponding mutation data
    const mutation = state.mutationData.find(m => m.index === point.index);
    if (!mutation) return;
    
    // Create group for each point
    const pointGroup = g.append("g")
      .datum(point)  // Attach data to the group
      .attr("class", "scatter-point")
      .attr("transform", `translate(${xScale(point.X)}, ${yScale(point.Y)})`)
      .attr("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Show tooltip
        tooltip.style("opacity", 1)
          .html(`
            <strong>Point ID: ${d.index}</strong><br>
            X: ${d.X.toFixed(3)}, Y: ${d.Y.toFixed(3)}<br>
            Mutation: ${mutation.DNA_mutation_code}<br>
            Value: ${mutation.random_float.toFixed(3)}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        
        // Highlight circle
        d3.select(this).select("circle")
          .attr("stroke-width", 2)
          .attr("stroke", "#ff0")
          .attr("r", 8);
          
        // Store highlighted index
        state.highlightedIndex = d.index;
      })
      .on("mouseout", function() {
        // Hide tooltip
        tooltip.style("opacity", 0);
        
        // Remove highlight if not clicked
        if (state.highlightedIndex !== point.index) {
          d3.select(this).select("circle")
            .attr("stroke-width", 1)
            .attr("stroke", "#333")
            .attr("r", 5);
        }
      })
      .on("click", function(event, d) {
        // Toggle highlight on click
        if (state.highlightedIndex === d.index) {
          // If already highlighted, unhighlight
          state.highlightedIndex = null;
          d3.select(this).select("circle")
            .attr("stroke-width", 1)
            .attr("stroke", "#333")
            .attr("r", 5);
        } else {
          // Highlight this point
          state.highlightedIndex = d.index;
          
          // Remove previous highlights
          g.selectAll(".scatter-point circle")
            .attr("stroke-width", 1)
            .attr("stroke", "#333")
            .attr("r", 5);
            
          // Add highlight to this point
          d3.select(this).select("circle")
            .attr("stroke-width", 2)
            .attr("stroke", "#ff0")
            .attr("r", 8);
        }
      });
    
    // Draw circle
    pointGroup.append("circle")
      .attr("r", 5)
      .attr("fill", mutationColorScale(mutation.random_float))
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("opacity", 0.7);
  });
}

// Initialize the scatter plot
updateScatterPlot();

// Handle window resize
window.addEventListener("resize", () => {
  const newWidth = scatterContainer.clientWidth;
  const newHeight = scatterContainer.clientHeight;
  
  // Update viewBox
  svg.attr("viewBox", [0, 0, newWidth, newHeight]);
  
  // Update inner dimensions
  const newInnerWidth = newWidth - margin.left - margin.right;
  const newInnerHeight = newHeight - margin.top - margin.bottom;
  
  // Update scales
  xScale.range([0, newInnerWidth]);
  yScale.range([newInnerHeight, 0]);
  
  // Update axes
  g.select(".x-axis")
    .attr("transform", `translate(0,${newInnerHeight})`)
    .call(xAxis);
  g.select(".y-axis").call(yAxis);
  
  // Update axis labels
  g.select(".x-label")
    .attr("x", newInnerWidth / 2)
    .attr("y", newInnerHeight + 40);
  
  g.select(".y-label")
    .attr("x", -newInnerHeight / 2);
  
  // Redraw all points
  updateScatterPlot();
});

// Add a legend for the color scale
function createLegend() {
  const legendContainer = document.createElement("div");
  legendContainer.style.display = "flex";
  legendContainer.style.justifyContent = "center";
  legendContainer.style.marginTop = "20px";
  
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
  
  legendInner.appendChild(minLabel);
  legendInner.appendChild(gradient);
  legendInner.appendChild(maxLabel);
  
  legendContainer.appendChild(legendInner);
  
  const description = document.createElement("div");
  description.style.textAlign = "center";
  description.style.fontSize = "0.9em";
  description.style.marginTop = "5px";
  description.textContent = "Mutation significance value";
  
  const wrapper = document.createElement("div");
  wrapper.appendChild(legendContainer);
  wrapper.appendChild(description);
  
  document.querySelector(".card").appendChild(wrapper);
}

// Add the legend to the page
createLegend();
``` 