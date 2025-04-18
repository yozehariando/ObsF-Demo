/**
 * visualization-initializer.js
 * Handles initialization of UMAP and map visualizations from cache data
 */

// Import required visualization components
import { createUmapScatterPlot } from '../components/api-scatter-component.js';
import { createUserScatterPlot } from '../components/api-user-scatter-component.js';
import { createApiMap } from '../components/api-map-component.js';
import { createEmergencyVisualization } from './umap-visualization.js';
import { getElementByID } from '../utils/dom-utils.js';

/**
 * Initialize dashboard event handlers
 * Sets up event listeners for cache-ready, new-user-sequence, and keyboard shortcuts
 */
export function initializeDashboardEvents() {
  console.log("🔵 Initializing dashboard events");
  
  try {
    // Listen for cache-ready event
    window.addEventListener('api-cache-ready', function(event) {
      console.log(`🌟 API cache is now ready with ${event.detail?.count || 'unknown'} sequences`);
      // Update visualizations with the new cache data
      if (event.detail?.data) {
        updateVisualizationsWithApiData(event.detail.data);
      }
    });

    // Listen for new user sequence event
    window.addEventListener('new-user-sequence', function(event) {
      console.log("🌟 New user sequence received");
      if (event.detail?.sequence) {
        updateVisualizationsWithUserSequence(event.detail.sequence);
      }
    });

    // Add keyboard shortcut for force initialization
    document.addEventListener('keydown', function(event) {
      if (event.shiftKey && event.altKey && event.key === 'F') {
        console.log("🔄 Force initialization triggered by keyboard shortcut");
        const data = window.apiCache || window.umapDataCache || [];
        updateVisualizationsWithApiData(data);
      }
    });

    console.log("✅ Dashboard events initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing dashboard events:", error);
  }
}

/**
 * Initialize visualizations with data from the UMAP data cache
 * @param {Object} options - Optional configuration parameters
 * @param {number} options.maxScatterPoints - Maximum number of points to show in scatter plot (default: 5000)
 * @param {number} options.maxMapPoints - Maximum number of points to show in map (default: 1000)
 * @returns {boolean} - True if initialization was successful, false otherwise
 */
export function initializeVisualizationsWithCacheData(options = {}) {
  console.log("🔵 Updating visualizations with cache data");
  console.log("🔵 DEBUG: window.createUmapScatterPlot exists:", typeof window.createUmapScatterPlot === 'function');
  console.log("🔵 DEBUG: window.state exists:", !!window.state);
  console.log("🔵 DEBUG: window.state?.scatterComponent exists:", !!window.state?.scatterComponent);
  
  const maxScatterPoints = options.maxScatterPoints || 5000;
  const maxMapPoints = options.maxMapPoints || 1000;
  
  // Get the cache from the window object
  const cache = window.umapDataCache || [];
  console.log(`🔵 Retrieved ${cache.length} items from cache`);
  
  if (!cache || cache.length === 0) {
    console.warn("⚠️ Cache data is empty, cannot update visualizations");
    return false;
  }
  
  try {
    // Transform data for visualization - ensure we handle both x/y and X/Y formats
    const transformedData = cache.map(item => {
      const x = item.coordinates ? item.coordinates[0] : (item.x !== undefined ? item.x : (item.X !== undefined ? item.X : 0));
      const y = item.coordinates ? item.coordinates[1] : (item.y !== undefined ? item.y : (item.Y !== undefined ? item.Y : 0));
      
      return {
        // Provide both lowercase and uppercase coordinates for compatibility
        x: x,
        y: y,
        X: x,
        Y: y,
        id: item.id || item.accession || `item-${Math.random().toString(36).substr(2, 9)}`,
        accession: item.accession,
        metadata: item.metadata || {},
        isUserSeq: item.isUserSeq || false,
        isSimilarSeq: item.isSimilarSeq || false
      };
    });
    
    console.log(`🔵 Transformed ${transformedData.length} data points for visualization`);
    
    // Sample data if needed to improve performance
    const sampledData = transformedData.length > maxScatterPoints 
      ? transformedData.slice(0, maxScatterPoints) 
      : transformedData;
    
    console.log(`🔵 Using ${sampledData.length} points for scatter plot`);
    
    // Find user sequences
    const userSeqs = sampledData.filter(item => item.isUserSeq);
    // Find similar sequences
    const similarSeqs = sampledData.filter(item => item.isSimilarSeq);
    // Find other sequences (reference data)
    const referenceData = sampledData.filter(item => !item.isUserSeq && !item.isSimilarSeq);
    
    console.log(`🔵 Found ${userSeqs.length} user sequences, ${similarSeqs.length} similar sequences, and ${referenceData.length} reference sequences`);
    
    // Update reference scatter plot with real data
    updateReferenceScatterPlot(referenceData);
    
    // Update user scatter plot - it starts empty but is initialized
    updateUserScatterPlot(userSeqs.concat(similarSeqs));
    
    // Update map with real data
    updateMapVisualization(sampledData);
    
    console.log("✅ Visualizations updated successfully with cache data");
    return true;
  } catch (err) {
    console.error("Failed to update visualizations with cache data:", err);
    return false;
  }
}

