---
theme: dashboard
toc: false
---

<link rel="stylesheet" href="./components/ui/styles/ui-components.css" id="ui-components-styles">

# Modular DNA Mutation Dashboard - (Modular)

This dashboard demonstrates a modular approach to visualizing DNA mutation data.

<div class="grid grid-cols-1 gap-4">
  <div class="card p-4">
    <h2 class="mb-4">Geographic Distribution</h2>
    <div id="map-container" style="width: 100%; height: 550px; position: relative; overflow: hidden;"></div>
  </div>
</div>

<div class="grid grid-cols-2 gap-4 mt-4">
  <div class="card p-4">
    <h2 class="mb-4">Reference Database UMAP</h2>
    <div id="scatter-container" style="width: 100%; height: 450px; position: relative; overflow: hidden;"></div>
  </div>
  <div class="card p-4">
    <h2 class="mb-4">User Sequence UMAP</h2>
    <div id="user-scatter-container" style="width: 100%; height: 460px; position: relative; overflow: visible; display: flex; flex-direction: column;"></div>
    <div class="flex justify-between items-center mt-3">
      <button id="upload-fasta-button" class="btn btn-primary">Upload FASTA Sequence</button>
      <button id="reset-user-sequences" class="btn btn-secondary">Reset Sequences</button>
      <input type="file" id="fasta-file-input" accept=".fasta,.fa" style="display: none;">
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
// Add at the beginning of the file, inside the <script> tag
// Import UI utility modules
import { 
  showMessage, 
  showInfoMessage, 
  showWarningMessage, 
  showErrorMessage,
  createMessage,
  createMessagesContainer,
  // addMessageStyles
} from './components/ui/message-handler.js';

import {
  showLoadingIndicator,
  hideLoadingIndicator,
  createLoadingIndicator,
  createCustomLoadingIndicator,
  // addLoadingStyles
} from './components/ui/loading-indicator.js';

import {
  updateJobStatus,
  updateProgressText,
  updateStatus,
  createStatusIndicator,
  createJobStatus,
  createJobProgressTracker,
  onStatusChange,
  getStatusHistory,
  // addStatusStyles
} from './components/ui/status-manager.js';

// Initialize the UI component styles
// addMessageStyles();
// addLoadingStyles();
// addStatusStyles();

import * as d3 from "d3";
import { createMap } from "./components/visualizations/map-component.js";
import { createApiMap } from "./components/visualizations/api-map-component.js";
import { createUmapScatterPlot } from "./components/visualizations/scatter-plot.js";
// import { updateDetailsPanel, addContainerStyles } from "./components/ui/dom-utils.js";
import { updateDetailsPanel } from "./components/ui/dom-utils.js";
import { setupEventHandlers } from "./components/event-handlers/interaction-handlers.js";
import { createUserScatterPlot } from "./components/visualizations/user-scatter-plot.js";
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
} from './components/data/api-service.js';
import { createUploadModal, readFastaFile, parseFastaContent } from './components/ui/api-upload-component.js';
import { createJobTracker } from './components/data/api-job-tracker.js';
import { 
  processSequenceResults, 
  generateDetailsHTML, 
  prepareVisualizationData,
  addSimilarSequenceListeners
} from './components/data/api-results-processor.js';
import {
  findSimilarSequencesForJob,
  fetchAllSequences,
  findSimilarSequences
} from './components/data/api-similarity-service.js';
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
  userSequences: [], // Array to store multiple user sequences
  jobTracker: null,
  jobPollingIntervals: {},
  stopPollingFunctions: {},
  similarSequences: []
};// Add a global cache for UMAP data
let umapDataCache = null;

/**
 * Fetch and cache all UMAP data if not already cached
 * @returns {Promise<Array>} - Array of UMAP data with coordinates
 */
async function getUmapDataCache() {
  if (umapDataCache && umapDataCache.length > 0) {
    console.log('Using cached UMAP data:', umapDataCache.length, 'sequences');
    return umapDataCache;
  }
  
  console.log('Fetching all UMAP data for coordinates lookup...');
  
  // Initialize empty cache
  umapDataCache = [];
  
  try {
    // Check for direct access to the API cache via window.apiCache
    let allData = null;
    
    // Add retry mechanism for window.apiCache access
    if (window.apiCache && typeof window.apiCache.getSequences === 'function') {
      console.log('🔍 DEBUG: Accessing directly from window.apiCache');
      
      // Try to get data with retries if needed
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        allData = window.apiCache.getSequences();
        const cacheStatus = window.apiCache.getCacheStatus();
        console.log(`🔍 DEBUG: API cache status (attempt ${retryCount + 1}):`, cacheStatus);
        
        if (allData && allData.length > 0) {
          console.log(`🔍 DEBUG: Successfully retrieved ${allData.length} sequences from window.apiCache on attempt ${retryCount + 1}`);
          break; // Success - exit the loop
        } else {
          console.log(`🔍 DEBUG: No data in window.apiCache on attempt ${retryCount + 1}, waiting...`);
          
          if (cacheStatus && cacheStatus.isFetching) {
            console.log('🔍 DEBUG: API cache is currently being fetched, waiting for completion...');
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      }
      
      if (!allData || allData.length === 0) {
        console.log('🔍 DEBUG: All retry attempts failed, falling back to other methods');
      }
    }
    
    // If direct access didn't work, try fetchAllSequences
    if (!allData || allData.length === 0) {
      if (typeof fetchAllSequences === 'function') {
        console.log('Attempting to use already cached sequences from api-service.js');
        allData = await fetchAllSequences();
        console.log(`Retrieved ${allData?.length || 0} sequences from existing cache`);
      } else {
        // Fallback to original method
        console.log('Falling back to direct fetchUmapData call');
        allData = await fetchUmapData('DNABERT-S', false);
        console.log(`Fetched ${allData?.length || 0} sequences from API`);
      }
    }
    
    // Last resort - try to manually force a refresh of the cache if available
    if ((!allData || allData.length === 0) && window.apiCache && typeof window.apiCache.refreshCache === 'function') {
      console.log('🔍 DEBUG: Attempting to force refresh the API cache...');
      const refreshResult = await window.apiCache.refreshCache();
      console.log('🔍 DEBUG: Cache refresh result:', refreshResult);
      
      if (refreshResult.success) {
        // Try again to get the refreshed data
        allData = window.apiCache.getSequences();
        console.log(`🔍 DEBUG: After refresh: Retrieved ${allData?.length || 0} sequences`);
      }
    }
    
    console.log(`🔍 DEBUG: Processing ${allData?.length || 0} sequences for UMAP data cache`);
    
    // Print a sample of the raw data
    if (allData && allData.length > 0) {
      console.log('Sample of raw API data before processing:');
      console.log(JSON.stringify(allData[0], null, 2));
    }
    
    // Process each sequence
    if (allData && allData.length > 0) {
      allData.forEach(seq => {
        if (seq) {
          let sequenceId = seq.sequence_hash || seq.id;
          let coordinates = seq.coordinates;
          
          if (sequenceId && coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
            umapDataCache.push({
              id: sequenceId,
              x: coordinates[0],
              y: coordinates[1],
              accession: seq.accession,
              metadata: {
                accessions: seq.accession ? [seq.accession] : [],
                country: seq.first_country || 'Unknown',
                first_year: seq.first_date ? (typeof seq.first_date === 'string' ? new Date(seq.first_date).getFullYear() : seq.first_date) : null,
                organism: seq.organism || null
              }
            });
          }
        }
      });
      
      console.log(`Cached ${umapDataCache.length} sequences with coordinates`);
      
      // Only log these stats when we have data
      if (umapDataCache.length > 0) {
        console.log('Sample cached sequence:', umapDataCache[0]);
        
        // Print the first 5 items to see patterns
        console.log('First 5 cached sequences:');
        umapDataCache.slice(0, 5).forEach((item, idx) => {
          console.log(`Cache item ${idx}:`, {
            id: item.id,
            x: item.x,
            y: item.y,
            accession: item.accession,
            metadata: item.metadata
          });
        });
        
        // Print some items with accession in different format
        const samplesWithNZ = umapDataCache.filter(item => item.accession && item.accession.startsWith('NZ_')).slice(0, 3);
        if (samplesWithNZ.length > 0) {
          console.log('Samples with NZ_ prefix:');
          samplesWithNZ.forEach((item, idx) => {
            console.log(`  Sample ${idx}:`, {
              accession: item.accession,
              x: item.x,
              y: item.y
            });
          });
        }
        
        // Check for items with different accession formats
        const accessionFormats = {};
        umapDataCache.forEach(item => {
          if (item.accession) {
            // Look for common patterns
            let format = 'other';
            if (item.accession.startsWith('NZ_')) format = 'NZ_';
            else if (item.accession.startsWith('NC_')) format = 'NC_';
            else if (item.accession.startsWith('AL')) format = 'AL';
            
            accessionFormats[format] = (accessionFormats[format] || 0) + 1;
          }
        });
        console.log('Accession format distribution in cache:');
        Object.entries(accessionFormats).forEach(([format, count]) => {
          console.log(`  ${format}: ${count} items (${((count/umapDataCache.length)*100).toFixed(1)}%)`);
        });
      }
    } else {
      console.error('🔍 DEBUG: No data available to process for UMAP data cache');
    }
    
    return umapDataCache;
  } catch (error) {
    console.error('Failed to fetch UMAP data cache:', error);
    // Create a small mock cache for fallback
    for (let i = 0; i < 100; i++) {
      umapDataCache.push({
        id: `fallback-${i}`,
        x: (Math.random() * 20) - 10,
        y: (Math.random() * 20) - 10,
        accession: `FB${i}`,
        metadata: {
          accessions: [`FB${i}`],
          country: 'Unknown',
          first_year: null
        }
      });
    }
    console.log(`Created ${umapDataCache.length} fallback sequences for cache`);
    return umapDataCache;
  }
}

/**
 * Debug utility to inspect the UMAP data cache
 */
function inspectUmapDataCache() {
  if (!umapDataCache || umapDataCache.length === 0) {
    console.log("🔎 INSPECT: umapDataCache is empty or null");
    return;
  }
  
  console.log(`🔎 INSPECT: umapDataCache contains ${umapDataCache.length} items`);
  
  // Sample the first few items
  console.log("🔎 INSPECT: First 5 items in cache:");
  umapDataCache.slice(0, 5).forEach((item, idx) => {
    console.log(`  Item ${idx}:`, {
      id: item.id,
      accession: item.accession,
      coordinates: [item.x, item.y],
      metadata: item.metadata
    });
  });
  
  // Count items with accession
  const withAccession = umapDataCache.filter(item => item.accession).length;
  console.log(`🔎 INSPECT: ${withAccession} items have accession property (${((withAccession/umapDataCache.length)*100).toFixed(1)}%)`);
  
  // Get all unique accession numbers
  const accessions = new Set();
  umapDataCache.forEach(item => {
    if (item.accession) {
      accessions.add(item.accession);
    }
  });
  console.log(`🔎 INSPECT: ${accessions.size} unique accession numbers found`);
  
  // Look for common accession prefixes like 'NZ_'
  const prefixCounts = {};
  accessions.forEach(acc => {
    const parts = acc.split('_');
    if (parts.length > 1) {
      const prefix = parts[0] + '_';
      prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    }
  });
  
  console.log("🔎 INSPECT: Common accession prefixes:");
  Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([prefix, count]) => {
      console.log(`  ${prefix}: ${count} items (${((count/accessions.size)*100).toFixed(1)}%)`);
    });
  
  return {
    totalItems: umapDataCache.length,
    withAccession,
    uniqueAccessions: accessions.size,
    prefixCounts
  };
}

/**
 * Debug utility to check if specific accession numbers exist in the UMAP data cache
 * @param {Array} accessionNumbers - Array of accession numbers to check
 */
