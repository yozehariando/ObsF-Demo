# Module Import Troubleshooting Guide

## Common Import Issues

### Failed to Fetch Dynamically Imported Module

#### Symptoms
Error message such as:
```
TypeError: Failed to fetch dynamically imported module: 
http://127.0.0.1:3000/_import/visualization/umap-visualization.js?sha=8b8c56dea3f18e7cf2278e9ce0f40de8ef093af8d429c19f20e04ad714b8422e
```

#### Causes
1. **Missing module file** - The imported module doesn't exist at the specified path
2. **Missing dependency** - The module exists but imports another module that doesn't exist
3. **Syntax error** - There's a syntax error in the module that prevents it from being parsed
4. **Network issue** - The server cannot serve the requested file

#### Solutions

1. **Check the module exists**
   ```bash
   ls -la path/to/module.js
   ```

2. **Check the module's dependencies**
   ```bash
   grep "from " path/to/module.js
   ```

3. **Create missing dependency modules**
   - Identify which imported modules don't exist
   - Create those modules with appropriate functionality

4. **Test the fix**
   - Refresh the page
   - Check console for any remaining errors

### Recent Fixed Issues

#### Missing error-handler.js Module

**Problem:** The `umap-visualization.js` module was importing a non-existent `error-handler.js` file:
```javascript
import { handleError } from '../utils/error-handler.js';
```

**Solution:** Created the missing `error-handler.js` module with comprehensive error handling capabilities:
- Implemented `handleError` function for standardized error handling
- Added user-friendly notifications
- Created fallback mechanisms
- Added additional utility functions:
  - `safeExecute` for safely executing functions
  - `safeExecuteAsync` for safely executing async functions
  - `createError` for creating detailed error objects

**Benefits:**
1. Fixed the module import error
2. Enhanced error handling across the application
3. Improved user experience with better error notifications
4. Added resilience through fallback mechanisms

## Preventing Import Issues

1. **Use module validation tools** like ESLint to detect missing imports
2. **Implement CI checks** that validate all imports before deployment
3. **Use TypeScript** for better type checking and import validation
4. **Create comprehensive tests** that exercise all code paths

## Debugging Techniques

1. **Chrome DevTools Network Tab**
   - Check the Network tab for failed requests
   - Look for 404 errors on module imports

2. **Console Error Details**
   - Expand error objects in console for more information
   - Look for the specific module path that failed to load

3. **Module Dependency Mapping**
   - Create a visual map of module dependencies
   - Identify circular dependencies or missing modules

4. **Incremental Testing**
   - Comment out imports one by one to identify the problematic one
   - Add modules back incrementally to validate fixes 

## Visualization Initialization Issues

### Blank Panels in Dashboard

#### Symptoms
- Dashboard loads without errors, but shows blank panels
- Console logs show successful data fetching but no visualizations
- Data appears to be in the cache but is not displayed

#### Causes
1. **Timing Issues** - Event handlers for cache initialization aren't properly triggered
2. **Container ID Mismatch** - Code is trying to access elements with incorrect IDs
3. **Data Format Issues** - The cached data format doesn't match what the visualization expects
4. **D3.js Initialization Failure** - D3 visualizations fail to initialize correctly

#### Solutions

1. **Force Initialization**
   - Use the debug panel in the bottom right corner to force initialization
   - Press Shift+Alt+F keyboard shortcut to trigger manual initialization
   - Check console logs for detailed error messages

2. **Check Container IDs**
   - Ensure the visualization container IDs in HTML match those in JavaScript
   - Make sure containers exist in the DOM before trying to create visualizations

3. **Verify Data Format**
   - Check that coordinates are properly accessed (e.g., `item.coordinates[0]` vs `item.x`)
   - Log sample data objects to verify structure matches what visualizations expect

4. **Browser Refresh**
   - Sometimes a full page reload is needed for proper initialization
   - Try clearing browser cache if the issue persists

### Recently Fixed Issues

#### Visualization Not Showing Despite Cache Loading

**Problem:** Dashboard showed blank panels despite logs showing successful data loading (7889 sequences).

**Cause Analysis:**
1. The `initializeVisualizationsWithCacheData` function was looking for containers with IDs that didn't match the HTML
2. The function wasn't being properly called after cache initialization
3. Data format in the cache didn't match what visualizations expected (coordinates array vs. direct x,y properties)

**Solution:**
1. Fixed container ID references to match actual HTML elements
2. Added direct initialization through `directInitializeFromApiCache()` function
3. Enhanced data transformation to handle both coordinate formats
4. Added fallback initialization after a timeout if visualizations aren't created
5. Added debug panel with force initialization button and keyboard shortcut (Shift+Alt+F)

**Benefits:**
1. More robust visualization initialization
2. Better error handling and logging
3. User-accessible recovery mechanisms
4. Improved debugging capabilities

## Advanced Debugging Techniques

### Logging Data at Key Points

Add strategic `console.log()` statements at key points to track:
- When data is fetched and cached
- When visualization initialization is triggered
- Container references before visualization creation 
- Data format and sample data points

### Force Initialization with Custom Events

Create a custom event to force visualization initialization:
```javascript
document.dispatchEvent(new CustomEvent('force-visualizations-update'));
```

### Check DOM Element Status

Verify that containers exist and are accessible:
```javascript
console.log(document.getElementById('scatter-container')); // Should not be null
console.log(document.getElementById('user-scatter-container')); // Should not be null
console.log(document.getElementById('map-container')); // Should not be null
``` 