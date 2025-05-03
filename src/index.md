---
theme: dashboard
toc: false
---

<link rel="stylesheet" href="./components/ui/styles/ui-components.css" id="ui-components-styles">

# Modular DNA Mutation Dashboard - Alternative layout 1

<!-- Upload/Instructions Section -->
<div class="card p-4 mb-4">
  <div class="flex justify-between items-center">
    <div class="flex-1">
      <h2 class="text-xl mb-2">Upload FASTA Sequence</h2>
      <p class="text-gray-600">Upload your FASTA file to analyze and find similar sequences in our database.</p>
    </div>
    <div class="flex items-center gap-4">
      <button id="upload-fasta-button" class="btn btn-primary">Upload FASTA</button>
      <button id="reset-user-sequences" class="btn btn-secondary">Reset Analysis</button>
      <input type="file" id="fasta-file-input" accept=".fasta,.fa" style="display: none;">
    </div>
  </div>
</div>

<!-- UMAP Visualization Section -->
<div class="grid grid-cols-1 gap-4 mb-4">
  <div class="card p-4">
    <h2 class="mb-4">Contextual UMAP</h2>
    <div id="scatter-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;">
      <!-- Added Empty State Message -->
      <div class="empty-state-message flex flex-col items-center justify-center h-full">
        <p class="text-center text-gray-500 mb-4">Upload a sequence to view its relationship with similar sequences in the database.</p>
      </div>
      <!-- <<< START ZOOM CONTROLS >>> -->
      <div class="zoom-controls" style="position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 5px; z-index: 10;">
        <button id="zoom-in-scatter" class="btn btn-sm btn-outline-secondary" title="Zoom In">+</button>
        <button id="zoom-out-scatter" class="btn btn-sm btn-outline-secondary" title="Zoom Out">-</button>
        <button id="reset-scatter" class="btn btn-sm btn-outline-secondary" title="Reset Zoom">Reset</button>
      </div>
      <!-- <<< END ZOOM CONTROLS >>> -->
    </div>
  </div>
</div>

<!-- Details Section - Full Width Container -->
<div>
  <!-- Inner Grid for Map and Details -->
  <div class="grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
    <!-- Left Column -->
    <div class="left-map-column" style="display: flex; flex-direction: column; gap: 1rem;"> 
        <!-- Reference Map Card -->
    <div class="card p-4">
          <h2 class="mb-4">Reference Map (Contextual)</h2>
          <div id="map-container" style="width: 100%; position: relative; overflow: hidden;">
            <!-- Added Empty State Message -->
            <div class="empty-state-message flex flex-col items-center justify-center h-full" style="min-height: 550px;">
              <p class="text-center text-gray-500 mb-4">Upload a sequence to view the geographic distribution of similar sequences.</p>
            </div>
          </div>
        </div>
        <!-- Geo Map Card -->
        <div class="card p-4"> 
          <h2 class="mb-4">Top 10 Similar Sequences - Geographic Distribution</h2>
          <div id="user-geo-container" style="width: 100%; position: relative;">
            <!-- Added Empty State Message -->
            <div class="empty-state-message flex flex-col items-center justify-center h-full">
              <p class="text-center text-gray-500 mb-4">Upload a sequence to view the specific locations of the top 10 most similar sequences.</p>
            </div>
          </div>
        </div>
    </div>
    <!-- Right Column -->
    <div class="card p-4">
      <div class="flex justify-between items-center cursor-pointer" id="details-toggle">
        <h2 class="mb-0">Top 10 Similar Sequences</h2>
        <!-- <span class="toggle-icon">▼</span> -->
      </div>
      <div id="details-panel" class="mt-4 p-4 border rounded" style="overflow-y: auto;">
        <p class="text-center text-gray-500">Upload a sequence to view details of the most similar matches.</p> <!-- Updated Text -->
      </div>
    </div>
  </div>
</div>

