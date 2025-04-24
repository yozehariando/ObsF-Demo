/**
 * API Similarity Service
 *
 * This service handles similarity search functionality for DNA sequences.
 * It fetches and stores data from the 'all' endpoint and provides methods
 * for finding similar sequences to a user-uploaded sequence.
 */

import { fetchUmapData, getUmapProjection } from './api-service.js'

// Cache for storing the 'all' endpoint data
let allSequencesCache = null
let isFetchingAll = false
let fetchAllPromise = null

// Add debugging info and window access at the top of the file
// Make the sequence cache accessible via window for debugging
;(function () {
  // Store a reference to the sequence cache for direct access
  const cacheAccessor = {
    getCache: function () {
      // Return a reference to the actual cache variable
      return allSequencesCache
    },
    getCacheStatus: function () {
      return {
        isCached: !!allSequencesCache,
        count: allSequencesCache ? allSequencesCache.length : 0,
        isFetching: isFetchingAll,
      }
    },
    forceRefresh: async function () {
      try {
        const result = await fetchAllSequences(true)
        return {
          success: true,
          count: result.length,
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  }

  // Make it globally accessible for debugging
  window.sequenceCacheDebug = cacheAccessor

  // Also make it available on the window.apiCache object for dashboard integration
  if (!window.apiCache) {
    window.apiCache = {}
  }
  window.apiCache.getSequences = cacheAccessor.getCache
  window.apiCache.getCacheStatus = cacheAccessor.getCacheStatus
  window.apiCache.refreshCache = cacheAccessor.forceRefresh

  // Original module code starts here
})()

// Start fetching sequences as soon as the module loads
;(function initializeCache() {
  console.log('🚀 Initializing API cache from api-similarity-service.js xx')
  // Start fetching in background without waiting
  fetchAllSequences()
    .then((data) => {
      console.log(`✅ API cache initialized with ${data.length} sequences`)

      // Make sure window.apiCache exists and is properly connected
      if (!window.apiCache) {
        window.apiCache = {}
      }

      // Make sure our getters always return the latest data
      if (!window.apiCache.getSequences) {
        window.apiCache.getSequences = function () {
          return allSequencesCache
        }
      }

      if (!window.apiCache.getCacheStatus) {
        window.apiCache.getCacheStatus = function () {
          return {
            isCached: !!allSequencesCache,
            count: allSequencesCache ? allSequencesCache.length : 0,
            isFetching: isFetchingAll,
          }
        }
      }

      // Dispatch an event to notify other components that the cache is ready
      const cacheReadyEvent = new CustomEvent('api-cache-ready', {
        detail: { count: data.length },
      })
      window.dispatchEvent(cacheReadyEvent)

      // Also set a flag for components that don't use events
      window.apiCacheReady = true
    })
    .catch((error) => {
      console.error('❌ Error initializing API cache:', error)
    })
})()

/**
 * Fetch all sequences from the API and store them for similarity search
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Array>} - Promise resolving to the array of all sequences
 */
export async function fetchAllSequences(forceRefresh = false) {
  // Enhanced debugging
  console.log(
    '🔍 DEBUG: fetchAllSequences called with forceRefresh =',
    forceRefresh
  )
  console.log('🔍 DEBUG: current cache state:', {
    isFetchingAll,
    cacheExists: !!allSequencesCache,
    cacheSize: allSequencesCache ? allSequencesCache.length : 0,
  })

  // If we're already fetching, return the existing promise
  if (isFetchingAll && !forceRefresh) {
    console.log('Already fetching all sequences, returning existing promise')
    return fetchAllPromise
  }

  // If we have cached data and don't need to refresh, return it
  if (allSequencesCache && !forceRefresh) {
    console.log(
      'Using cached sequence data:',
      allSequencesCache.length,
      'sequences'
    )
    return allSequencesCache
  }

  // Set up the fetching state
  isFetchingAll = true

  // Create a new promise for the fetch operation
  fetchAllPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Fetching all sequences for similarity search...')

      // Use the fetchUmapData function from api-service.js
      const allData = await fetchUmapData()

      // Enhanced debugging - log API response
      console.log('🔍 DEBUG: API response for fetchUmapData:', {
        dataExists: !!allData,
        dataSize: allData ? allData.length : 0,
        sampleData: allData && allData.length > 0 ? allData[0] : null,
      })

      // Store in cache
      allSequencesCache = allData
      console.log(`Cached ${allData.length} sequences for similarity search`)

      // Reset fetching state
      isFetchingAll = false

      // Resolve with the data
      resolve(allData)
    } catch (error) {
      console.error('Error fetching all sequences:', error)

      // Reset fetching state
      isFetchingAll = false

      // Generate mock data as fallback
      console.log('Generating mock data as fallback')
      const mockData = generateMockData(100)

      // Store mock data in cache
      allSequencesCache = mockData

      // Resolve with mock data
      resolve(mockData)
    }
  })

  return fetchAllPromise
}

