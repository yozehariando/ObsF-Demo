---
theme: dashboard
toc: false
---

# Modular DNA Mutation Dashboard - API

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
import { createUmapScatterPlot } from "./components/api-scatter-component.js";
import { updateDetailsPanel, addContainerStyles } from "./components/ui-utils.js";
import { setupEventHandlers } from "./components/event-handlers.js";
import { fetchUmapData, transformUmapData } from './components/api/api-service.js';

// Make FileAttachment available globally if it exists in this context
// This helps our components detect if they're running in Observable
if (typeof FileAttachment !== 'undefined') {
  window.FileAttachment = FileAttachment;
}

// Initialize immediately for Observable
(async function() {
  try {
    console.log("Initializing dashboard...");
    
    // Add CSS styles for proper container sizing
    addContainerStyles();
    
    // Add notices for data sources
    const apiDataNotice = document.createElement('div');
    apiDataNotice.id = 'api-data-notice';
    apiDataNotice.className = 'p-2 bg-blue-100 text-blue-800 rounded mb-4';
    apiDataNotice.style.display = 'none';
    apiDataNotice.innerHTML = '<strong>UMAP View:</strong> Showing DNA sequences in UMAP coordinate space. Similar sequences appear closer together.';
    document.querySelector('.grid').parentNode.insertBefore(apiDataNotice, document.querySelector('.grid'));
    
    // Show loading indicator
    showLoadingIndicator("Fetching data from API...");
    
    // Fetch data from API
    try {
      console.log("Fetching data from API...");
      const apiData = await fetchUmapData('DNABERT-S', false); // false to use real API data
      const transformedData = transformUmapData(apiData);
      console.log('API data transformed:', transformedData.length, 'points');
      
      // Hide loading indicator
      hideLoadingIndicator();
      
      // Store current data and UI state
      const state = {
        originalData: [...transformedData], // Keep a copy of original data for reset
        currentData: transformedData,
        selectedPoint: null,
        mapComponent: null,
        scatterComponent: null
      };
      
      // Create map visualization
      console.log("Creating map visualization...");
      state.mapComponent = createMap("map-container", transformedData, {
        colorScale: d3.scaleOrdinal(d3.schemeCategory10),
        onPointClick: (point) => {
          selectPoint(point.index);
        }
      });
      
      // Create scatter plot visualization
      console.log("Creating scatter plot visualization...");
      state.scatterComponent = createUmapScatterPlot("scatter-container", transformedData, {
        xLabel: "X Dimension",
        yLabel: "Y Dimension",
        onPointClick: (point) => {
          selectPoint(point.index);
        }
      });
      
      // Show API data notice
      apiDataNotice.style.display = 'block';
      
      // Function to select a point and update visualizations
      function selectPoint(index) {
        state.selectedPoint = index;
        
        // Update map with selected point
        state.mapComponent.updateMap(state.currentData, {
          selectedIndex: index
        });
        
        // Update scatter plot with selected point
        state.scatterComponent.updateScatterPlot(state.currentData, {
          selectedIndex: index
        });
        
        // Update details panel with selected point data
        const selectedData = state.currentData.find(d => d.index === index);
        if (selectedData) {
          updateDetailsPanel(selectedData);
        }
      }
      
      // Connect the reset button
      document.getElementById("reset-button").addEventListener("click", function() {
        // Reset to original data
        state.currentData = [...state.originalData];
        state.selectedPoint = null;
        
        // Update visualizations
        state.mapComponent.updateMap(state.currentData);
        state.scatterComponent.updateScatterPlot(state.currentData);
        
        // Clear details panel
        document.getElementById("details-panel").innerHTML = 
          `<p class="text-center text-gray-500">Select a mutation point to view details</p>`;
      });
      
      // Connect the API button to refresh data
      document.getElementById("api-button").addEventListener("click", async function() {
        showLoadingIndicator("Refreshing API data...");
        
        try {
          const newApiData = await fetchUmapData('DNABERT-S', false); // false to use real API data
          const newTransformedData = transformUmapData(newApiData);
          
          // Update state
          state.originalData = [...newTransformedData];
          state.currentData = newTransformedData;
          state.selectedPoint = null;
          
          // Update visualizations
          state.mapComponent.updateMap(state.currentData);
          state.scatterComponent.updateScatterPlot(state.currentData);
          
          // Clear details panel
          document.getElementById("details-panel").innerHTML = 
            `<p class="text-center text-gray-500">Select a mutation point to view details</p>`;
          
          hideLoadingIndicator();
        } catch (error) {
          console.error("Error refreshing API data:", error);
          hideLoadingIndicator();
          showErrorMessage("Failed to refresh API data: " + error.message);
        }
      });
      
      console.log("Dashboard initialized successfully");
    } catch (error) {
      console.error("Error fetching API data:", error);
      hideLoadingIndicator();
      showErrorMessage("Failed to fetch API data: " + error.message);
      
      // Display error message in the UI
      document.getElementById("map-container").innerHTML = 
        `<div class="p-4 text-red-500">Error loading map: ${error.message}</div>`;
      document.getElementById("scatter-container").innerHTML = 
        `<div class="p-4 text-red-500">Error loading scatter plot: ${error.message}</div>`;
    }
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    
    // Display error message in the UI
    document.getElementById("map-container").innerHTML = 
      `<div class="p-4 text-red-500">Error loading map: ${error.message}</div>`;
    document.getElementById("scatter-container").innerHTML = 
      `<div class="p-4 text-red-500">Error loading scatter plot: ${error.message}</div>`;
  }
  
  // Function to show loading indicator
  function showLoadingIndicator(message) {
    // Remove any existing loading indicator
    hideLoadingIndicator();
    
    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-indicator';
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    loadingDiv.style.background = 'rgba(255, 255, 255, 0.9)';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.borderRadius = '5px';
    loadingDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    loadingDiv.style.zIndex = '1000';
    loadingDiv.innerHTML = `
      <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; margin: 0 auto 10px; animation: spin 2s linear infinite;"></div>
      <p style="margin: 0; text-align: center;">${message || 'Loading...'}</p>
    `;
    document.body.appendChild(loadingDiv);
    
    // Add the spin animation
    if (!document.querySelector('style#loading-animation')) {
      const style = document.createElement('style');
      style.id = 'loading-animation';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function hideLoadingIndicator() {
    const loadingDiv = document.querySelector('.loading-indicator');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.background = '#f8d7da';
    errorDiv.style.color = '#721c24';
    errorDiv.style.padding = '10px 20px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    errorDiv.style.zIndex = '1000';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
})(); 