```js
import * as d3 from "d3";
// Import UI utility modules
import { 
  showMessage, 
  showInfoMessage, 
  showWarningMessage, 
  showErrorMessage,
} from './components/ui/message-handler.js';
import {
  showLoadingIndicator,
  hideLoadingIndicator,
} from './components/ui/loading-indicator.js';
import {
  updateStatus,
  onStatusChange,
} from './components/ui/status-manager.js';
import { createApiMap } from "./components/visualizations/map-component.js";
import { createUmapScatterPlot } from "./components/visualizations/scatter-plot.js";
import { 
  uploadSequence,
  checkJobStatus,
  getUmapProjection,
  getSimilarSequences,
} from './components/data/api-service.js';
import { 
  createUploadModal, 
  } from './components/ui/upload-component.js';
import { createJobTracker } from './components/ui/job-tracker.js';
import { createUserGeoMap } from "./components/visualizations/user-geo-map.js";

// Make FileAttachment available globally if it exists in this context
// This helps our components detect if they're running in Observable
if (typeof FileAttachment !== 'undefined') {
  window.FileAttachment = FileAttachment;
}

// --- Configuration for Simulated Delay ---
const SIMULATE_PROCESSING_DELAY = false; // Set to false to disable delay
const SIMULATED_DELAY_MS = 120000; // 120,000 ms = 2 minutes
// --- End Configuration ---

// --- ADD THIS FUNCTION DEFINITION ---
/**
 * Show a notification message to the user using the message handler utility.
 * @param {string} message - The message to display
 * @param {string} type - The message type ('success', 'error', 'info', 'warning')
 * @param {number} duration - How long the message should stay visible (ms). Defaults to 5000.
 */
function showNotification(message, type = 'info', duration = 5000) {
  // Reuse our existing message system from message-handler.js
  showMessage(message, type, duration);
}
// --- END ADDED FUNCTION DEFINITION ---

// --- START NEW FUNCTION DEFINITION ---
/**
 * Sets up polling to check the status of a background job.
 * @param {string} jobId - The ID of the job to poll.
 * @param {number} intervalMs - How often to poll (in milliseconds). Defaults to 3000.
 * @returns {Function} A function that can be called to stop the polling.
 */
function setupJobPolling(jobId, intervalMs = 3000) {
  console.log(`🕒 Setting up polling for job ${jobId} every ${intervalMs}ms`);

  const intervalId = setInterval(async () => {
    if (!state.apiKey) { /* ... */ return; }
    console.log(`🕒 Polling job status for ${jobId}...`);
    try {
      // --- Get ACTUAL status from API ---
      const statusResponse = await checkJobStatus(jobId, state.apiKey);
      let actualStatus = statusResponse?.status;
      const result = statusResponse?.result;
      let displayStatus = actualStatus; // Status to show in UI

      console.log(`🕒 Job ${jobId} actual API status: ${actualStatus}`);

      // --- Simulation Logic ---
      if (SIMULATE_PROCESSING_DELAY && actualStatus === 'completed') {
          if (!state.simulatedCompletionTimes[jobId]) {
              // First time seeing 'completed', start simulation
              state.simulatedCompletionTimes[jobId] = Date.now();
              console.log(`🕒 SIMULATION: Job ${jobId} actually completed. Starting ${SIMULATED_DELAY_MS / 1000}s simulated delay.`);
              displayStatus = 'running'; // Report 'running' to UI
        } else {
              // Simulation already started, check if delay is over
              const elapsed = Date.now() - state.simulatedCompletionTimes[jobId];
              if (elapsed >= SIMULATED_DELAY_MS) {
                  console.log(`🕒 SIMULATION: Job ${jobId} simulated delay finished.`);
                  displayStatus = 'completed'; // Report real status now
                  delete state.simulatedCompletionTimes[jobId]; // Clean up
              } else {
                  console.log(`🕒 SIMULATION: Job ${jobId} delay ongoing (${((SIMULATED_DELAY_MS - elapsed) / 1000).toFixed(1)}s remaining).`);
                  displayStatus = 'running'; // Continue reporting 'running'
              }
          }
      }
      // --- End Simulation Logic ---

      // Update Job Tracker UI based on displayStatus
      if (state.jobTracker && state.jobTracker.updateStatus) {
          state.jobTracker.updateStatus(displayStatus, result); 
      }

      // Process based on displayStatus
      if (displayStatus === 'completed') {
        console.log(`✅ Job ${jobId} processing started (after real/simulated completion).`);
        clearInterval(intervalId); 
        delete state.stopPollingFunctions[jobId]; 
        if (state.jobTracker) state.jobTracker.updateStatus('processing results'); 
        await handleJobCompletion(jobId, statusResponse); // Pass original response
      } else if (displayStatus === 'failed') { // Use displayStatus here too
        console.error(`❌ Job ${jobId} failed.`);
        clearInterval(intervalId); 
        delete state.stopPollingFunctions[jobId];
        hideLoadingIndicator(); 
      }
      // If status is 'pending' or 'running', do nothing and let the interval continue

    } catch (error) {
      // ... error handling ...
       if (state.jobTracker) state.jobTracker.updateStatus('failed', { error: error.message });
       clearInterval(intervalId); 
       delete state.stopPollingFunctions[jobId]; 
       delete state.simulatedCompletionTimes[jobId]; // Clean up simulation on error
       hideLoadingIndicator(); 
    }
  }, intervalMs);

  // Return a function to stop polling manually
  const stopPolling = () => {
    console.log(`🚫 Manually stopping polling for job ${jobId}`);
    clearInterval(intervalId);
    delete state.stopPollingFunctions[jobId];
    delete state.simulatedCompletionTimes[jobId]; // Clean up simulation on manual stop
  };

   // Store the stop function globally ONLY IF NOT ALREADY STORED
   // Note: the caller (onUpload) also stores this, which is redundant.
   // We might simplify this later, but keep both for now.
   state.stopPollingFunctions = state.stopPollingFunctions || {};
   if (!state.stopPollingFunctions[jobId]) {
       state.stopPollingFunctions[jobId] = stopPolling;
   }


  return stopPolling;
}
// --- END NEW FUNCTION DEFINITION ---

// Define the state object at the beginning of the JavaScript section
const state = {
  originalData: [], // Keep a copy of original data for reset
  currentData: [],
  selectedPoint: null,
  mapComponent: null,
  scatterComponent: null, // This will be the main/single UMAP
  userSequences: [], // Array to store multiple user sequences
  jobTracker: null,
  jobPollingIntervals: {},
  stopPollingFunctions: {},
  similarSequences: [],
  userGeoMap: null,
  apiKey: null, // <-- Add apiKey state
  simulatedCompletionTimes: {} // <-- Add tracking for simulation
};

// <<<--- START NEW FUNCTION DEFINITION --- >>>
/**
 * Sets up zoom control buttons for a given visualization component.
 * Assumes the component exposes `svg` and `zoomBehavior` properties.
 * @param {Object} componentInstance - The visualization component instance (e.g., state.scatterComponent).
 * @param {Object} buttonIds - An object containing the IDs for zoom in, out, and reset buttons.
 *                             Example: { zoomIn: 'zoom-in-scatter', zoomOut: 'zoom-out-scatter', reset: 'reset-scatter' }
 */
function setupZoomControls(componentInstance, buttonIds) {
  if (!componentInstance || !componentInstance.svg || !componentInstance.zoomBehavior) {
    console.warn("Cannot setup zoom controls: Component instance, SVG, or zoomBehavior is missing.", componentInstance);
    return;
  }
  if (!buttonIds || !buttonIds.zoomIn || !buttonIds.zoomOut || !buttonIds.reset) {
    console.warn("Cannot setup zoom controls: Button IDs are missing.", buttonIds);
    return;
  }

  const svgNode = componentInstance.svg.node(); // Get the actual DOM node
  const zoomBehavior = componentInstance.zoomBehavior;

  const zoomInButton = document.getElementById(buttonIds.zoomIn);
  const zoomOutButton = document.getElementById(buttonIds.zoomOut);
  const resetButton = document.getElementById(buttonIds.reset);

  if (!zoomInButton || !zoomOutButton || !resetButton) {
    console.warn("Cannot setup zoom controls: One or more buttons not found in the DOM.", buttonIds);
    return;
  }

  // --- Remove existing listeners first to prevent duplicates ---
  // Simple approach: Clone and replace the node to remove all listeners
  const newZoomInButton = zoomInButton.cloneNode(true);
  zoomInButton.parentNode.replaceChild(newZoomInButton, zoomInButton);
  const newZoomOutButton = zoomOutButton.cloneNode(true);
  zoomOutButton.parentNode.replaceChild(newZoomOutButton, zoomOutButton);
  const newResetButton = resetButton.cloneNode(true);
  resetButton.parentNode.replaceChild(newResetButton, resetButton);

  // --- Add new listeners ---
  newZoomInButton.addEventListener('click', () => {
    // Re-select the node with D3 before calling transition
    d3.select(svgNode).transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
  });

  newZoomOutButton.addEventListener('click', () => {
    // Re-select the node with D3 before calling transition
    d3.select(svgNode).transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.3);
  });

  newResetButton.addEventListener('click', () => {
    // Re-select the node with D3 before calling transition
    d3.select(svgNode).transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
  });

  console.log(`Zoom controls setup complete for buttons: ${Object.values(buttonIds).join(', ')}`);
}
// <<<--- END NEW FUNCTION DEFINITION --- >>>

/**
 * Handle job completion: Fetch user projection, fetch N=100 similar sequences,
 * directly use coordinates from the /similar endpoint response, prepare data subsets,
 * and update all visualizations.
 * @param {string} jobId - The completed job ID
 * @param {Object} jobData - The job data from the API (e.g., from checkJobStatus)
 */
async function handleJobCompletion(jobId, jobData) {
  console.log(`🚀 Phase 3: handleJobCompletion started for job ${jobId} (Using direct coords from /similar)`);
  let userSequence = null; // Define userSequence here to be accessible in finally block

  // --- Ensure API Key is available ---
  if (!state.apiKey) {
      console.error(`❌ Cannot process job ${jobId}: API Key is not set.`);
      showErrorMessage("API Key missing, cannot process results.");
      hideLoadingIndicator();
      return;
  }

  try {
    showLoadingIndicator("Processing sequence results...");

    // --- Step 1: Get User Projection ---
    const umapProjection = await getUmapProjection(jobId, state.apiKey);
    let embeddingId = jobId;
    if (jobData?.embedding_id) embeddingId = jobData.embedding_id;
    else if (jobData?.result?.embedding_id) embeddingId = jobData.result.embedding_id;
    console.log(`Using embedding ID for user object: ${embeddingId}`);

    let userX = 0, userY = 0;
    if (umapProjection && typeof umapProjection.x === 'number' && typeof umapProjection.y === 'number' && !umapProjection.isPlaceholder) {
      userX = umapProjection.x;
      userY = umapProjection.y;
    } else {
      console.warn("Valid coordinates not found for user sequence from getUmapProjection, using fallback (0, 0).");
    }
    userSequence = {
      id: embeddingId,
      x: userX,
      y: userY,
      label: "Your Sequence",
      isUserSequence: true,
      uploadedAt: new Date().toISOString()
    };
    console.log("Created user sequence object:", userSequence);

    // --- Step 2: Fetch Similar Sequences (Now includes coordinates) ---
    console.log(`Fetching Top 100 similar sequences (with coords) for job ID: ${jobId}`);
    showLoadingIndicator("Fetching similar sequences...");
    const similarOptions100 = { n_results: 100 };
    const similarSequencesResponse100 = await getSimilarSequences(jobId, similarOptions100, state.apiKey);

    // --- Step 3: Handle API Failures ---
    if (!similarSequencesResponse100 || !similarSequencesResponse100.result) {
      console.error(`Failed to fetch or parse Top 100 similar sequences for job ${jobId}. Response:`, similarSequencesResponse100);
      showErrorMessage("Error fetching similar sequences data. Cannot display contextual visualizations.");
      // Update visualizations to show only the user point
      if (state.scatterComponent) {
        state.scatterComponent.updateScatterPlot([], userSequence);
      }
      if (state.mapComponent) state.mapComponent.updateMap([]);
      if (state.userGeoMap) state.userGeoMap.updateMap(userSequence, []);
      updateDetailsWithSimilarSequences(userSequence, []);
      hideLoadingIndicator();
      return; // Exit if fetching failed
    }
    const top100SimilarRaw = similarSequencesResponse100.result;
    console.log(`Received ${top100SimilarRaw.length} similar sequences from API (including coords).`);

    // --- Step 4: Prepare Data Subsets (Simplified) ---
    console.log("Preparing data subsets for visualizations using direct coordinates...");
    const contextualUmapData = [];
    const referenceMapData100 = []; // Still needed for main map display
    const userContextData10WithCoords = []; // Still needed for details panel

    let missingCoordsCount = 0;

    top100SimilarRaw.forEach((rawSeq, index) => {
      // Directly check for umap_coords in the raw sequence data
      const coords = rawSeq.umap_coords;
      const hasCoords = coords && coords.x != null && coords.y != null;

      if (hasCoords) {
        const combinedData = {
          // Core data from raw sequence
          id: rawSeq.id,
          similarity: rawSeq.similarity,
          distance: rawSeq.distance,
          metadata: rawSeq.metadata, // Includes lat_lon, country, year, host, etc.
          // Directly use coordinates from the response
          accession: rawSeq.metadata?.accessions?.[0] || rawSeq.id, // Keep for label/display
          x: coords.x, // Use coordinate from umap_coords
          y: coords.y, // Use coordinate from umap_coords
          // Contextual flags/labels
          label: rawSeq.metadata?.accessions?.[0] || rawSeq.id, // Default label
          isTop10: index < 10,
          isUserSequence: false,
          matchesUserSequence: true
        };

        // Add to the UMAP data list
        contextualUmapData.push(combinedData);
        // Add to the reference map data list
        referenceMapData100.push(combinedData);
        // Add to the top 10 list if applicable
        if (combinedData.isTop10) {
          userContextData10WithCoords.push(combinedData);
        }
      } else {
         missingCoordsCount++;
         console.warn(`Similar sequence ${rawSeq.id} (index ${index}) is missing umap_coords.`);
      }
    });

    console.log(`Prepared UMAP data: ${contextualUmapData.length} points (out of ${top100SimilarRaw.length} raw)`);
    console.log(`Prepared Reference Map data: ${referenceMapData100.length} points`);
    console.log(`Prepared Top 10 data with coords: ${userContextData10WithCoords.length} points`);
    if (missingCoordsCount > 0) {
        showWarningMessage(`Note: ${missingCoordsCount} similar sequences were missing coordinates in the API response.`);
    }

    // --- Step 5: Initialize or Update Visualizations ---
    showLoadingIndicator("Initializing/Updating visualizations...");

    // 5a: Contextual UMAP (`#scatter-container`) - Logic remains the same, just uses the new contextualUmapData
    let scatterComponentInitialized = false;
    if (!state.scatterComponent) {
      console.log("Initializing main UMAP (scatterComponent)...");
      const scatterContainerId = 'scatter-container';
      const scatterContainer = document.getElementById(scatterContainerId);
      const emptyState = scatterContainer?.querySelector('.empty-state-message');
      if (emptyState) emptyState.style.display = 'none';

      state.scatterComponent = createUmapScatterPlot(scatterContainerId, contextualUmapData, { // Pass new data
        initialUserSequence: userSequence,
        colorScheme: { user: '#FF5722', top10: '#E91E63', other: '#9E9E9E' }
      });
      scatterComponentInitialized = true;
    } else {
      console.log("Updating main UMAP (scatterComponent)...");
      state.scatterComponent.updateScatterPlot(contextualUmapData, userSequence); // Pass new data
    }
    // Setup Zoom Controls for UMAP
    if (state.scatterComponent) {
        setupZoomControls(state.scatterComponent, {
            zoomIn: 'zoom-in-scatter',
            zoomOut: 'zoom-out-scatter',
            reset: 'reset-scatter'
        });
        const scatterControls = document.getElementById('scatter-container')?.querySelector('.zoom-controls');
        if (scatterControls) scatterControls.style.display = (contextualUmapData.length > 0 || userSequence) ? 'flex' : 'none';
    }

    // 5b: Reference Map (`#map-container`) - Uses referenceMapData100
    // (Initialization/update logic remains the same)
    if (!state.mapComponent) {
      // ... initialize createApiMap with referenceMapData100 ...
       console.log("Initializing Reference Map (mapComponent)...");
       const mapContainerId = 'map-container';
       const mapContainer = document.getElementById(mapContainerId);
       const emptyState = mapContainer?.querySelector('.empty-state-message');
       if (emptyState) emptyState.style.display = 'none';
       state.mapComponent = createApiMap(mapContainerId, referenceMapData100, { // Pass new data
           initialUserSequence: userSequence
       });
    } else {
      // ... update state.mapComponent.updateMap with referenceMapData100 ...
      console.log("Updating Reference Map (mapComponent)...");
      state.mapComponent.updateMap(referenceMapData100, userSequence); // Pass new data
    }

    // 5c: Geo Map (`#user-geo-container`) - Still uses Top 10 Raw data for potentially different viz logic
    // (Initialization/update logic remains the same)
    const top10ForGeoMap = top100SimilarRaw.slice(0, 10); // Use raw slice for consistency if it expects that format
    if (!state.userGeoMap) {
        // ... initialize createUserGeoMap ...
        console.log("Initializing User Geo Map (userGeoMap) with Top 10 raw...");
        const geoContainerId = 'user-geo-container';
        const geoContainer = document.getElementById(geoContainerId);
        const emptyState = geoContainer?.querySelector('.empty-state-message');
        if (emptyState) emptyState.style.display = 'none';
        state.userGeoMap = await createUserGeoMap(geoContainerId, {});
        if (state.userGeoMap && typeof state.userGeoMap.updateMap === 'function') {
            state.userGeoMap.updateMap(userSequence, top10ForGeoMap); // Pass Top 10 Raw
        } // ... error handling ...
    } else {
        // ... update state.userGeoMap.updateMap ...
        console.log("Updating User Geo Map (userGeoMap) with Top 10 raw...");
        if (typeof state.userGeoMap.updateMap === 'function') {
            state.userGeoMap.updateMap(userSequence, top10ForGeoMap); // Pass Top 10 Raw
        } // ... error handling ...
    }


    // 5d: Details Panel (`#details-panel`) - Uses userContextData10WithCoords
    console.log("Updating Details Panel...");
    updateDetailsWithSimilarSequences(userSequence, userContextData10WithCoords); // Use the prepared top 10 list

    // --- Setup Interactions ---
    if (scatterComponentInitialized /* || other components initialized */) {
         setupCrossHighlighting();
         setupPointHoverEffects();
    } else {
         setupPointHoverEffects(); // Refresh hover effects
    }

    // --- Step 6: Notifications ---
    showNotification(`Analysis complete. Displaying your sequence and ${contextualUmapData.length} similar sequences.`, "success");
    // Warning for missing coords already shown during data prep if needed

    // --- Update tracker ---
    if (state.jobTracker) state.jobTracker.updateStatus('Completed');

  } catch (error) {
    // ... existing error handling ...
    console.error("❌ Error during handleJobCompletion:", error);
    if (state.jobTracker) state.jobTracker.updateStatus('failed', { error: error.message });
    // ... rest of error handling ...
  } finally {
    hideLoadingIndicator();
    console.log(`🚀 Phase 3: handleJobCompletion finished for job ${jobId}`);
  }
}

