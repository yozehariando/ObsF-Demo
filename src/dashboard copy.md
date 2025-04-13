---
theme: dashboard
toc: false
---

# Modular DNA Mutation Dashboard - API

This dashboard demonstrates a modular approach to visualizing DNA mutation data.

<div class="grid grid-cols-2 gap-4">
  <div class="card p-4">
    <h2 class="mb-4">Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;"></div>
  </div>
  <div class="card p-4">
    <h2 class="mb-4">Mutation Clustering</h2>
    <div id="scatter-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;"></div>
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
      <button id="upload-fasta-button" class="btn btn-primary">Upload FASTA Sequence</button>
      <input type="file" id="fasta-file-input" accept=".fasta,.fa" style="display: none;">
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
  getUmapProjection,
  getSimilarSequences
} from './components/api/api-service.js';
import { createUploadModal, readFastaFile, parseFastaContent } from './components/api/api-upload-component.js';
import { createJobTracker } from './components/api/api-job-tracker.js';

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
        userSequence: null,
        jobTracker: null
      };
      
      // Create map visualization using our new API map component
      console.log("Creating map visualization...");
      state.mapComponent = createApiMap("map-container", transformedData, {
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
              state.jobTracker.startPolling();
              
              // Hide the loading indicator
              hideLoadingIndicator();
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
      
      // Function to process sequence results
      function processSequenceResults(jobId, projection, similarSequences) {
        try {
          console.log("Processing sequence results:", { jobId, projection, similarSequences });
          
          // 1. Extract user sequence data
          const userSequence = {
            id: jobId,
            x: projection.x,
            y: projection.y,
            isUserSequence: true,
            label: "Your Sequence"
          };
          
          // 2. Format similar sequences - ensure it's an array first
          let formattedSimilarSequences = [];
          
          if (similarSequences) {
            // Check if similarSequences is an array
            if (Array.isArray(similarSequences)) {
              formattedSimilarSequences = similarSequences.map(seq => ({
                ...seq,
                isSimilar: true,
                similarityScore: 1 - seq.distance
              }));
            } 
            // Check if it's an object with results property (API might return this format)
            else if (similarSequences.results && Array.isArray(similarSequences.results)) {
              formattedSimilarSequences = similarSequences.results.map(seq => ({
                ...seq,
                isSimilar: true,
                similarityScore: 1 - seq.distance
              }));
            }
            // Log the actual structure for debugging
            else {
              console.error("Unexpected similarSequences format:", similarSequences);
              console.log("similarSequences type:", typeof similarSequences);
              console.log("similarSequences keys:", Object.keys(similarSequences));
            }
          }
          
          console.log("Formatted similar sequences:", formattedSimilarSequences);
          
          // 3. Update state
          state.userSequence = userSequence;
          state.similarSequences = formattedSimilarSequences;
          
          // 4. Show success message with more details
          const similarCount = formattedSimilarSequences.length;
          const successMessage = similarCount > 0 
            ? `Sequence analysis complete! Found ${similarCount} similar sequences.` 
            : "Sequence analysis complete! Your sequence has been added to the visualization. No similar sequences were found in the database.";
          
          showInfoMessage(successMessage);
          
          // 5. Add user sequence to visualizations with visual highlight
          if (state.mapComponent && state.mapComponent.addPoint) {
            state.mapComponent.addPoint(userSequence);
            
            // Highlight the user's sequence
            if (state.mapComponent.highlightPoint) {
              state.mapComponent.highlightPoint(jobId);
            }
          }
          
          if (state.scatterComponent && state.scatterComponent.addPoint) {
            state.scatterComponent.addPoint(userSequence);
            
            // Highlight the user's sequence
            if (state.scatterComponent.highlightPoint) {
              state.scatterComponent.highlightPoint(jobId);
            }
          }
          
          // 6. Show similarity panel
          showSimilarityPanel(formattedSimilarSequences);
          
          // 7. Update details panel with user sequence info
          updateDetailsPanel({
            ...userSequence,
            label: "Your Uploaded Sequence",
            description: "This is your uploaded sequence projected into the visualization space."
          });
        } catch (error) {
          console.error("Error processing sequence results:", error);
          showErrorMessage("Error processing sequence results. Please try again.");
        }
      }
      
      // Add this function right after processSequenceResults
      function showSimilarityPanel(similarSequences) {
        try {
          console.log("Showing similarity panel with", similarSequences.length, "sequences");
          
          // Remove existing panel if present
          const existingPanel = document.querySelector('.similarity-panel');
          if (existingPanel) {
            existingPanel.remove();
          }
          
          // Create panel
          const panel = document.createElement('div');
          panel.className = 'similarity-panel';
          panel.style.position = 'fixed';
          panel.style.top = '80px';
          panel.style.right = '20px';
          panel.style.width = '300px';
          panel.style.maxHeight = '80vh';
          panel.style.overflowY = 'auto';
          panel.style.background = 'white';
          panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
          panel.style.borderRadius = '5px';
          panel.style.zIndex = '100';
          panel.style.padding = '10px';
          
          panel.innerHTML = `
            <div class="similarity-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
              <h3 style="margin: 0; font-size: 16px;">Sequence Analysis Results</h3>
              <button class="close-button" style="background: none; border: none; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
            <div class="similarity-list">
              ${similarSequences.length > 0 ? 
                similarSequences.map(seq => `
                  <div class="similarity-item" data-id="${seq.id}" style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; margin-bottom: 5px; transition: background 0.2s;">
                    <div class="similarity-score" style="width: 50px; height: 50px; border-radius: 50%; background: ${getScoreColor(seq.similarityScore)}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px;">
                      ${(seq.similarityScore * 100).toFixed(0)}%
                    </div>
                    <div class="similarity-details">
                      <div class="similarity-accession" style="font-weight: bold;">${seq.accession || 'Unknown'}</div>
                      <div class="similarity-metadata" style="font-size: 12px; color: #666;">
                        <span class="similarity-country">${seq.country || 'Unknown'}</span>
                        ${seq.year ? `<span class="similarity-year"> (${seq.year})</span>` : ''}
                      </div>
                    </div>
                  </div>
                `).join('') : 
                `<div class="no-similar-sequences" style="padding: 20px; text-align: center;">
                  <div style="margin-bottom: 15px; font-size: 40px; color: #6c757d;">🧬</div>
                  <div style="font-weight: bold; margin-bottom: 5px; color: #495057;">No Similar Sequences Found</div>
                  <div style="color: #6c757d; font-size: 14px;">Your sequence has been successfully analyzed and added to the visualization, but no similar sequences were found in our database.</div>
                  <div style="margin-top: 15px; font-size: 13px; color: #6c757d;">Your sequence is now visible as a highlighted point in the visualizations.</div>
                </div>`
              }
            </div>
          `;
          
          // Add to dashboard
          document.body.appendChild(panel);
          
          // Add event listeners
          panel.querySelector('.close-button').addEventListener('click', () => {
            panel.remove();
          });
          
          // Add event listeners for similarity items
          panel.querySelectorAll('.similarity-item').forEach(item => {
            item.addEventListener('click', () => {
              const id = item.dataset.id;
              const sequence = similarSequences.find(s => s.id === id);
              if (sequence) {
                // Highlight the sequence in visualizations
                if (state.mapComponent && state.mapComponent.highlightPoint) {
                  state.mapComponent.highlightPoint(id);
                }
                
                // Update details panel
                updateDetailsPanel(sequence);
              }
            });
            
            // Add hover effect
            item.addEventListener('mouseover', () => {
              item.style.background = '#f5f5f5';
            });
            
            item.addEventListener('mouseout', () => {
              item.style.background = 'white';
            });
          });
        } catch (error) {
          console.error("Error showing similarity panel:", error);
        }
      }
      
      // Helper function to get color based on similarity score
      function getScoreColor(score) {
        // Color gradient from red (0%) to green (100%)
        if (score > 0.8) return '#28a745'; // Green for high similarity
        if (score > 0.6) return '#5cb85c'; // Light green
        if (score > 0.4) return '#ffc107'; // Yellow
        if (score > 0.2) return '#fd7e14'; // Orange
        return '#dc3545'; // Red for low similarity
      }
      
    } catch (error) {
      console.error("Error fetching API data:", error);
      hideLoadingIndicator();
      showErrorMessage("Error fetching data from API. Please try again later.");
    }
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    hideLoadingIndicator();
    showErrorMessage("Error initializing dashboard. Please refresh the page.");
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
  
  function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-message';
    infoDiv.style.position = 'fixed';
    infoDiv.style.top = '20px';
    infoDiv.style.left = '50%';
    infoDiv.style.transform = 'translateX(-50%)';
    infoDiv.style.background = '#d1ecf1';
    infoDiv.style.color = '#0c5460';
    infoDiv.style.padding = '10px 20px';
    infoDiv.style.borderRadius = '5px';
    infoDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    infoDiv.style.zIndex = '1000';
    infoDiv.textContent = message;
    document.body.appendChild(infoDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      infoDiv.remove();
    }, 5000);
  }
})(); 