/**
 * Update the reference scatter plot with real data
 * @param {Array} data - Data points to display in the reference scatter plot
 */
function updateReferenceScatterPlot(data) {
  const referenceContainer = document.getElementById('scatter-container');
  if (!referenceContainer) {
    console.warn("⚠️ Reference container not found");
    return;
  }
  
  try {
    // Ensure coordinates are properly formatted (both x/y and X/Y formats)
    const formattedData = data.map(item => {
      const x = item.x !== undefined ? item.x : (item.X !== undefined ? item.X : 0);
      const y = item.y !== undefined ? item.y : (item.Y !== undefined ? item.Y : 0);
      return {
        ...item,
        x: x,
        y: y,
        X: x,
        Y: y
      };
    });
    
    console.log(`🔵 Updating reference scatter plot with ${formattedData.length} data points`);
    
    // Check if component exists and has expected methods
    const hasComponent = !!window.state?.scatterComponent;
    const hasUpdateScatterPlot = hasComponent && typeof window.state.scatterComponent.updateScatterPlot === 'function';
    const hasUpdateData = hasComponent && typeof window.state.scatterComponent.updateData === 'function';
    
    console.log(`🔵 Reference component status: exists=${hasComponent}, has updateScatterPlot=${hasUpdateScatterPlot}, has updateData=${hasUpdateData}`);
    
    // If we have a reference component with updateScatterPlot method
    if (hasUpdateScatterPlot) {
      console.log("🔵 Using updateScatterPlot API to update reference scatter plot");
      window.state.scatterComponent.updateScatterPlot(formattedData);
    } 
    // If component has updateData method
    else if (hasUpdateData) {
      console.log("🔵 Using updateData API to update reference scatter plot");
      window.state.scatterComponent.updateData(formattedData);
    }
    // If window has an updateReferenceUmap function
    else if (window.updateReferenceUmap && typeof window.updateReferenceUmap === 'function') {
      console.log("🔵 Using window.updateReferenceUmap to update reference scatter plot");
      window.updateReferenceUmap(formattedData);
    }
    // Try direct D3 rendering
    else {
      console.log("🔵 Creating new reference scatter plot with direct D3 rendering");
      referenceContainer.innerHTML = '';
      
      // Try to use the imported function if available
      if (typeof window.createUmapScatterPlot === 'function') {
        console.log("🔵 Using imported createUmapScatterPlot for direct rendering");
        try {
          window.state.scatterComponent = window.createUmapScatterPlot(
            'scatter-container', 
            formattedData,
            { title: 'Reference UMAP' }
          );
          return; // Early return if successful
        } catch (err) {
          console.error("Error using imported createUmapScatterPlot:", err);
          // Continue to fallback
        }
      }
      
      // Fallback to emergency visualization
      console.log("🔵 Using createEmergencyVisualization as fallback");
      window.state.scatterComponent = window.createEmergencyVisualization(referenceContainer, formattedData);
    }
    
    console.log("✅ Reference scatter plot updated successfully");
  } catch (error) {
    console.error("❌ ERROR updating reference scatter plot:", error);
    
    // Ultimate fallback - direct D3.js rendering
    try {
      console.log("🔵 Using EMERGENCY FALLBACK D3 rendering for reference plot");
      referenceContainer.innerHTML = '';
      window.state.scatterComponent = window.createEmergencyVisualization(referenceContainer, data);
    } catch (fallbackError) {
      console.error("❌ CRITICAL: Even emergency visualization failed:", fallbackError);
    }
  }
}

/**
 * Update the user scatter plot with real data
 * @param {Array} data - Data points to display in the user scatter plot
 */