function checkAccessionExistence(accessionNumbers) {
  if (!umapDataCache || umapDataCache.length === 0) {
    console.log("❌ CHECK: umapDataCache is empty or null");
    return;
  }
  
  console.log(`🔍 CHECK: Checking ${accessionNumbers.length} accession numbers against ${umapDataCache.length} cache items`);
  
  // For each accession number, check if it exists in the cache
  accessionNumbers.forEach(accessionNumber => {
    // Direct match
    const directMatch = umapDataCache.find(item => item.accession === accessionNumber);
    
    // Case-insensitive match
    const caseInsensitiveMatch = !directMatch ? umapDataCache.find(item => 
      item.accession && item.accession.toLowerCase() === accessionNumber.toLowerCase()
    ) : null;
    
    // Base match (without version number)
    const baseAccession = accessionNumber.split('.')[0];
    const baseMatch = (!directMatch && !caseInsensitiveMatch) ? umapDataCache.find(item => {
      if (!item.accession) return false;
      const itemBase = item.accession.split('.')[0];
      return itemBase === baseAccession;
    }) : null;
    
    // Prefix match
    const prefixMatch = (!directMatch && !caseInsensitiveMatch && !baseMatch) ? umapDataCache.find(item => {
      if (!item.accession) return false;
      return item.accession.startsWith(baseAccession) || baseAccession.startsWith(item.accession);
    }) : null;
    
    console.log(`🔍 CHECK: Accession "${accessionNumber}":`);
    console.log(`  - Direct match: ${directMatch ? 'YES' : 'NO'}`);
    console.log(`  - Case-insensitive match: ${caseInsensitiveMatch ? 'YES (' + caseInsensitiveMatch.accession + ')' : 'NO'}`);
    console.log(`  - Base match (without version): ${baseMatch ? 'YES (' + baseMatch.accession + ')' : 'NO'}`);
    console.log(`  - Prefix match: ${prefixMatch ? 'YES (' + prefixMatch.accession + ')' : 'NO'}`);
    
    if (directMatch || caseInsensitiveMatch || baseMatch || prefixMatch) {
      const match = directMatch || caseInsensitiveMatch || baseMatch || prefixMatch;
      console.log(`  - Found match: ${match.accession}`);
      console.log(`  - Has coordinates array: ${!!(match.coordinates && Array.isArray(match.coordinates))}`);
      console.log(`  - Has x,y properties: ${!!(typeof match.x === 'number' && typeof match.y === 'number')}`);
      
      // Log coordinates if available
      if (match.coordinates && Array.isArray(match.coordinates)) {
        console.log(`  - Coordinates: [${match.coordinates.join(', ')}]`);
      } else if (typeof match.x === 'number' && typeof match.y === 'number') {
        console.log(`  - X,Y properties: (${match.x}, ${match.y})`);
      }
    }
  });
}

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
    console.log(`Original job ID: ${jobId}`);
    
    // Get UMAP projection for the user sequence
    const umapProjection = await getUmapProjection(embeddingId);
    console.log("UMAP projection response:", umapProjection);
    
    // Create a user sequence object with coordinates from the API
    let userX = 0, userY = 0;
    
    // Extract coordinates from the API response
    if (umapProjection && umapProjection.result && umapProjection.result.coordinates) {
      // Format from API response
      userX = umapProjection.result.coordinates[0];
      userY = umapProjection.result.coordinates[1];
      console.log(`Extracted coordinates from API response: (${userX}, ${userY})`);
    } else if (umapProjection && umapProjection.x !== undefined && umapProjection.y !== undefined) {
      // Direct coordinates
      userX = umapProjection.x;
      userY = umapProjection.y;
      console.log(`Using direct coordinates: (${userX}, ${userY})`);
    } else {
      // Fallback to center position
      userX = 0;
      userY = 0;
      console.warn(`No coordinates found in UMAP projection, using center position: (${userX}, ${userY})`);
    }
    
    // Create the user sequence object
    const userSequence = {
      id: embeddingId,
      x: userX,
      y: userY,
      label: "Your Sequence",
      isUserSequence: true,
      uploadedAt: new Date().toISOString()
    };
    
    console.log("Created user sequence object:", userSequence);
    
    // IMPORTANT: Completely bypass the imported function and use a direct implementation
    console.log("🔍 DEBUG: Making direct API call to similar sequences endpoint");
    console.log(`🔍 DEBUG: Using job ID: ${jobId}`);
    
    // Set up the API parameters
    const API_BASE_URL = 'http://54.169.186.71/api/v1';
    const API_KEY = 'test_key';
    
    const similarOptions = {
      n_results: 10,
      min_distance: -1,
      max_year: 0,
      include_unknown_dates: false
    };
    
    // Construct the URL with job_id in the query string
    const url = `${API_BASE_URL}/pathtrack/sequence/similar?job_id=${encodeURIComponent(jobId)}`;
    console.log(`🔍 DEBUG: Sending request to URL: ${url}`);
    console.log(`🔍 DEBUG: With options:`, similarOptions);
    
    let similarSequencesResponse;
    try {
      // Make the direct fetch call
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(similarOptions)
      });
      
      console.log(`🔍 DEBUG: API response status: ${response.status}`);
      
      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔍 DEBUG: API error: ${response.status} - ${errorText}`);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      // Parse the response
      const responseText = await response.text();
      console.log(`🔍 DEBUG: Raw API response:`, responseText);
      
      try {
        similarSequencesResponse = JSON.parse(responseText);
        console.log("🔍 DEBUG: Parsed API response:", similarSequencesResponse);
      } catch (parseError) {
        console.error("🔍 DEBUG: Error parsing API response:", parseError);
        throw new Error(`Failed to parse API response: ${parseError.message}`);
      }
    } catch (fetchError) {
      console.error("🔍 DEBUG: Error fetching similar sequences:", fetchError);
      
      // Create a mock response for testing
      console.log("🔍 DEBUG: Creating mock response for testing");
      similarSequencesResponse = {
        id: jobId,
        type: "similarity_search",
        status: "completed",
        result: [
          {
            job_id: "unknown",
            id: "mock1",
            metadata: {
              accessions: ["MOCK1"],
              country: "Test Country",
              first_year: 2022
            },
            distance: 0.1,
            similarity: 0.9
          },
          {
            job_id: "unknown",
            id: "mock2",
            metadata: {
              accessions: ["MOCK2"],
              country: "Test Country",
              first_year: 2022
            },
            distance: 0.2,
            similarity: 0.8
          }
        ]
      };
    }
    
    // At this point, similarSequencesResponse should contain the response from the API
    // or the mock response if the API call failed
    console.log("🔍 DEBUG: Final similar sequences response:", similarSequencesResponse);
    console.log("🔍 DEBUG: Response type:", typeof similarSequencesResponse);
    
    if (similarSequencesResponse && similarSequencesResponse.result) {
      console.log(`🔍 DEBUG: Found ${similarSequencesResponse.result.length} similar sequences in response`);
    } else {
      console.log("🔍 DEBUG: No similar sequences found in response");
    }
    
    // Make sure we have the UMAP data cache for looking up coordinates
    await getUmapDataCache();
    
    // Run the cache inspection for debugging
    console.log("🔍 DEBUG: Inspecting UMAP data cache before processing similar sequences:");
    inspectUmapDataCache();
    
    // Test some known accession numbers
    console.log("🔍 DEBUG: Testing sample accession numbers against cache:");
    checkAccessionExistence([
      "NZ_QTIX00000000",  // Example from your provided data
      "AL123456",         // Example from your UMAP data example
      "NZ_QTIX0000",      // Partial prefix
      "QTIX00000000"      // Without NZ_ prefix
    ]);
    
    // Extract accession numbers from similar sequences
    const similarAccessionNumbers = [];
    if (similarSequencesResponse && similarSequencesResponse.result && Array.isArray(similarSequencesResponse.result)) {
      console.log("🔍 DEBUG: Extracting accession numbers from similar sequences");
      
      similarSequencesResponse.result.forEach(seq => {
        if (seq.metadata && seq.metadata.accessions && seq.metadata.accessions.length > 0) {
          const accessionNumber = seq.metadata.accessions[0];
          similarAccessionNumbers.push(accessionNumber);
          console.log(`  - Accession: "${accessionNumber}"`);
        }
      });
      
      console.log(`🔍 DEBUG: Extracted ${similarAccessionNumbers.length} accession numbers from similar sequences`);
      
      // Directly search for these accessions using the improved search function
      const matchedItems = await findAllMatchesInCache(similarAccessionNumbers);
      console.log(`🔍 DEBUG: Direct search found ${matchedItems.length} matches`);
      
      // If we find more matches this way, use them instead of the regular method
      if (matchedItems.length > 0) {
        console.log("🔍 DEBUG: Using direct match results for similar sequences visualization");
        
        // Print the matched items
        matchedItems.forEach((item, idx) => {
          console.log(`  Match ${idx}: "${item.query}" → "${item.match}" at (${item.x}, ${item.y})`);
        });
        
        // Create similar sequence objects from matched items
        const directSimilarSequences = [];
        
        matchedItems.forEach(item => {
          // Find the original similar sequence data
          const originalSeq = similarSequencesResponse.result.find(
            seq => seq.metadata?.accessions?.[0] === item.query
          );
          
          if (originalSeq) {
            directSimilarSequences.push({
              id: originalSeq.id || item.id, 
              x: item.x,
              y: item.y,
              similarity: originalSeq.similarity || 0,
              distance: originalSeq.distance || 0,
              matchesUserSequence: true,
              metadata: originalSeq.metadata || {},
              accession: item.query,
              label: item.query,
              coordinateSource: 'direct-match',
              originalMatch: item.match
            });
          }
        });
        
        console.log(`🔍 DEBUG: Created ${directSimilarSequences.length} similar sequences from direct matches`);
        
        if (directSimilarSequences.length > 0) {
          // Return early with the direct matches
          console.log(`🔍 DEBUG: Showing ${directSimilarSequences.length} direct-matched similar sequences`);
          
          // Update visualizations with these direct matches
          updateUmapVisualization([userSequence, ...directSimilarSequences]);
          
          // Update details panel
          updateDetailsWithSimilarSequences(userSequence, directSimilarSequences);
          
          // Hide loading indicator
          hideLoadingIndicator();
          
          // Show success message
          showNotification(`Found ${directSimilarSequences.length} sequences in Reference UMAP`, "success");
          
          return; // Skip the rest of the function
        }
      }
    }
    
    // Extract and list all accession numbers from the similar sequences response
    console.log("🔍 DEBUG: Accession numbers from similar sequences response:");
    if (similarSequencesResponse && similarSequencesResponse.result && Array.isArray(similarSequencesResponse.result)) {
      similarSequencesResponse.result.forEach((seq, idx) => {
        const accessionNumber = seq.metadata?.accessions?.[0];
        console.log(`  Sequence ${idx}: Accession=${accessionNumber || 'undefined'}`);
        
        // Check if this accession exists in the cache
        if (accessionNumber) {
          // Exact match
          const exactMatch = umapDataCache.find(s => s.accession === accessionNumber);
          // Partial match (same prefix)
          const partialMatch = !exactMatch ? umapDataCache.find(s => {
            if (!s.accession) return false;
            return s.accession.startsWith(accessionNumber) || accessionNumber.startsWith(s.accession);
          }) : null;
          
          console.log(`    Exact match in cache: ${exactMatch ? 'Yes' : 'No'}`);
          console.log(`    Partial match in cache: ${partialMatch ? 'Yes (' + partialMatch.accession + ')' : 'No'}`);
        }
      });
    }
    
    // Process similar sequences
    const similarSequences = [];
    
    // Map through the API response and find coordinates for each similar sequence using the accession number
    if (similarSequencesResponse && similarSequencesResponse.result && Array.isArray(similarSequencesResponse.result)) {
      console.log(`Processing ${similarSequencesResponse.result.length} similar sequences from API response`);
      
      let foundCoordinatesCount = 0;
      let missingCoordinatesCount = 0;
      
      for (const seq of similarSequencesResponse.result) {
        console.log(`🔍 DEBUG: Processing similar sequence:`, seq);
        
        // Get the accession number from the metadata
        const accessionNumber = seq.metadata?.accessions?.[0];
        
        if (!accessionNumber) {
          console.warn("Similar sequence missing accession number, skipping:", seq);
          missingCoordinatesCount++;
          continue;
        }
        
        console.log(`🔍 DEBUG: Looking for accession number "${accessionNumber}" in UMAP data cache of ${umapDataCache.length} entries`);
        
        // Detailed lookup diagnostics
        const exactMatches = umapDataCache.filter(s => s.accession === accessionNumber);
        console.log(`🔍 DEBUG: Found ${exactMatches.length} exact matches for accession ${accessionNumber}`);
        
        // Try direct accession lookup with case-insensitive comparison
        const caseInsensitiveMatches = umapDataCache.filter(s => {
          return s.accession && s.accession.toLowerCase() === accessionNumber.toLowerCase();
        });
        console.log(`🔍 DEBUG: Found ${caseInsensitiveMatches.length} case-insensitive matches for accession ${accessionNumber}`);
        
        // Look for this sequence in the UMAP data cache by accession number
        const cachedSeq = umapDataCache.find(s => s.accession === accessionNumber);
        console.log(`🔍 DEBUG: Cached sequence for accession ${accessionNumber}:`, cachedSeq);
        
        let seqX, seqY;
        let coordinateSource = 'generated';
        
        if (cachedSeq && cachedSeq.coordinates && Array.isArray(cachedSeq.coordinates) && cachedSeq.coordinates.length >= 2) {
          // Use coordinates from cache
          seqX = cachedSeq.coordinates[0];
          seqY = cachedSeq.coordinates[1];
          coordinateSource = 'cache';
          console.log(`Found cached coordinates for accession ${accessionNumber}: (${seqX}, ${seqY})`);
          foundCoordinatesCount++;
        } else if (cachedSeq && typeof cachedSeq.x === 'number' && typeof cachedSeq.y === 'number') {
          // Alternative format with x,y properties
          seqX = cachedSeq.x;
          seqY = cachedSeq.y;
          coordinateSource = 'cache-xy';
          console.log(`Found cached x,y properties for accession ${accessionNumber}: (${seqX}, ${seqY})`);
          foundCoordinatesCount++;
        } else {
          // Try a more flexible search
          console.log(`🔍 DEBUG: Trying a more flexible search for "${accessionNumber}"`);
          
          // Some accession numbers might have version numbers or other suffixes
          // Try to match without version numbers
          const baseAccession = accessionNumber.split('.')[0]; // Remove version number if present
          const flexMatch = umapDataCache.find(s => {
            if (!s.accession) return false;
            return s.accession.startsWith(baseAccession) || baseAccession.startsWith(s.accession);
          });
          
          if (flexMatch) {
            console.log(`🔍 DEBUG: Found flexible match: ${flexMatch.accession} for ${accessionNumber}`);
            
            if (flexMatch.coordinates && Array.isArray(flexMatch.coordinates) && flexMatch.coordinates.length >= 2) {
              seqX = flexMatch.coordinates[0];
              seqY = flexMatch.coordinates[1];
              coordinateSource = 'cache-flex';
              console.log(`Found flexible match coordinates for accession ${accessionNumber} (matched ${flexMatch.accession}): (${seqX}, ${seqY})`);
              foundCoordinatesCount++;
            } else if (typeof flexMatch.x === 'number' && typeof flexMatch.y === 'number') {
              seqX = flexMatch.x;
              seqY = flexMatch.y;
              coordinateSource = 'cache-flex-xy';
              console.log(`Found flexible match x,y properties for accession ${accessionNumber} (matched ${flexMatch.accession}): (${seqX}, ${seqY})`);
              foundCoordinatesCount++;
            } else {
              console.log(`🔍 DEBUG: Flexible match found but no valid coordinates in: `, flexMatch);
              
              // Generate deterministic coordinates as fallback
              const angle = seq.similarity * Math.PI * 2; // Use similarity to place more similar sequences closer
              const distance = 1 - (seq.similarity || 0.5); // Distance from user sequence (0-1)
              const radius = Math.max(1, Math.min(5, distance * 10)); // Scale to reasonable range (1-5)
              
              // Place in circle around user sequence
              seqX = userX + Math.cos(angle) * radius;
              seqY = userY + Math.sin(angle) * radius;
              
              console.log(`Generated fallback coordinates for accession ${accessionNumber}: (${seqX}, ${seqY})`);
              missingCoordinatesCount++;
            }
          } else {
            console.log(`🔍 DEBUG: No flexible match found for ${accessionNumber}`);
            
            // Generate deterministic coordinates as fallback
            const angle = seq.similarity * Math.PI * 2; // Use similarity to place more similar sequences closer
            const distance = 1 - (seq.similarity || 0.5); // Distance from user sequence (0-1)
            const radius = Math.max(1, Math.min(5, distance * 10)); // Scale to reasonable range (1-5)
            
            // Place in circle around user sequence
            seqX = userX + Math.cos(angle) * radius;
            seqY = userY + Math.sin(angle) * radius;
            
            console.log(`Generated fallback coordinates for accession ${accessionNumber}: (${seqX}, ${seqY})`);
            missingCoordinatesCount++;
          }
        }
        
        // Create similar sequence object
        similarSequences.push({
          id: seq.id,
          x: seqX,
          y: seqY,
          similarity: seq.similarity || 0,
          distance: seq.distance || 0,
          matchesUserSequence: true, // Set to boolean true instead of userSequence.id
          metadata: seq.metadata || {},
          accession: accessionNumber,
          label: accessionNumber || seq.id,
          coordinateSource: coordinateSource
        });
      }
      
      // Show notification about found coordinates
      console.log(`Found coordinates for ${foundCoordinatesCount} similar sequences in UMAP data cache`);
      console.log(`Generated fallback coordinates for ${missingCoordinatesCount} similar sequences`);
      
      // Force notification to display
      // Clear any existing notification element first
      const existingNotification = document.getElementById('notification-container');
      if (existingNotification) {
        existingNotification.remove();
      }
      
      setTimeout(() => {
        if (foundCoordinatesCount > 0) {
          showNotification(`Found ${foundCoordinatesCount} of ${similarSequencesResponse.result.length} similar sequences in Reference UMAP`, "success");
        } else {
          showNotification(`No matches found in Reference UMAP. Showing ${similarSequencesResponse.result.length} similar sequences with generated positions`, "warning");
        }
      }, 500); // Slight delay to ensure DOM is ready
    } else {
      console.warn("No similar sequences found in API response:", similarSequencesResponse);
    }
    
    console.log(`Processed ${similarSequences.length} similar sequences with coordinates`);
    console.log("FINAL SEQUENCES FOR VISUALIZATION:", similarSequences);
    
    // Add diagnostic info to the user UMAP container
    try {
      // First remove any existing info box
      const existingBox = document.querySelector('.reference-match-info');
      if (existingBox) {
        existingBox.remove();
      }
      
      const userScatterContainer = document.getElementById('user-scatter-container');
      if (userScatterContainer) {
        const infoBox = document.createElement('div');
        infoBox.className = 'reference-match-info';
        infoBox.style.cssText = 'position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 8px; border-radius: 4px; font-size: 12px; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
        
        // Count how many sequences have real coordinates from cache
        const realCoordinateCount = similarSequences.filter(seq => 
          seq.coordinateSource === 'cache' || 
          seq.coordinateSource === 'cache-flex' || 
          seq.coordinateSource === 'cache-xy' || 
          seq.coordinateSource === 'cache-flex-xy'
        ).length;
        const totalSimilarCount = similarSequences.length;
        
        infoBox.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">Similar Sequences</div>
          <div>✅ ${realCoordinateCount} sequences found in Reference UMAP</div>
          <div>📊 ${totalSimilarCount} total similar sequences</div>
        `;
        
        userScatterContainer.appendChild(infoBox);
        console.log("Added info box to user scatter container");
      } else {
        console.warn("Could not find user scatter container for info box");
      }
    } catch (infoBoxError) {
      console.error("Error adding info box:", infoBoxError);
    }
    
    // Update visualizations
    updateUmapVisualization([userSequence, ...similarSequences]);
    
    // Store current sequences for potential cache refresh scenarios
    window.currentSequences = [userSequence, ...similarSequences];
    
    // Update details panel
    updateDetailsWithSimilarSequences(userSequence, similarSequences);
    
    // Hide loading indicator
    hideLoadingIndicator();
    
    // Show success message
    showNotification("Sequence analysis complete!", "success");
    
  } catch (error) {
    console.error("Error processing job completion:", error);
    hideLoadingIndicator();
    showNotification("Error processing sequence analysis", "error");
  }
}