/**
 * Find sequences similar to a processed job
 * @param {string} jobId - The job ID from sequence processing
 * @param {Object} options - Options for similarity search
 * @returns {Promise<Array>} - Promise resolving to array of similar sequences
 */
export async function findSimilarSequencesForJob(jobId, options = {}) {
  try {
    console.log(`Finding similar sequences for job: ${jobId}`)

    // Default options
    const defaultOptions = {
      limit: 10,
      threshold: 0.7,
      useCoordinates: true, // Whether to use UMAP coordinates for similarity
    }

    // Merge with user options
    const searchOptions = { ...defaultOptions, ...options }

    // Get UMAP projection for the user sequence
    console.log(`Getting UMAP projection for job ${jobId}`)
    const umapProjection = await getUmapProjection(jobId)
    console.log('UMAP projection result:', umapProjection)

    // Extract coordinates from the API response
    let userCoordinates
    if (
      umapProjection &&
      umapProjection.result &&
      umapProjection.result.coordinates
    ) {
      // Format from API response
      userCoordinates = umapProjection.result.coordinates
    } else if (
      umapProjection &&
      umapProjection.x !== undefined &&
      umapProjection.y !== undefined
    ) {
      // Already in the expected format
      userCoordinates = [umapProjection.x, umapProjection.y]
    } else {
      console.error('Unexpected UMAP projection format:', umapProjection)
      throw new Error('Invalid UMAP projection data received from API')
    }

    console.log(
      `User sequence coordinates: [${userCoordinates[0]}, ${userCoordinates[1]}]`
    )

    // Create a user sequence object with the coordinates
    const userSequence = {
      id: jobId,
      x: userCoordinates[0],
      y: userCoordinates[1],
      isUserSequence: true,
    }

    // Fetch all reference sequences if not already cached
    console.log('Fetching reference sequences for similarity search')
    const referenceSequences = await fetchAllSequences()
    console.log(`Found ${referenceSequences.length} reference sequences`)

    // Find similar sequences using the local data
    console.log('Finding similar sequences based on UMAP coordinates')
    const similarSequences = findSimilarSequences(
      userSequence,
      referenceSequences,
      searchOptions
    )
    console.log(`Found ${similarSequences.length} similar sequences`)

    return similarSequences
  } catch (error) {
    console.error('Error finding similar sequences for job:', error)

    // Generate mock data as fallback
    console.log('Generating mock similar sequences as fallback')
    return generateMockSimilarSequences(options.limit || 10)
  }
}

/**
 * Find sequences similar to a user sequence
 * @param {Object} userSequence - User sequence with coordinates
 * @param {Array} referenceSequences - Array of reference sequences
 * @param {Object} options - Search options
 * @returns {Array} - Array of similar sequences
 */
