---
theme: dashboard
toc: false
---

# Modular DNA Mutation Dashboard

This dashboard demonstrates a modular approach to visualizing DNA mutation data.

<div class="grid grid-cols-2 gap-4">
  <div class="card p-4">
    <h2 class="mb-4">Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 400px; position: relative; overflow: hidden;"></div>
  </div>
  <div class="card p-4">
    <h2 class="mb-4">Mutation Clustering</h2>
    <div id="scatter-container" style="width: 100%; height: 400px; position: relative; overflow: hidden;"></div>
  </div>
</div>

<div class="grid grid-cols-1 gap-4 mt-4">
  <div class="card p-4">
    <h2 class="mb-4">Mutation Details</h2>
    <div id="details-panel" class="mt-4 p-4 border rounded">
      <p class="text-center text-gray-500">Select a mutation point to view details</p>
    </div>
  </div>
</div>

<div class="grid grid-cols-1 gap-4 mt-4">
  <div class="card p-4">
    <h2 class="mb-4">Add New Mutation Data</h2>
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
import * as d3 from "d3";
import { createMap } from "./components/map-component.js";
import { createScatterPlot, createScatterLegend } from "./components/scatter-component.js";
import { loadInitialData } from "./components/data-service.js";
import { updateDetailsPanel, addContainerStyles } from "./components/ui-utils.js";
import { setupEventHandlers } from "./components/event-handlers.js";

// Make FileAttachment available globally if it exists in this context
// This helps our components detect if they're running in Observable
if (typeof FileAttachment !== 'undefined') {
  window.FileAttachment = FileAttachment;
}

// Initialize immediately for Observable
(async function() {
  try {
    // Add CSS styles for proper container sizing
    addContainerStyles();
    
    // Add a notice about mock data
    const noticeElement = document.createElement('div');
    noticeElement.className = 'p-2 bg-yellow-100 text-yellow-800 rounded mb-4';
    noticeElement.style.display = 'none';
    noticeElement.innerHTML = '<strong>Note:</strong> Using generated mock data for demonstration.';
    document.querySelector('.grid').parentNode.insertBefore(noticeElement, document.querySelector('.grid'));
    
    // Load initial data
    const combinedData = await loadInitialData();
    console.log(`Loaded ${combinedData.length} combined data points`);
    
    // Show notice if we're using mock data (determined by checking if first point has index < 1000)
    if (combinedData.length > 0 && combinedData[0].index < 1000) {
      noticeElement.style.display = 'block';
    }
    
    // Create a color scale for mutation values
    const mutationColorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateViridis);
    
    // Store current data and UI state
    const state = {
      originalData: [...combinedData], // Keep a copy of original data for reset
      currentData: combinedData,
      selectedIndex: null,
      apiCallCount: 0
    };
    
    // Initialize visualization components
    let mapComponent;
    let scatterComponent;
    
    // Function to select a point by index
    function selectPoint(index) {
      state.selectedIndex = index;
      
      // Find the selected point
      const selectedPoint = state.currentData.find(d => d.index === index);
      
      // Update details panel
      updateDetailsPanel("details-panel", selectedPoint, mutationColorScale);
      
      // Update visualizations
      updateVisualizations();
    }
    
    // Function to update all visualizations
    function updateVisualizations() {
      // Update map
      if (mapComponent) {
        mapComponent.updateMap(state.currentData, {
          selectedIndex: state.selectedIndex,
          colorScale: mutationColorScale,
          onPointClick: (point) => selectPoint(point.index)
        });
      }
      
      // Update scatter plot
      if (scatterComponent) {
        scatterComponent.updateScatterPlot(state.currentData, {
          selectedIndex: state.selectedIndex,
          colorScale: mutationColorScale,
          onPointClick: (point) => selectPoint(point.index)
        });
      }
      
      // Update details panel if a point is selected
      if (state.selectedIndex !== null) {
        const selectedPoint = state.currentData.find(d => d.index === state.selectedIndex);
        updateDetailsPanel("details-panel", selectedPoint, mutationColorScale);
      } else {
        updateDetailsPanel("details-panel", null, mutationColorScale);
      }
    }
    
    // Initialize map component
    mapComponent = await createMap("map-container", {
      colorScale: mutationColorScale
    });
    
    // Initialize scatter plot component
    scatterComponent = createScatterPlot("scatter-container", {
      colorScale: mutationColorScale,
      xLabel: "X Dimension",
      yLabel: "Y Dimension"
    });
    
    // Create legend for scatter plot
    const scatterCard = document.querySelector(".card:nth-child(2)");
    if (scatterCard) {
      createScatterLegend(scatterCard, mutationColorScale);
    }
    
    // Set up event handlers
    setupEventHandlers(state, { mapComponent, scatterComponent }, updateVisualizations);
    
    // Initial update of visualizations
    updateVisualizations();
    
    console.log("Dashboard initialized successfully");
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    
    // Display error message in the UI
    document.getElementById("map-container").innerHTML = 
      `<div class="p-4 text-red-500">Error loading map: ${error.message}</div>`;
    document.getElementById("scatter-container").innerHTML = 
      `<div class="p-4 text-red-500">Error loading scatter plot: ${error.message}</div>`;
  }
})(); 