function updateUserScatterPlot(data) {
  const userContainer = document.getElementById('user-scatter-container');
  if (!userContainer) {
    console.warn("⚠️ User container not found");
    return;
  }
  
  try {
    // Ensure coordinates are properly formatted (both x/y and X/Y formats)
    const formattedData = data.map(item => {
      const x = item.x !== undefined ? item.x : (item.X !== undefined ? item.X : 0);
      const y = item.y !== undefined ? item.y : (item.Y !== undefined ? item.Y : 0);
      return {
        ...item,
        x: x,
        y: y,
        X: x,
        Y: y
      };
    });
    
    console.log(`🔵 Updating user scatter plot with ${formattedData.length} data points`);
    
    // Check if component exists and has expected methods
    const hasComponent = !!window.state?.userScatterComponent;
    const hasUpdateScatterPlot = hasComponent && typeof window.state.userScatterComponent.updateScatterPlot === 'function';
    const hasUpdateData = hasComponent && typeof window.state.userScatterComponent.updateData === 'function';
    
    console.log(`🔵 User component status: exists=${hasComponent}, has updateScatterPlot=${hasUpdateScatterPlot}, has updateData=${hasUpdateData}`);
    
    // If we have a user component with updateScatterPlot method
    if (hasUpdateScatterPlot) {
      console.log("🔵 Using updateScatterPlot API to update user scatter plot");
      window.state.userScatterComponent.updateScatterPlot(formattedData);
    } 
    // If component has updateData method
    else if (hasUpdateData) {
      console.log("🔵 Using updateData API to update user scatter plot");
      window.state.userScatterComponent.updateData(formattedData);
    }
    // If window has an updateUserUmap function
    else if (window.updateUserUmap && typeof window.updateUserUmap === 'function') {
      console.log("🔵 Using window.updateUserUmap to update user scatter plot");
      window.updateUserUmap(formattedData);
    }
    // Try direct D3 rendering
    else {
      console.log("🔵 Creating new user scatter plot with direct D3 rendering");
      userContainer.innerHTML = '';
      
      // Try to use the imported functions if available
      if (typeof window.createUserScatterPlot === 'function') {
        console.log("🔵 Using imported createUserScatterPlot for direct rendering");
        try {
          window.state.userScatterComponent = window.createUserScatterPlot(
            'user-scatter-container',  // Pass ID string instead of element
            formattedData,
            { title: 'User UMAP Visualization' }
          );
          return; // Early return if successful
        } catch (err) {
          console.error("Error using imported createUserScatterPlot:", err);
          // Continue to next fallback
        }
      }
      
      if (typeof window.createUmapScatterPlot === 'function') {
        console.log("🔵 Using imported createUmapScatterPlot for direct rendering");
        try {
          window.state.userScatterComponent = window.createUmapScatterPlot(
            'user-scatter-container',  // Pass ID string instead of element
            formattedData,
            { title: 'User UMAP Visualization' }
          );
          return; // Early return if successful
        } catch (err) {
          console.error("Error using imported createUmapScatterPlot:", err);
          // Continue to fallback
        }
      }
      
      // Fallback to emergency visualization
      console.log("🔵 Using createEmergencyVisualization as fallback");
      window.state.userScatterComponent = window.createEmergencyVisualization(userContainer, formattedData);
    }
    
    console.log("✅ User scatter plot updated successfully");
  } catch (error) {
    console.error("❌ ERROR updating user scatter plot:", error);
    
    // Ultimate fallback - direct D3.js rendering
    try {
      console.log("🔵 Using EMERGENCY FALLBACK D3 rendering for user plot");
      userContainer.innerHTML = '';
      window.state.userScatterComponent = window.createEmergencyVisualization(userContainer, data);
    } catch (fallbackError) {
      console.error("❌ CRITICAL: Even emergency visualization failed:", fallbackError);
    }
  }
}

/**
 * Update the map visualization with real data
 * @param {Array} data - Data points to display in the map visualization
 */