// Helper function to get color for a sequence by index
function getSequenceColor(index) {
  const colors = ['rgba(228, 26, 28, 0.5)', 'rgba(55, 126, 184, 0.5)', 'rgba(77, 175, 74, 0.5)', 
                 'rgba(152, 78, 163, 0.5)', 'rgba(255, 127, 0, 0.5)'];
  return colors[index % colors.length];
}

// Function to set up cross-highlighting between Reference and User UMAPs
function setupCrossHighlighting() {
  console.log("Setting up cross-highlighting between Reference and User UMAPs");
  
  // Set cross-highlight function in Reference UMAP
  if (state.scatterComponent && typeof state.scatterComponent.setCrossHighlightFunction === 'function') {
    // Create a wrapper for the highlight function
    const highlightInUserUMAP = (pointId, highlight) => {
      console.log(`Cross-highlight from Reference to User UMAP: ${pointId} (${highlight ? 'on' : 'off'})`);
      if (state.userScatterComponent && state.userScatterComponent.highlightPoint) {
        state.userScatterComponent.highlightPoint(pointId, highlight);
      }
    };
    
    // Set up the cross-highlight function in Reference UMAP
    state.scatterComponent.setCrossHighlightFunction(highlightInUserUMAP);
    console.log("Set cross-highlight function in Reference UMAP");
  } else {
    console.warn("Reference scatter component does not support cross-highlighting");
  }
  
  // Set cross-highlight function in User UMAP
  if (state.userScatterComponent && typeof state.userScatterComponent.setCrossHighlightFunction === 'function') {
    // Create a wrapper for the highlight function
    const highlightInReferenceUMAP = (pointId, highlight) => {
      console.log(`Cross-highlight from User to Reference UMAP: ${pointId} (${highlight ? 'on' : 'off'})`);
      if (state.scatterComponent && state.scatterComponent.highlightPoint) {
        state.scatterComponent.highlightPoint(pointId, highlight);
      }
    };
    
    // Set up the cross-highlight function in User UMAP
    state.userScatterComponent.setCrossHighlightFunction(highlightInReferenceUMAP);
    console.log("Set cross-highlight function in User UMAP");
  } else {
    console.warn("User scatter component does not support cross-highlighting");
  }
}

// Function to set up job polling
function setupJobPolling(jobId, maxAttempts = 60) {
  let attempts = 0;
  let lastProgress = 5; // Start at 5%
  
  console.log(`Setting up polling for job ${jobId}`);
  
  // Create a function to stop polling
  const stopPolling = () => {
    if (state.jobPollingIntervals[jobId]) {
      console.log(`Stopping polling for job ${jobId}`);
      clearInterval(state.jobPollingIntervals[jobId]);
      delete state.jobPollingIntervals[jobId];
    }
  };
  
  // Set up more frequent PROGRESS updates (every 1 second)
  const progressInterval = setInterval(() => {
    // Calculate smooth progress increase
    const normalizedAttempt = attempts / maxAttempts;
    const sigmoid = 1 / (1 + Math.exp(-12 * (normalizedAttempt - 0.5)));
    const targetProgress = Math.min(5 + sigmoid * 90, 90); // Start at 5%, cap at 90%
    
    // Smoothly approach the target progress
    lastProgress = lastProgress + (targetProgress - lastProgress) * 0.1;
    
    // Update the tracker
    updateProgressText('processing', lastProgress);
    
    // Also update through the job tracker API if it exists
    if (state.jobTracker) {
      state.jobTracker.updateProgress(lastProgress);
    }
  }, 1000);
  
  // Set up the STATUS check interval (every 5 seconds)
  const intervalId = setInterval(async () => {
    attempts++;
    
    try {
      console.log(`Polling job ${jobId}, attempt ${attempts}/${maxAttempts}`);
      
      // Check job status
      const jobData = await checkJobStatus(jobId);
      console.log(`Job status: ${jobData.status}`, jobData);
      
      let currentStatus = jobData.status;
      
      // Force transition to processing after a few attempts
      if (currentStatus === 'initializing' && attempts >= 3) {
        currentStatus = 'processing';
      }
      
      // Update job tracker if it exists
      if (state.jobTracker) {
        state.jobTracker.updateStatus(currentStatus, jobData);
      }
      
      // Handle different job statuses
      if (jobData.status === 'completed') {
        console.log(`Job ${jobId} completed successfully`);
        
        // Clear both intervals
        stopPolling();
        clearInterval(progressInterval);
        
        // Force update the progress display to completed
        updateProgressText('completed', 100);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.updateProgress(100);
          state.jobTracker.complete(jobData);
        }
        
        // Process the results
        await handleJobCompletion(jobId, jobData);
      } else if (jobData.status === 'failed') {
        console.error(`Job ${jobId} failed:`, jobData.error || 'Unknown error');
        
        // Clear both intervals
        stopPolling();
        clearInterval(progressInterval);
        
        // Force update the progress display to failed
        updateProgressText('failed', 100);
        
        // Show error message
        showErrorMessage(`Job failed: ${jobData.error || 'Unknown error'}`);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.error(jobData.error || 'Unknown error');
        }
      } else if (attempts >= maxAttempts) {
        console.warn(`Job ${jobId} polling timed out after ${maxAttempts} attempts`);
        
        // Clear both intervals
        stopPolling();
        clearInterval(progressInterval);
        
        // Force update the progress display to failed
        updateProgressText('failed', 100);
        
        // Show timeout message
        showWarningMessage(`Job ${jobId} is taking too long. Please check back later.`);
        
        // Update job tracker
        if (state.jobTracker) {
          state.jobTracker.timeout();
        }
      } else {
        // For ongoing jobs, manually update the progress text
        updateProgressText(currentStatus, lastProgress);
      }
    } catch (error) {
      console.error(`Error polling job ${jobId}:`, error);
    }
  }, 5000); // Poll every 5 seconds for status
  
  // Store interval ID for cleanup
  state.jobPollingIntervals[jobId] = intervalId;
  
  // Return an enhanced stop function that clears both intervals
  return () => {
    stopPolling();
    clearInterval(progressInterval);
  };
}

