---
theme: dashboard
toc: false
---

# Modular DNA Mutation Dashboard - API

This dashboard demonstrates a modular approach to visualizing DNA mutation data.

<div class="grid grid-cols-1 gap-4">
  <div class="card p-4">
    <h2 class="mb-4">Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;"></div>
  </div>
</div>

<div class="grid grid-cols-2 gap-4 mt-4">
  <div class="card p-4">
    <h2 class="mb-4">Reference Database UMAP</h2>
    <div id="scatter-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;"></div>
  </div>
  <div class="card p-4">
    <h2 class="mb-4">User Sequence UMAP</h2>
    <div id="user-scatter-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;">
      <div class="flex flex-col items-center justify-center h-full">
        <p class="text-center text-gray-500 mb-4">Upload a sequence to view its UMAP projection</p>
        <button id="upload-fasta-button" class="btn btn-primary">Upload FASTA Sequence</button>
        <input type="file" id="fasta-file-input" accept=".fasta,.fa" style="display: none;">
      </div>
    </div>
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

```js
import * as d3 from "d3";
import { createMap } from "./components/map-component.js";
import { createApiMap } from "./components/api-map-component.js";
import { createUmapScatterPlot } from "./components/api-scatter-component.js";
import { updateDetailsPanel, addContainerStyles } from "./components/ui-utils.js";
import { setupEventHandlers } from "./components/event-handlers.js";
import { createUserScatterPlot } from "./components/api-user-scatter-component.js";
import { 
  fetchUmapData, 
  transformUmapData,
  uploadSequence,
  checkJobStatus,
  getUmapProjection,
  getSimilarSequences,
  visualizeSimilarityConnections,
  highlightSimilarSequence,
  toggleSimilarityConnections,
  API_BASE_URL,
  API_KEY
} from './components/api/api-service.js';
import { createUploadModal, readFastaFile, parseFastaContent } from './components/api/api-upload-component.js';
import { createJobTracker } from './components/api/api-job-tracker.js';
import { 
  processSequenceResults, 
  generateDetailsHTML, 
  prepareVisualizationData,
  addSimilarSequenceListeners
} from './components/api/api-results-processor.js';
import {
  findSimilarSequencesForJob,
  fetchAllSequences,
  findSimilarSequences
} from './components/api/api-similarity-service.js';

// Make FileAttachment available globally if it exists in this context
// This helps our components detect if they're running in Observable
if (typeof FileAttachment !== 'undefined') {
  window.FileAttachment = FileAttachment;
}

// Define the state object at the beginning of the JavaScript section
const state = {
  originalData: [], // Keep a copy of original data for reset
  currentData: [],
  selectedPoint: null,
  mapComponent: null,
  scatterComponent: null,
  userScatterComponent: null,
  userSequence: null,
  jobTracker: null,
  jobPollingIntervals: {},
  stopPollingFunctions: {},
  similarSequences: []
};

// Define API constants
// const API_BASE_URL = 'http://54.169.186.71/api/v1';
// const API_KEY = 'test_key';

/**
 * Handle job completion and update visualizations
 * @param {string} jobId - The completed job ID
 * @param {Object} jobData - The job data from the API
 */
async function handleJobCompletion(jobId, jobData) {
  try {
    console.log(`Job ${jobId} completed. Processing results...`);
    console.log("Job data received:", jobData);
    showLoadingIndicator("Processing sequence results...");
    
    // Extract embedding ID from job data
    let embeddingId = jobId;
    if (jobData && jobData.embedding_id) {
      embeddingId = jobData.embedding_id;
    } else if (jobData && jobData.result && jobData.result.embedding_id) {
      embeddingId = jobData.result.embedding_id;
    }
    
    console.log(`Using embedding ID: ${embeddingId}`);
    
    // Get UMAP projection for the user sequence
    const umapProjection = await getUmapProjection(embeddingId);
    console.log("UMAP projection:", umapProjection);
    
    // Create a user sequence object
    const userSequence = {
      id: embeddingId,
      isUserSequence: true,
      accession: "User Sequence",
      country: "N/A",
      date: new Date().toISOString().split('T')[0]
    };
    
    // Extract coordinates from the API response
    if (umapProjection && umapProjection.result && umapProjection.result.coordinates) {
      // Format from API response
      userSequence.x = umapProjection.result.coordinates[0];
      userSequence.y = umapProjection.result.coordinates[1];
    } else if (umapProjection && umapProjection.x !== undefined && umapProjection.y !== undefined) {
      // Direct coordinates
      userSequence.x = umapProjection.x;
      userSequence.y = umapProjection.y;
    } else {
      // Fallback to random coordinates if none found
      console.warn("No coordinates found in UMAP projection, using random values");
      userSequence.x = (Math.random() * 20) - 10;
      userSequence.y = (Math.random() * 20) - 10;
    }
    
    console.log("User sequence with coordinates:", userSequence);
    
    // Find similar sequences using our improved function
    let similarSequences = [];
    try {
      console.log("Finding similar sequences for job:", embeddingId);
      
      // Import the function directly to avoid module loading issues
      // const { findSimilarSequencesForJob } = await import('./components/api/api-similarity-service.js');
      
      similarSequences = await findSimilarSequencesForJob(embeddingId, {
        limit: 10,
        threshold: 0.7
      });
      console.log("Similar sequences found:", similarSequences.length);
      
      // Store in state
      state.similarSequences = similarSequences;
    } catch (error) {
      console.error("Error finding similar sequences:", error);
      showWarningMessage(`Could not find similar sequences: ${error.message}`);
    }
    
    // Create or update user scatter plot
    const userScatterContainer = document.getElementById('user-scatter-container');
    
    try {
      // Clear the container
      userScatterContainer.innerHTML = '';
      
      // Create visualization data
      const visualizationData = [userSequence, ...similarSequences];
      
      // Create the user scatter plot using the dedicated component
      state.userScatterComponent = createUserScatterPlot('user-scatter-container', visualizationData, {
        width: userScatterContainer.clientWidth,
        height: userScatterContainer.clientHeight,
        showLabels: true,
        userPointRadius: 8,
        pointRadius: 5,
        onPointClick: (point) => {
          console.log("User scatter point clicked:", point);
          // Highlight the point in all visualizations
          highlightSequence(point.id, true);
        }
      });
      
      // Add similarity connections if we have similar sequences
      if (similarSequences.length > 0) {
        state.userScatterComponent.addSimilarityConnections(userSequence, similarSequences);
      }
      
      // Update details panel
      const detailsPanel = document.getElementById('details-panel');
      if (detailsPanel) {
        detailsPanel.innerHTML = generateDetailsHTML(userSequence, similarSequences);
        
        // Add event listeners to similar sequence items
        addSimilarSequenceListeners();
      }
      
      // Show success message
      showInfoMessage(`Analysis complete! Found ${similarSequences.length} similar sequences.`);
    } catch (error) {
      console.error("Error creating user scatter plot:", error);
      userScatterContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
          <p class="text-center text-red-500 mb-4">Error visualizing sequence: ${error.message}</p>
          <button id="retry-visualization-button" class="btn btn-primary">Retry Visualization</button>
        </div>
      `;
      
      // Add retry button handler
      document.getElementById('retry-visualization-button').addEventListener('click', () => {
        handleJobCompletion(jobId, jobData);
      });
    }
    
    hideLoadingIndicator();
  } catch (error) {
    console.error("Error handling job completion:", error);
    hideLoadingIndicator();
    showErrorMessage(`Error processing sequence results: ${error.message}`);
    
    // Show error in user scatter container
    const userScatterContainer = document.getElementById('user-scatter-container');
    userScatterContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full">
        <p class="text-center text-red-500 mb-4">Error: ${error.message}</p>
        <button id="upload-fasta-button" class="btn btn-primary">Try Again</button>
      </div>
    `;
  }
}

// Function to set up job polling
function setupJobPolling(jobId, maxAttempts = 60) {
  let attempts = 0;
  
  console.log(`Setting up polling for job ${jobId}`);
  
  // Create a function to stop polling
  const stopPolling = () => {
    if (state.jobPollingIntervals[jobId]) {
      console.log(`Stopping polling for job ${jobId}`);
      clearInterval(state.jobPollingIntervals[jobId]);
      delete state.jobPollingIntervals[jobId];
    }
  };
  
  // Set up the interval
  const intervalId = setInterval(async () => {
    attempts++;
    
    try {
      console.log(`Polling job ${jobId}, attempt ${attempts}/${maxAttempts}`);
      
      // Update progress bar if it exists
      const progressBar = document.getElementById('job-progress-bar');
      if (progressBar) {
        const progress = Math.min((attempts / maxAttempts) * 100, 95);
        progressBar.style.width = `${progress}%`;
      }
      
      // Check job status
      const jobData = await checkJobStatus(jobId);
      
      // Update job tracker if it exists
      if (state.jobTracker) {
        state.jobTracker.updateStatus(jobData.status, jobData);
      }
      
      // Handle different job statuses
      if (jobData.status === 'completed') {
        console.log(`Job ${jobId} completed successfully`);
        
        // Stop polling
        stopPolling();
        
        // Process the results
        await handleJobCompletion(jobId, jobData);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.complete(jobData);
        }
      } else if (jobData.status === 'failed') {
        console.error(`Job ${jobId} failed:`, jobData.error || 'Unknown error');
        
        // Stop polling
        stopPolling();
        
        // Show error message
        showErrorMessage(`Job failed: ${jobData.error || 'Unknown error'}`);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.error(jobData.error || 'Unknown error');
        }
      } else if (attempts >= maxAttempts) {
        console.warn(`Job ${jobId} polling timed out after ${maxAttempts} attempts`);
        
        // Stop polling
        stopPolling();
        
        // Show timeout message
        showWarningMessage(`Job ${jobId} is taking too long. Please check back later.`);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.timeout();
        }
      }
    } catch (error) {
      console.error(`Error polling job ${jobId}:`, error);
    }
  }, 5000); // Poll every 5 seconds
  
  // Store interval ID for cleanup
  state.jobPollingIntervals[jobId] = intervalId;
  
  // Return the stop function
  return stopPolling;
}

// Add utility functions for showing messages and loading indicators
function showLoadingIndicator(message = "Loading...") {
  // Create loading indicator if it doesn't exist
  let loadingIndicator = document.getElementById('loading-indicator');
  
  if (!loadingIndicator) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.className = 'loading-indicator';
    document.body.appendChild(loadingIndicator);
  }
  
  // Update message and show
  loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  loadingIndicator.style.display = 'flex';
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

function showInfoMessage(message, duration = 5000) {
  showMessage(message, 'info', duration);
}

function showWarningMessage(message, duration = 8000) {
  showMessage(message, 'warning', duration);
}

function showErrorMessage(message, duration = 8000) {
  showMessage(message, 'error', duration);
}

function showMessage(message, type = 'info', duration = 5000) {
  // Create messages container if it doesn't exist
  let messagesContainer = document.getElementById('messages-container');
  
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.id = 'messages-container';
    messagesContainer.className = 'messages-container';
    document.body.appendChild(messagesContainer);
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${type}`;
  messageElement.innerHTML = `
    <div class="message-content">${message}</div>
    <button class="message-close">&times;</button>
  `;
  
  // Add to container
  messagesContainer.appendChild(messageElement);
  
  // Add close button handler
  const closeButton = messageElement.querySelector('.message-close');
  closeButton.addEventListener('click', () => {
    messageElement.classList.add('message-hiding');
    setTimeout(() => {
      messagesContainer.removeChild(messageElement);
    }, 300);
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (messageElement.parentNode === messagesContainer) {
        messageElement.classList.add('message-hiding');
        setTimeout(() => {
          if (messageElement.parentNode === messagesContainer) {
            messagesContainer.removeChild(messageElement);
          }
        }, 300);
      }
    }, duration);
  }
  
  // Show with animation
  setTimeout(() => {
    messageElement.classList.add('message-visible');
  }, 10);
}