function updateMapVisualization(data) {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) {
    console.warn("⚠️ Map container not found");
    return;
  }
  
  try {
    // Filter points with geographic data
    const geoData = data.filter(item => 
      item.metadata && 
      item.metadata.country && 
      item.metadata.country !== 'Unknown'
    );
    
    console.log(`🔵 Updating map with ${geoData.length} geographic data points`);
    
    // Make sure each data point has both x/y and X/Y coordinates for compatibility
    const formattedGeoData = geoData.map(item => {
      const x = item.x !== undefined ? item.x : (item.X !== undefined ? item.X : 0);
      const y = item.y !== undefined ? item.y : (item.Y !== undefined ? item.Y : 0);
      return {
        ...item,
        x: x,
        y: y,
        X: x,
        Y: y
      };
    });
    
    // Check if component exists and has expected methods
    const hasComponent = !!window.state?.mapComponent;
    const hasUpdateData = hasComponent && typeof window.state.mapComponent.updateData === 'function';
    
    console.log(`🔵 Map component status: exists=${hasComponent}, has updateData=${hasUpdateData}`);
    
    // If we have a map component with updateData method
    if (hasUpdateData) {
      console.log("🔵 Using updateData API to update map");
      window.state.mapComponent.updateData(formattedGeoData);
    }
    // Try direct rendering approach
    else {
      console.log("🔵 Creating new map visualization with direct rendering");
      mapContainer.innerHTML = '';
      
      // Try to use createApiMap first
      if (typeof window.createApiMap === 'function') {
        console.log("🔵 Using createApiMap for direct rendering");
        try {
          window.state.mapComponent = window.createApiMap(
            mapContainer, 
            formattedGeoData
          );
          return; // Early return if successful
        } catch (err) {
          console.error("Error using createApiMap:", err);
          // Continue to next fallback
        }
      }
      
      if (typeof window.createMap === 'function') {
        console.log("🔵 Using createMap for direct rendering");
        try {
          window.state.mapComponent = window.createMap(
            mapContainer, 
            formattedGeoData
          );
          return; // Early return if successful
        } catch (err) {
          console.error("Error using createMap:", err);
          // Continue to fallback
        }
      }
      
      // Fallback to a basic visualization
      console.log("🔵 Using basic HTML fallback for map");
      window.state.mapComponent = { container: mapContainer };
      const messageEl = document.createElement('div');
      messageEl.className = 'map-message';
      messageEl.innerHTML = `
        <h3>Geographic Distribution</h3>
        <p>Showing data from ${formattedGeoData.length} sequences with geographic information.</p>
      `;
      mapContainer.appendChild(messageEl);
    }
    
    console.log("✅ Map visualization updated successfully");
  } catch (error) {
    console.error("❌ ERROR updating map visualization:", error);
    
    // Ultimate fallback - basic HTML
    try {
      console.log("🔵 Using EMERGENCY HTML FALLBACK for map");
      mapContainer.innerHTML = '';
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.innerHTML = `
        <h3>Map Visualization Error</h3>
        <p>Failed to load map visualization</p>
        <div class="map-error" style="height: 300px; background: #fff0f0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
          <p>Error: ${error.message || 'Unknown error'}</p>
        </div>
      `;
      mapContainer.appendChild(errorEl);
      window.state.mapComponent = { container: mapContainer };
    } catch (fallbackError) {
      console.error("❌ CRITICAL: Even basic map fallback failed:", fallbackError);
    }
  }
}

/**
 * Initialize visualizations directly using window.apiCache if available
 * This is a fallback method if other approaches fail
 * @returns {boolean} - True if initialization was successful, false otherwise
 */
export function directInitializeFromApiCache() {
  console.log("🔧 Attempting direct initialization from window.apiCache");
  
  try {
    // Debug statements to help diagnose visualization issues
    console.log("🔧 DEBUG: window.createUmapScatterPlot exists:", typeof window.createUmapScatterPlot === 'function');
    console.log("🔧 DEBUG: window.createEmergencyVisualization exists:", typeof window.createEmergencyVisualization === 'function');
    console.log("🔧 DEBUG: document.getElementById('scatter-container'):", !!document.getElementById('scatter-container'));
    console.log("🔧 DEBUG: document.getElementById('user-scatter-container'):", !!document.getElementById('user-scatter-container'));
    
    // Try to get data from window.apiCache (set by the API service)
    if (window.apiCache && Array.isArray(window.apiCache) && window.apiCache.length > 0) {
      console.log(`🔧 Found data in window.apiCache: ${window.apiCache.length} items`);
      
      // Set this as our UMAP data cache
      window.umapDataCache = window.apiCache;
      
      // Initialize visualizations
      return initializeVisualizationsWithCacheData();
    } else if (window.umapDataCache && Array.isArray(window.umapDataCache) && window.umapDataCache.length > 0) {
      console.log(`🔧 Found data in window.umapDataCache: ${window.umapDataCache.length} items`);
      
      // Initialize visualizations
      return initializeVisualizationsWithCacheData();
    } else {
      console.warn("🔧 No data found in window.apiCache or window.umapDataCache");
      return false;
    }
  } catch (error) {
    console.error("Error in directInitializeFromApiCache:", error);
    return false;
  }
}

/**
 * Initialize dashboard event listeners for visualization updates
 */
