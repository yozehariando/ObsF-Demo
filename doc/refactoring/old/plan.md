# Dashboard Refactoring Implementation Plan

## Overview

This document outlines the specific steps needed to fix the `dashboard-new.md` implementation without modifying any files under the `/components` directory. The goal is to make `dashboard-new.md` work properly with the existing component interfaces that already work with `dashboard.md`.

## Important Note on Original File

⚠️ **IMPORTANT:** During the refactoring process, we should NOT modify the original `dashboard.md` file. This file serves as our reference implementation and should be preserved in its original state. 

If any bugs or issues are discovered in the original implementation:
- Document them in `doc/implementation-plan.md`
- Fix them ONLY in the new refactored implementation (`dashboard-new.md` and module files)
- Do NOT backport fixes to the original `dashboard.md`

This approach maintains a clean separation between the reference implementation and our refactored code.

## Current Issues

1. **Import Path Issues**
   - `dashboard-new.md` doesn't use proper relative paths with `./` prefix
   - Some imports are using absolute or root-relative paths that Observable Framework doesn't resolve correctly

2. **Initialization Sequence Problems**
   - `dashboard-new.md` wraps initialization in a `DOMContentLoaded` event listener
   - Observable Framework has its own execution order that's incompatible with this approach

3. **Cache Dependency**
   - Current implementation waits for cache to be ready before initializing visualizations
   - Original `dashboard.md` creates visualizations immediately with empty/sample data

4. **Visualization Initialization**
   - Missing direct D3.js initialization pattern that works in the original
   - Too much reliance on component APIs that might not work as expected in this context

5. **Event Handling Differences**
   - Event registration timing is different from the original
   - Some event handlers may be registered too late in the lifecycle

## Step-by-Step Fix Plan

### 1. Fix Import Paths

Update all import statements in `dashboard-new.md` to use proper relative paths:

```javascript
// INCORRECT
import { fetchUmapData } from '/components/api/api-service.js';
import { createUmapScatterPlot } from 'components/api-scatter-component.js';

// CORRECT
import { fetchUmapData } from './components/api/api-service.js';
import { createUmapScatterPlot } from './components/api-scatter-component.js';
```

### 2. Remove DOMContentLoaded Wrapper

Remove the `DOMContentLoaded` event listener wrapper and move the initialization code directly into the main code block:

```javascript
// INCORRECT
document.addEventListener('DOMContentLoaded', function() {
  // Initialization code
});

// CORRECT
// Initialization code directly in the main block
```

### 3. Use Direct Initialization Pattern

Follow the same initialization pattern as `dashboard.md` to create visualizations immediately:

```javascript
// Define state object first
const state = {
  originalData: [],
  currentData: [],
  selectedPoint: null,
  mapComponent: null,
  scatterComponent: null,
  userScatterComponent: null,
  // Additional state properties
};

// Make state globally available
window.state = state;

// Initialize visualizations directly
function initializeVisualizations() {
  try {
    // Create visualizations with empty/sample data
    state.scatterComponent = createUmapScatterPlot('scatter-container', [], {
      title: 'Reference Database UMAP'
    });
    
    state.userScatterComponent = createUserScatterPlot('user-scatter-container', []);
    
    state.mapComponent = createApiMap('map-container', []);
    
    // Log success
    console.log("✅ Visualizations initialized with empty data");
  } catch (error) {
    console.error("❌ Error initializing visualizations:", error);
  }
}

// Call initialization functions
initializeVisualizations();
```

### 4. Implement Background Cache Loading

Load the cache in the background and update visualizations when ready:

```javascript
// Load cache data in background
async function loadCacheData() {
  try {
    const apiData = await fetchUmapData('DNABERT-S', false);
    
    if (apiData && apiData.length > 0) {
      // Store data in cache
      window.apiCache = apiData;
      window.umapDataCache = apiData;
      
      // Transform and store data in state
      const transformedData = transformUmapData(apiData);
      state.originalData = [...transformedData];
      state.currentData = transformedData;
      
      // Update visualizations with real data
      updateVisualizationsWithApiData(apiData);
      
      // Dispatch cache-ready event
      const event = new CustomEvent('api-cache-ready', {
        detail: {
          count: apiData.length,
          data: apiData
        }
      });
      document.dispatchEvent(event);
    }
  } catch (error) {
    console.error("❌ Error loading cache data:", error);
  }
}

// Start loading cache data
loadCacheData();
```