// Placeholder for the new info panel/legend logic needed for the single UMAP
// This replaces the one previously inside updateUmapVisualization
function addOrUpdateInfoPanel(containerId, sequences) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing info container
    const existingInfoContainer = container.querySelector('.umap-info-container');
    if (existingInfoContainer) existingInfoContainer.remove();

    const infoContainer = document.createElement('div');
    infoContainer.className = 'umap-info-container'; // Use existing class for styling

    const userSequences = sequences.filter(d => d.isUserSequence);
    const top10Sequences = sequences.filter(d => !d.isUserSequence && d.isTop10);
    const otherSequences = sequences.filter(d => !d.isUserSequence && !d.isTop10);

    // Basic Stats
    const statsHtml = `
        <div style="font-weight: bold; margin-bottom: 4px;">Sequence Stats</div>
        <div>User Sequence: <strong>${userSequences.length}</strong></div>
        <div>Top 10 Similar: <strong>${top10Sequences.length}</strong></div>
        <div>Other Similar (11-100): <strong>${otherSequences.length}</strong></div>
        <div>Total Displayed: <strong>${sequences.length}</strong></div>
    `;

    // Legend (needs colors defined according to scatter-plot.js implementation)
    const legendItems = [
        { color: '#FF5722', label: 'User Sequence' }, // Example color - MUST MATCH scatter-plot.js
        { color: '#E91E63', label: 'Top 10 Similar' }, // Example color - MUST MATCH scatter-plot.js
        { color: '#9E9E9E', label: 'Similar (11-100)' }, // Example color - MUST MATCH scatter-plot.js
        // Add line legend if needed later
    ];
    const legendElement = createLegend(null, legendItems, 'UMAP Legend');

    // Assemble panel
    const statsDiv = document.createElement('div');
    statsDiv.className = 'sequence-stats'; // Use existing class
    statsDiv.style.flex = '1';
    statsDiv.innerHTML = statsHtml;

    const legendDiv = document.createElement('div');
    legendDiv.style.flex = '1';
    legendDiv.appendChild(legendElement);


    infoContainer.appendChild(statsDiv);
    infoContainer.appendChild(legendDiv);

    container.appendChild(infoContainer);
    console.log("Added/Updated info panel for UMAP.");
}