export function initializeVisualizationEvents() {
  console.log("🔍 Initializing visualization event listeners");
  
  // Listen for cache ready event
  document.addEventListener('umap-cache-ready', (event) => {
    console.log("🔍 Received umap-cache-ready event", event);
    
    // Initialize visualizations when cache is ready
    initializeVisualizationsWithCacheData();
  });
  
  // Listen for new user sequence event
  document.addEventListener('new-user-sequence', (event) => {
    console.log("🔍 Received new-user-sequence event", event);
    const sequenceData = event.detail;
    
    if (sequenceData) {
      console.log("🔍 Processing new user sequence data", sequenceData);
      // Update visualizations with new user sequence
      if (typeof window.updateVisualizationsWithUserSequence === 'function') {
        window.updateVisualizationsWithUserSequence(sequenceData);
      }
    }
  });
  
  // Listen for direct initialization trigger event
  document.addEventListener('force-visualizations-update', function() {
    console.log("🔄 Force visualizations update triggered");
    directInitializeFromApiCache();
  });
  
  console.log("🔍 Visualization event listeners initialized");
}

/**
 * Initialize containers with sample/empty data
 * This follows the pattern from dashboard.md where visualizations
 * are created directly without waiting for cache data
 * @param {Object} state - State object to store component references
 * @returns {Promise<boolean>} - Promise resolving to true if initialization was successful
 */
