/**
 * Debug utilities for UMAP data cache
 * 
 * This module provides utilities for inspecting and debugging the UMAP data cache,
 * including functions to check accession numbers, inspect cache statistics, and more.
 */

/**
 * Debug utility to inspect the UMAP data cache
 * @param {Array} cache - The UMAP data cache to inspect
 * @returns {Object} Statistics about the cache
 */
export function inspectUmapDataCache(cache) {
  if (!cache || cache.length === 0) {
    console.log("🔎 INSPECT: umapDataCache is empty or null");
    return;
  }
  
  console.log(`🔎 INSPECT: umapDataCache contains ${cache.length} items`);
  
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
 * Debug utility to check if specific accession numbers exist in the UMAP data cache
 * @param {Array} cache - The UMAP data cache to check
 * @param {Array} accessionNumbers - Array of accession numbers to check
 */
export function checkAccessionExistence(cache, accessionNumbers) {
  if (!cache || cache.length === 0) {
    console.log("❌ CHECK: umapDataCache is empty or null");
    return;
  }
  
  console.log(`🔍 CHECK: Checking ${accessionNumbers.length} accession numbers against ${cache.length} cache items`);
  
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
 * Show detailed cache statistics
 * @param {Array} cache - The UMAP data cache to check
 */
export function showCacheDebugStats(cache) {
  if (!cache || cache.length === 0) {
    console.log('🔍 DEBUG: UMAP data cache is empty');
    return;
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
}

/**
 * Register global debugging utilities in the window object
 * @param {Array} cache - The UMAP data cache to use for debugging
 * @param {Function} refreshCache - Function to refresh the cache
 */
export function registerDebugUtilities(cache, refreshCache) {
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
    refreshCache().then(updatedCache => {
      console.log(`  - Force reload result: ${updatedCache.length} items`);
    }).catch(err => {
      console.error('  - Force reload failed:', err);
    });
    
    return 'Debug inspection complete. Check console for detailed output.';
  };
  
  // Add a utility for searching sequences
  window.findSequenceInCache = function(accessionQuery) {
    if (!cache || !accessionQuery) {
      console.log("❌ Cannot search: umapDataCache is empty or no query provided");
      return null;
    }
    
    console.log(`🔍 Searching for: "${accessionQuery}"`);
    
    // Try direct match
    const directMatch = cache.find(item => 
      item.accession === accessionQuery
    );
    
    if (directMatch) {
      console.log(`✅ Found direct match: ${directMatch.accession}`);
      return directMatch;
    }
    
    // Try partial matches
    console.log(`🔍 No direct match found, trying partial matches...`);
    
    const partialMatches = cache.filter(item => 
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
    
    const prefixMatches = cache.filter(item => 
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