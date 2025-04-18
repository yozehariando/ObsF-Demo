/**
 * Sequence Matcher Utilities
 * 
 * This module provides utilities for finding sequences in the UMAP data cache
 * using various matching strategies, improving the lookup success rate.
 */

/**
 * Improved version of findExactMatchesInCache that uses direct comprehensive search
 * instead of relying on the map lookup which might be missing some matches
 * @param {Array<string>} accessionNumbers - Array of accession numbers to search for
 * @param {Array<Object>} cache - UMAP data cache to search in
 * @returns {Array<Object>} - Array of objects with coordinates for the matched sequences
 */
export async function findAllMatchesInCache(accessionNumbers, cache) {
  console.log(`🔧 IMPROVED SEARCH: Searching for ${accessionNumbers.length} sequences using direct search`);
  
  if (!cache || !accessionNumbers) {
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
    let matches = cache.filter(item => 
      item.accession && item.accession === origAccession
    );
    
    // 2. Case-insensitive match
    if (matches.length === 0) {
      matches = cache.filter(item => 
        item.accession && item.accession.toLowerCase() === accLower
      );
    }
    
    // 3. Base name match (without version)
    if (matches.length === 0) {
      matches = cache.filter(item => 
        item.accession && item.accession.split('.')[0].toLowerCase() === accBase
      );
    }
    
    // 4. Without NZ_ prefix match
    if (matches.length === 0 && accWithoutPrefix) {
      matches = cache.filter(item => 
        item.accession && 
        (item.accession.toLowerCase() === accWithoutPrefix || 
        item.accession.split('.')[0].toLowerCase() === accWithoutPrefix)
      );
    }
    
    // 5. Includes match (more permissive)
    if (matches.length === 0) {
      matches = cache.filter(item => 
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

/**
 * Register debug utilities for the sequence matcher
 * @param {Array<Object>} cache - UMAP data cache to use for debugging
 */
export function registerSequenceMatcherDebug(cache) {
  // Add the function to window for testing in the console
  window.findAllMatchesInCache = (accessionNumbers) => findAllMatchesInCache(accessionNumbers, cache);
  
  // Make a utility function available for single sequence lookup
  window.findSequenceInCache = function(accessionQuery) {
    if (!cache || !accessionQuery) {
      console.log("❌ Cannot search: cache is empty or no query provided");
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
      console.log(`✅ Found ${prefixMatches.length} prefix matches:`);
      prefixMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`  ${idx+1}. ${match.accession}`);
      });
      return prefixMatches[0];
    }
    
    console.log(`❌ No matches found for "${accessionQuery}"`);
    return null;
  };
  
  console.log(`🔍 DEBUG: Added utility function 'findSequenceInCache()' to manually test accession numbers`);
  console.log(`  Usage example: findSequenceInCache('NZ_QTIX00000000')`);
} 