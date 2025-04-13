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
import { 
  fetchUmapData, 
  transformUmapData,
  uploadSequence,
  checkJobStatus,
  getUmapProjection,
  getSimilarSequences,
  visualizeSimilarityConnections,
  highlightSimilarSequence,
  toggleSimilarityConnections
} from './components/api/api-service.js';
import { createUploadModal, readFastaFile, parseFastaContent } from './components/api/api-upload-component.js';
import { createJobTracker } from './components/api/api-job-tracker.js';
import { 
  fetchAllSequences, 
  findSimilarSequencesForJob
} from './components/api/api-similarity-service.js';
import { 
  processSequenceResults, 
  generateDetailsHTML, 
  prepareVisualizationData,
  addSimilarSequenceListeners
} from './components/api/api-results-processor.js';

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
        scatterComponent: null,
        userScatterComponent: null,
        userSequence: null,
        jobTracker: null,
        jobPollingIntervals: {}
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
                  try {
                    console.log("Job completed:", jobData);
                    
                    // Get job ID
                    const jobId = jobData.job_id;
                    
                    // Get UMAP projection
                    const projection = await getUmapProjection(jobId);
                    
                    // Get similar sequences with options
                    const similarSequences = await getSimilarSequences(jobId, {
                      n_results: 10,
                      min_distance: -1,
                      max_year: 0,
                      include_unknown_dates: true
                    });
                    
                    // Process and visualize results
                    processSequenceResults(jobId, projection, similarSequences);
                  } catch (error) {
                    console.error("Error processing job results:", error);
                    showErrorMessage("Error processing sequence results.");
                  }
                },
                onError: (error) => {
                  console.error("Job failed:", error);
                  showErrorMessage("Sequence analysis failed. Please try again.");
                }
              });
              
              // Show the job tracker and start polling
              state.jobTracker.show();
              state.jobPollingIntervals[jobId] = setInterval(() => {
                checkJobStatus(jobId)
                  .then(jobData => {
                    // This will be handled inside the checkJobStatus function in api-service.js
                    // No need for additional handling here
                  })
                  .catch(error => {
                    console.error("Error checking job status:", error);
                    showErrorMessage(`Error checking job status: ${error.message}`);
                  });
              }, 5000); // Check every 5 seconds
              
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
      
      // Function to process sequence results
      async function processSequenceResults(jobId, projection, similarSequences) {
        try {
          console.log("Processing sequence results for job:", jobId);
          
          // Get UMAP projection for the user sequence
          const umapResponse = await getUmapProjection(jobId);
          
          if (!umapResponse.ok) {
            throw new Error(`Failed to get UMAP projection: ${umapResponse.status}`);
          }
          
          const umapData = await umapResponse.json();
          console.log("UMAP projection received:", umapData);
          
          // Create user sequence object
          const userSequence = {
            id: jobId,
            x: umapData.x,
            y: umapData.y,
            isUserSequence: true,
            // Add other properties as needed
          };
          
          // Find similar sequences
          console.log("Finding similar sequences...");
          const similarSequences = await findSimilarSequencesForJob(jobId, {
            limit: 20,
            threshold: 0.7
          });
          
          console.log("Found similar sequences:", similarSequences.length);
          
          // Create user scatter plot if it doesn't exist
          if (!state.userScatterComponent) {
            const userScatterContainer = document.getElementById('user-scatter-container');
            // Clear the container
            userScatterContainer.innerHTML = '';
            
            // Create the scatter plot
            state.userScatterComponent = createUmapScatterPlot(userScatterContainer, [userSequence], {
              width: userScatterContainer.clientWidth,
              height: userScatterContainer.clientHeight,
              xField: 'x',
              yField: 'y',
              colorField: 'isUserSequence',
              colorScale: d3.scaleOrdinal().domain([true, false]).range(['red', 'blue']),
              tooltipFunction: (d) => {
                return d.isUserSequence ? 
                  'Your sequence' : 
                  `Similarity: ${(d.similarity * 100).toFixed(2)}%<br>ID: ${d.id}`;
              }
            });
          }
          
          // Add user sequence and similar sequences to the user scatter plot
          state.userScatterComponent.updateData([userSequence, ...similarSequences]);
          
          // Visualize similarity connections
          visualizeSimilarityConnections(state.userScatterComponent, userSequence, similarSequences, {
            lineColor: 'rgba(255, 0, 0, 0.3)',
            lineWidth: 1
          });
          
          // Update the details panel with user sequence info
          updateDetailsPanel(`
            <h3>Your Sequence</h3>
            <p>Job ID: ${jobId}</p>
            <p>UMAP Coordinates: (${umapData.x.toFixed(4)}, ${umapData.y.toFixed(4)})</p>
            <h3>Similar Sequences</h3>
            <div class="similar-sequences-list">
              ${similarSequences.map(seq => `
                <div class="similar-sequence-item">
                  <p><strong>ID:</strong> ${seq.id}</p>
                  <p><strong>Similarity:</strong> ${(seq.similarity * 100).toFixed(2)}%</p>
                  ${seq.accession ? `<p><strong>Accession:</strong> ${seq.accession}</p>` : ''}
                  ${seq.first_country ? `<p><strong>Country:</strong> ${seq.first_country}</p>` : ''}
                  ${seq.first_date ? `<p><strong>Date:</strong> ${seq.first_date}</p>` : ''}
                </div>
              `).join('')}
            </div>
          `);
          
          // Show success message
          showInfoMessage("Sequence analysis complete! Similar sequences found.");
        } catch (error) {
          console.error("Error processing sequence results:", error);
          showErrorMessage("Failed to process sequence results: " + error.message);
        }
      }
      
      // Function to show similarity panel
      function showSimilarityPanel(userSequence, similarSequences) {
        try {
          console.log("Showing similarity panel for:", userSequence, similarSequences);
          
          // Get the details panel
          const detailsPanel = document.getElementById('details-panel');
          
          // Clear existing content
          detailsPanel.innerHTML = '';
          
          // Create header
          const header = document.createElement('h3');
          header.className = 'text-lg font-semibold mb-4';
          header.textContent = 'Similarity Results';
          detailsPanel.appendChild(header);
          
          // Create user sequence info
          const userInfo = document.createElement('div');
          userInfo.className = 'mb-4 p-3 bg-blue-50 rounded';
          userInfo.innerHTML = `
            <p class="font-semibold">Your Sequence</p>
            <p>ID: ${userSequence.id}</p>
            <p>UMAP Coordinates: (${userSequence.x.toFixed(2)}, ${userSequence.y.toFixed(2)})</p>
          `;
          detailsPanel.appendChild(userInfo);
          
          // Create similar sequences list
          const similarHeader = document.createElement('h4');
          similarHeader.className = 'font-semibold mt-4 mb-2';
          similarHeader.textContent = `Similar Sequences (${similarSequences.length})`;
          detailsPanel.appendChild(similarHeader);
          
          if (similarSequences.length === 0) {
            const noResults = document.createElement('p');
            noResults.className = 'text-gray-500 italic';
            noResults.textContent = 'No similar sequences found.';
            detailsPanel.appendChild(noResults);
            return;
          }
          
          // Create list
          const list = document.createElement('div');
          list.className = 'space-y-2 max-h-60 overflow-y-auto';
          
          // Add each similar sequence
          similarSequences.forEach((seq, index) => {
            const item = document.createElement('div');
            item.className = 'p-2 border-b cursor-pointer hover:bg-gray-100';
            item.setAttribute('data-id', seq.id);
            
            // Calculate similarity percentage
            const similarityPercent = (seq.similarity * 100).toFixed(1);
            
            // Get color based on score
            const scoreColor = getScoreColor(seq.similarity);
            
            item.innerHTML = `
              <div class="flex justify-between">
                <span class="font-medium">#${index + 1}</span>
                <span class="font-medium" style="color: ${scoreColor}">${similarityPercent}% similar</span>
              </div>
              <div class="text-sm">
                <p>ID: ${seq.id}</p>
                ${seq.accession ? `<p>Accession: ${seq.accession}</p>` : ''}
                ${seq.first_country ? `<p>Country: ${seq.first_country}</p>` : ''}
                ${seq.first_date ? `<p>Date: ${seq.first_date}</p>` : ''}
              </div>
            `;
            
            list.appendChild(item);
            
            // Add click event to highlight this sequence
            item.addEventListener('click', () => {
              const id = item.getAttribute('data-id');
              if (id) {
                // Highlight in map
                if (state.mapComponent && state.mapComponent.highlightPoint) {
                  state.mapComponent.highlightPoint(id);
                }
                
                // Highlight in scatter plot
                if (state.scatterComponent && state.scatterComponent.highlightPoint) {
                  state.scatterComponent.highlightPoint(id);
                }
                
                if (state.userScatterComponent && state.userScatterComponent.highlightPoint) {
                  state.userScatterComponent.highlightPoint(id);
                }
              }
            });
            
            // Add hover effect
            item.addEventListener('mouseenter', () => {
              item.style.background = '#f0f0f0';
            });
            
            item.addEventListener('mouseleave', () => {
              item.style.background = 'transparent';
            });
          });
          
          detailsPanel.appendChild(list);
        } catch (error) {
          console.error("Error showing similarity panel:", error);
        }
      }
      
      // Helper function to get color based on score
      function getScoreColor(score) {
        // Color gradient from red (0%) to green (100%)
        if (score > 0.8) return '#4CAF50'; // Green
        if (score > 0.6) return '#8BC34A'; // Light green
        if (score > 0.4) return '#FFEB3B'; // Yellow
        if (score > 0.2) return '#FF9800'; // Orange
        return '#F44336'; // Red
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

// Add this function to handle job status updates
function updateJobStatus(jobId, status) {
  console.log(`Updating job status for ${jobId} to ${status}`);
  
  // Find the job status element
  const jobStatusElement = document.querySelector(`.job-status[data-job-id="${jobId}"]`);
  
  if (jobStatusElement) {
    // Update the status text
    jobStatusElement.textContent = status;
    
    // Update the status class
    jobStatusElement.className = `job-status job-status-${status}`;
    
    // If we have a progress bar, update it
    const progressBar = document.querySelector(`.job-progress[data-job-id="${jobId}"]`);
    if (progressBar) {
      if (status === 'completed') {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#4CAF50'; // Green
      } else if (status === 'failed') {
        progressBar.style.backgroundColor = '#F44336'; // Red
      } else if (status === 'processing') {
        progressBar.style.width = '75%';
        progressBar.style.backgroundColor = '#2196F3'; // Blue
      } else if (status === 'queued') {
        progressBar.style.width = '25%';
        progressBar.style.backgroundColor = '#FFC107'; // Amber
      }
    }
  } else {
    console.warn(`Job status element for job ${jobId} not found`);
  }
}

// Add these utility functions for showing messages
function showLoadingIndicator(message) {
  // Create or update loading indicator
  let loadingIndicator = document.getElementById('loading-indicator');
  
  if (!loadingIndicator) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.className = 'loading-indicator';
    document.body.appendChild(loadingIndicator);
  }
  
  loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message || 'Loading...'}</div>
  `;
  
  loadingIndicator.style.display = 'flex';
}

function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

function showErrorMessage(message) {
  // Create or update error message
  let errorMessage = document.getElementById('error-message');
  
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.id = 'error-message';
    errorMessage.className = 'error-message';
    document.body.appendChild(errorMessage);
  }
  
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

function showInfoMessage(message) {
  // Create or update info message
  let infoMessage = document.getElementById('info-message');
  
  if (!infoMessage) {
    infoMessage = document.createElement('div');
    infoMessage.id = 'info-message';
    infoMessage.className = 'info-message';
    document.body.appendChild(infoMessage);
  }
  
  infoMessage.textContent = message;
  infoMessage.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    infoMessage.style.display = 'none';
  }, 5000);
}

// Add CSS for these UI elements
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .loading-indicator {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
    }
    
    .loading-spinner {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 2s linear infinite;
      margin-bottom: 10px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-message {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #f44336;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 9999;
      display: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }
    
    .info-message {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4CAF50;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 9999;
      display: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }
    
    .job-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .job-status-queued {
      background-color: #FFC107;
      color: #000;
    }
    
    .job-status-processing {
      background-color: #2196F3;
      color: white;
    }
    
    .job-status-completed {
      background-color: #4CAF50;
      color: white;
    }
    
    .job-status-failed {
      background-color: #F44336;
      color: white;
    }
    
    .job-progress-container {
      width: 100%;
      height: 5px;
      background-color: #f3f3f3;
      border-radius: 3px;
      margin-top: 5px;
    }
    
    .job-progress {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
  </style>
`);