export async function initializeContainersWithSampleData(state = window.state || {}) {
  console.log("🔹 Initializing containers with sample data");
  
  // Debug info
  console.log("🔹 DEBUG: imported createUmapScatterPlot:", typeof createUmapScatterPlot === 'function');
  console.log("🔹 DEBUG: imported createUserScatterPlot:", typeof createUserScatterPlot === 'function');
  console.log("🔹 DEBUG: imported createEmergencyVisualization:", typeof createEmergencyVisualization === 'function');
  
  // Create sample data - small random dataset for initial visualization
  const sampleData = Array.from({ length: 50 }, (_, i) => ({
    id: `sample-${i}`,
    x: (Math.random() * 20) - 10,  // Random X between -10 and 10
    y: (Math.random() * 20) - 10,  // Random Y between -10 and 10
    // Also add uppercase coordinates for compatibility
    X: (Math.random() * 20) - 10,
    Y: (Math.random() * 20) - 10,
    accession: `SAMPLE${i}`,
    metadata: {
      country: ['USA', 'China', 'UK', 'India', 'Brazil'][Math.floor(Math.random() * 5)],
      year: 2020 + Math.floor(Math.random() * 3)
    }
  }));
  
  try {
    // Initialize the main scatter plot component (reference database)
    const scatterContainer = document.getElementById('scatter-container');
    if (scatterContainer) {
      console.log("🔹 Creating reference scatter plot with sample data");
      try {
        // First clear the container to ensure clean state
        scatterContainer.innerHTML = '';
        
        // Try to use imported createUmapScatterPlot first
        try {
          console.log("🔹 Using imported createUmapScatterPlot for reference visualization");
          state.scatterComponent = createUmapScatterPlot(
            'scatter-container',  // Pass ID string instead of element
            sampleData, 
            { title: 'Reference UMAP' }
          );
          console.log("Reference component created with imported createUmapScatterPlot");
        } catch (importError) {
          console.error("Error using imported createUmapScatterPlot:", importError);
          
          // Fallback to window version if available
          if (typeof window.createUmapScatterPlot === 'function') {
            console.log("🔹 Falling back to window.createUmapScatterPlot");
            state.scatterComponent = window.createUmapScatterPlot(
              'scatter-container',  
              sampleData, 
              { title: 'Reference UMAP' }
            );
            console.log("Reference component created with window.createUmapScatterPlot");
          } else {
            // Last resort fallback to emergency visualization
            console.log("🔹 Using last resort emergency visualization");
            state.scatterComponent = createEmergencyVisualization(
              scatterContainer, 
              sampleData
            );
            console.log("Reference component created with createEmergencyVisualization");
          }
        }
        console.log("✅ Reference scatter plot created successfully");
      } catch (error) {
        console.error("❌ Error creating reference scatter plot:", error);
        // Last resort fallback
        state.scatterComponent = createEmergencyVisualization(
          scatterContainer, 
          sampleData
        );
      }
    } else {
      console.error("❌ Could not find reference scatter container");
    }
    
    // Initialize the user scatter plot container
    const userScatterContainer = document.getElementById('user-scatter-container');
    if (userScatterContainer) {
      console.log("🔹 Creating user scatter plot with sample data");
      try {
        // First clear the container to ensure clean state
        userScatterContainer.innerHTML = '';
        
        // Try to use imported createUserScatterPlot first
        try {
          console.log("🔹 Using imported createUserScatterPlot for user visualization");
          state.userScatterComponent = createUserScatterPlot(
            'user-scatter-container',  // Pass ID string instead of element
            [], // Empty data for user visualization initially
            { title: 'User UMAP Visualization' }
          );
          console.log("User component created with imported createUserScatterPlot");
        } catch (importError) {
          console.error("Error using imported createUserScatterPlot:", importError);
          
          // Try window.createUserScatterPlot as fallback
          if (typeof window.createUserScatterPlot === 'function') {
            console.log("🔹 Falling back to window.createUserScatterPlot");
            state.userScatterComponent = window.createUserScatterPlot(
              'user-scatter-container',
              [], // Empty data for user visualization initially
              { title: 'User UMAP Visualization' }
            );
            console.log("User component created with window.createUserScatterPlot");
          } 
          // Try imported createUmapScatterPlot as fallback
          else if (typeof createUmapScatterPlot === 'function') {
            console.log("🔹 Using imported createUmapScatterPlot as fallback");
            state.userScatterComponent = createUmapScatterPlot(
              'user-scatter-container',
              [], // Empty data for user visualization initially
              { title: 'User UMAP Visualization' }
            );
            console.log("User component created with imported createUmapScatterPlot");
          }
          // Try window.createUmapScatterPlot as last API fallback
          else if (typeof window.createUmapScatterPlot === 'function') {
            console.log("🔹 Using window.createUmapScatterPlot as fallback");
            state.userScatterComponent = window.createUmapScatterPlot(
              'user-scatter-container',
              [], // Empty data for user visualization initially
              { title: 'User UMAP Visualization' }
            );
            console.log("User component created with window.createUmapScatterPlot");
          }
          // Last resort fallback to emergency visualization
          else {
            console.log("🔹 Using last resort emergency visualization");
            state.userScatterComponent = createEmergencyVisualization(
              userScatterContainer, 
              []
            );
            console.log("User component created with createEmergencyVisualization");
          }
        }
        console.log("✅ User scatter plot created successfully");
      } catch (error) {
        console.error("❌ Error creating user scatter plot:", error);
        // Last resort fallback
        state.userScatterComponent = createEmergencyVisualization(
          userScatterContainer, 
          []
        );
      }
    } else {
      console.error("❌ Could not find user scatter container");
    }
    
    // Initialize the map container
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      console.log("🔹 Creating map with sample data");
      try {
        // First clear the container to ensure clean state
        mapContainer.innerHTML = '';
        
        // Sample data for the map (filter to include only items with country metadata)
        const mapSampleData = sampleData.filter(item => item.metadata && item.metadata.country);
        
        // Try to use createApiMap or createMap
        if (typeof window.createApiMap === 'function') {
          state.mapComponent = window.createApiMap(
            mapContainer,
            mapSampleData
          );
          console.log("Map component created with createApiMap");
        } else if (typeof window.createMap === 'function') {
          state.mapComponent = window.createMap(
            mapContainer,
            mapSampleData
          );
          console.log("Map component created with createMap");
        } else {
          // Fallback to basic message
          mapContainer.innerHTML = `
            <div class="map-message">
              <h3>Geographic Distribution</h3>
              <p>Sample map visualization with ${mapSampleData.length} points</p>
              <div class="map-placeholder" style="height: 300px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                <p>Map visualization initialized</p>
              </div>
            </div>
          `;
          state.mapComponent = { container: mapContainer };
          console.log("Map container initialized with placeholder");
        }
        console.log("✅ Map created successfully");
      } catch (error) {
        console.error("❌ Error creating map:", error);
        // Basic fallback
        mapContainer.innerHTML = `
          <div class="map-message">
            <h3>Geographic Distribution</h3>
            <p>Error initializing map visualization</p>
          </div>
        `;
        state.mapComponent = { container: mapContainer };
      }
    } else {
      console.error("❌ Could not find map container");
    }
    
    return true;
  } catch (error) {
    console.error("Failed to initialize containers with sample data:", error);
    return false;
  }
}

/**
 * Load cache data in background without blocking visualization
 * @param {Object} options - Configuration options
 * @param {Function} options.getUmapDataCache - Function to get current UMAP data cache
 * @param {Function} options.initializeAndGetUmapDataCache - Function to initialize and get UMAP data cache
 * @param {Function} options.showCacheDebugStats - Function to show cache debug statistics
 * @returns {Promise<boolean>} - Promise resolving to true if cache loading was successful
 */