// Make sure this helper function exists before updateDetailsWithSimilarSequences
function getSimilarityColor(similarity) {
  if (similarity >= 0.9) return 'high';
  if (similarity >= 0.7) return 'medium';
  return 'low';
}

// Function to update the details panel with similar sequences
function updateDetailsWithSimilarSequences(userSequence, similarSequences) {
  const detailsPanel = document.getElementById('details-panel');
  if (!detailsPanel) return;

  console.log("Updating details panel with Top 10 similar sequences:", similarSequences);

  // Clear current content
  detailsPanel.innerHTML = '';

  // --- User Sequence Header ---
  const userHeader = document.createElement('div');
  userHeader.className = 'details-header';
  const clearButtonHtml = similarSequences && similarSequences.length > 0
     ? `<button id="clear-highlights" class="btn btn-sm btn-outline-secondary" title="Clear selection highlights">Clear</button>`
     : '';
  userHeader.innerHTML = `<h3>Your Sequence</h3><div class="sequence-actions">${clearButtonHtml}</div>`;
  detailsPanel.appendChild(userHeader);

  const userInfo = document.createElement('div');
  userInfo.className = 'user-sequence';
  userInfo.innerHTML = `
    <div><strong>ID:</strong> ${userSequence?.id || 'N/A'}</div>
    <div><strong>Label:</strong> ${userSequence?.label || 'Your Sequence'}</div>
  `;
  detailsPanel.appendChild(userInfo);

  // --- Similar Sequences Section ---
  const similarHeader = document.createElement('div');
  similarHeader.className = 'details-header';
  similarHeader.innerHTML = `<h3>Top ${similarSequences?.length || 0} Similar Sequences</h3>`;
  detailsPanel.appendChild(similarHeader);

  if (!similarSequences || similarSequences.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = userSequence ? 'No similar sequences found or none had coordinates.' : 'Upload a sequence first.';
    detailsPanel.appendChild(noResults);
    return;
  }

  const validSequences = similarSequences.filter(seq => seq.id);
  const sortedSequences = [...validSequences].sort((a, b) =>
    (b.similarity || 0) - (a.similarity || 0)
  );

  const sequencesList = document.createElement('div');
  sequencesList.className = 'similar-sequences-list';

  sortedSequences.forEach(seq => {
    const similarity = seq.similarity || 0;
    const similarityLevel = getSimilarityColor(similarity); // Determine level (high, medium, low)
    const similarityClass = `similarity-${similarityLevel}`; // e.g., similarity-high

    const sequenceLabel = seq.label || seq.accession || seq.id || 'Unknown Sequence';
    const metadata = seq.metadata || {};
    const country = metadata.country || metadata.first_country || 'N/A';
    const year = metadata.first_year || (metadata.years && metadata.years[0]) || 'N/A';
    const host = metadata.host || 'N/A';
    // const distance = seq.distance !== undefined ? seq.distance.toFixed(3) : 'N/A';
    const isolationSource = metadata.isolation_source || 'N/A';

    const seqItem = document.createElement('div');
    // Add the base class AND the similarity level class
    seqItem.className = `similar-sequence-item ${similarityClass}`; 
    seqItem.dataset.id = seq.id;
    // Optional: Keep the data attribute if needed elsewhere, though class is primary now
    seqItem.dataset.similarityLevel = similarityLevel; 

    // Set the CSS variable for border color persistence on hover/highlight
    let borderColor = '#eee'; // Default
    if (similarityLevel === 'high') borderColor = '#4CAF50';
    else if (similarityLevel === 'medium') borderColor = '#FFC107';
    else if (similarityLevel === 'low') borderColor = '#F44336';
    seqItem.style.setProperty('--similarity-border-color', borderColor);

    seqItem.innerHTML = `
      <div class="sequence-content">
        <div class="sequence-name" title="ID: ${seq.id}">${sequenceLabel}</div>
        <div class="sequence-metadata">
          <div class="metadata-row" title="Similarity Score"><strong>Sim:</strong> ${(similarity * 100).toFixed(1)}%</div>
          <div class="metadata-row" title="Country"><strong>Country:</strong> ${country}</div>
          <div class="metadata-row" title="Year"><strong>Year:</strong> ${year}</div>
          <div class="metadata-row" title="Host"><strong>Host:</strong> ${host}</div>
          <div class="metadata-row" title="Isolation Source"><strong>Isol. Source:</strong> ${isolationSource}</div>
      </div>
      </div>
      <div class="similarity-badge" title="Similarity Score">${(similarity * 100).toFixed(0)}%</div>
    `;

    // Add click handler (no changes needed here)
    seqItem.addEventListener('click', function() {
       const sequenceIdToHighlight = this.dataset.id;
       const isHighlighted = this.classList.contains('highlighted');

       document.querySelectorAll('.similar-sequence-item.highlighted').forEach(item => {
         if (item !== this) {
           item.classList.remove('highlighted');
           highlightSequence(item.dataset.id, false);
         }
       });

       if (!isHighlighted) {
         this.classList.add('highlighted');
         highlightSequence(sequenceIdToHighlight, true);
       } else {
         this.classList.remove('highlighted');
         highlightSequence(sequenceIdToHighlight, false);
       }
    });

    sequencesList.appendChild(seqItem);
  });

  detailsPanel.appendChild(sequencesList);

  const clearButton = document.getElementById('clear-highlights');
  if (clearButton) {
    clearButton.addEventListener('click', clearAllHighlights);
  }

  setTimeout(setupPointHoverEffects, 100);
}