// Function to initialize the user scatter plot
function initializeUserScatterPlot(container, data = [], options = {}) {
  console.log(`Initializing user scatter plot with ${data.length} points`);
  console.log("Container:", container.id);
  console.log("Sample data point:", data.length > 0 ? JSON.stringify(data[0]) : "No data points");
  
  // Validation
  if (!container) {
    console.error("Container not provided to initializeUserScatterPlot");
    return null;
  }
  
  if (!container.id) {
    console.error("Container has no ID, generating one");
    container.id = 'user-scatter-' + Math.random().toString(36).substring(2, 10);
  }
  
  // Clear the container if needed
  if (options.clearContainer) {
    container.innerHTML = '';
  }
  
  // Ensure container has position relative for proper positioning of elements
  container.style.position = 'relative';
  
  // Get container dimensions and ensure they're reasonable
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight || 400;
  
  console.log(`Container dimensions: ${containerWidth}x${containerHeight}`);
  
  // If dimensions seem incorrect, set explicit dimensions
  if (containerWidth < 100 || containerHeight < 100) {
    console.warn("Container dimensions may be too small, applying defaults");
    container.style.width = '100%';
    container.style.height = '400px';
  }
  
  // Default options
  const defaultOptions = {
    xLabel: "X Dimension",
    yLabel: "Y Dimension",
    showLabels: true,
    userPointRadius: 8,
    pointRadius: 5,
    onPointClick: (point) => {
      console.log("User scatter point clicked:", point);
      // Highlight the point in all visualizations
      highlightSequence(point.id, true);
    },
    width: containerWidth || 400,
    height: containerHeight || 300
  };
  
  // Merge with provided options
  const componentOptions = { ...defaultOptions, ...options };
  
  try {
    // Create the component - making sure to pass the container ID, not the container element
    const component = createUserScatterPlot(container.id, data, componentOptions);
    
    if (!component) {
      console.error("Failed to create user scatter plot component");
      // Show error in container
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
          <p class="text-center text-red-500 mb-4">Error creating visualization component</p>
        </div>
      `;
      return null;
    }
    
    // If there's no data, show the empty state message
    if (!data || data.length === 0) {
      const emptyStateDiv = document.createElement('div');
      emptyStateDiv.className = 'flex flex-col items-center justify-center h-full';
      emptyStateDiv.innerHTML = `
        <p class="text-center text-gray-500 mb-4">Upload a sequence to view its UMAP projection</p>
      `;
      container.appendChild(emptyStateDiv);
    } else {
      console.log(`Created user scatter plot with ${data.length} points`);
    }
    
    return component;
  } catch (error) {
    console.error("Error initializing user scatter plot:", error);
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full">
        <p class="text-center text-red-500 mb-4">Error: ${error.message}</p>
      </div>
    `;
    return null;
  }
}

// Initialize immediately for Observable
(async function() {
  try {
    console.log("Initializing dashboard...");
    
    // Add CSS styles for proper container sizing
    // addContainerStyles();
    
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
      
      // Store current data and UI state
      state.originalData = [...transformedData];
      state.currentData = transformedData;
      
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
      const userScatterContainer = document.getElementById('user-scatter-container');
      state.userScatterComponent = initializeUserScatterPlot(userScatterContainer, []);
      
      // Set up cross-highlighting between scatter plots
      setupCrossHighlighting();
      
      // Show API data notice
      apiDataNotice.style.display = 'block';
      
      // Set up the reset button
      const resetButton = document.getElementById('reset-user-sequences');
      resetButton.addEventListener('click', () => {
        console.log("Resetting user sequences...");
        
        // Reset the state
        state.userSequences = [];
        state.similarSequences = [];
        
        // Clear the user scatter plot container
        const userScatterContainer = document.getElementById('user-scatter-container');
        
        // First try to clear the existing visualization
        if (state.userScatterComponent) {
          if (state.userScatterComponent.clearVisualization) {
            console.log("Using clearVisualization to reset the user scatter plot");
            state.userScatterComponent.clearVisualization();
            
            // Add empty state message
            const emptyStateDiv = document.createElement('div');
            emptyStateDiv.className = 'flex flex-col items-center justify-center h-full';
            emptyStateDiv.innerHTML = `
              <p class="text-center text-gray-500 mb-4">Upload a sequence to view its UMAP projection</p>
            `;
            userScatterContainer.appendChild(emptyStateDiv);
            
            // Reset any highlighting in the reference scatter plot
            if (state.scatterComponent && state.scatterComponent.clearHighlights) {
              state.scatterComponent.clearHighlights();
            }
            
            // Re-setup cross-highlighting
            setupCrossHighlighting();
            
            // Show success message
            showInfoMessage('All user sequences have been cleared.');
            return;
          }
          
          // If clearVisualization is not available, destroy the component
          if (state.userScatterComponent.destroy) {
            state.userScatterComponent.destroy();
          }
        }
        
        // If we get here, we need to recreate the component from scratch
        
        // Now clear the container
        userScatterContainer.innerHTML = '';
        
        // Recreate empty scatter plot using the initialization function
        state.userScatterComponent = initializeUserScatterPlot(userScatterContainer, [], {
          clearContainer: true
        });
        
        // Reset any highlighting in the reference scatter plot
        if (state.scatterComponent && state.scatterComponent.clearHighlights) {
          state.scatterComponent.clearHighlights();
        }
        
        // Re-setup cross-highlighting (important after recreating components)
        setupCrossHighlighting();
        
        // Show success message
        showInfoMessage('All user sequences have been cleared.');
      });
      
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
                floating: true,
                onStatusChange: (status, jobData) => {
                  console.log(`Job status changed to: ${status}`);
                },
                onComplete: async (jobData) => {
                  console.log("Job completed:", jobData);
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
        
        // Don't show debug stats here as the dashboard's umapDataCache isn't populated yet
        // This would show misleading "0 entries" statistics
        
        // Add a utility function to manually search for accessions in the cache
        window.findSequenceInCache = function(accessionQuery) {
          if (!umapDataCache || !accessionQuery) {
            console.log("Cache or query is empty");
            return null;
          }
          
          const query = accessionQuery.toLowerCase();
          
          // Direct match
          const directMatch = umapDataCache.find(item => 
            item.accession && item.accession.toLowerCase() === query
          );
          
          if (directMatch) {
            console.log("✅ Found direct match:", directMatch);
            return directMatch;
          }
          
          // Partial match
          const partialMatches = umapDataCache.filter(item => 
            item.accession && item.accession.toLowerCase().includes(query)
          );
          
          if (partialMatches.length > 0) {
            console.log(`✅ Found ${partialMatches.length} partial matches:`, 
              partialMatches.slice(0, 5).map(m => m.accession));
            return partialMatches;
          }
          
          // Prefix without NZ_ match
          if (query.startsWith('nz_')) {
            const withoutPrefix = query.substring(3);
            const prefixMatches = umapDataCache.filter(item => 
              item.accession && item.accession.toLowerCase().includes(withoutPrefix)
            );
            
            if (prefixMatches.length > 0) {
              console.log(`✅ Found ${prefixMatches.length} matches without NZ_ prefix:`, 
                prefixMatches.slice(0, 5).map(m => m.accession));
              return prefixMatches;
            }
          }
          
          console.log("❌ No matches found for", accessionQuery);
          return null;
        };
        
        console.log("🔍 DEBUG: Added utility function 'findSequenceInCache()' to manually test accession numbers");
        console.log("  Usage example: findSequenceInCache('NZ_QTIX00000000')");
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

// Function to highlight a sequence in the visualization
function highlightSequence(sequenceId, shouldHighlight = true) {
  // Validate sequenceId
  if (!sequenceId) {
    console.warn("Cannot highlight: sequence ID is undefined");
    return;
  }
  
  console.log(`Highlighting sequence ${sequenceId}: ${shouldHighlight ? 'on' : 'off'}`);
  
  // Get references to the UMAPs
  const referenceUmap = state.scatterComponent?.container || document.getElementById('scatter-container');
  const userUmap = state.userScatterComponent?.container || document.getElementById('user-scatter-container');
  
  // Highlight in Reference UMAP
  if (state.scatterComponent && typeof state.scatterComponent.highlightPoint === 'function') {
    state.scatterComponent.highlightPoint(sequenceId, shouldHighlight);
  } else if (referenceUmap) {
    // Fallback: direct DOM manipulation
    const referencePoint = referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
    if (referencePoint) {
      if (shouldHighlight) {
        referencePoint.setAttribute('r', '6');
        referencePoint.style.stroke = '#FF5722';
        referencePoint.style.strokeWidth = '2px';
        referencePoint.style.fillOpacity = '1';
      } else {
        referencePoint.setAttribute('r', '4');
        referencePoint.style.stroke = 'none';
        referencePoint.style.strokeWidth = '0px';
        referencePoint.style.fillOpacity = '0.7';
      }
    }
  }
  
  // Highlight in User UMAP
  if (state.userScatterComponent && typeof state.userScatterComponent.highlightPoint === 'function') {
    state.userScatterComponent.highlightPoint(sequenceId, shouldHighlight);
  } else if (userUmap) {
    // Fallback: direct DOM manipulation
    const userPoint = userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
    if (userPoint) {
      if (shouldHighlight) {
        userPoint.setAttribute('r', '6');
        userPoint.style.stroke = '#FF5722';
        userPoint.style.strokeWidth = '2px';
        userPoint.style.fillOpacity = '1';
        
        // Also highlight connections related to this sequence
        userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#FF5722';
          line.style.strokeWidth = '2px';
          line.style.opacity = '0.8';
        });
      } else {
        userPoint.setAttribute('r', '4');
        userPoint.style.stroke = 'none';
        userPoint.style.strokeWidth = '0px';
        userPoint.style.fillOpacity = '0.7';
        
        // Reset connections
        userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#999';
          line.style.strokeWidth = '1px';
          line.style.opacity = '0.4';
        });
      }
    }
  }
  
  // Highlight in details panel
  const detailsPanel = document.getElementById('details-panel');
  if (detailsPanel) {
    const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
    if (sequenceItem) {
      if (shouldHighlight) {
        sequenceItem.classList.add('highlighted');
        // Remove auto-scrolling behavior
      } else {
        sequenceItem.classList.remove('highlighted');
      }
    }
  }
}

// Add hover effects to UMAP points
function setupPointHoverEffects() {
  console.log("Setting up point hover effects for UMAPs");
  
  const referenceUmap = state.scatterComponent?.container || document.getElementById('scatter-container');
  const userUmap = state.userScatterComponent?.container || document.getElementById('user-scatter-container');
  const detailsPanel = document.getElementById('details-panel');
  
  // Function to handle point hover
  function handlePointHover(point, isHovering) {
    const sequenceId = point.getAttribute('data-id');
    if (!sequenceId) return;
    
    console.log(`Point hover: ${sequenceId} - ${isHovering ? 'entering' : 'leaving'}`);
    
    // Check if the point is already clicked (permanently highlighted)
    const isClicked = point.classList.contains('clicked') || 
                     (point.style.stroke === 'rgb(255, 87, 34)'); // #FF5722 in RGB
    
    // Don't remove highlighting on mouseleave if it's clicked
    if (!isHovering && isClicked) return;
    
    // Apply temporary visual changes on hover
    if (isHovering) {
      // Don't highlight if the point is already highlighted (clicked)
      if (!isClicked) {
        point.setAttribute('r', '6');
        point.style.stroke = '#2196F3';  // Use blue for hover to differentiate from click highlight
        point.style.strokeWidth = '2px';
        point.style.fillOpacity = '1';
        
        // Find and highlight corresponding item in details panel
        if (detailsPanel) {
          const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
          if (sequenceItem) {
            sequenceItem.classList.add('hover-highlight');
            // Remove auto-scrolling behavior
          }
        }
        
        // For user UMAP, highlight connections too
        if (point.closest('#user-scatter-container')) {
          userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
            line.style.stroke = '#2196F3';
            line.style.strokeWidth = '1.5px';
            line.style.opacity = '0.6';
          });
        }
      }
    } else {
      // Only unhighlight if this point wasn't clicked (permanent highlight)
      if (!isClicked) {
        point.setAttribute('r', '4');
        point.style.stroke = 'none';
        point.style.strokeWidth = '0px';
        point.style.fillOpacity = '0.7';
        
        // Remove hover highlight from the details panel
        if (detailsPanel) {
          const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
          if (sequenceItem) {
            sequenceItem.classList.remove('hover-highlight');
          }
        }
        
        // For user UMAP, reset connections
        if (point.closest('#user-scatter-container')) {
          userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
            line.style.stroke = '#999';
            line.style.strokeWidth = '1px';
            line.style.opacity = '0.4';
          });
        }
      }
    }
  }
  
  // Helper function to add hover events to points
  function addHoverEvents(container) {
    if (!container) return;
    
    const points = container.querySelectorAll('circle[data-id]');
    console.log(`Adding hover events to ${points.length} points in ${container.id}`);
    
    points.forEach(point => {
      // Remove existing listeners to prevent duplicates
      point.removeEventListener('mouseenter', point._mouseEnterHandler);
      point.removeEventListener('mouseleave', point._mouseLeaveHandler);
      
      // Create and store handlers
      point._mouseEnterHandler = () => handlePointHover(point, true);
      point._mouseLeaveHandler = () => handlePointHover(point, false);
      
      // Add new listeners
      point.addEventListener('mouseenter', point._mouseEnterHandler);
      point.addEventListener('mouseleave', point._mouseLeaveHandler);
    });
  }
  
  // Add hover events to points in both UMAPs
  addHoverEvents(referenceUmap);
  addHoverEvents(userUmap);
  
  // Setup hover for detail panel items
  if (detailsPanel) {
    const sequenceItems = detailsPanel.querySelectorAll('.similar-sequence-item[data-id]');
    sequenceItems.forEach(item => {
      const sequenceId = item.dataset.id;
      
      // Remove existing listeners to prevent duplicates
      item.removeEventListener('mouseenter', item._mouseEnterHandler);
      item.removeEventListener('mouseleave', item._mouseLeaveHandler);
      
      // Create stored handlers
      item._mouseEnterHandler = () => {
        // Only apply hover effect if not already highlighted
        if (!item.classList.contains('highlighted')) {
          item.classList.add('hover-highlight');
          
          // Highlight points in both UMAPs
          const referencePoint = referenceUmap?.querySelector(`circle[data-id="${sequenceId}"]`);
          if (referencePoint) handlePointHover(referencePoint, true);
          
          const userPoint = userUmap?.querySelector(`circle[data-id="${sequenceId}"]`);
          if (userPoint) handlePointHover(userPoint, true);
        }
      };
      
      item._mouseLeaveHandler = () => {
        // Only remove hover effect if not permanently highlighted
        if (!item.classList.contains('highlighted')) {
          item.classList.remove('hover-highlight');
          
          // Remove highlighting from points
          const referencePoint = referenceUmap?.querySelector(`circle[data-id="${sequenceId}"]`);
          if (referencePoint) handlePointHover(referencePoint, false);
          
          const userPoint = userUmap?.querySelector(`circle[data-id="${sequenceId}"]`);
          if (userPoint) handlePointHover(userPoint, false);
        }
      };
      
      // Add new listeners
      item.addEventListener('mouseenter', item._mouseEnterHandler);
      item.addEventListener('mouseleave', item._mouseLeaveHandler);
    });
  }
  
  // Add style for hover highlight if not already present
  if (!document.getElementById('hover-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'hover-highlight-style';
    style.textContent = `
      .similar-sequence-item.hover-highlight {
        background-color: #e3f2fd;
        border-left: 4px solid #2196F3;
      }
      
      .similar-sequence-item.highlighted {
        background-color: #fff3e0;
        border-left: 4px solid #FF5722;
      }
      
      .similar-sequence-item.hover-highlight.highlighted {
        background-color: #fff8e1;
        border-left: 4px solid #FF9800;
      }
    `;
    document.head.appendChild(style);
  }
}

