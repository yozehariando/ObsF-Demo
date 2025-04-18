/**
 * UMAP Cache Manager Module
 * 
 * This module provides utilities for managing, inspecting, and debugging the UMAP data cache.
 * It includes functions for inspecting the cache, checking for the existence of accession numbers,
 * and displaying cache statistics.
 */

// Internal cache reference for module-level management
let _umapDataCache = null;

/**
 * Initialize and get the UMAP data cache
 * @param {Object} options - Options for getting the cache
 * @param {boolean} options.forceRefresh - Whether to force a cache refresh
 * @param {Function} options.fetchUmapData - Function to fetch UMAP data if needed
 * @param {Function} options.fetchAllSequences - Alternative function to fetch sequences
 * @returns {Promise<Array>} - Array of UMAP data with coordinates
 */
export async function initializeAndGetUmapDataCache(options = {}) {
  const { 
    forceRefresh = false,
    fetchUmapData = null,
    fetchAllSequences = null
  } = options;
  
  // Return existing cache if available and no refresh requested
  if (_umapDataCache && _umapDataCache.length > 0 && !forceRefresh) {
    console.log(`Using existing UMAP data cache with ${_umapDataCache.length} sequences`);
    return _umapDataCache;
  }
  
  console.log('Initializing UMAP data cache...');
  
  // Initialize empty cache
  _umapDataCache = [];
  
  try {
    // Try to get data from various sources in priority order
    let allData = null;
    
    // 1. Try window.apiCache first (with retries)
    if (window.apiCache && typeof window.apiCache.getSequences === 'function') {
      console.log('🔍 Attempting to access UMAP data from window.apiCache');
      
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        allData = window.apiCache.getSequences();
        const cacheStatus = window.apiCache.getCacheStatus();
        
        if (allData && allData.length > 0) {
          console.log(`✅ Successfully retrieved ${allData.length} sequences from window.apiCache on attempt ${retryCount + 1}`);
          break; // Success - exit the loop
        } else {
          console.log(`⏳ No data in window.apiCache on attempt ${retryCount + 1}, waiting...`);
          
          if (cacheStatus && cacheStatus.isFetching) {
            console.log('⏳ API cache is currently being fetched, waiting for completion...');
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      }
    }
    
    // 2. Try fetchAllSequences if direct access didn't work
    if (!allData || allData.length === 0) {
      if (fetchAllSequences && typeof fetchAllSequences === 'function') {
        console.log('🔍 Attempting to use cached sequences from fetchAllSequences function');
        allData = await fetchAllSequences();
        console.log(`${allData?.length || 0} sequences retrieved from existing cache`);
      }
    }
    
    // 3. Try direct fetchUmapData call as fallback
    if (!allData || allData.length === 0) {
      if (fetchUmapData && typeof fetchUmapData === 'function') {
        console.log('🔍 Falling back to direct fetchUmapData call');
        allData = await fetchUmapData('DNABERT-S', false);
        console.log(`${allData?.length || 0} sequences fetched from API`);
      }
    }
    
    // 4. Last resort - force refresh the API cache
    if ((!allData || allData.length === 0) && window.apiCache && typeof window.apiCache.refreshCache === 'function') {
      console.log('🔍 Attempting to force refresh the API cache...');
      const refreshResult = await window.apiCache.refreshCache();
      
      if (refreshResult.success) {
        allData = window.apiCache.getSequences();
        console.log(`${allData?.length || 0} sequences retrieved after cache refresh`);
      }
    }
    
    // Process and transform the data for our cache
    if (allData && allData.length > 0) {
      allData.forEach(seq => {
        if (seq) {
          let sequenceId = seq.sequence_hash || seq.id;
          let coordinates = seq.coordinates;
          
          if (sequenceId && coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
            _umapDataCache.push({
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
      
      console.log(`✅ Successfully cached ${_umapDataCache.length} sequences with coordinates`);
      
      // Inspect the cache for debugging
      if (_umapDataCache.length > 0) {
        inspectUmapDataCache(_umapDataCache);
      }
    } else {
      console.error('❌ No data available from any source for UMAP data cache');
    }
    
    // If we still have no data, create a fallback mock cache
    if (_umapDataCache.length === 0) {
      console.warn('⚠️ Creating fallback mock cache for development purposes');
      
      for (let i = 0; i < 100; i++) {
        _umapDataCache.push({
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
      console.log(`Created ${_umapDataCache.length} fallback sequences`);
    }
    
    return _umapDataCache;
  } catch (error) {
    console.error('❌ Error initializing UMAP data cache:', error);
    
    // Create a fallback cache on error
    if (_umapDataCache.length === 0) {
      for (let i = 0; i < 100; i++) {
        _umapDataCache.push({
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
      console.log(`Created ${_umapDataCache.length} fallback sequences for cache after error`);
    }
    
    return _umapDataCache;
  }
}

/**
 * Get the current UMAP data cache
 * @returns {Array|null} - Current UMAP data cache or null if not initialized
 */
export function getUmapDataCache() {
  return _umapDataCache;
}

/**
 * Inspect the UMAP data cache and return statistics
 * @param {Array} cache - The UMAP data cache to inspect
 * @returns {Object} Statistics about the cache
 */
export function inspectUmapDataCache(cache) {
  if (!cache || cache.length === 0) {
    console.log("🔎 INSPECT: UMAP data cache is empty or null");
    return {
      totalItems: 0,
      withAccession: 0,
      uniqueAccessions: 0,
      prefixCounts: {}
    };
  }
  
  console.log(`🔎 INSPECT: UMAP data cache contains ${cache.length} items`);
  
  // Sample the first few items
  console.log("🔎 INSPECT: First 5 items in cache:");
  cache.slice(0, 5).forEach((item, idx) => {
    console.log(`  Item ${idx}:`, {
      id: item.id,
      accession: item.accession,
      coordinates: [item.x, item.y],
      metadata: item.metadata
    });
  });
  
  // Count items with accession
  const withAccession = cache.filter(item => item.accession).length;
  console.log(`🔎 INSPECT: ${withAccession} items have accession property (${((withAccession/cache.length)*100).toFixed(1)}%)`);
  
  // Get all unique accession numbers
  const accessions = new Set();
  cache.forEach(item => {
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
    totalItems: cache.length,
    withAccession,
    uniqueAccessions: accessions.size,
    prefixCounts
  };
}

/**
 * Check if specific accession numbers exist in the UMAP data cache
 * @param {Array} accessionNumbers - Array of accession numbers to check
 * @param {Array} cache - The UMAP data cache to search in
 * @returns {Object} Results of the search with match counts
 */
export function checkAccessionExistence(accessionNumbers, cache) {
  if (!cache || cache.length === 0) {
    console.log("❌ CHECK: UMAP data cache is empty or null");
    return {
      checked: 0,
      found: 0,
      notFound: accessionNumbers.length
    };
  }
  
  console.log(`🔍 CHECK: Checking ${accessionNumbers.length} accession numbers against ${cache.length} cache items`);
  
  const results = {
    checked: accessionNumbers.length,
    found: 0,
    notFound: 0,
    matchTypes: {
      direct: 0,
      caseInsensitive: 0,
      base: 0,
      prefix: 0,
      none: 0
    }
  };
  
  // For each accession number, check if it exists in the cache
  accessionNumbers.forEach(accessionNumber => {
    // Direct match
    const directMatch = cache.find(item => item.accession === accessionNumber);
    
    // Case-insensitive match
    const caseInsensitiveMatch = !directMatch ? cache.find(item => 
      item.accession && item.accession.toLowerCase() === accessionNumber.toLowerCase()
    ) : null;
    
    // Base match (without version number)
    const baseAccession = accessionNumber.split('.')[0];
    const baseMatch = (!directMatch && !caseInsensitiveMatch) ? cache.find(item => {
      if (!item.accession) return false;
      const itemBase = item.accession.split('.')[0];
      return itemBase === baseAccession;
    }) : null;
    
    // Prefix match
    const prefixMatch = (!directMatch && !caseInsensitiveMatch && !baseMatch) ? cache.find(item => {
      if (!item.accession) return false;
      return item.accession.startsWith(baseAccession) || baseAccession.startsWith(item.accession);
    }) : null;
    
    console.log(`🔍 CHECK: Accession "${accessionNumber}":`);
    console.log(`  - Direct match: ${directMatch ? 'YES' : 'NO'}`);
    console.log(`  - Case-insensitive match: ${caseInsensitiveMatch ? 'YES (' + caseInsensitiveMatch.accession + ')' : 'NO'}`);
    console.log(`  - Base match (without version): ${baseMatch ? 'YES (' + baseMatch.accession + ')' : 'NO'}`);
    console.log(`  - Prefix match: ${prefixMatch ? 'YES (' + prefixMatch.accession + ')' : 'NO'}`);
    
    if (directMatch) {
      results.found++;
      results.matchTypes.direct++;
      
      console.log(`  - Found direct match: ${directMatch.accession}`);
      console.log(`  - Has coordinates array: ${!!(directMatch.coordinates && Array.isArray(directMatch.coordinates))}`);
      console.log(`  - Has x,y properties: ${!!(typeof directMatch.x === 'number' && typeof directMatch.y === 'number')}`);
      
      // Log coordinates if available
      if (directMatch.coordinates && Array.isArray(directMatch.coordinates)) {
        console.log(`  - Coordinates: [${directMatch.coordinates.join(', ')}]`);
      } else if (typeof directMatch.x === 'number' && typeof directMatch.y === 'number') {
        console.log(`  - X,Y properties: (${directMatch.x}, ${directMatch.y})`);
      }
    } else if (caseInsensitiveMatch) {
      results.found++;
      results.matchTypes.caseInsensitive++;
      
      console.log(`  - Found case-insensitive match: ${caseInsensitiveMatch.accession}`);
    } else if (baseMatch) {
      results.found++;
      results.matchTypes.base++;
      
      console.log(`  - Found base match: ${baseMatch.accession}`);
    } else if (prefixMatch) {
      results.found++;
      results.matchTypes.prefix++;
      
      console.log(`  - Found prefix match: ${prefixMatch.accession}`);
    } else {
      results.notFound++;
      results.matchTypes.none++;
    }
  });
  
  console.log(`🔍 CHECK: Summary: Found ${results.found} out of ${accessionNumbers.length} accession numbers`);
  console.log(`  - Direct matches: ${results.matchTypes.direct}`);
  console.log(`  - Case-insensitive matches: ${results.matchTypes.caseInsensitive}`);
  console.log(`  - Base matches: ${results.matchTypes.base}`);
  console.log(`  - Prefix matches: ${results.matchTypes.prefix}`);
  console.log(`  - Not found: ${results.matchTypes.none}`);
  
  return results;
}

/**
 * Show debug statistics about the UMAP data cache
 * @param {Array} cache - The UMAP data cache to analyze
 * @returns {Object} Statistics about the cache
 */
export function showCacheDebugStats(cache) {
  if (!cache || cache.length === 0) {
    console.log('🔍 DEBUG: UMAP data cache is empty');
    return {
      totalEntries: 0,
      entriesWithAccession: 0
    };
  }
  
  // Count entries with accession numbers
  const entriesWithAccession = cache.filter(item => item && item.accession).length;
  
  console.log('🔍 DEBUG: UMAP data cache statistics:');
  console.log(`  - Total entries in cache: ${cache.length}`);
  console.log(`  - Entries with accession numbers: ${entriesWithAccession}`);
  
  // Log accession format distribution
  const accessionFormats = {};
  cache.forEach(item => {
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
  
  return {
    totalEntries: cache.length,
    entriesWithAccession,
    accessionFormats
  };
}

/**
 * Register debug utilities on the window object for debugging in the browser console
 * @param {Array} cache - The UMAP data cache to debug
 * @param {Function} refreshCache - Function to refresh the cache
 */
export function registerDebugUtilities(cache, refreshCache) {
  window.cacheDebugUtils = {
    inspect: () => inspectUmapDataCache(cache),
    checkAccession: (accessionNumbers) => checkAccessionExistence(
      Array.isArray(accessionNumbers) ? accessionNumbers : [accessionNumbers], 
      cache
    ),
    showStats: () => showCacheDebugStats(cache),
    refreshCache: refreshCache
  };
  
  console.log('🔧 DEBUG: Cache debug utilities registered on window.cacheDebugUtils');
  console.log('  - Usage examples:');
  console.log('    window.cacheDebugUtils.inspect()');
  console.log('    window.cacheDebugUtils.checkAccession("NZ_QTIX00000000")');
  console.log('    window.cacheDebugUtils.showStats()');
  console.log('    window.cacheDebugUtils.refreshCache()');
}

/**
 * Create a debug utility for checking the UMAP data cache status
 * @param {Function} getUmapDataCache - Function to get the UMAP data cache
 * @returns {Function} Debug utility function
 */
export function createDebugUmapCacheUtil(getUmapDataCache) {
  return function debugUmapCache() {
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
    
    // Get the current cache through the provided function
    const cache = window.umapDataCache;
    
    console.log('🔧 DEBUGGER: Checking umapDataCache:');
    if (cache) {
      console.log(`  - Cache exists: Yes`);
      console.log(`  - Cache size: ${cache.length}`);
      
      if (cache.length > 0) {
        console.log('  - First cache item:');
        console.log(cache[0]);
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
} 