// Add CSS for loading indicator and messages
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .loading-indicator {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-message {
      font-size: 18px;
      color: #333;
    }
    
    .messages-container {
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 9998;
    }
    
    .message {
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px;
      transform: translateX(120%);
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      opacity: 0;
    }
    
    .message-visible {
      transform: translateX(0);
      opacity: 1;
    }
    
    .message-hiding {
      transform: translateX(120%);
      opacity: 0;
    }
    
    .message-info {
      border-left: 4px solid #3498db;
    }
    
    .message-error {
      border-left: 4px solid #e74c3c;
    }
    
    .message-content {
      flex: 1;
      margin-right: 10px;
    }
    
    .message-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
    }
    
    .message-close:hover {
      color: #333;
    }
  </style>
`);

// Add function to update job status in UI
function updateJobStatus(jobId, status) {
  console.log(`Updating job status for ${jobId} to ${status}`);
  
  // Find the job status element
  const jobStatusElement = document.querySelector(`.job-status[data-job-id="${jobId}"]`);
  
  if (jobStatusElement) {
    // Update the status text
    jobStatusElement.textContent = status;
    
    // Update the status class
    jobStatusElement.className = `job-status job-status-${status}`;
    
    // Update progress bar if it exists
    const progressBar = document.querySelector(`.job-progress[data-job-id="${jobId}"]`);
    if (progressBar) {
      if (status === 'completed') {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#4CAF50';
      } else if (status === 'failed') {
        progressBar.style.backgroundColor = '#e74c3c';
      } else if (status === 'processing') {
        progressBar.style.width = '50%';
        progressBar.style.backgroundColor = '#3498db';
      }
    }
  } else {
    console.warn(`Job status element not found for job ${jobId}`);
  }
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
        scatterComponent: null,
        userScatterComponent: null,
        userSequence: null,
        jobTracker: null,
        jobPollingIntervals: {},
        similarSequences: []
      };
      
      // Create map visualization using our new API map component
      console.log("Creating map visualization...");
      state.mapComponent = createApiMap("map-container", transformedData, {
        colorScale: d3.scaleOrdinal(d3.schemeCategory10),
        onPointClick: (point) => {
          selectPoint(point.index);
        }
      });
      
      // Create scatter plot visualization for reference database
      console.log("Creating reference database scatter plot...");
      state.scatterComponent = createUmapScatterPlot("scatter-container", transformedData, {
        xLabel: "X Dimension",
        yLabel: "Y Dimension",
        onPointClick: (point) => {
          selectPoint(point.index);
        }
      });
      
      // Create empty scatter plot for user sequence
      console.log("Creating user sequence scatter plot...");
      state.userScatterComponent = createUmapScatterPlot("user-scatter-container", [], {
        xLabel: "X Dimension",
        yLabel: "Y Dimension",
        emptyState: true
      });
      
      // Show API data notice
      apiDataNotice.style.display = 'block';
      
      // Function to select a point and update visualizations
      function selectPoint(index) {
        state.selectedPoint = index;
        
        // Find the point in our data
        const point = state.currentData.find(d => d.index === index);
        
        if (point) {
          console.log("Selected point:", point);
          
          // Update details panel
          updateDetailsPanel(point);
          
          // Highlight point in map
          if (state.mapComponent && state.mapComponent.highlightPoint) {
            state.mapComponent.highlightPoint(index);
          }
          
          // Highlight point in scatter plot
          if (state.scatterComponent && state.scatterComponent.highlightPoint) {
            state.scatterComponent.highlightPoint(index);
          }
        }
      }
      
      // Set up the upload button
      const uploadButton = document.getElementById('upload-fasta-button');
      uploadButton.addEventListener('click', () => {
        // Create and show the upload modal
        const uploadModal = createUploadModal({
          onUpload: async (file, model) => {
            try {
              console.log(`Processing file: ${file.name}, model: ${model}`);
              showLoadingIndicator("Uploading sequence...");
              
              // Upload the sequence
              const uploadResult = await uploadSequence(file, model);
              console.log("Upload result:", uploadResult);
              
              // Create job tracker
              const jobId = uploadResult.job_id;
              state.jobTracker = createJobTracker(jobId, {
                onStatusChange: (status, jobData) => {
                  console.log(`Job status changed to: ${status}`);
                },
                onComplete: async (jobData) => {
                  console.log("Job completed:", jobData);
                  // The processing will be handled by the polling function
                },
                onError: (error) => {
                  console.error("Job failed:", error);
                  showErrorMessage("Sequence analysis failed. Please try again.");
                }
              });
              
              // Show the job tracker
              state.jobTracker.show();
              
              // Start polling with the new function
              const stopPolling = setupJobPolling(jobId);
              
              // Store the stop function in case we need to cancel
              state.stopPollingFunctions = state.stopPollingFunctions || {};
              state.stopPollingFunctions[jobId] = stopPolling;
              
              // Hide the loading indicator
              hideLoadingIndicator();
              
              // Hide the empty state message in the user scatter container
              const userScatterContainer = document.getElementById('user-scatter-container');
              const emptyStateMessage = userScatterContainer.querySelector('.flex');
              if (emptyStateMessage) {
                emptyStateMessage.style.display = 'none';
              }
            } catch (error) {
              console.error("Error uploading sequence:", error);
              hideLoadingIndicator();
              showErrorMessage("Error uploading sequence. Please try again.");
            }
          },
          onCancel: () => {
            console.log("Upload canceled");
          }
        });
      });
      
      // Fetch and cache all sequences for similarity search
      try {
        await fetchAllSequences();
        console.log("All sequences cached for similarity search");
      } catch (error) {
        console.error("Error caching sequences for similarity search:", error);
        // Continue anyway, as this is not critical for initial visualization
      }
      
    } catch (error) {
      console.error("Error fetching API data:", error);
      hideLoadingIndicator();
      showErrorMessage("Error loading data. Please try again later.");
    }
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    showErrorMessage("Error initializing dashboard. Please try again later.");
  }
})();

// Add the missing addSimilarityConnectionsToggle function
function addSimilarityConnectionsToggle() {
  // Create the toggle control if it doesn't exist
  let toggleContainer = document.getElementById('similarity-connections-toggle');
  
  if (!toggleContainer) {
    toggleContainer = document.createElement('div');
    toggleContainer.id = 'similarity-connections-toggle';
    toggleContainer.className = 'toggle-container';
    
    // Create the toggle switch
    toggleContainer.innerHTML = `
      <label class="toggle-switch">
        <input type="checkbox" id="show-connections-checkbox" checked>
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label">Show similarity connections</span>
    `;
    
    // Add to the controls container
    const controlsContainer = document.querySelector('.controls-container') || document.body;
    controlsContainer.appendChild(toggleContainer);
    
    // Add event listener
    const checkbox = document.getElementById('show-connections-checkbox');
    checkbox.addEventListener('change', (e) => {
      const showConnections = e.target.checked;
      
      // Toggle connections in user scatter plot
      if (state.userScatterComponent) {
        toggleSimilarityConnections(state.userScatterComponent, showConnections);
      }
      
      // Toggle connections in main scatter plot if needed
      if (state.scatterComponent) {
        toggleSimilarityConnections(state.scatterComponent, showConnections);
      }
      
      console.log(`Similarity connections ${showConnections ? 'shown' : 'hidden'}`);
    });
  }
  
  console.log("Added similarity connections toggle");
}

// Add CSS for the toggle
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .toggle-container {
      display: flex;
      align-items: center;
      margin: 10px 0;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
      margin-right: 10px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 20px;
    }
    
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .toggle-slider {
      background-color: #2196F3;
    }
    
    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
    
    .toggle-label {
      font-size: 14px;
    }
  </style>
`);