// Function to set up cross-highlighting between visualizations
function setupCrossHighlighting() {
  console.log("Setting up cross-highlighting between visualizations (Single UMAP)");

  // --- Highlighting originating FROM the main UMAP (scatterComponent) ---
  if (state.scatterComponent && typeof state.scatterComponent.setCrossHighlightFunction === 'function') {
      const highlightFromMainUMAP = (pointId, highlight) => {
          console.log(`Cross-highlight from Main UMAP: ${pointId} (${highlight ? 'on' : 'off'})`);
          // Highlight in Geo Map
          if (state.userGeoMap && state.userGeoMap.highlightSequence) {
              state.userGeoMap.highlightSequence(pointId, highlight);
          }
          // Highlight in Details Panel
          const detailsPanel = document.getElementById('details-panel');
          if (detailsPanel) {
            const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${pointId}"]`);
            if (sequenceItem) {
              sequenceItem.classList.toggle('hover-highlight', highlight);
            }
          }
      };
      state.scatterComponent.setCrossHighlightFunction(highlightFromMainUMAP);
      console.log("Set cross-highlight function in Main UMAP (scatterComponent)");
  } else {
      console.warn("Main UMAP component (scatterComponent) does not support cross-highlighting setup.");
  }

  // --- Highlighting originating FROM the Geo Map (userGeoMap) ---
  // REMOVED THE if/else block that tried to set the callback.
  // We will ONLY use the direct event listeners below for geo map -> other highlighting.

  // Define the handler function once
  const highlightFromGeoMap = (pointId, highlight) => {
      console.log(`Cross-highlight from Geo Map: ${pointId} (${highlight ? 'on' : 'off'})`);
      // Highlight in Main UMAP
      if (state.scatterComponent && state.scatterComponent.highlightPoint) {
          state.scatterComponent.highlightPoint(pointId, highlight);
      }
       // Highlight in Details Panel
       const detailsPanel = document.getElementById('details-panel');
       if (detailsPanel) {
         const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${pointId}"]`);
         if (sequenceItem) {
           sequenceItem.classList.toggle('hover-highlight', highlight);
         }
       }
  };

  // Add event listeners directly to the container for geo map hovers
  const userGeoContainer = document.getElementById('user-geo-container');
  if (userGeoContainer) {
      // Remove potentially existing listeners first to avoid duplicates
      userGeoContainer.removeEventListener('mouseover', userGeoContainer._geoMouseoverHandler);
      userGeoContainer.removeEventListener('mouseout', userGeoContainer._geoMouseoutHandler);

      // Define handlers and attach them to the container object for easy removal
      userGeoContainer._geoMouseoverHandler = (event) => {
          const targetPoint = event.target.closest('.map-point.similar-point'); // Target only similar points' circles or groups
          if (targetPoint) {
              const pointId = targetPoint.getAttribute('data-id'); // Assumes data-id is on the circle or its parent group
              if (pointId) highlightFromGeoMap(pointId, true);
          }
      };
      userGeoContainer._geoMouseoutHandler = (event) => {
          const targetPoint = event.target.closest('.map-point.similar-point');
          if (targetPoint) {
              const pointId = targetPoint.getAttribute('data-id');
              if (pointId) highlightFromGeoMap(pointId, false);
          }
      };

      // Add the new listeners
      userGeoContainer.addEventListener('mouseover', userGeoContainer._geoMouseoverHandler);
      userGeoContainer.addEventListener('mouseout', userGeoContainer._geoMouseoutHandler);
      console.log("Added direct event listeners for Geo Map cross-highlighting.");
  } else {
       console.warn("Could not find user-geo-container to attach hover listeners.");
  }

   console.log("Cross-highlighting setup complete.");
}

