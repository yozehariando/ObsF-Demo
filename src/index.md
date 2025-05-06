---
theme: dashboard
toc: false
---

<link rel="stylesheet" href="./components/ui/styles/ui-components.css" id="ui-components-styles">

# Modular DNA Mutation Dashboard

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
    <h2 class="mb-4">Top 100 Model-Similar Sequences – UMAP View</h2>
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
          <h2 class="mb-4">Geographic Distribution of Top 100 Sequences</h2>
          <div id="map-container" style="width: 100%; position: relative; overflow: hidden;">
            <!-- Added Empty State Message -->
            <div class="empty-state-message flex flex-col items-center justify-center h-full" style="min-height: 550px;">
              <p class="text-center text-gray-500 mb-4">Upload a sequence to view the geographic distribution of similar sequences.</p>
            </div>
            <!-- <<< START MAP ZOOM CONTROLS >>> -->
            <div class="zoom-controls" style="position: absolute; top: 10px; right: 10px; display: none; flex-direction: column; gap: 5px; z-index: 10;">
              <button id="zoom-in-map" class="btn btn-sm btn-outline-secondary" title="Zoom In">+</button>
              <button id="zoom-out-map" class="btn btn-sm btn-outline-secondary" title="Zoom Out">-</button>
              <button id="reset-map" class="btn btn-sm btn-outline-secondary" title="Reset Zoom">Reset</button>
            </div>
            <!-- <<< END MAP ZOOM CONTROLS >>> -->
          </div>
        </div>
        <!-- Geo Map Card -->
        <div class="card p-4"> 
          <h2 class="mb-4">Top 10 Similar Sequences - Geographic Distribution</h2>
          <div id="user-geo-container" style="width: 100%; position: relative;">
            <!-- Geo Map SVG added here by JS -->
            <div class="empty-state-message flex flex-col items-center justify-center h-full">
              <p class="text-center text-gray-500 mb-4">Upload a sequence to view the specific locations of the top 10 most similar sequences.</p>
            </div>
            <!-- Geo Map Zoom Controls -->
            <div class="zoom-controls" style="position: absolute; top: 10px; right: 10px; display: none; flex-direction: column; gap: 5px; z-index: 10;">
              <button id="zoom-in-geo" class="btn btn-sm btn-outline-secondary" title="Zoom In">+</button>
              <button id="zoom-out-geo" class="btn btn-sm btn-outline-secondary" title="Zoom Out">-</button>
              <button id="reset-geo" class="btn btn-sm btn-outline-secondary" title="Reset Zoom">Reset</button>
            </div>
          </div>
          <!-- <<< START GEO MAP TIME-LAPSE CONTROLS (Initially Hidden) >>> -->
          <div id="timelapse-controls-geo" class="mt-4 p-3 border rounded bg-gray-50" style="display: none;">
            <h3 class="text-sm font-semibold mb-2">Time-Lapse Controls</h3>
            <!-- Similarity Filter -->
            <div class="mb-3">
              <label for="similarity-slider-geo" class="form-label text-xs">Min Similarity:</label>
              <div class="flex items-center gap-2">
                 <input type="range" id="similarity-slider-geo" class="form-range flex-grow" min="0" max="100" value="0" step="1">
                 <span id="similarity-value-geo" class="text-xs font-mono w-10 text-right">0%</span>
              </div>
            </div>
             <!-- Time Filter & Animation -->
            <div>
               <label for="time-slider-geo" class="form-label text-xs">Time Window (Year <=):</label> <!-- Updated Label -->
               <div class="flex items-center gap-2 mb-2">
                  <span id="time-min-label-geo" class="text-xs font-mono">Start</span>
                  <input type="range" id="time-slider-geo" class="form-range flex-grow" min="0" max="100" value="0" step="1" disabled> <!-- Start disabled -->
                  <span id="time-max-label-geo" class="text-xs font-mono">End</span>
               </div>
               <div class="flex items-center justify-between gap-2">
                 <span id="current-time-display-geo" class="text-xs font-mono">Time: ---</span>
                 <div class="flex gap-2">
                   <button id="play-pause-button-geo" class="btn btn-sm btn-outline-secondary" disabled>Play</button> <!-- Start disabled -->
                   <button id="reset-time-button-geo" class="btn btn-sm btn-outline-secondary">Reset</button> <!-- Removed disabled -->
                 </div>
               </div>
            </div>
          </div>
          <!-- <<< END GEO MAP TIME-LAPSE CONTROLS >>> -->
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
  simulatedCompletionTimes: {}, // <-- Add tracking for simulation
  allSimilarSequencesData: [], // Store the full dataset (e.g., Top 100)
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
    // Store userSequence in state *early* so it's accessible
    state.userSequence = {
      id: embeddingId,
      x: userX,
      y: userY,
      label: "Your Sequence",
      isUserSequence: true,
      uploadedAt: new Date().toISOString()
    };
    userSequence = state.userSequence; // Assign to local variable too
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
      if (state.mapComponent) state.mapComponent.updateMap([], userSequence); // Pass user seq here too
      if (state.userGeoMap) state.userGeoMap.updateMap(userSequence, []);
      updateDetailsWithSimilarSequences(userSequence, []);
      hideLoadingIndicator();
      return; // Exit if fetching failed
    }
    const top100SimilarRaw = similarSequencesResponse100.result;
    console.log(`Received ${top100SimilarRaw.length} similar sequences from API (including coords).`);

    // --- Store full dataset for time-lapse --- // NOTE: Maybe rename allSimilarSequencesData to top100SimilarRaw?
    state.allSimilarSequencesData = top100SimilarRaw; // Store the raw data

    // --- Step 4: Prepare Data Subsets (Simplified) ---
    console.log("Preparing data subsets for visualizations using direct coordinates...");
    const contextualUmapData = [];
    const referenceMapData100 = []; // Still needed for main map display
    const userContextData10WithCoords = []; // Still needed for details panel

    // *** CREATE GEO MAP SUBSET LOCALLY for initialization ***
    const geoMapLimit = 100;
    let geoMapSequenceSubset = []; // Local variable for initialization

    let missingCoordsCount = 0;
    let calculatedMinYear = null;
    let calculatedMaxYear = null;
    const yearsInData = [];

    top100SimilarRaw.forEach((rawSeq, index) => {
      const coords = rawSeq.umap_coords;
      const hasCoords = coords && coords.x != null && coords.y != null;

      if (hasCoords) {
        const combinedData = {
          id: rawSeq.id,
          similarity: rawSeq.similarity,
          distance: rawSeq.distance,
          metadata: rawSeq.metadata,
          accession: rawSeq.metadata?.accessions?.[0] || rawSeq.id,
          x: coords.x,
          y: coords.y,
          label: rawSeq.metadata?.accessions?.[0] || rawSeq.id,
          isTop10: index < 10,
          isUserSequence: false,
          matchesUserSequence: true
        };
        contextualUmapData.push(combinedData);
        referenceMapData100.push(combinedData);
        if (combinedData.isTop10) {
          userContextData10WithCoords.push(combinedData);
        }
        // Add to the Geo Map subset if within the limit
        if (index < geoMapLimit) {
           geoMapSequenceSubset.push(combinedData); // Add to local subset
        }

        // --- Calculate Time Range --- // Moved inside loop
        const year = combinedData.metadata?.first_year || combinedData.metadata?.years?.[0];
        if (year != null) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                yearsInData.push(parsedYear);
            }
        }

      } else {
         missingCoordsCount++;
         console.warn(`Similar sequence ${rawSeq.id} (index ${index}) is missing umap_coords.`);
      }
    });

    console.log(`Prepared UMAP data: ${contextualUmapData.length} points`);
    console.log(`Prepared Reference Map data: ${referenceMapData100.length} points`);
    console.log(`Prepared Top 10 data: ${userContextData10WithCoords.length} points`);
    console.log(`Created Geo Map initialization subset: ${geoMapSequenceSubset.length} points (Limit: ${geoMapLimit})`);
    if (missingCoordsCount > 0) {
        showWarningMessage(`Note: ${missingCoordsCount} similar sequences were missing coordinates in the API response.`);
    }

    // --- Finalize Time Range Calculation --- //
    if (yearsInData.length > 0) {
        calculatedMinYear = d3.min(yearsInData);
        calculatedMaxYear = d3.max(yearsInData);
        console.log(`Time range calculated: ${calculatedMinYear} - ${calculatedMaxYear}.`);
    } else {
        const currentYear = new Date().getFullYear();
        calculatedMinYear = currentYear - 10;
        calculatedMaxYear = currentYear;
        console.warn("No valid year data found, defaulting time range.");
    }

    // --- Step 5: Initialize or Update Visualizations ---
    showLoadingIndicator("Initializing/Updating visualizations...");

    // 5a: Contextual UMAP (`#scatter-container`)
    let scatterComponentInitialized = false;
    if (!state.scatterComponent) {
      console.log("Initializing main UMAP (scatterComponent)...");
      const scatterContainerId = 'scatter-container';
      const scatterContainer = document.getElementById(scatterContainerId);
      const emptyState = scatterContainer?.querySelector('.empty-state-message');
      if (emptyState) emptyState.style.display = 'none';

      state.scatterComponent = createUmapScatterPlot(scatterContainerId, contextualUmapData, {
        initialUserSequence: userSequence,
        colorScheme: { user: '#FF5722', top10: '#E91E63', other: '#9E9E9E' }
      });
      scatterComponentInitialized = true;
    } else {
      console.log("Updating main UMAP (scatterComponent)...");
      state.scatterComponent.updateScatterPlot(contextualUmapData, userSequence);
    }
    if (state.scatterComponent) {
        setupZoomControls(state.scatterComponent, { zoomIn: 'zoom-in-scatter', zoomOut: 'zoom-out-scatter', reset: 'reset-scatter' });
        const scatterControls = document.getElementById('scatter-container')?.querySelector('.zoom-controls');
        if (scatterControls) scatterControls.style.display = (contextualUmapData.length > 0 || userSequence) ? 'flex' : 'none';
    }

    // 5b: Reference Map (`#map-container`)
    let mapComponentInitialized = false;
    if (!state.mapComponent) {
       console.log("Initializing Reference Map (mapComponent)...");
       const mapContainerId = 'map-container';
       const mapContainer = document.getElementById(mapContainerId);
       const emptyState = mapContainer?.querySelector('.empty-state-message');
       if (emptyState) emptyState.style.display = 'none';
       state.mapComponent = createApiMap(mapContainerId, referenceMapData100, {
           initialUserSequence: userSequence
       });
       mapComponentInitialized = true;
    } else {
      console.log("Updating Reference Map (mapComponent)...");
      state.mapComponent.updateMap(referenceMapData100, userSequence);
    }
    if (state.mapComponent) {
        setupZoomControls(state.mapComponent, { zoomIn: 'zoom-in-map', zoomOut: 'zoom-out-map', reset: 'reset-map' });
        const mapControls = document.getElementById('map-container')?.querySelector('.zoom-controls');
        if (mapControls) mapControls.style.display = (referenceMapData100.length > 0) ? 'flex' : 'none';
    }

    // 5c: Geo Map (`#user-geo-container`)
    if (!state.userGeoMap) { // FIRST TIME initialization block
        console.log('Attempting to create User Geo Map...');
        try {
            state.userGeoMap = await createUserGeoMap(
              'user-geo-container',
              geoMapSequenceSubset, // *** PASS LOCAL SUBSET FOR INIT ***
              userSequence,
              { /* options */ }
              // Removed hover/leave/year handlers - component handles internally
            );

            if (state.userGeoMap) {
               console.log("👍 Geo Map created successfully.");
               // Setup zoom controls (logic remains the same)
               if (state.userGeoMap.svg && state.userGeoMap.zoomBehavior) {
                   setupZoomControls(state.userGeoMap, { zoomIn: 'zoom-in-geo', zoomOut: 'zoom-out-geo', reset: 'reset-geo' });
                   const zoomControls = document.getElementById('user-geo-container')?.querySelector('.zoom-controls');
                   if (zoomControls) zoomControls.style.display = 'flex';
               } else { /* ... error log ... */ }

               // *** SET TIME RANGE and SETUP CONTROLS ***
               if (calculatedMinYear !== null && calculatedMaxYear !== null) {
                   console.log("  -> Setting initial time range and setting up controls...");
                   state.userGeoMap.setTimeRange(calculatedMinYear, calculatedMaxYear);
                   setupTimeLapseControls(state.userGeoMap); // Pass the component instance
                   const timeControlsDiv = document.getElementById('timelapse-controls-geo');
                   if (timeControlsDiv) timeControlsDiv.style.display = 'block';
               } else {
                   console.error("  ❌ Cannot setup time-lapse: Invalid time range calculated.");
                   const timeControlsDiv = document.getElementById('timelapse-controls-geo');
                   if(timeControlsDiv) timeControlsDiv.style.display = 'none';
               }
            } else { /* ... handle creation failure ... */ }
        } catch (creationError) { /* ... handle creation error ... */ }
    } else { // SUBSEQUENT TIMES update block
      console.log('Updating existing User Geo Map (userGeoMap)...');
      if (state.userGeoMap && typeof state.userGeoMap.updateData === 'function') {
          // *** UPDATE DATA using the component's method ***
          state.userGeoMap.updateData(userSequence, geoMapSequenceSubset);

          // *** UPDATE TIME RANGE ***
          if (calculatedMinYear !== null && calculatedMaxYear !== null) {
              state.userGeoMap.setTimeRange(calculatedMinYear, calculatedMaxYear);
              console.log(`Ensured time range is ${calculatedMinYear}-${calculatedMaxYear} on update.`);
          } else {
              console.warn("Could not update time range on existing map.");
          }
          // Ensure controls remain visible if they should be
          const timeControlsDiv = document.getElementById('timelapse-controls-geo');
          if (timeControlsDiv && calculatedMinYear !== null) timeControlsDiv.style.display = 'block';
          const zoomControls = document.getElementById('user-geo-container')?.querySelector('.zoom-controls');
          if (zoomControls) zoomControls.style.display = 'flex';
      } else {
          console.error("❌ Cannot update User Geo Map: instance or updateData function is missing.", state.userGeoMap);
      }
    }
    // Remove empty state message if map exists
    if (state.userGeoMap) {
        const emptyState = document.getElementById('user-geo-container')?.querySelector('.empty-state-message');
        if (emptyState) emptyState.style.display = 'none';
    }

    // 5d: Details Panel (`#details-panel`)
    console.log("Updating Details Panel...");
    updateDetailsWithSimilarSequences(userSequence, userContextData10WithCoords); // Use the prepared top 10 list

    // --- Setup Interactions ---
    // Call setup after all components are potentially initialized/updated
    setupCrossHighlighting();
    setupPointHoverEffects();
    // addDetailsPanelHoverListeners(); // This line should remain commented/deleted

    // --- Step 6: Notifications ---
    showNotification(`Analysis complete. Displaying your sequence and ${contextualUmapData.length} similar sequences.`, "success");

    // --- Update tracker ---
    if (state.jobTracker) state.jobTracker.updateStatus('Completed');

    // --- Ensure Time-Lapse Controls are Visible (if setup succeeded) ---
    // This check is now handled within the setup/update logic above

  } catch (error) {
    console.error('❌ Error during handleJobCompletion:', error);
    if (state.jobTracker) state.jobTracker.updateStatus('failed', { error: error.message });
    // Log the error more visibly
    showErrorMessage(`Failed to process and display results: ${error.message}. Check console for details.`);
    // Potentially reset parts of the UI
    hideLoadingIndicator();
  } finally {
    hideLoadingIndicator(); // Ensure loading is hidden even if errors occur
    console.log(`🚀 Phase 3: handleJobCompletion finished for job ${jobId}`);
  }
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
  state.simulatedCompletionTimes = {};
  state.allSimilarSequencesData = []; // Clear sequence data

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

  // Show empty state messages again
  document.querySelectorAll('.empty-state-message').forEach(el => el.style.display = 'flex');

  // --- Correctly Remove Job Tracker --- //
  if (state.jobTracker) {
    if (typeof state.jobTracker.hide === 'function') {
      state.jobTracker.hide(); // Call hide method if available
    }
    // Use the returned element directly
    if (state.jobTracker.element && typeof state.jobTracker.element.remove === 'function') {
      state.jobTracker.element.remove();
      console.log(`Removed job tracker element: ${state.jobTracker.element.id}`);
    } else {
      // Fallback (should be less likely needed now)
      console.warn('Could not remove job tracker element directly, trying fallback selector.');
      const floatingTracker = document.querySelector('.floating-tracker');
      if (floatingTracker) floatingTracker.remove();
    }
    state.jobTracker = null; // Nullify the state variable
  }
  // --- End Corrected Removal --- //

  // Hide zoom controls
  document.querySelectorAll('.zoom-controls').forEach(controls => {
      controls.style.display = 'none';
  });

  // Re-initialize state pointers
  state.scatterComponent = null;
  state.mapComponent = null;
  state.userGeoMap = null;

  // Hide Time-Lapse Controls container
  const timelapseControlsGeo = document.getElementById('timelapse-controls-geo');
  if (timelapseControlsGeo) timelapseControlsGeo.style.display = 'none';

  showInfoMessage("Analysis reset. Ready for new upload.");
});