// Add the missing highlightSequence function
function highlightSequence(sequenceId, highlight = true) {
  console.log(`${highlight ? 'Highlighting' : 'Unhighlighting'} sequence: ${sequenceId}`);
  
  try {
    // Highlight in map component
    if (state.mapComponent && state.mapComponent.highlightPoint) {
      state.mapComponent.highlightPoint(sequenceId, highlight);
    }
    
    // Highlight in main scatter plot
    if (state.scatterComponent && state.scatterComponent.highlightPoint) {
      state.scatterComponent.highlightPoint(sequenceId, highlight);
    }
    
    // Highlight in user scatter plot
    if (state.userScatterComponent && state.userScatterComponent.highlightPoint) {
      state.userScatterComponent.highlightPoint(sequenceId, highlight);
    }
    
    // Highlight in similar sequences list
    const sequenceItems = document.querySelectorAll(`.similar-sequence-item[data-id="${sequenceId}"]`);
    sequenceItems.forEach(item => {
      if (highlight) {
        item.classList.add('highlighted');
      } else {
        item.classList.remove('highlighted');
      }
    });
    
    // If we have the imported highlightSimilarSequence function, use it
    if (typeof highlightSimilarSequence === 'function') {
      // This function might be imported from api-service.js
      highlightSimilarSequence(state.userScatterComponent, sequenceId, highlight);
    }
  } catch (error) {
    console.error(`Error ${highlight ? 'highlighting' : 'unhighlighting'} sequence:`, error);
  }
}