// Modify highlightSequence to only target existing components
function highlightSequence(sequenceId, shouldHighlight = true) {
  // Validate sequenceId
  if (!sequenceId || sequenceId === 'user') { // Ignore clicks on user point for now
    // console.warn("Cannot highlight: sequence ID is undefined or 'user'");
    return;
  }
  
  console.log(`Highlighting sequence ${sequenceId}: ${shouldHighlight ? 'on' : 'off'}`);
  
  // Highlight in Main UMAP (scatterComponent)
  if (state.scatterComponent && typeof state.scatterComponent.highlightPoint === 'function') {
    state.scatterComponent.highlightPoint(sequenceId, shouldHighlight);
  }

  // Highlight in Geo Map (userGeoMap)
  if (state.userGeoMap && typeof state.userGeoMap.highlightSequence === 'function') {
    state.userGeoMap.highlightSequence(sequenceId, shouldHighlight);
  }

  // Highlight in details panel (handled by click listener adding/removing 'highlighted' class)
  // Ensure hover effects respect the 'highlighted' class
  const detailsPanel = document.getElementById('details-panel');
  if (detailsPanel) {
    const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
    if (sequenceItem) {
       // Ensure the class matches the highlight state (click listener might already do this)
       sequenceItem.classList.toggle('highlighted', shouldHighlight);
     }
   }
}