export async function loadCacheDataInBackground(options = {}) {
  try {
    console.log("🔹 Loading cache data in background");
    
    const getCache = options.getUmapDataCache || window.getUmapDataCache;
    const initCache = options.initializeAndGetUmapDataCache || window.initializeAndGetUmapDataCache;
    const showStats = options.showCacheDebugStats || window.showCacheDebugStats;
    
    // Get current cache
    let cache = typeof getCache === 'function' ? getCache() : (window.umapDataCache || []);
    
    // If cache is empty, try to initialize it
    if (!cache || cache.length === 0) {
      console.log("🔄 Cache is empty, initializing it");
      
      if (typeof window.showLoadingIndicator === 'function') {
        window.showLoadingIndicator("Loading reference data...");
      }
      
      try {
        // Try to initialize cache
        if (typeof initCache === 'function') {
          cache = await initCache({
            forceRefresh: true,
            fetchUmapData: window.fetchUmapData,
            fetchAllSequences: window.fetchAllSequences
          });
        }
        
        if (typeof window.hideLoadingIndicator === 'function') {
          window.hideLoadingIndicator();
        }
        
        // Show notification if cache initialization failed
        if (!cache || cache.length === 0) {
          console.error("❌ Failed to load UMAP data cache");
          
          if (typeof window.showNotification === 'function') {
            window.showNotification(
              "Warning: Failed to load reference data. Some visualizations may not work correctly.",
              "warning",
              10000
            );
          }
          
          return false;
        }
        
        console.log(`✅ UMAP data cache initialized with ${cache.length} items`);
        
        // Make the cache globally available for backward compatibility
        window.umapDataCache = cache;
      } catch (error) {
        console.error("Error initializing UMAP data cache:", error);
        
        if (typeof window.hideLoadingIndicator === 'function') {
          window.hideLoadingIndicator();
        }
        
        return false;
      }
    }
    
    // Show cache statistics
    if (cache && cache.length > 0) {
      if (typeof showStats === 'function') {
        try {
          showStats(cache);
        } catch (error) {
          console.error("Error showing cache statistics:", error);
        }
      }
      
      // Update visualizations with cache data
      initializeVisualizationsWithCacheData();
    }
    
    return true;
  } catch (error) {
    console.error("Failed to load cache data in background:", error);
    return false;
  }
}

/**
 * Initialize all visualizations with empty data
 * @returns {Object} - Object containing initialized components
 */
export function initializeAllVisualizations() {
  console.log("🔵 Initializing all visualizations with empty data");
  
  try {
    // Initialize reference scatter plot
    const scatterComponent = initializeReferenceScatterPlot();
    
    // Initialize user scatter plot
    const userScatterComponent = initializeUserScatterPlot();
    
    // Initialize map visualization
    const mapComponent = initializeMapVisualization();
    
    // Return initialized components
    return {
      scatterComponent,
      userScatterComponent,
      mapComponent,
      errors: []
    };
  } catch (error) {
    console.error("❌ Error initializing visualizations:", error);
    return {
      scatterComponent: null,
      userScatterComponent: null,
      mapComponent: null,
      errors: [error]
    };
  }
}

/**
 * Initialize reference scatter plot with empty data
 * @returns {Object} - Initialized scatter component
 */
function initializeReferenceScatterPlot() {
  const referenceContainer = document.getElementById('scatter-container');
  if (!referenceContainer) {
    console.warn("⚠️ Reference container not found");
    return null;
  }
  
  try {
    // Clear container
    referenceContainer.innerHTML = '';
    
    // Initialize with empty data
    const scatterComponent = window.createUmapScatterPlot(
      'scatter-container',
      [],
      { title: 'Reference UMAP' }
    );
    
    console.log("✅ Reference scatter plot initialized with empty data");
    return scatterComponent;
  } catch (error) {
    console.error("❌ Error initializing reference scatter plot:", error);
    return null;
  }
}

/**
 * Initialize user scatter plot with empty data
 * @returns {Object} - Initialized user scatter component
 */
function initializeUserScatterPlot() {
  const userContainer = document.getElementById('user-scatter-container');
  if (!userContainer) {
    console.warn("⚠️ User container not found");
    return null;
  }
  
  try {
    // Clear container
    userContainer.innerHTML = '';
    
    // Initialize with empty data
    const userScatterComponent = window.createUserScatterPlot(
      'user-scatter-container',
      [],
      { title: 'User Sequence UMAP' }
    );
    
    console.log("✅ User scatter plot initialized with empty data");
    return userScatterComponent;
  } catch (error) {
    console.error("❌ Error initializing user scatter plot:", error);
    return null;
  }
}