// --- Update Event Listeners (within DOMContentLoaded, update IDs) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, Initializing UI.");
    // Listeners for time-lapse are now attached in setupTimeLapseControls
});

/**
 * Sets up the time-lapse controls and attaches listeners that call the component's methods.
 * @param {object} componentInstance - The user geo map component instance (state.userGeoMap).
 */
function setupTimeLapseControls(componentInstance) {
  // Check if componentInstance is valid and has expected methods
  if (!componentInstance || typeof componentInstance.play !== 'function') {
      console.error("Cannot setup time-lapse controls: Invalid component instance provided.", componentInstance);
      return;
  }
  console.log(`🕰️ Setting up time-lapse control listeners for Geo Map.`);

  // Get elements
  const similaritySlider = document.getElementById('similarity-slider-geo');
  const timeSlider = document.getElementById('time-slider-geo');
  const playPauseButton = document.getElementById('play-pause-button-geo');
  const resetTimeButton = document.getElementById('reset-time-button-geo');

  // Attach listeners calling component methods
  if (similaritySlider) {
        similaritySlider.replaceWith(similaritySlider.cloneNode(true)); // Clear old listeners
        document.getElementById('similarity-slider-geo').addEventListener('input', (e) => {
            componentInstance.setSimilarity(e.target.value); // Call component method
            // Update label directly (component's _updateExternalUI doesn't run on setSimilarity)
            const similarityValueEl = document.getElementById('similarity-value-geo');
            if (similarityValueEl) similarityValueEl.textContent = `${e.target.value}%`;
        });
        console.log("  -> Similarity listener attached.");
    } else { /* ... warn ... */ }

    if (timeSlider) {
        timeSlider.replaceWith(timeSlider.cloneNode(true)); // Clear old listeners
        document.getElementById('time-slider-geo').addEventListener('input', (e) => {
             console.log("🕰️ Time Slider INPUT detected - calling componentInstance.setYear()");
             componentInstance.setYear(e.target.value); // Call component method
        });
        console.log("  -> Time slider listener attached.");
    } else { /* ... warn ... */ }

    if (playPauseButton) {
        playPauseButton.replaceWith(playPauseButton.cloneNode(true)); // Clear old listeners
        document.getElementById('play-pause-button-geo').addEventListener('click', () => {
            console.log(`⏯️ Play/Pause button clicked.`);
            if (componentInstance.isPlaying()) {
                 console.log("   -> Calling componentInstance.pause()");
                 componentInstance.pause();
            } else {
                 console.log("   -> Calling componentInstance.play()");
                 componentInstance.play();
            }
        });
        console.log("  -> Play/Pause listener attached.");
    } else { /* ... warn ... */ }

    if (resetTimeButton) {
        resetTimeButton.replaceWith(resetTimeButton.cloneNode(true)); // Clear old listeners
        document.getElementById('reset-time-button-geo').addEventListener('click', () => {
            console.log("🔄 Reset Time button clicked - calling componentInstance.resetTime()");
            componentInstance.resetTime(); // Call component method
        });
        console.log("  -> Reset Time listener attached.");
    } else { /* ... warn ... */ }

    // Initial UI state is set by the component via setTimeRange -> _updateExternalUI
    console.log('🕰️ Time-lapse control listeners attached.');
}