// Add CSS for highlighted sequence items
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .similar-sequence-item.highlighted {
      background-color: #f0f7ff;
      border-left: 3px solid #2196F3;
    }
  </style>
`);

// Add the missing updateVisualizationWithResults function
function updateVisualizationWithResults(results) {
  console.log("Updating visualization with results:", results);
  
  try {
    const { userSequence, similarSequences } = results;
    
    // Store the user sequence in state
    state.userSequence = userSequence;
    
    // 1. Update user scatter plot
    if (state.userScatterComponent) {
      // Clear existing data
      state.userScatterComponent.updateData([]);
      
      // Add user sequence and similar sequences
      const visualizationData = [userSequence, ...similarSequences];
      state.userScatterComponent.updateData(visualizationData);
      
      // Visualize similarity connections
      visualizeSimilarityConnections(
        state.userScatterComponent, 
        userSequence, 
        similarSequences, 
        {
          lineColor: 'rgba(255, 0, 0, 0.3)',
          lineWidth: 1
        }
      );
      
      console.log("Updated user scatter plot with", visualizationData.length, "points");
    } else {
      console.warn("User scatter component not found");
      
      // Create user scatter plot if it doesn't exist
      const userScatterContainer = document.getElementById('user-scatter-container');
      if (userScatterContainer) {
        // Clear the container
        userScatterContainer.innerHTML = '';
        
        // Create the scatter plot
        state.userScatterComponent = createUmapScatterPlot(
          "user-scatter-container", 
          [userSequence, ...similarSequences], 
          {
            xLabel: "X Dimension",
            yLabel: "Y Dimension",
            colorField: 'isUserSequence',
            colorScale: d3.scaleOrdinal().domain([true, false]).range(['red', 'blue']),
            tooltipFunction: (d) => {
              return d.isUserSequence ? 
                'Your sequence' : 
                `Similarity: ${(d.similarity * 100).toFixed(2)}%<br>ID: ${d.id}`;
            }
          }
        );
        
        // Visualize similarity connections
        visualizeSimilarityConnections(
          state.userScatterComponent, 
          userSequence, 
          similarSequences, 
          {
            lineColor: 'rgba(255, 0, 0, 0.3)',
            lineWidth: 1
          }
        );
        
        console.log("Created new user scatter plot");
      }
    }
    
    // 2. Update main scatter plot to highlight similar sequences
    if (state.scatterComponent) {
      // Highlight similar sequences in the main scatter plot
      similarSequences.forEach(seq => {
        if (state.scatterComponent.highlightPoint) {
          state.scatterComponent.highlightPoint(seq.id, true, {
            color: 'rgba(255, 0, 0, 0.5)',
            radius: 5
          });
        }
      });
      
      console.log("Highlighted similar sequences in main scatter plot");
    }
    
    // 3. Update map component if available
    if (state.mapComponent && state.mapComponent.highlightPoints) {
      // Highlight similar sequences on the map
      const pointIds = similarSequences.map(seq => seq.id);
      state.mapComponent.highlightPoints(pointIds, {
        color: 'rgba(255, 0, 0, 0.5)',
        radius: 5
      });
      
      console.log("Highlighted similar sequences on map");
    }
    
    // 4. Update the details panel - use the imported function
    const detailsPanel = document.getElementById('details-panel');
    if (detailsPanel) {
      detailsPanel.innerHTML = generateDetailsHTML(userSequence, similarSequences);
      console.log("Updated details panel");
    }
    
    // 5. Show success message
    showInfoMessage("Sequence analysis complete! Found " + similarSequences.length + " similar sequences.");
    
    return true;
  } catch (error) {
    console.error("Error updating visualization with results:", error);
    showErrorMessage("Error updating visualization: " + error.message);
    return false;
  }
}