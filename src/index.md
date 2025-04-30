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
  updateJobStatus,
  updateProgressText,
  updateStatus,
  onStatusChange,
} from './components/ui/status-manager.js';
import { createApiMap } from "./components/visualizations/api-map-component.js";
import { createUmapScatterPlot } from "./components/visualizations/scatter-plot.js";
import { updateDetailsPanel } from "./components/ui/dom-utils.js";
import { 
  fetchUmapData, 
  transformUmapData,
  uploadSequence,
  checkJobStatus,
  getUmapProjection,
  toggleSimilarityConnections,
  getSimilarSequences,
} from './components/data/api-service.js';
import { 
  createUploadModal, 
  } from './components/ui/api-upload-component.js';
import { createJobTracker } from './components/data/api-job-tracker.js';
import {
  fetchAllSequences,
} from './components/data/api-similarity-service.js';
import { createUserGeoMap } from "./components/visualizations/user-geo-map.js";

// Make FileAttachment available globally if it exists in this context
// This helps our components detect if they're running in Observable
if (typeof FileAttachment !== 'undefined') {
  window.FileAttachment = FileAttachment;
}

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
    console.log(`🕒 Polling job status for ${jobId}...`);
    try {
      const statusResponse = await checkJobStatus(jobId, state.apiKey);
      const status = statusResponse?.status;
      const result = statusResponse?.result; // Or however the final data is nested

      console.log(`🕒 Job ${jobId} status: ${status}`);

      // Update Job Tracker UI if it exists
      if (state.jobTracker && state.jobTracker.updateStatus) {
          state.jobTracker.updateStatus(status, result); // Pass result for potential progress info
      }

      if (status === 'completed') {
        console.log(`✅ Job ${jobId} completed.`);
        clearInterval(intervalId); // Stop polling
        delete state.stopPollingFunctions[jobId]; // Clean up stop function reference
        await handleJobCompletion(jobId, statusResponse); // Pass the full response
      } else if (status === 'failed') {
        console.error(`❌ Job ${jobId} failed.`);
        clearInterval(intervalId); // Stop polling
        delete state.stopPollingFunctions[jobId];
        // Use showErrorMessage from message-handler.js
        showErrorMessage(`Analysis job ${jobId} failed: ${result?.error || 'Unknown error'}`);
        hideLoadingIndicator(); // Ensure loading indicator is hidden on failure
         // Update Job Tracker UI to show error state
         if (state.jobTracker && state.jobTracker.updateStatus) {
            state.jobTracker.updateStatus(status, result);
         }
      }
      // If status is 'pending' or 'running', do nothing and let the interval continue
    } catch (error) {
      console.error(`❌ Error polling job status for ${jobId}:`, error);
      showErrorMessage(`Error checking job status: ${error.message}`);
      // Optionally stop polling on error, or let it retry
      // clearInterval(intervalId); 
      // delete state.stopPollingFunctions[jobId]; 
    }
  }, intervalMs);

  // Return a function to stop polling manually
  const stopPolling = () => {
    console.log(`🚫 Manually stopping polling for job ${jobId}`);
    clearInterval(intervalId);
     delete state.stopPollingFunctions[jobId];
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
  apiKey: null // <-- Add apiKey state
};

/**
 * Handle job completion: Fetch user projection, fetch N=100 similar sequences,
 * ensure reference cache is loaded, find coordinates for similar sequences,
 * prepare data subsets, and update all visualizations.
 * @param {string} jobId - The completed job ID
 * @param {Object} jobData - The job data from the API
 */