// Modify setupPointHoverEffects to only reference existing components
function setupPointHoverEffects() {
  console.log("Setting up point hover effects (Single UMAP focus)");
  
  const mainUmapContainer = state.scatterComponent?.container || document.getElementById('scatter-container');
  const geoMapContainer = state.userGeoMap?.container || document.getElementById('user-geo-container'); // Assuming container is exposed
  const detailsPanel = document.getElementById('details-panel');
  
  // Function to handle point hover in UMAP/Maps
  function handleVizPointHover(pointElement, isHovering) {
    const sequenceId = pointElement.getAttribute('data-id');
    if (!sequenceId || sequenceId === 'user') return; // Ignore user point for hover effects linking

    // Apply visual changes to the hovered point itself (handled by component's internal mouseover/out)
        
        // Find and highlight corresponding item in details panel
        if (detailsPanel) {
          const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
          if (sequenceItem) {
         // Use hover-highlight class to avoid conflict with persistent 'highlighted' class from clicks
        sequenceItem.classList.toggle('hover-highlight', isHovering);
      }
    }
    // Potentially highlight corresponding point in the *other* visualization
    // This is now handled by the crossHighlight functions set up earlier
  }

   // Function to handle hover over details panel items
   function handleDetailsItemHover(itemElement, isHovering) {
        const sequenceId = itemElement.dataset.id;
        if (!sequenceId) return;

        // Highlight corresponding points in visualizations
        if (state.scatterComponent?.highlightPoint) {
            state.scatterComponent.highlightPoint(sequenceId, isHovering); // Geo map might use its own hover style
        }
        if (state.userGeoMap?.highlightSequence) {
            state.userGeoMap.highlightSequence(sequenceId, isHovering); // Geo map might use its own hover style
        }
   }


  // For Details Panel items (ensure listeners are added after items are created)
  if (detailsPanel) {
    // Use event delegation on the panel itself
    detailsPanel.removeEventListener('mouseover', detailsPanel._itemMouseoverHandler); // Remove previous listener if any
    detailsPanel.removeEventListener('mouseout', detailsPanel._itemMouseoutHandler);

    detailsPanel._itemMouseoverHandler = (event) => {
        const targetItem = event.target.closest('.similar-sequence-item');
        if (targetItem) {
            handleDetailsItemHover(targetItem, true);
            targetItem.classList.add('hover-highlight'); // Add visual feedback to item
        }
    };
     detailsPanel._itemMouseoutHandler = (event) => {
        const targetItem = event.target.closest('.similar-sequence-item');
        if (targetItem) {
            handleDetailsItemHover(targetItem, false);
            targetItem.classList.remove('hover-highlight'); // Remove visual feedback
        }
    };

    detailsPanel.addEventListener('mouseover', detailsPanel._itemMouseoverHandler);
    detailsPanel.addEventListener('mouseout', detailsPanel._itemMouseoutHandler);
    console.log("Added delegated hover listeners to details panel.");
  }


  // Ensure hover highlight style exists
  if (!document.getElementById('hover-highlight-style')) {
    // ... (style definition remains the same) ...
    const style = document.createElement('style');
    style.id = 'hover-highlight-style';
    style.textContent = `
      .similar-sequence-item.hover-highlight {
        background-color: #e3f2fd !important; /* Use important to override base */
        /* border-left: 4px solid #2196F3; */ /* Optional border */
      }
      .similar-sequence-item.highlighted { /* Style for clicked items */
        background-color: #fff3e0;
        border-left: 4px solid #FF5722;
        font-weight: bold; /* Make clicked item bold */
      }
      /* .similar-sequence-item.hover-highlight.highlighted { */
        /* Optional combined style */
      /* } */
    `;
    document.head.appendChild(style);
  }
}

// Function to clear all highlighted sequences
function clearAllHighlights() {
  // Remove highlight class from all sequence items
  document.querySelectorAll('.similar-sequence-item.highlighted').forEach(item => {
    item.classList.remove('highlighted');
    
    // Unhighlight the sequence in the visualization
    const sequenceId = item.dataset.id;
    if (sequenceId) {
      highlightSequence(sequenceId, false);
    }
  });
  
  // Get all visible sequence points and reset them
  const referenceUmap = document.getElementById('reference-scatter-container');
  const userUmap = document.getElementById('user-scatter-container');
  
  if (referenceUmap) {
    referenceUmap.querySelectorAll('circle[style*="stroke"]').forEach(point => {
      point.setAttribute('r', '4');
      point.style.stroke = 'none';
      point.style.strokeWidth = '0px';
      point.style.fillOpacity = '0.7';
    });
  }
  
  if (userUmap) {
    // Reset all points
    userUmap.querySelectorAll('circle[style*="stroke"]').forEach(point => {
      point.setAttribute('r', '4');
      point.style.stroke = 'none';
      point.style.strokeWidth = '0px';
      point.style.fillOpacity = '0.7';
    });
    
    // Reset all connections
    userUmap.querySelectorAll('line[style*="stroke-width"]').forEach(line => {
      line.style.stroke = '#999';
      line.style.strokeWidth = '1px';
      line.style.opacity = '0.4';
    });
  }
  
  console.log('All highlights cleared');
}

/**
 * Create a standardized legend for visualizations
 * @param {HTMLElement} container - Container to append the legend to
 * @param {Array} items - Array of legend items with label and color properties
 * @param {string} title - Optional legend title
 * @returns {HTMLElement} - The created legend element
 */