// Setup event listeners to initialize and refresh hover effects
document.addEventListener('DOMContentLoaded', () => {
  // Set up hover effects after visualizations are loaded
  window.addEventListener('visualizationsLoaded', setupPointHoverEffects);
  
  // Also run setup when user sequences are loaded
  if (state.jobTracker) {
    state.jobTracker.addEventListener('complete', setupPointHoverEffects);
  }
});

// Call setupPointHoverEffects after any visualization update
const originalInitializeUserScatterPlot = initializeUserScatterPlot;
initializeUserScatterPlot = function() {
  const result = originalInitializeUserScatterPlot.apply(this, arguments);
  // Allow a short delay for rendering to complete
  setTimeout(setupPointHoverEffects, 500);
  return result;
};

// Ensure hover effects are setup after the similar sequences are added
const originalUpdateDetailsWithSimilarSequences = updateDetailsWithSimilarSequences;
updateDetailsWithSimilarSequences = function() {
  const result = originalUpdateDetailsWithSimilarSequences.apply(this, arguments);
  // Allow a short delay for rendering to complete
  setTimeout(setupPointHoverEffects, 500);
  return result;
};

// Function to update the details panel with similar sequences
function updateDetailsWithSimilarSequences(userSequence, similarSequences) {
  const detailsPanel = document.getElementById('details-panel');
  if (!detailsPanel) return;
  
  console.log("Updating details panel with similar sequences:", similarSequences);
  
  // Clear current content
  detailsPanel.innerHTML = '';
  
  // Create header for user sequence
  const userHeader = document.createElement('div');
  userHeader.className = 'details-header';
  userHeader.innerHTML = `<h3>Your Uploaded Sequence</h3>
    <div class="sequence-actions">
      <button id="clear-highlights" class="btn btn-sm btn-outline-secondary">Clear Highlights</button>
    </div>`;
  detailsPanel.appendChild(userHeader);
  
  // Add user sequence info
  const userInfo = document.createElement('div');
  userInfo.className = 'sequence-info user-sequence';
  userInfo.innerHTML = `
    <div><strong>ID:</strong> ${userSequence.id || 'Unknown'}</div>
    <div><strong>Label:</strong> ${userSequence.label || 'Your Sequence'}</div>
    ${userSequence.description ? `<div><strong>Description:</strong> ${userSequence.description}</div>` : ''}
  `;
  detailsPanel.appendChild(userInfo);
  
  // Add similar sequences section
  const similarHeader = document.createElement('div');
  similarHeader.className = 'details-header';
  similarHeader.innerHTML = '<h3>Similar Sequences</h3>';
  detailsPanel.appendChild(similarHeader);
  
  // Check if we have similar sequences
  if (!similarSequences || similarSequences.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'No similar sequences found.';
    detailsPanel.appendChild(noResults);
    return;
  }
  
  // Filter out sequences without IDs
  const validSequences = similarSequences.filter(seq => seq.id);
  
  // Sort by similarity (highest first)
  const sortedSequences = [...validSequences].sort((a, b) => 
    (b.similarity || 0) - (a.similarity || 0)
  );
  
  // Create list of similar sequences
  const sequencesList = document.createElement('div');
  sequencesList.className = 'similar-sequences-list';
  
  sortedSequences.forEach(seq => {
    const similarity = seq.similarity || 0;
    const similarityClass = getSimilarityColor(similarity);
    
    // Ensure we have a proper label and sequence identifiers
    const sequenceLabel = seq.label || seq.accession || seq.id || 'Unknown sequence';
    
    // Get metadata for display
    const metadata = seq.metadata || {};
    const country = metadata.country || metadata.first_country || 'Unknown';
    const year = metadata.first_year || (metadata.years && metadata.years.length > 0 ? metadata.years[0] : 'Unknown');
    const host = metadata.host || 'Unknown';
    const distance = seq.distance !== undefined ? seq.distance.toFixed(3) : 'Unknown';
    
    const seqItem = document.createElement('div');
    seqItem.className = `similar-sequence-item similarity-${similarityClass}`;
    seqItem.dataset.id = seq.id;
    
    // Create the basic content with similarity score
    seqItem.innerHTML = `
      <div class="sequence-content">
        <div class="sequence-name">${sequenceLabel}</div>
        <div class="sequence-metadata">
          <div class="metadata-row"><strong>Similarity:</strong> ${(similarity * 100).toFixed(1)}%</div>
          <div class="metadata-row"><strong>Distance:</strong> ${distance}</div>
          <div class="metadata-row"><strong>Country:</strong> ${country}</div>
          <div class="metadata-row"><strong>Year:</strong> ${year}</div>
          <div class="metadata-row"><strong>Host:</strong> ${host}</div>
        </div>
      </div>
      <div class="similarity-badge">${(similarity * 100).toFixed(0)}%</div>
    `;
    
    // Add click handler to highlight this sequence
    seqItem.addEventListener('click', function() {
      const isHighlighted = this.classList.contains('highlighted');
      
      // Remove highlight class from all sequences
      document.querySelectorAll('.similar-sequence-item.highlighted').forEach(item => {
        if (item !== this) {
          item.classList.remove('highlighted');
          highlightSequence(item.dataset.id, false);
        }
      });
      
      if (!isHighlighted) {
        this.classList.add('highlighted');
        highlightSequence(seq.id, true);
      } else {
        this.classList.remove('highlighted');
        highlightSequence(seq.id, false);
      }
    });
    
    sequencesList.appendChild(seqItem);
  });
  
  detailsPanel.appendChild(sequencesList);
  
  // Add event listener to the clear highlights button
  document.getElementById('clear-highlights').addEventListener('click', clearAllHighlights);
  
  // Add styles for the similar sequences list
  const style = document.createElement('style');
  style.textContent = `
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .sequence-actions {
      display: flex;
      gap: 8px;
    }
    .similar-sequences-list {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
    }
    .similar-sequence-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 5px;
      background-color: #f5f5f5;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .similar-sequence-item:hover {
      background-color: #e9e9e9;
    }
    .similar-sequence-item.highlighted {
      background-color: #fff3e0;
      border-left: 4px solid #FF5722;
    }
    .similarity-high {
      border-left: 4px solid #4CAF50;
    }
    .similarity-medium {
      border-left: 4px solid #FFC107;
    }
    .similarity-low {
      border-left: 4px solid #F44336;
    }
    .user-sequence {
      background-color: #e3f2fd;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .no-results {
      padding: 15px;
      text-align: center;
      color: #757575;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
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

function getSimilarityColor(similarity) {
  if (similarity >= 0.9) return 'high';
  if (similarity >= 0.7) return 'medium';
  return 'low';
}

/**
 * Update the UMAP visualization with new sequence data
 * @param {Array} sequences - Array of sequences to visualize
 */
function updateUmapVisualization(sequences) {
  console.log(`Updating UMAP visualization with ${sequences.length} sequences`);
  
  try {
    // Get the container
    const userScatterContainer = document.getElementById('user-scatter-container');
    if (!userScatterContainer) {
      console.error("User scatter container not found");
      return;
    }
    
    // Debug - Count sequences by type
    const userSeqCount = sequences.filter(d => d.isUserSequence).length;
    const similarSeqCount = sequences.filter(d => d.matchesUserSequence).length;
    console.log(`Visualizing ${userSeqCount} user sequences and ${similarSeqCount} similar sequences`);
    
    // Log the coordinate ranges to help with visualization scaling
    const allX = sequences.map(d => d.x);
    const allY = sequences.map(d => d.y);
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMin = Math.min(...allY), yMax = Math.max(...allY);
    console.log(`X coordinate range: ${xMin} to ${xMax}`);
    console.log(`Y coordinate range: ${yMin} to ${yMax}`);
    
    // Use emergency visualization with the correct coordinates
    console.log(`Creating visualization with ${sequences.length} points using actual coordinates`);
    createEmergencyVisualization(userScatterContainer, sequences);
    
    // Setup hover effects
    setTimeout(setupPointHoverEffects, 500);
    
    console.log("UMAP visualization updated successfully");
  } catch (error) {
    console.error("Error updating UMAP visualization:", error);
    showNotification("Error updating visualization", "error");
  }
}

// Function to create a direct visualization as emergency fallback
function createEmergencyVisualization(container, data) {
  console.log("🔍 DEBUG: Creating emergency visualization with data:", data);
  
  // Ensure all data points have the minimal required properties
  data = data.map(d => {
    // Make a copy to avoid modifying the original
    const point = {...d};
    
    // Ensure ID exists
    if (!point.id) {
      point.id = `seq-${Math.random().toString(36).substring(2, 10)}`;
      console.log(`Generated ID for point: ${point.id}`);
    }
    
    // Fix coordinates if needed
    if (isNaN(point.x) || point.x === undefined) point.x = 0;
    if (isNaN(point.y) || point.y === undefined) point.y = 0;
    
    return point;
  });

  // Count the actual types of sequences we have
  const userSeqCount = data.filter(d => d.isUserSequence).length;
  const similarSeqCount = data.filter(d => d.matchesUserSequence).length;
  const otherSeqCount = data.length - userSeqCount - similarSeqCount;
  
  console.log("EMERGENCY VISUALIZATION - SEQUENCE COUNTS:");
  console.log(`User sequences: ${userSeqCount}`);
  console.log(`Similar sequences: ${similarSeqCount}`);
  console.log(`Other sequences: ${otherSeqCount}`);
  console.log(`Total sequences: ${data.length}`);
  
  // Print all sequences with their coordinates and types
  console.log("🔍 DEBUG: All sequences with coordinates and types:");
  data.forEach((seq, i) => {
    console.log(`Sequence ${i}: ID=${seq.id || 'undefined'}, x=${seq.x}, y=${seq.y}, isUser=${seq.isUserSequence}, matchesUser=${seq.matchesUserSequence}, source=${seq.coordinateSource || 'unknown'}`);
  });

  // Clear the container
  container.innerHTML = '';
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'viz-tooltip';
  tooltip.style.cssText = 'position: absolute; display: none; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none; z-index: 1000;';
  container.appendChild(tooltip);
  
  // Create SVG element with fixed dimensions to match the mockup
  const margin = { top: 20, right: 20, bottom: 50, left: 40 }; // Increased bottom margin
  const svgWidth = 565;
  const svgHeight = 350; // Fixed height
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .attr("viewBox", `0,0,${svgWidth},${svgHeight}`)
    .style("max-width", "100%")
    .style("height", "350px") // Fixed height
    .style("display", "block")
    .style("border", "1px solid #eee");
  
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Calculate domain for scales from the data
  // Find min and max values for x and y
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  
  let xMin = d3.min(xValues), xMax = d3.max(xValues);
  let yMin = d3.min(yValues), yMax = d3.max(yValues);
  
  // Add some padding to the domains
  const xPadding = Math.max(1, (xMax - xMin) * 0.2);
  const yPadding = Math.max(1, (yMax - yMin) * 0.2);
  
  xMin -= xPadding;
  xMax += xPadding;
  yMin -= yPadding;
  yMax += yPadding;
  
  console.log(`Visualization domain: X(${xMin} to ${xMax}), Y(${yMin} to ${yMax})`);
  
  // Set up scales with actual data domain
  const xScale = d3.scaleLinear()
    .domain([xMin, xMax])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0]);
  
  // Add axes
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));
  
  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
  
  // Add axis labels
  g.append("text")
    .attr("class", "x-axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .text("UMAP Dimension 1");
  
  g.append("text")
    .attr("class", "y-axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .text("UMAP Dimension 2");
  
  // Add grid lines
  g.append("g")
    .attr("class", "grid-lines")
    .selectAll("line.grid-line")
    .data(xScale.ticks(10))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d))
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "#e0e0e0")
    .style("stroke-width", 0.5);
  
  g.append("g")
    .attr("class", "grid-lines")
    .selectAll("line.grid-line")
    .data(yScale.ticks(10))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", d => yScale(d))
    .attr("y2", d => yScale(d))
    .style("stroke", "#e0e0e0")
    .style("stroke-width", 0.5);
  
  // Function to get color for point
  const getPointColor = getStandardPointColor;
  
  // Function to get radius for point
  const getPointRadius = getStandardPointRadius;

  // Create links between user sequences and their similar sequences
  const links = [];
  
  // Find user sequence(s)
  const userSequences = data.filter(d => d.isUserSequence);
  console.log(`🔍 DEBUG: Found ${userSequences.length} user sequences for links`);
  
  // Find similar sequences
  const similarSequences = data.filter(d => d.matchesUserSequence === true);
  console.log(`🔍 DEBUG: Found ${similarSequences.length} similar sequences for links`);
  
  if (userSequences.length > 0 && similarSequences.length > 0) {
    // For each user sequence, create links to all similar sequences
    userSequences.forEach(userSeq => {
      similarSequences.forEach(similarSeq => {
        links.push({
          source: userSeq,
          target: similarSeq,
          similarity: similarSeq.similarity || 0
        });
      });
    });
    
    console.log(`🔍 DEBUG: Created ${links.length} links between sequences`);
  } else {
    console.warn("No links created: missing user sequence or similar sequences");
  }
  
  // Add links
  g.selectAll("line.similarity-link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "similarity-link")
    .attr("x1", d => xScale(d.source.x))
    .attr("y1", d => yScale(d.source.y))
    .attr("x2", d => xScale(d.target.x))
    .attr("y2", d => yScale(d.target.y))
    .attr("data-source", d => d.source.id)
    .attr("data-target", d => d.target.id)
    .style("stroke", "#999") // Use grey for all similarity lines
    .style("stroke-width", 1)
    .style("stroke-opacity", 0.4);
  
  // Format tooltip content function
  function formatTooltip(data) {
    if (!data || !data.id) {
      console.warn('Invalid data for tooltip', data);
      return '<div class="tooltip-content">No data available</div>';
    }

    let tooltipContent = `
      <div class="tooltip-content">
        <div class="tooltip-header">`;
        
    // Customize header based on type
    if (data.isUserSequence) {
      tooltipContent += `
        <div style="color: #FF5722; font-weight: bold; margin-bottom: 3px;">User Sequence</div>
        <strong>${data.label || data.id}</strong>`;
    } else {
      tooltipContent += `<strong>${data.id}</strong>`;
    }
    
    tooltipContent += `
        </div>
        <div class="tooltip-body">`;
        
    // Add sequence type information at the top if it's a similar sequence
    if (data.matchesUserSequence && !data.isUserSequence) {
      tooltipContent += `<div class="tooltip-item" style="color: #3F51B5; font-weight: bold;">Similar Sequence</div>`;
    }
        
    // Basic information
    if (data.similarity !== undefined) {
      tooltipContent += `<div class="tooltip-item">Similarity: ${(data.similarity * 100).toFixed(1)}%</div>`;
    }
    
    // For user sequences, add upload info if available
    if (data.isUserSequence) {
      // Add ID information
      tooltipContent += `<div class="tooltip-item">ID: ${data.id}</div>`;
      
      // Add coordinates with precision
      const x = data.x !== undefined ? data.x : (data.X !== undefined ? data.X : null);
      const y = data.y !== undefined ? data.y : (data.Y !== undefined ? data.Y : null);
      
      if (x !== null && y !== null) {
        tooltipContent += `<div class="tooltip-item">Coordinates: [${x.toFixed(4)}, ${y.toFixed(4)}]</div>`;
      }
      
      if (data.uploadTime) {
        const uploadDate = new Date(data.uploadTime);
        tooltipContent += `<div class="tooltip-item">Uploaded: ${uploadDate.toLocaleString()}</div>`;
      }
      
      if (data.sequenceLength) {
        tooltipContent += `<div class="tooltip-item">Length: ${data.sequenceLength.toLocaleString()} bp</div>`;
      }
    }
    
    // Add separator line if we have metadata to display
    const hasMetadata = data.accession || data.country || data.year || data.host || data.organism || data.lineage;
    const hasDetailedMetadata = data.metadata && (
      data.metadata.accessions || 
      data.metadata.country || 
      data.metadata.first_year || 
      data.metadata.host || 
      data.metadata.organism ||
      data.metadata.lineage
    );
    
    if (hasMetadata || hasDetailedMetadata) {
      tooltipContent += `<hr class="tooltip-separator">`;
    }
    
    // Direct metadata properties
    if (data.accession) {
      tooltipContent += `<div class="tooltip-item">Accession: ${data.accession}</div>`;
    }
    
    if (data.country) {
      tooltipContent += `<div class="tooltip-item">Country: ${data.country}</div>`;
    }
    
    if (data.year) {
      tooltipContent += `<div class="tooltip-item">Year: ${data.year}</div>`;
    }
    
    if (data.host) {
      tooltipContent += `<div class="tooltip-item">Host: ${data.host}</div>`;
    }
    
    if (data.organism) {
      tooltipContent += `<div class="tooltip-item">Organism: ${data.organism}</div>`;
    }
    
    if (data.lineage) {
      tooltipContent += `<div class="tooltip-item">Lineage: ${data.lineage}</div>`;
    }
    
    // Check for nested metadata
    if (data.metadata) {
      // Accessions from metadata
      if (data.metadata.accessions && data.metadata.accessions.length > 0 && !data.accession) {
        tooltipContent += `<div class="tooltip-item">Accession: ${data.metadata.accessions[0]}</div>`;
      }
      
      // Country from metadata
      if (data.metadata.country && !data.country) {
        tooltipContent += `<div class="tooltip-item">Country: ${data.metadata.country}</div>`;
      }
      
      // Year from metadata
      if (data.metadata.first_year && !data.year) {
        tooltipContent += `<div class="tooltip-item">Year: ${data.metadata.first_year}</div>`;
      }
      
      // Host from metadata
      if (data.metadata.host && !data.host) {
        tooltipContent += `<div class="tooltip-item">Host: ${data.metadata.host}</div>`;
      }
      
      // Organism from metadata
      if (data.metadata.organism && !data.organism) {
        tooltipContent += `<div class="tooltip-item">Organism: ${data.metadata.organism}</div>`;
      }
      
      // Lineage from metadata
      if (data.metadata.lineage && !data.lineage) {
        tooltipContent += `<div class="tooltip-item">Lineage: ${data.metadata.lineage}</div>`;
      }
      
      // Additional metadata fields that might be useful
      if (data.metadata.clade) {
        tooltipContent += `<div class="tooltip-item">Clade: ${data.metadata.clade}</div>`;
      }
      
      if (data.metadata.region) {
        tooltipContent += `<div class="tooltip-item">Region: ${data.metadata.region}</div>`;
      }
    }
    
    tooltipContent += `
        </div>
      </div>
    `;
    
    return tooltipContent;
  }
  
  // Add points (circles) with enhanced hover effects
  g.selectAll("circle.point")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => xScale(d.x))
    .attr("cy", d => yScale(d.y))
    .attr("r", getPointRadius)
    .attr("data-id", d => d.id)
    .style("fill", getPointColor)
    .style("fill-opacity", 0.7)
    .style("stroke", "none")
    .on("mouseenter", function(event, d) {
      const point = d3.select(this);
      const id = point.attr("data-id");
      console.log("Emergency viz point hover:", id, d);
      
      // Show tooltip with safety checks
      tooltip.style.display = 'block';
      tooltip.innerHTML = formatTooltip(d);
      
      const tooltipWidth = tooltip.offsetWidth || 150;
      const tooltipHeight = tooltip.offsetHeight || 80;
      
      // Position tooltip relative to mouse and container
      const containerRect = container.getBoundingClientRect();
      const mouseX = event.clientX - containerRect.left;
      const mouseY = event.clientY - containerRect.top;
      
      // Position above the point with offset
      tooltip.style.left = (mouseX - tooltipWidth / 2) + 'px';
      tooltip.style.top = (mouseY - tooltipHeight - 10) + 'px';
      
      // Only highlight if not already highlighted
      if (point.style("stroke") !== "#FF5722") {
        point.attr("r", getPointRadius(d) + 2)
          .style("stroke", "#2196F3")
          .style("stroke-width", "2px")
          .style("fill-opacity", 1);
        
        // Highlight connections
        if (id) {
          d3.selectAll(`line[data-source="${id}"], line[data-target="${id}"]`)
            .style("stroke", "#999") // Use grey for consistency
            .style("stroke-width", "1.5px")
            .style("opacity", "0.8");
        }
      }
    })
    .on("mousemove", function(event) {
      // Update tooltip position on mouse move
      const containerRect = container.getBoundingClientRect();
      const mouseX = event.clientX - containerRect.left;
      const mouseY = event.clientY - containerRect.top;
      
      const tooltipWidth = tooltip.offsetWidth || 150;
      const tooltipHeight = tooltip.offsetHeight || 80;
      
      tooltip.style.left = (mouseX - tooltipWidth / 2) + 'px';
      tooltip.style.top = (mouseY - tooltipHeight - 10) + 'px';
    })
    .on("mouseleave", function() {
      const point = d3.select(this);
      const id = point.attr("data-id");
      
      // Hide tooltip
      tooltip.style.display = 'none';
      
      // Only unhighlight if not permanently highlighted
      if (point.style("stroke") !== "#FF5722") {
        const d = point.datum();
        point.attr("r", getPointRadius(d))
          .style("stroke", "none")
          .style("stroke-width", "0px")
          .style("fill-opacity", 0.7);
          
        // Unhighlight connections
        if (id) {
          d3.selectAll(`line[data-source="${id}"], line[data-target="${id}"]`)
            .style("stroke", "#999")
            .style("stroke-width", "1px")
            .style("opacity", "0.4");
        }
      }
    })
    .on("click", function(event, d) {
      console.log("Emergency viz point clicked:", d);
      
      // Clear existing highlights
      d3.selectAll("circle.point").each(function() {
        const p = d3.select(this);
        const isThisPoint = p.attr("data-id") === d.id;
        
        if (!isThisPoint) {
          const pd = p.datum();
          p.attr("r", getPointRadius(pd))
            .style("stroke", "none")
            .style("stroke-width", "0px")
            .style("fill-opacity", 0.7);
        }
      });
      
      // Toggle highlight for this point
      const point = d3.select(this);
      const isHighlighted = point.style("stroke") === "rgb(255, 87, 34)"; // #FF5722
      
      if (!isHighlighted) {
        point.attr("r", getPointRadius(d) + 2)
          .style("stroke", "#FF5722")
          .style("stroke-width", "2px")
          .style("fill-opacity", 1);
          
        // Highlight connections
        if (d.id) {
          d3.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`)
            .style("stroke", "#FF5722")
            .style("stroke-width", "2px")
            .style("opacity", "0.8");
          
          // Call global highlight function
          highlightSequence(d.id, true);
          
          // Also update details panel with this sequence and its similar sequences
          if (d.isUserSequence) {
            const similarSequences = data.filter(seq => seq.matchesUserSequence === d.id);
            updateDetailsWithSimilarSequences(d, similarSequences);
          }
        }
      } else {
        point.attr("r", getPointRadius(d))
          .style("stroke", "none")
          .style("stroke-width", "0px")
          .style("fill-opacity", 0.7);
          
        // Reset connections
        if (d.id) {
          d3.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`)
            .style("stroke", "#999")
            .style("stroke-width", "1px")
            .style("opacity", "0.4");
          
          // Call global highlight function
          highlightSequence(d.id, false);
        }
      }
    });
  
  // Add labels for the points for better identification
  g.selectAll("text.point-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "point-label")
    .attr("x", d => xScale(d.x))
    .attr("y", d => yScale(d.y) - 8) // Position above the point
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("pointer-events", "none") // Don't interfere with mouse events
    .text(d => {
      if (d.isUserSequence) return "User Seq";
      // Show similarity percentage for similar sequences
      return d.similarity ? `${(d.similarity * 100).toFixed(0)}%` : "";
    })
    .style("fill", d => d.isUserSequence ? "#FF5722" : "#3F51B5")
    .style("font-weight", "bold") // Make labels more visible
    .style("stroke", "white")  // Add white outline for better visibility
    .style("stroke-width", "0.5px")
    .style("paint-order", "stroke");
  
  // Create legend group position (commented out as we'll use the bottom legend instead)
  // svg.append("g")
  //   .attr("class", "legend-group")
  //   .attr("transform", "translate(445, 20)");

  // Add the SVG to the container
  container.appendChild(svg.node());
  
  // Create info container below the chart with improved height and styling
  const infoContainer = document.createElement('div');
  infoContainer.className = 'umap-info-container';
  // No need for inline styles since we have a CSS class with the same styles
  
  // Create diagnostic info with improved styling
  const diagnosticInfo = document.createElement('div');
  diagnosticInfo.className = 'sequence-stats';
  diagnosticInfo.style.cssText = `
    flex: 1;
    padding-right: 10px;
    font-size: 12px;
  `;
  diagnosticInfo.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Sequence Stats</div>
    <div style="margin-bottom: 2px;">Total sequences: <strong>${data.length}</strong></div>
    <div style="margin-bottom: 2px;">User sequences: <strong>${userSeqCount}</strong></div>
    <div style="margin-bottom: 2px;">Similar sequences: <strong>${similarSeqCount}</strong></div>
  `;
  
  // Create legend with improved styling
  const infoLegend = createLegend(null, [
    { color: '#FF5722', label: 'User Sequence' },
    { color: '#3F51B5', label: 'Similar Sequence' },
    { color: '#999', label: 'Similarity Line' }
  ]);
  infoLegend.style.cssText = `
    flex: 1;
    padding-left: 5px;
    font-size: 12px;
  `;
  
  // Add the info sections to the container
  infoContainer.appendChild(diagnosticInfo);
  infoContainer.appendChild(infoLegend);
  
  // Add the info container to the main container
  container.appendChild(infoContainer);
  
  // Update the details panel with first user sequence data
  const userSequence = data.find(d => d.isUserSequence);
  if (userSequence) {
    const similarSequences = data.filter(d => d.matchesUserSequence === userSequence.id);
    if (similarSequences.length > 0) {
      // Ensure the update happens after a slight delay to let the DOM update
      setTimeout(() => {
        updateDetailsWithSimilarSequences(userSequence, similarSequences);
      }, 100);
    }
  }
  
  // Return an object with a minimal API to maintain compatibility
  return {
    container: container,
    data: data,
    highlightPoint: function(id, highlight) {
      const point = g.select(`circle[data-id="${id}"]`);
      
      if (!point.empty()) {
        // Use the new utility function instead of manual styling
        setPointHighlight(point, highlight);
        
        // Highlight connections
        d3.selectAll(`line[data-source="${id}"], line[data-target="${id}"]`)
          .style("stroke", highlight ? "#FF5722" : "#999")
          .style("stroke-width", highlight ? "2px" : "1px")
          .style("opacity", highlight ? "0.8" : "0.4");
      }
    },
    updateScatterPlot: function(newData) {
      console.log("Emergency visualization doesn't support dynamic updates");
      // If needed, could re-create visualization here
      createEmergencyVisualization(container, newData);
    }
  };
}

/**
 * Show a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - The message type ('success', 'error', 'info', 'warning')
 */
function showNotification(message, type = 'info') {
  // Reuse our existing message system
  showMessage(message, type, 5000);
}

// Add a function to directly search for accession numbers from the similar sequences
async function findExactMatchesInCache(accessionNumbers) {
  if (!umapDataCache || umapDataCache.length === 0) {
    console.error("❌ FIND: UMAP data cache is empty");
    return [];
  }
  
  if (!accessionNumbers || !Array.isArray(accessionNumbers) || accessionNumbers.length === 0) {
    console.error("❌ FIND: Invalid or empty accession numbers array");
    return [];
  }
  
  console.log(`🔍 FIND: Searching for ${accessionNumbers.length} accession numbers in cache of ${umapDataCache.length} items`);
  console.log("🔍 FIND: Accession numbers to search for:", accessionNumbers);
  
  // Build a fast lookup cache map if not already built
  if (!window.umapAccessionMap || window.umapAccessionMap.size === 0) {
    console.log("🔍 FIND: Building accession lookup map for faster searches");
    window.umapAccessionMap = new Map();
    
    let mapsStats = {
      totalProcessed: 0,
      withAccession: 0,
      withoutAccession: 0,
      addedToMap: 0,
      addedBaseNames: 0,
      addedWithoutPrefix: 0
    };
    
    umapDataCache.forEach(item => {
      mapsStats.totalProcessed++;
      
      if (!item || !item.accession) {
        mapsStats.withoutAccession++;
        return;
      }
      
      mapsStats.withAccession++;
      const accession = item.accession;
      
      // Store with lowercase key for case-insensitive lookup
      window.umapAccessionMap.set(accession.toLowerCase(), item);
      mapsStats.addedToMap++;
      
      // Also store without version number
      const baseName = accession.split('.')[0].toLowerCase();
      if (!window.umapAccessionMap.has(baseName)) {
        window.umapAccessionMap.set(baseName, item);
        mapsStats.addedBaseNames++;
      }
      
      // For NZ_ prefixed accessions, also store without the prefix
      if (accession.startsWith('NZ_')) {
        const withoutPrefix = accession.substring(3).toLowerCase();
        if (!window.umapAccessionMap.has(withoutPrefix)) {
          window.umapAccessionMap.set(withoutPrefix, item);
          mapsStats.addedWithoutPrefix++;
        }
      }
    });
    
    console.log(`🔍 FIND: Built accession map with ${window.umapAccessionMap.size} entries`);
    console.log("🔍 FIND: Map building statistics:", mapsStats);
    
    // Output sample of keys in the map for debugging
    const mapKeys = Array.from(window.umapAccessionMap.keys()).slice(0, 10);
    console.log("🔍 FIND: Sample of keys in the accession map:", mapKeys);
  }
  
  // Find items matching the accession numbers
  const foundItems = [];
  const notFoundAccessions = [];
  const searchDetails = [];
  
  for (const acc of accessionNumbers) {
    if (!acc) continue;
    
    // Try different variations
    const accLower = acc.toLowerCase();
    const accBase = acc.split('.')[0].toLowerCase();
    const accWithoutPrefix = acc.startsWith('NZ_') ? acc.substring(3).toLowerCase() : null;
    
    const searchDetail = {
      original: acc,
      lowercase: accLower,
      basename: accBase,
      withoutPrefix: accWithoutPrefix,
      result: "not found"
    };
    
    let match = null;
    
    // Try exact match (case-insensitive)
    if (window.umapAccessionMap.has(accLower)) {
      match = window.umapAccessionMap.get(accLower);
      searchDetail.result = "exact match";
    } 
    // Try base name match (without version)
    else if (window.umapAccessionMap.has(accBase)) {
      match = window.umapAccessionMap.get(accBase);
      searchDetail.result = "base name match";
    }
    // Try without prefix
    else if (accWithoutPrefix && window.umapAccessionMap.has(accWithoutPrefix)) {
      match = window.umapAccessionMap.get(accWithoutPrefix);
      searchDetail.result = "without prefix match";
    }
    
    if (match) {
      foundItems.push({
        query: acc,
        match: match.accession,
        x: match.x,
        y: match.y,
        id: match.id
      });
      searchDetail.foundMatch = match.accession;
    } else {
      notFoundAccessions.push(acc);
      
      // Try a manual search for debugging
      const allItems = umapDataCache.filter(item => 
        item.accession && (
          item.accession.toLowerCase() === accLower ||
          item.accession.toLowerCase().includes(accBase) ||
          (accWithoutPrefix && item.accession.toLowerCase().includes(accWithoutPrefix))
        )
      );
      
      if (allItems.length > 0) {
        searchDetail.manualMatches = allItems.slice(0, 3).map(i => i.accession);
        searchDetail.result = "Found manually but missed in map lookup";
        console.log(`🔍 FIND: Manual search found ${allItems.length} matches for "${acc}" but map lookup failed`);
      }
    }
    
    searchDetails.push(searchDetail);
  }
  
  console.log(`🔍 FIND: Found ${foundItems.length} matches out of ${accessionNumbers.length} accessions`);
  console.log("🔍 FIND: Detailed search results:", searchDetails);
  
  if (notFoundAccessions.length > 0 && notFoundAccessions.length <= 5) {
    console.log(`🔍 FIND: Could not find matches for: ${notFoundAccessions.join(', ')}`);
  } else if (notFoundAccessions.length > 5) {
    console.log(`🔍 FIND: Could not find matches for ${notFoundAccessions.length} accessions`);
  }
  
  return foundItems;
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
 * Get standard color for different point types
 * @param {Object} point - Data point with type information
 * @returns {string} - Color code
 */
function getStandardPointColor(point) {
  if (!point) return '#999'; // Default gray
  
  if (point.isUserSequence) {
    return '#FF5722'; // User Sequence - orange
  } else if (point.matchesUserSequence) {
    return '#3F51B5'; // Similar Sequence - blue
  } else if (point.isHighlighted) {
    return '#FFC107'; // Highlighted point - amber
  }
  
  // Default color based on country if available
  if (point.country) {
    // Simple hash function to get consistent colors by country
    const hash = point.country.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Use a subset of D3 category colors
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    return colors[hash % colors.length];
  }
  
  return '#999'; // Default gray
}

/**
 * Get standard radius for different point types
 * @param {Object} point - Data point with type information
 * @returns {number} - Radius in pixels
 */
function getStandardPointRadius(point) {
  if (!point) return 4; // Default size
  
  if (point.isUserSequence) {
    return 7; // User sequence - larger
  } else if (point.matchesUserSequence) {
    // Size based on similarity if available
    if (point.similarity !== undefined) {
      // Scale from 4 to 6 based on similarity (0.0 to 1.0)
      return 4 + (point.similarity * 2);
    }
    return 5; // Default for similar sequences
  } else if (point.isHighlighted) {
    return 6; // Highlighted point
  }
  
  return 4; // Default size
}

/**
 * Highlight or unhighlight a point in the visualization
 * @param {Object} point - D3 selection for the point
 * @param {boolean} highlight - Whether to highlight or unhighlight
 * @param {string} color - Color to use for highlighting (default #FF5722)
 */
function setPointHighlight(point, highlight, color = '#FF5722') {
  if (!point || point.empty()) return;
  
  const d = point.datum();
  
  if (highlight) {
    // Store original values if not already stored
    if (!d._originalRadius) {
      d._originalRadius = getStandardPointRadius(d);
      d._originalOpacity = point.style('fill-opacity') || 0.7;
    }
    
    point.attr("r", d._originalRadius + 2)
      .style("stroke", color)
      .style("stroke-width", "2px")
      .style("fill-opacity", 1);
  } else {
    // Restore original values or use defaults
    point.attr("r", d._originalRadius || getStandardPointRadius(d))
      .style("stroke", "none")
      .style("stroke-width", "0px")
      .style("fill-opacity", d._originalOpacity || 0.7);
    
    // Clean up stored values
    delete d._originalRadius;
    delete d._originalOpacity;
  }
}

// Add global CSS to improve visualization containers
document.head.insertAdjacentHTML('beforeend', `
  <style>
    /* Ensure containers size properly for info panels */
    #user-scatter-container {
      display: flex;
      flex-direction: column;
      padding-bottom: 0;
      height: 460px; /* Fixed height to accommodate all elements */
      position: relative;
    }
    
    #user-scatter-container svg {
      width: 100%;
      height: 350px; /* Fixed height */
      max-height: 350px; /* Max height to prevent overflow */
      display: block;
      margin-bottom: 10px; /* Exactly 10px space to legend */
    }
    
    .umap-info-container {
      box-shadow: none;
      height: 90px; /* Fixed height of 90px */
      margin-top: 0;
      margin-bottom: 10px; /* Exactly 10px space to buttons */
      border: 1px solid #eee;
      background: #f9f9f9;
      border-radius: 4px;
      padding: 10px;
      box-sizing: border-box;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 12px;
      width: 100%;
      overflow: visible;
    }
    
    /* Make sequence legend stand out better */
    .sequence-legend {
      padding: 0;
      background-color: transparent;
    }
    
    /* Adjust tooltip size for better fit in smaller visualization */
    .tooltip-content {
      max-width: 250px;
      font-size: 12px;
    }
    
    /* Ensure point labels are visible but not overwhelming */
    .point-label {
      font-size: 9px;
    }
    
    /* Add empty state message styling */
    .empty-state-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    
    .empty-state-message p {
      text-align: center;
      color: #6b7280;
      margin-bottom: 1rem;
    }
  </style>
`);

/**
 * Improved version of findExactMatchesInCache that uses direct comprehensive search
 * instead of relying on the map lookup which might be missing some matches
 * @param {Array<string>} accessionNumbers - Array of accession numbers to search for
 * @returns {Array<Object>} - Array of objects with coordinates for the matched sequences
 */
async function findAllMatchesInCache(accessionNumbers) {
  console.log(`🔧 IMPROVED SEARCH: Searching for ${accessionNumbers.length} sequences using direct search`);
  
  if (!umapDataCache || !accessionNumbers) {
    console.error("❌ IMPROVED SEARCH: Cache or accession numbers are invalid");
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
    
    // Try all possible matching strategies
    let found = false;
    
    // 1. Direct match (exact)
    let matches = umapDataCache.filter(item => 
      item.accession && item.accession === origAccession
    );
    
    // 2. Case-insensitive match
    if (matches.length === 0) {
      matches = umapDataCache.filter(item => 
        item.accession && item.accession.toLowerCase() === accLower
      );
    }
    
    // 3. Base name match (without version)
    if (matches.length === 0) {
      matches = umapDataCache.filter(item => 
        item.accession && item.accession.split('.')[0].toLowerCase() === accBase
      );
    }
    
    // 4. Without NZ_ prefix match
    if (matches.length === 0 && accWithoutPrefix) {
      matches = umapDataCache.filter(item => 
        item.accession && 
        (item.accession.toLowerCase() === accWithoutPrefix || 
        item.accession.split('.')[0].toLowerCase() === accWithoutPrefix)
      );
    }
    
    // 5. Includes match (more permissive)
    if (matches.length === 0) {
      matches = umapDataCache.filter(item => 
        item.accession && 
        (item.accession.toLowerCase().includes(accBase) || 
         (accWithoutPrefix && item.accession.toLowerCase().includes(accWithoutPrefix)))
      );
    }
    
    // If we found any matches, add the first one to our results
    if (matches.length > 0) {
      found = true;
      const matchItem = matches[0]; // Take the first match
      
      foundItems.push({
        query: origAccession,
        match: matchItem.accession,
        x: matchItem.x,
        y: matchItem.y,
        id: matchItem.id,
        searchMethod: matches.length > 1 ? `direct (${matches.length} matches found)` : 'direct'
      });
      
      console.log(`✅ IMPROVED SEARCH: Found ${matches.length} matches for "${origAccession}", using: ${matchItem.accession}`);
    } else {
      searchFailures.push(origAccession);
      console.log(`❌ IMPROVED SEARCH: No matches found for "${origAccession}" after trying all methods`);
    }
  }
  
  console.log(`🔧 IMPROVED SEARCH: Found ${foundItems.length} out of ${accessionNumbers.length} sequences`);
  if (searchFailures.length > 0) {
    console.log(`❌ IMPROVED SEARCH: Could not find matches for: ${searchFailures.join(', ')}`);
  }
  
  return foundItems;
}

// Add the new function to window for testing in the console
window.findAllMatchesInCache = findAllMatchesInCache;

// Add a debug utility accessible in the console
window.debugUmapCache = function() {
  console.log('🔧 DEBUGGER: Manual cache inspection initiated');
  
  // Check both caching mechanisms
  console.log('🔧 DEBUGGER: Checking window.apiCache:');
  if (window.apiCache) {
    const status = window.apiCache.getCacheStatus();
    console.log(`  - Status: ${JSON.stringify(status)}`);
    
    const sequences = window.apiCache.getSequences();
    console.log(`  - Sequences available: ${sequences ? 'Yes' : 'No'}`);
    console.log(`  - Sequence count: ${sequences ? sequences.length : 0}`);
    
    if (sequences && sequences.length > 0) {
      console.log('  - First sequence sample:');
      console.log(sequences[0]);
      
      // Check if the sequences have coordinates
      const withCoordinates = sequences.filter(s => s.coordinates && Array.isArray(s.coordinates) && s.coordinates.length >= 2);
      console.log(`  - Sequences with coordinates: ${withCoordinates.length} (${((withCoordinates.length/sequences.length)*100).toFixed(1)}%)`);
      
      if (withCoordinates.length > 0) {
        console.log('  - Sample sequence with coordinates:');
        console.log(withCoordinates[0]);
      }
    }
  } else {
    console.log('  - window.apiCache is not available');
  }
  
  console.log('🔧 DEBUGGER: Checking umapDataCache:');
  if (umapDataCache) {
    console.log(`  - Cache exists: Yes`);
    console.log(`  - Cache size: ${umapDataCache.length}`);
    
    if (umapDataCache.length > 0) {
      console.log('  - First cache item:');
      console.log(umapDataCache[0]);
    }
  } else {
    console.log('  - umapDataCache is not initialized');
  }
  
  console.log('🔧 DEBUGGER: Attempting to force cache reload');
  getUmapDataCache().then(cache => {
    console.log(`  - Force reload result: ${cache.length} items`);
  }).catch(err => {
    console.error('  - Force reload failed:', err);
  });
  
  return 'Debug inspection complete. Check console for detailed output.';
};

// Listen for the cache-ready event from api-similarity-service.js
window.addEventListener('api-cache-ready', function(event) {
  console.log(`🌟 API cache is now ready with ${event.detail.count} sequences`);
  
  // If the dashboard has already loaded and we don't have data yet, refresh the cache
  if (window.dashboardLoaded && (!umapDataCache || umapDataCache.length === 0)) {
    console.log('🔄 Dashboard already loaded, refreshing UMAP data cache');
    getUmapDataCache().then(cache => {
      console.log(`✅ UMAP data cache refreshed with ${cache.length} items`);
      
      // Show debug stats after the cache is properly loaded
      if (cache.length > 0) {
        showCacheDebugStats();
      }
      
      // If we already have initialized visualizations, update them
      if (window.currentSequences && window.currentSequences.length > 0) {
        console.log('🔄 Updating visualizations with refreshed cache data');
        updateUmapVisualization(window.currentSequences);
      }
    });
  }
});

// Set a flag when the dashboard is considered loaded
window.addEventListener('DOMContentLoaded', function() {
  window.dashboardLoaded = true;
  console.log('📊 Dashboard DOM content loaded');
});

// Function to show cache debug stats at the right time
function showCacheDebugStats() {
  if (!umapDataCache || umapDataCache.length === 0) {
    console.log('🔍 DEBUG: UMAP data cache is empty');
    return;
  }
  
  // Count entries with accession numbers
  const entriesWithAccession = umapDataCache.filter(item => item && item.accession).length;
  
  console.log('🔍 DEBUG: UMAP data cache statistics:');
  console.log(`  - Total entries in cache: ${umapDataCache.length}`);
  console.log(`  - Entries with accession numbers: ${entriesWithAccession}`);
  
  // Log accession format distribution
  const accessionFormats = {};
  umapDataCache.forEach(item => {
    if (item.accession) {
      let format = 'other';
      if (item.accession.startsWith('NZ_')) format = 'NZ_';
      else if (item.accession.startsWith('NC_')) format = 'NC_';
      else if (item.accession.startsWith('AL')) format = 'AL';
      accessionFormats[format] = (accessionFormats[format] || 0) + 1;
    }
  });
  
  console.log(`  - Accession format distribution:`);
  Object.entries(accessionFormats).forEach(([format, count]) => {
    console.log(`    ${format}: ${count} items (${((count/entriesWithAccession)*100).toFixed(1)}%)`);
  });
}

// Replace the old debug section with a function call that can be triggered at the right time
function logUmapDataCacheStats() {
  showCacheDebugStats();
  
  // Add a utility function for manual testing
  console.log(`🔍 DEBUG: Added utility function 'findSequenceInCache()' to manually test accession numbers`);
  console.log(`  Usage example: findSequenceInCache('NZ_QTIX00000000')`);
  
  // Make the function available on window
  window.findSequenceInCache = function(accessionQuery) {
    if (!umapDataCache || !accessionQuery) {
      console.log("❌ Cannot search: umapDataCache is empty or no query provided");
      return null;
    }
    
    console.log(`🔍 Searching for: "${accessionQuery}"`);
    
    // Try direct match
    const directMatch = umapDataCache.find(item => 
      item.accession === accessionQuery
    );
    
    if (directMatch) {
      console.log(`✅ Found direct match: ${directMatch.accession}`);
      return directMatch;
    }
    
    // Try partial matches
    console.log(`🔍 No direct match found, trying partial matches...`);
    
    const partialMatches = umapDataCache.filter(item => 
      item.accession && 
      (item.accession.includes(accessionQuery) || 
       accessionQuery.includes(item.accession))
    );
    
    if (partialMatches.length > 0) {
      console.log(`✅ Found ${partialMatches.length} partial matches:`);
      partialMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`  ${idx+1}. ${match.accession}`);
      });
      return partialMatches[0];
    }
    
    // Try prefix matches (no NZ_ prefix)
    console.log(`🔍 No partial matches found, trying prefix variations...`);
    
    const prefixMatches = umapDataCache.filter(item => 
      item.accession && 
      (
        (item.accession.startsWith('NZ_') && item.accession.substring(3) === accessionQuery) ||
        (accessionQuery.startsWith('NZ_') && accessionQuery.substring(3) === item.accession)
      )
    );
    
    if (prefixMatches.length > 0) {
      console.log(`✅ Found ${prefixMatches.length} prefix variation matches:`);
      prefixMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`  ${idx+1}. ${match.accession}`);
      });
      return prefixMatches[0];
    }
    
    console.log(`❌ No matches found for "${accessionQuery}"`);
    return null;
  };
}

// Add compact styling for metadata to ensure it looks clean
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .sequence-content {
      flex: 1;
    }
    .sequence-name {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .sequence-metadata {
      font-size: 12px;
      color: #555;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }
    .metadata-row {
      line-height: 1.3;
    }
    .similarity-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      border-radius: 20px;
      background-color: #3F51B5;
      color: white;
      font-weight: bold;
      font-size: 14px;
      margin-left: 10px;
    }
    .similarity-high .similarity-badge {
      background-color: #4CAF50;
    }
    .similarity-medium .similarity-badge {
      background-color: #FFC107;
      color: #333;
    }
    .similarity-low .similarity-badge {
      background-color: #F44336;
    }
  </style>
`);