### 5. Fix Event Handlers Registration

Ensure event handlers are registered at the right time:

```javascript
// Setup button event handlers
function setupButtonHandlers() {
  // Debug button
  const debugButton = document.getElementById('debug-button');
  if (debugButton) {
    debugButton.addEventListener('click', () => {
      console.log("🔍 DEBUG BUTTON CLICKED");
      console.log("State:", state);
      console.log("Cache Status:", {
        umapDataCache: window.umapDataCache?.length || 0,
        apiCache: window.apiCache?.length || 0
      });
    });
  }
  
  // Force Init button
  const forceInitButton = document.getElementById('force-init-button');
  if (forceInitButton) {
    forceInitButton.addEventListener('click', () => {
      console.log("🔄 FORCE INIT BUTTON CLICKED");
      
      if (window.apiCache && window.apiCache.length > 0) {
        updateVisualizationsWithApiData(window.apiCache);
      }
    });
  }
  
  // Other button handlers...
}

// Register event handlers
setupButtonHandlers();
```

### 6. Implement Fallback Mechanisms

Add fallback mechanisms for initialization errors:

```javascript
// Fallback visualization if component creation fails
function createEmergencyVisualization(container, data, options = {}) {
  if (!container) return null;
  
  console.log("⚠️ Using emergency visualization fallback");
  
  // Clear container
  container.innerHTML = '';
  
  // Set dimensions
  const width = container.clientWidth;
  const height = container.clientHeight || 450;
  
  // Create SVG with D3
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);
  
  // Add background
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#f9f9f9");
  
  // Add message if no data
  if (!data || data.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No data available. Data will appear here when loaded.");
  } else {
    // Basic visualization with data
    // ...
  }
  
  // Append SVG to container
  container.appendChild(svg.node());
  
  return {
    update: function(newData) {
      // Update logic
    }
  };
}
```

### 7. Add Error Handling

Improve error handling throughout the code:

```javascript
// Utility function to safely execute code with proper error handling
function safeExecute(fn, fallback, errorMessage) {
  try {
    return fn();
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, error);
    return fallback;
  }
}

// Example usage
state.scatterComponent = safeExecute(
  () => createUmapScatterPlot('scatter-container', []),
  createEmergencyVisualization(document.getElementById('scatter-container'), []),
  "Failed to create scatter plot"
);
```

## Implementation Order

1. **Import Paths Correction**
   - Fix all import statements first to ensure proper module loading

2. **Initialization Structure**
   - Remove DOMContentLoaded wrapper
   - Move initialization code to main block
   - Setup state object correctly

3. **Direct Visualization Creation**
   - Implement direct creation of visualizations with empty data
   - Ensure component references are stored in state

4. **Background Cache Loading**
   - Implement background cache loading
   - Add updating of visualizations when cache is ready

5. **Event Handlers Correction**
   - Fix event handler registration timing
   - Ensure proper event handling for cache-ready events

6. **Fallback Mechanisms**
   - Add emergency visualization functions
   - Implement error recovery mechanisms

7. **Testing & Verification**
   - Test the implementation with different scenarios
   - Verify that all features work as expected

## Success Criteria

The refactoring will be considered successful when:

1. `dashboard-new.md` loads and displays visualizations correctly
2. All three visualization panels (map, reference scatter, user scatter) appear on initial load
3. Visualizations update properly when API data is loaded
4. All interactive features (clicks, hovers, buttons) work correctly
5. No console errors appear during normal operation
6. The implementation works without modifying any files in the `/components` directory

## Backup Strategy

In case of issues, we'll maintain the following backup strategy:

1. Keep `dashboard.md` as the primary implementation until `dashboard-new.md` is fully tested
2. Document all changes made to `dashboard-new.md` for rollback if needed
3. Implement changes incrementally with testing after each major step

The goal is to make minimal, targeted changes to ensure that `dashboard-new.md` works with the existing component interfaces without requiring any changes to the component files themselves. 