function createLegend(container, items, title = 'Legend') {
  // Create legend container
  const legend = document.createElement('div');
  legend.className = 'sequence-legend';
  
  // Start with the title
  let legendHtml = `<div style="font-weight: bold; margin-bottom: 4px;">${title}</div>`;
  
  // Add each item
  items.forEach(item => {
    // Check if this is the similarity line item
    if (item.label === 'Similarity Line') {
      // Create a horizontal line for the similarity line legend item
      legendHtml += `
        <div style="display: flex; align-items: center; margin: 3px 0;">
          <span style="display: inline-block; width: 14px; height: 2px; background: ${item.color}; margin-right: 8px;"></span>
          <span style="font-size: 12px;">${item.label}</span>
        </div>
      `;
    } else {
      // Create a bullet point for other items
      legendHtml += `
        <div style="display: flex; align-items: center; margin: 3px 0;">
          <span style="display: inline-block; width: 12px; height: 12px; background: ${item.color}; border-radius: 50%; margin-right: 8px;"></span>
          <span style="font-size: 12px;">${item.label}</span>
        </div>
      `;
    }
  });
  
  // Set the HTML content
  legend.innerHTML = legendHtml;
  
  // Add to container if provided
  if (container) {
    container.appendChild(legend);
  }
  
  return legend;
}

// Set up the upload button
const uploadButton = document.getElementById('upload-fasta-button');
uploadButton.addEventListener('click', () => {
  console.log("🚀 Upload FASTA button clicked!");

  // Create and show the upload modal
  const uploadModal = createUploadModal({
    onUpload: async (file, model, apiKey) => {
      console.log("🚀 onUpload callback started."); 
      try {
        // --- Validate & Store API Key ---
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            console.error("❌ API Key missing or invalid from modal.");
            showErrorMessage("API Key is required. Please enter a valid key.");
            // Re-open modal or indicate error differently? For now, just stop.
            return;
        }
        state.apiKey = apiKey.trim(); // Store the key
        console.log("🔑 API Key stored in state.");
        // --- End API Key Handling ---

        console.log(`Processing file: ${file.name}, model: ${model}`);
        showLoadingIndicator("Uploading sequence...");

        console.log("Calling uploadSequence API..."); 
        const uploadResult = await uploadSequence(file, model, state.apiKey);
        console.log("uploadSequence API finished. Result:", uploadResult); 

        if (!uploadResult || !uploadResult.job_id) {
           console.error("❌ Upload failed or did not return a job_id:", uploadResult);
           showErrorMessage("Upload failed. Could not start analysis job.");
           hideLoadingIndicator();
           return; // Stop if upload failed
        }

        // Create job tracker
        const jobId = uploadResult.job_id;
        console.log(`Got job ID: ${jobId}. Creating job tracker...`); 
        state.jobTracker = createJobTracker(jobId, {
          floating: true,
          onStatusChange: (status, jobData) => {
            console.log(`Job status changed to: ${status}`);
          },
          onComplete: async (jobData) => {
            console.log("Job completed (via tracker):", jobData);
            // NOTE: handleJobCompletion is now called by setupJobPolling
          },
          onError: (error) => {
            console.error("Job failed (via tracker):", error);
            showErrorMessage("Sequence analysis failed. Please try again.");
          }
        });

        console.log("Showing job tracker..."); 
        state.jobTracker.show();

        console.log("Setting up job polling..."); 
        const stopPolling = setupJobPolling(jobId);

        // Store the stop function in case we need to cancel
        state.stopPollingFunctions = state.stopPollingFunctions || {};
        state.stopPollingFunctions[jobId] = stopPolling;

        // Hide the loading indicator *after* setup
        hideLoadingIndicator();

        console.log("🚀 onUpload callback finished successfully."); 

      } catch (error) {
        console.error("❌ Error inside onUpload callback:", error); 
        hideLoadingIndicator();
         // Check for auth errors specifically
         if (error.message.includes('401') || error.message.includes('403')) {
            showErrorMessage("Invalid API Key. Upload failed.");
            state.apiKey = null; // Clear invalid key?
         } else {
            showErrorMessage(`Error during upload process: ${error.message}`);
         }
      }
    },
    onCancel: () => {
      console.log("Upload canceled");
    }
  });

  // Check if the modal object was created (doesn't guarantee it's visible)
  if (uploadModal) {
       console.log("✅ createUploadModal function called, modal object created.");
  } else {
       console.error("❌ createUploadModal function did NOT return a modal object!");
  }
});

// --- Reset Button Listener ---
const resetButton = document.getElementById('reset-user-sequences');
resetButton?.addEventListener('click', () => {
  console.log("🔄 Reset Analysis button clicked!");
  // Clear state related to the analysis
  state.userSequences = [];
  state.similarSequences = [];
  state.selectedPoint = null;
  state.apiKey = null; // Clear API key on reset
  state.simulatedCompletionTimes = {}; // <-- Clear simulation state on reset

  // Stop any active polling
  if (state.stopPollingFunctions) {
      Object.values(state.stopPollingFunctions).forEach(stopFunc => stopFunc());
      state.stopPollingFunctions = {};
  }

  // Destroy or reset visualizations
  if (state.scatterComponent?.destroy) state.scatterComponent.destroy();
  else if (state.scatterComponent?.updateScatterPlot) state.scatterComponent.updateScatterPlot([], null); // Reset with empty data

  if (state.mapComponent?.destroy) state.mapComponent.destroy();
  else if (state.mapComponent?.updateMap) state.mapComponent.updateMap([]); // Reset with empty data

  if (state.userGeoMap?.destroy) state.userGeoMap.destroy();
  else if (state.userGeoMap?.updateMap) state.userGeoMap.updateMap(null, []); // Reset with empty data

  // Clear the details panel
  const detailsPanel = document.getElementById('details-panel');
  if (detailsPanel) {
      detailsPanel.innerHTML = '<p class="text-center text-gray-500">Upload a sequence to view details of the most similar matches.</p>';
  }

  // Show empty state messages again (optional, could just clear graphs)
  document.querySelectorAll('.empty-state-message').forEach(el => el.style.display = 'flex');
  // Clear job tracker if it exists
  state.jobTracker?.destroy();
  state.jobTracker = null;

  // --- Hide zoom controls on reset ---
  document.querySelectorAll('.zoom-controls').forEach(controls => {
      controls.style.display = 'none';
  });

  // Re-initialize state pointers (if needed, though resetting data might suffice)
  state.scatterComponent = null;
  state.mapComponent = null;
  state.userGeoMap = null;


  showInfoMessage("Analysis reset. Ready for new upload.");
});