async function handleJobCompletion(jobId, jobData) {
  console.log(`🚀 Phase 3: handleJobCompletion started for job ${jobId}`);
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
    const umapProjection = await getUmapProjection(jobId, state.apiKey); // Pass original jobId

    // --- Determine embeddingId for userSequence object AFTER getting projection ---
    let embeddingId = jobId; // Default to jobId
    if (jobData?.embedding_id) embeddingId = jobData.embedding_id;
    else if (jobData?.result?.embedding_id) embeddingId = jobData.result.embedding_id;
    console.log(`Using embedding ID for user object: ${embeddingId}`); 
    
    console.log("UMAP projection response:", umapProjection);
    
    // --- Rest of userSequence creation using umapProjection.x/y and embeddingId ---
    let userX = 0, userY = 0;
    if (umapProjection && typeof umapProjection.x === 'number' && typeof umapProjection.y === 'number' && !umapProjection.isPlaceholder) {
      userX = umapProjection.x;
      userY = umapProjection.y;
      console.log(`User sequence coordinates from API: (${userX}, ${userY})`);
    } else {
      console.warn("Valid coordinates not found for user sequence, using fallback (0, 0).");
    }
    
    userSequence = {
      id: embeddingId, // Use embedding ID for the object ID
      x: userX,
      y: userY,
      label: "Your Sequence",
      isUserSequence: true,
      uploadedAt: new Date().toISOString()
    };
    console.log("Created user sequence object:", userSequence);
    
    // --- Step 3: Fetch Similar Sequences (Still uses original jobId) ---
    console.log(`Fetching Top 100 similar sequences for job ID: ${jobId}`);
    showLoadingIndicator("Fetching similar sequences..."); // Update loading message
    const similarOptions100 = { n_results: 100 }; // Fetch 100
    // const similarOptions100 = { n_results: 10 }; // Fetch 100
    const similarSequencesResponse100 = await getSimilarSequences(jobId, similarOptions100, state.apiKey); // Pass original jobId

    // --- Step 4: Handle API Failures ---
    if (!similarSequencesResponse100 || !similarSequencesResponse100.result) {
      console.error(`Failed to fetch or parse Top 100 similar sequences for job ${jobId}. Response:`, similarSequencesResponse100);
      showErrorMessage("Error fetching similar sequences data. Cannot display contextual visualizations.");
      // Update visualizations to show only the user point?
      if (state.scatterComponent) {
        state.scatterComponent.updateScatterPlot([], userSequence); // Pass empty data + user sequence
        addOrUpdateInfoPanel('scatter-container', userSequence ? [userSequence] : []); // Show info for user seq only
      }
      if (state.mapComponent) state.mapComponent.updateMap([]);
      if (state.userGeoMap) state.userGeoMap.updateMap(userSequence, []); // Pass userSequence for potential centering
      updateDetailsWithSimilarSequences(userSequence, []);
      hideLoadingIndicator();
      return; // Exit if fetching failed
    }
    console.log(`Received ${similarSequencesResponse100.result.length} similar sequences from API`);

    // --- Step 5: Extract Top 10 & Accessions ---
    const top100SimilarRaw = similarSequencesResponse100.result;
    const top10SimilarRaw = top100SimilarRaw.slice(0, 10); // Assumes API returns sorted results

    // Extract all unique accession numbers needed for coordinate lookup
    const allAccessionNumbers = [
      ...new Set( // Use Set to ensure uniqueness
        top100SimilarRaw
          .map(seq => seq.metadata?.accessions?.[0]) // Get the first accession
          .filter(Boolean) // Remove null/undefined accessions
      )
    ];
    console.log(`Extracted ${allAccessionNumbers.length} unique accession numbers for coordinate lookup.`);

    // --- Step 2 & 6: Ensure Cache and Lookup Coordinates (Pass API Key) ---
    // Call findAllMatchesInCache - this function now handles loading the cache if needed (Phase 2)
    showLoadingIndicator("Finding sequences in reference dataset..."); // Update loading message
    const matchedItems = await findAllMatchesInCache(allAccessionNumbers, state.apiKey); // Pass state.apiKey
    console.log(`Found ${matchedItems.length} matches with coordinates in central cache.`);

    if (matchedItems.length === 0 && allAccessionNumbers.length > 0) {
       showWarningMessage("Found similar sequences, but could not locate their coordinates in the reference dataset. Displaying limited context.");
       // Proceed with limited data if needed, or decide how to handle this case
    }

    // --- Step 7: Prepare Data Subsets ---
    console.log("Preparing data subsets for visualizations...");
    const contextualUmapData = [];
    const referenceMapData100 = []; // For the main map (grouped by country)
    const userContextData10WithCoords = []; // For details panel and potentially geo-map

    const matchedItemsMap = new Map(matchedItems.map(item => [item.query, item])); // Map for quick lookup

    top100SimilarRaw.forEach((rawSeq, index) => {
      const accession = rawSeq.metadata?.accessions?.[0];
      const matchedCoordItem = accession ? matchedItemsMap.get(accession) : null;

      if (matchedCoordItem) {
        const combinedData = {
          // Core data from raw sequence
          id: rawSeq.id, // Use the ID from the similarity result
          similarity: rawSeq.similarity,
          distance: rawSeq.distance,
          metadata: rawSeq.metadata, // Includes lat_lon, country, year, host, isolation_source etc.
          // Data from matched cache item
          accession: matchedCoordItem.query, // The accession number we searched for
          matchedAccession: matchedCoordItem.match, // The actual accession found in cache (might differ slightly)
          x: matchedCoordItem.x,
          y: matchedCoordItem.y,
          // Contextual flags/labels
          label: matchedCoordItem.query, // Default label
          isTop10: index < 10,
          isUserSequence: false, // Explicitly mark as not the user sequence
          matchesUserSequence: true // Mark as related to the user's query
        };

        // Add to the UMAP data list
        contextualUmapData.push(combinedData);

        // Add to the reference map data list (all 100 with coordinates)
        referenceMapData100.push(combinedData);

        // Add to the top 10 list if applicable
        if (combinedData.isTop10) {
          userContextData10WithCoords.push(combinedData);
        }
    } else {
         console.warn(`Could not find coordinates for similar sequence: ${accession || rawSeq.id}`);
      }
    });

    console.log(`Prepared UMAP data: ${contextualUmapData.length} points (out of ${top100SimilarRaw.length} raw)`);
    console.log(`Prepared Reference Map data: ${referenceMapData100.length} points`);
    console.log(`Prepared Top 10 data with coords: ${userContextData10WithCoords.length} points`);

    // --- Step 8: Initialize or Update Visualizations ---
    showLoadingIndicator("Initializing/Updating visualizations..."); 

    // 8a: Contextual UMAP (`#scatter-container`)
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
    } else {
      console.log("Updating main UMAP (scatterComponent)...");
      state.scatterComponent.updateScatterPlot(contextualUmapData, userSequence);
    }

    // 8b: Reference Map (`#map-container`)
    if (!state.mapComponent) {
      console.log("Initializing Reference Map (mapComponent)...");
      const mapContainerId = 'map-container'; // <-- Use ID string
      const mapContainer = document.getElementById(mapContainerId);
      const emptyState = mapContainer?.querySelector('.empty-state-message');
      if (emptyState) emptyState.style.display = 'none'; 

      // --- PASS ID STRING ---
      state.mapComponent = createApiMap(mapContainerId, referenceMapData100, { 
          initialUserSequence: userSequence 
      });
      // --- END CHANGE ---
      } else {
        // ... update logic remains the same ...
        console.log("Updating Reference Map (mapComponent)...");
        state.mapComponent.updateMap(referenceMapData100, userSequence);
    }

    // 8c: Geo Map (`#user-geo-container` - shows Top 10 Raw locations)
    if (!state.userGeoMap) {
       console.log("Initializing User Geo Map (userGeoMap) with Top 10 raw...");
       const geoContainerId = 'user-geo-container';
       const geoContainer = document.getElementById(geoContainerId);
       const emptyState = geoContainer?.querySelector('.empty-state-message');
       if (emptyState) emptyState.style.display = 'none';

       state.userGeoMap = await createUserGeoMap(geoContainerId, {
         // Pass options if needed
       });
       
       if (state.userGeoMap && typeof state.userGeoMap.updateMap === 'function') {
           console.log("Calling userGeoMap.updateMap with initial data...");
           state.userGeoMap.updateMap(userSequence, top10SimilarRaw); // Pass original userSequence
      } else {
           console.error("Failed to initialize userGeoMap component or updateMap is missing.");
      }
    
  } else {
        // Update existing map
        console.log("Updating User Geo Map (userGeoMap) with Top 10 raw...");
        if (typeof state.userGeoMap.updateMap === 'function') {
            state.userGeoMap.updateMap(userSequence, top10SimilarRaw); // Pass original userSequence
  } else {
             console.error("Cannot update userGeoMap: updateMap method is missing.");
        }
    }

    // 8d: Details Panel (`#details-panel` - shows Top 10 with Coords)
    console.log("Updating Details Panel...");
    updateDetailsWithSimilarSequences(userSequence, userContextData10WithCoords); // This updates innerHTML, no init needed

    // --- Crucially, setup cross-highlighting AFTER components are initialized ---
    setupCrossHighlighting();
    setupPointHoverEffects(); // Needs to run after details panel is populated

    // --- Step 9: Notifications ---
    showNotification(`Analysis complete. Displaying your sequence and ${contextualUmapData.length} similar sequences found in the reference dataset.`, "success");
    if (contextualUmapData.length < top100SimilarRaw.length) {
        showWarningMessage(`Note: Coordinates were not found for ${top100SimilarRaw.length - contextualUmapData.length} similar sequences.`);
    }


  } catch (error) {
    console.error("❌ Error during handleJobCompletion:", error);
    showErrorMessage("An error occurred while processing the sequence results.");
    // Attempt to clear/reset visualizations to a safe state if userSequence exists
    if (state.scatterComponent && userSequence) {
      state.scatterComponent.updateScatterPlot([], userSequence);
      addOrUpdateInfoPanel('scatter-container', [userSequence]);
    }
    if (state.mapComponent) state.mapComponent.updateMap([]);
    if (state.userGeoMap && userSequence) state.userGeoMap.updateMap(userSequence, []);
     if (userSequence) updateDetailsWithSimilarSequences(userSequence, []);


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

/**
 * Searches the central cache for sequences matching the given accession numbers.
 * Ensures the cache is loaded if it's empty.
 * @param {Array<string>} accessionNumbers - Array of accession numbers to search for
 * @returns {Array<Object>} - Array of objects with coordinates for the matched sequences
 */
async function findAllMatchesInCache(accessionNumbers, apiKey) {
  console.log(`🔧 CENTRAL CACHE SEARCH: Searching for ${accessionNumbers.length} sequences.`);

  // --- Phase 2: On-Demand Cache Load ---
  let centralCache = window.apiCache.getSequences();

  if (!centralCache || centralCache.length === 0) {
    console.log("⏳ CENTRAL CACHE SEARCH: Cache is empty. Fetching reference data...");
    // --- Ensure API Key is available before fetching cache ---
    if (!apiKey) {
        console.error("❌ CENTRAL CACHE SEARCH: Cannot fetch reference data - API Key missing.");
        showErrorMessage("API Key missing, cannot load reference dataset.");
        return []; // Cannot proceed without key
    }
    showLoadingIndicator("Loading reference dataset for context..."); 
    try {
      // --- Pass apiKey to fetchAllSequences ---
      await fetchAllSequences(false, apiKey); // Pass forceRefresh=false and apiKey
      centralCache = window.apiCache.getSequences(); 
      console.log(`✅ CENTRAL CACHE SEARCH: Reference data fetched. Cache size: ${centralCache?.length || 0}`);
      if (!centralCache || centralCache.length === 0) {
         throw new Error("fetchAllSequences completed but cache is still empty.");
      }
    } catch (error) {
      console.error("❌ CENTRAL CACHE SEARCH: Failed to fetch reference data:", error);
       if (error.message.includes('401') || error.message.includes('403')) {
            showErrorMessage("Invalid API Key. Failed to load reference data.");
       } else {
            showErrorMessage("Failed to load reference data needed for visualization.");
       }
      hideLoadingIndicator();
      return []; // Cannot proceed without the cache
    } finally {
      hideLoadingIndicator(); // Ensure it's hidden even on error
    }
  } else {
     console.log(`👍 CENTRAL CACHE SEARCH: Using existing cache with ${centralCache.length} items.`);
  }
  // --- End Phase 2 ---

  // Original cache check (now redundant but kept for safety, can be removed later)
  if (!centralCache || centralCache.length === 0 || !accessionNumbers || accessionNumbers.length === 0) {
    console.error("❌ CENTRAL CACHE SEARCH: Central cache (window.apiCache) is empty or accession numbers are invalid after fetch attempt.");
    return [];
  }
  
  const foundItems = [];
  const searchFailures = [];
  
  // Process each accession number
  for (const accession of accessionNumbers) {
    if (!accession) continue;
    
    const origAccession = accession;
    const accLower = accession.toLowerCase();
    const accBase = accession.split('.')[0].toLowerCase();
    const accWithoutPrefix = accession.startsWith('NZ_') ? accession.substring(3).toLowerCase() : null;
    
    let found = false;
    let matchItem = null;
    let foundStrategy = null; // <-- Variable to store the successful strategy
    
    // Define search strategies
    const strategies = [
    // 1. Direct match (exact)
      item => item.accession && item.accession === origAccession,
    // 2. Case-insensitive match
      item => item.accession && item.accession.toLowerCase() === accLower,
    // 3. Base name match (without version)
      item => item.accession && item.accession.split('.')[0].toLowerCase() === accBase,
      // 4. Without NZ_ prefix match (if applicable)
      item => accWithoutPrefix && item.accession &&
        (item.accession.toLowerCase() === accWithoutPrefix || 
               item.accession.split('.')[0].toLowerCase() === accWithoutPrefix),
      // 5. Includes match (more permissive - use cautiously)
      // item => item.accession &&
      //         (item.accession.toLowerCase().includes(accBase) ||
      //          (accWithoutPrefix && item.accession.toLowerCase().includes(accWithoutPrefix)))
    ];

    // Try strategies in order
    for (const strategy of strategies) {
      if (!strategy) continue; // Skip invalid strategies (like #4 if not NZ_)
      const matches = centralCache.filter(strategy);
    if (matches.length > 0) {
      found = true;
        matchItem = matches[0]; // Take the first match
        foundStrategy = strategy; // <-- Store the strategy that worked
        // console.log(`✅ CENTRAL CACHE SEARCH: Found match for "${origAccession}" using strategy #${strategies.indexOf(strategy) + 1}. Match: ${matchItem.accession}`); // Reduce verbosity
        break; // Stop searching once a match is found
      }
    }

    // If we found a match, format and add it
    if (found && matchItem) {
      // Ensure coordinates exist
      let xCoord = 0, yCoord = 0;
      if (matchItem.coordinates && Array.isArray(matchItem.coordinates) && matchItem.coordinates.length >= 2) {
        xCoord = matchItem.coordinates[0];
        yCoord = matchItem.coordinates[1];
      } else {
         console.warn(`⚠️ CENTRAL CACHE SEARCH: Matched item ${matchItem.accession} is missing valid coordinates.`);
      }
      
      foundItems.push({
        query: origAccession,
        match: matchItem.accession,
        x: xCoord,
        y: yCoord,
        id: matchItem.sequence_hash || matchItem.id, // Prefer sequence_hash if available
        searchMethod: `Strategy ${strategies.indexOf(foundStrategy) + 1}`
      });
    } else {
      searchFailures.push(origAccession);
      // console.log(`❌ CENTRAL CACHE SEARCH: No matches found for "${origAccession}"`); // Less verbose logging
    }
  }
  
  console.log(`🔧 CENTRAL CACHE SEARCH: Found ${foundItems.length} matches for ${accessionNumbers.length} accessions.`);
  if (searchFailures.length > 0) {
    console.warn(`❌ CENTRAL CACHE SEARCH: Could not find matches for ${searchFailures.length} accessions: ${searchFailures.slice(0, 10).join(', ')}${searchFailures.length > 10 ? '...' : ''}`);
  }
  
  return foundItems;
}

async function handleSimilarSequences(jobId, similarSequencesResponse) {
  try {
    console.log("Processing similar sequences for job:", jobId);
    console.log("Similar sequences response:", similarSequencesResponse);

    if (similarSequencesResponse && similarSequencesResponse.result) {
      // Update geo map visualization
      if (state.userGeoMap && state.userGeoMap.updateMap) {
        console.log("🌍 Updating geo map with similar sequences");
        console.log("Number of similar sequences:", similarSequencesResponse.result.length);
        
        // Create user sequence with geo data from the first similar sequence
        // This is valid since similar sequences are from the same location as the user sequence
        const userSequenceWithGeo = {
          id: jobId,
          label: "Your Sequence",
          isUserSequence: true,
          metadata: {
            lat_lon: similarSequencesResponse.result[0]?.metadata?.lat_lon
          }
        };
        
        console.log("User sequence with geo:", userSequenceWithGeo);
        console.log("First similar sequence metadata:", similarSequencesResponse.result[0]?.metadata);
        
        // Update the map with the sequences
        state.userGeoMap.updateMap(userSequenceWithGeo, similarSequencesResponse.result);
      } else {
        console.warn("User geo map component not found or updateMap method not available");
      }
    } else {
      console.warn("No similar sequences data available in the response");
    }

  } catch (error) {
    console.error("Error in handleSimilarSequences:", error);
    console.error("Error details:", {
      jobId,
      similarSequencesResponseAvailable: !!similarSequencesResponse,
      similarSequencesType: typeof similarSequencesResponse
    });
    showErrorMessage("Failed to process similar sequences");
  }
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


  // Optionally remove visualization containers content if destroy methods don't exist
   document.getElementById('scatter-container').innerHTML = '<div class="empty-state-message flex flex-col items-center justify-center h-full"><p class="text-center text-gray-500 mb-4">Upload a sequence to view its relationship...</p></div>';
   document.getElementById('map-container').innerHTML = '<div class="empty-state-message flex flex-col items-center justify-center h-full" style="min-height: 550px;"><p class="text-center text-gray-500 mb-4">Upload a sequence to view the geographic distribution...</p></div>';
   document.getElementById('user-geo-container').innerHTML = '<div class="empty-state-message flex flex-col items-center justify-center h-full"><p class="text-center text-gray-500 mb-4">Upload a sequence to view the specific locations...</p></div>';

  // Re-initialize state pointers (if needed, though resetting data might suffice)
  state.scatterComponent = null;
  state.mapComponent = null;
  state.userGeoMap = null;


  showInfoMessage("Analysis reset. Ready for new upload.");
});