/**
 * Initialize map visualization with empty data
 * @returns {Object} - Initialized map component
 */
function initializeMapVisualization() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) {
    console.warn("⚠️ Map container not found");
    return null;
  }
  
  try {
    // Clear container
    mapContainer.innerHTML = '';
    
    // Initialize with empty data
    const mapComponent = window.createApiMap(
      'map-container',
      [],
      { title: 'Geographic Distribution' }
    );
    
    console.log("✅ Map visualization initialized with empty data");
    return mapComponent;
  } catch (error) {
    console.error("❌ Error initializing map visualization:", error);
    return null;
  }
}

/**
 * Update visualizations with API response data
 * @param {Array} data - API response data
 * @returns {boolean} - True if update was successful
 */
export function updateVisualizationsWithApiData(data) {
  console.log(`🔵 Updating visualizations with API data (${data?.length || 0} points)`);
  
  if (!data || data.length === 0) {
    console.warn("⚠️ No data provided for visualization update");
    return false;
  }
  
  try {
    // Transform data for visualization
    const transformedData = data.map(item => ({
      x: item.coordinates[0],
      y: item.coordinates[1],
      id: item.id || item.accession,
      accession: item.accession,
      metadata: item.metadata || {},
      isUserSeq: false,
      isSimilarSeq: false
    }));
    
    // Update reference scatter plot
    updateReferenceScatterPlot(transformedData);
    
    // Update map visualization
    updateMapVisualization(transformedData);
    
    // User scatter plot remains empty until user uploads sequences
    
    console.log("✅ Visualizations updated successfully with API data");
    return true;
  } catch (error) {
    console.error("❌ Error updating visualizations with API data:", error);
    return false;
  }
}

/**
 * Updates visualizations with cache data
 * @param {Array} cacheData - The data to update visualizations with
 * @returns {Object} Object containing updated components and any errors
 */
export function updateVisualizationsWithCacheData(cacheData = []) {
  const result = {
    scatterComponent: null,
    userScatterComponent: null,
    mapComponent: null,
    errors: []
  };

  try {
    // Update reference scatter plot
    const scatterContainer = getElementByID('scatter-container');
    if (scatterContainer) {
      console.log("🔍 DEBUG: Updating reference scatter plot");
      scatterContainer.innerHTML = '';
      result.scatterComponent = createUmapScatterPlot('scatter-container', cacheData, {
        title: 'Reference UMAP',
        width: scatterContainer.clientWidth,
        height: scatterContainer.clientHeight
      });
    }

    // Update user scatter plot (keep empty)
    const userScatterContainer = getElementByID('user-scatter-container');
    if (userScatterContainer) {
      console.log("🔍 DEBUG: Updating user scatter plot");
      userScatterContainer.innerHTML = '';
      result.userScatterComponent = createUserScatterPlot('user-scatter-container', [], {
        title: 'User Sequence UMAP',
        width: userScatterContainer.clientWidth,
        height: userScatterContainer.clientHeight
      });
    }

    // Update map visualization
    const mapContainer = getElementByID('map-container');
    if (mapContainer) {
      console.log("🔍 DEBUG: Updating map visualization");
      mapContainer.innerHTML = '';
      result.mapComponent = createApiMap('map-container', cacheData, {
        title: 'Geographic Distribution',
        width: mapContainer.clientWidth,
        height: mapContainer.clientHeight
      });
    }
  } catch (error) {
    console.error("❌ Error updating visualizations:", error);
    result.errors.push(error.message);
  }

  return result;
}

// Export all necessary functions
// export {
//   initializeDashboardEvents,
//   initializeVisualizationsWithCacheData as initializeAllVisualizations,
//   updateVisualizationsWithCacheData,
//   initializeVisualizationEvents,
//   loadCacheDataInBackground,
//   updateVisualizationsWithApiData
// };

// Also attach to window for backward compatibility
window.initializeDashboardEvents = initializeDashboardEvents;
window.initializeAllVisualizations = initializeVisualizationsWithCacheData;
window.updateVisualizationsWithCacheData = updateVisualizationsWithCacheData;
window.initializeVisualizationEvents = initializeVisualizationEvents;
window.loadCacheDataInBackground = loadCacheDataInBackground;
window.updateVisualizationsWithApiData = updateVisualizationsWithApiData; 