/**
 * Debug Integration Module
 * 
 * This module centralizes the integration of all debugging utilities
 * from various modules into the application.
 */

import { registerDebugUtilities } from '../utils/debug-utils.js';
import { registerSequenceMatcherDebug, findAllMatchesInCache } from './sequence-matcher.js';
import { 
  getUmapDataCache, 
  initializeAndGetUmapDataCache, 
  createDebugUmapCacheUtil 
} from './cache-manager.js';

/**
 * Export findAllMatchesInCache directly for use in dashboard code
 */
export { findAllMatchesInCache };

/**
 * Register all debug utilities in one place
 * @param {Object} options - Options for debug registration
 * @param {Function} options.fetchUmapData - Function to fetch UMAP data if needed
 * @param {Function} options.fetchAllSequences - Alternative function to fetch sequences
 */
export function registerAllDebugUtilities(options = {}) {
  console.log('🔧 DEBUG: Registering all debug utilities');
  
  // Get current cache or initialize it if not available
  const currentCache = getUmapDataCache() || [];
  
  // Create refresh function that uses the cache manager module
  const refreshCache = async () => {
    return initializeAndGetUmapDataCache({
      forceRefresh: true,
      ...options
    });
  };
  
  // Register debug utilities from debug-utils.js
  registerDebugUtilities(currentCache, refreshCache);
  
  // Register sequence matcher debug utilities
  registerSequenceMatcherDebug(currentCache);
  
  // Create and register the cache debug utility
  window.debugUmapCache = createDebugUmapCacheUtil(() => refreshCache());
  
  console.log('🔧 DEBUG: All debug utilities registered and available in console');
  console.log('🔧 DEBUG: Use window.debugUmapCache() to inspect cache status');
} 