export function findSimilarSequences(
  userSequence,
  referenceSequences = null,
  options = {}
) {
  try {
    console.log('Finding similar sequences for:', userSequence)

    // Default options
    const defaultOptions = {
      limit: 10,
      threshold: 0.7,
      useCoordinates: true,
    }

    // Merge with user options
    const searchOptions = { ...defaultOptions, ...options }
    console.log('Search options:', searchOptions)

    // If no reference sequences provided, use the cached ones
    if (!referenceSequences) {
      if (!allSequencesCache || allSequencesCache.length === 0) {
        throw new Error(
          'No reference sequences available for similarity search'
        )
      }
      referenceSequences = allSequencesCache
    }

    // Make sure we have coordinates for the user sequence
    if (
      searchOptions.useCoordinates &&
      (userSequence.x === undefined || userSequence.y === undefined)
    ) {
      throw new Error(
        'User sequence must have x and y coordinates for similarity search'
      )
    }

    // Calculate similarity based on UMAP distance
    const similarSequences = referenceSequences
      .filter((seq) => {
        // Skip sequences without coordinates
        if (
          seq.coordinates === undefined &&
          (seq.x === undefined || seq.y === undefined)
        ) {
          return false
        }

        // Get coordinates (handle different formats)
        const refX =
          seq.x !== undefined ? seq.x : seq.coordinates ? seq.coordinates[0] : 0
        const refY =
          seq.y !== undefined ? seq.y : seq.coordinates ? seq.coordinates[1] : 0

        // Calculate Euclidean distance
        const distance = Math.sqrt(
          Math.pow(userSequence.x - refX, 2) +
            Math.pow(userSequence.y - refY, 2)
        )

        // Calculate similarity (inverse of distance, normalized)
        const similarity = 1 / (1 + distance)

        // Store distance and similarity on the sequence
        seq.distance = distance
        seq.similarity = similarity
        seq.x = refX
        seq.y = refY

        // Filter by threshold
        return similarity >= searchOptions.threshold
      })
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (descending)
      .slice(0, searchOptions.limit) // Limit results

    console.log(`Found ${similarSequences.length} similar sequences`)

    return similarSequences
  } catch (error) {
    console.error('Error in findSimilarSequences:', error)
    return []
  }
}

/**
 * Generate mock data for testing
 * @param {number} count - Number of mock data points to generate
 * @returns {Array} Array of mock data points
 */
function generateMockData(count = 100) {
  const mockData = []
  const countries = [
    'USA',
    'China',
    'UK',
    'Brazil',
    'India',
    'Japan',
    'Germany',
    'France',
  ]
  const years = ['2018', '2019', '2020', '2021', '2022', '2023']

  for (let i = 0; i < count; i++) {
    mockData.push({
      id: `mock-${i}`,
      sequence_hash: `hash-${i}`,
      accession: `ACC${i}`,
      coordinates: [Math.random() * 20 - 10, Math.random() * 20 - 10],
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      first_country: countries[Math.floor(Math.random() * countries.length)],
      first_date: years[Math.floor(Math.random() * years.length)],
      isReference: true,
    })
  }

  console.log(`Generated ${mockData.length} mock data points`)
  return mockData
}

/**
 * Generate mock similar sequences for testing
 * @param {number} count - Number of mock sequences to generate
 * @returns {Array} Array of mock similar sequences
 */
function generateMockSimilarSequences(count = 5) {
  const mockSequences = []
  const countries = [
    'USA',
    'China',
    'UK',
    'Brazil',
    'India',
    'Japan',
    'Germany',
    'France',
  ]
  const years = ['2018', '2019', '2020', '2021', '2022', '2023']

  for (let i = 0; i < count; i++) {
    mockSequences.push({
      id: `mock-seq-${i}`,
      sequence_hash: `mock-hash-${i}`,
      accession: `MOCK${i}`,
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      similarity: 0.9 - i * 0.05, // Decreasing similarity
      first_country: countries[Math.floor(Math.random() * countries.length)],
      first_date: years[Math.floor(Math.random() * years.length)],
      isReference: true,
    })
  }

  console.log('Generated mock similar sequences:', mockSequences)
  return mockSequences
}
