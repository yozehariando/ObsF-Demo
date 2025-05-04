/**
 * API Service for enhanced API integration
 * Handles API requests, configuration, and data transformation
 */

import * as d3 from 'd3'

// API configuration
const API_BASE_URL = 'http://dev.pathgen.ai/api/v1'

// Cache for sequences to avoid redundant API calls
let cachedSequences = null
let sequenceCoordinatesCache = {} // Cache for sequence coordinates by ID

// Export the cache for direct access from dashboard
window.apiCache = {
  getSequences: function () {
    return cachedSequences
  },
  getCacheStatus: function () {
    return {
      isCached: !!cachedSequences,
      count: cachedSequences ? cachedSequences.length : 0,
    }
  },
}

/**
 * Helper to create authorization headers
 * @param {string} apiKey - The API key
 * @returns {Object} Headers object or empty object if no key
 */
function getAuthHeaders(apiKey) {
  if (!apiKey) {
    console.warn('API Key is missing for authenticated request.')
    // Decide how to handle: throw error or allow request without auth?
    // Returning without the key will likely cause API errors anyway.
    return { accept: 'application/json' }
  }
  // --- REVERT TO USING X-API-Key ---
  return {
    accept: 'application/json',
    'X-API-Key': apiKey, // Use X-API-Key header
  }
  // --- END REVERT ---
}

/**
 * Configure API request with proper headers and parameters
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Object} Request configuration object
 */
function configureApiRequest(endpoint, params = {}) {
  // Build URL with query parameters
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  Object.keys(params).forEach((key) => {
    url.searchParams.append(key, params[key])
  })

  // Return fetch configuration
  return {
    url: url.toString(),
    options: {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    },
  }
}

/**
 * Fetch UMAP data from the API
 * @param {string} model - Model name (default: 'DNABERT-S')
 * @param {boolean} useMock - Whether to use mock data (default: false)
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Array>} Array of UMAP data points
 */
async function fetchUmapData(model = 'DNABERT-S', useMock = false, apiKey) {
  console.log('🔍 DEBUG: fetchUmapData called with params:', { model, useMock })

  // If useMock is true or we're in development environment, use mock data
  if (useMock || window.location.hostname === 'localhost') {
    console.log(
      'Using mock UMAP data (explicitly requested or running locally)'
    )
    return mockUmapData(500) // Generate 500 mock data points
  }

  // Check for API Key before making the actual call
  if (!apiKey) {
    console.error(
      '❌ fetchUmapData: API Key is required to fetch reference data.'
    )
    // Fallback to mock data if no key is provided
    console.warn('API Key missing, falling back to mock UMAP data.')
    return mockUmapData(500)
  }

  try {
    const apiUrl = `${API_BASE_URL}/pathtrack/umap/all?embedding_model=${encodeURIComponent(
      model
    )}&reduced=true`
    console.log(`Fetching UMAP data from ${apiUrl}`)
    console.log('🔍 DEBUG: API request headers:', getAuthHeaders(apiKey))

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: getAuthHeaders(apiKey),
    })

    console.log(
      '🔍 DEBUG: API response status:',
      response.status,
      response.statusText
    )

    if (!response.ok) {
      console.error('🔍 DEBUG: API request failed with details:', {
        status: response.status,
        statusText: response.statusText,
      })

      // Try to get error details from response
      let errorText = ''
      try {
        errorText = await response.text()
        console.error('🔍 DEBUG: API error response:', errorText)
      } catch (e) {
        console.error('🔍 DEBUG: Could not read error response body')
      }

      // Check if this is an API key authentication error
      if (
        response.status === 401 ||
        response.status === 403 ||
        (errorText && errorText.includes('API Key'))
      ) {
        console.warn(
          '🔍 DEBUG: API authentication error detected, using mock data'
        )
        return mockUmapData(500) // Generate 500 mock points
      }

      throw new Error(`API request failed with status ${response.status}`)
    }

    // Get the text response
    const text = await response.text()
    console.log(
      '🔍 DEBUG: API response text (first 200 chars):',
      text.substring(0, 200)
    )

    // Split the text by newlines and parse each line as JSON
    const jsonLines = text
      .split('\n')
      .filter((line) => line.trim() !== '') // Remove empty lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch (e) {
          console.warn('Failed to parse JSON line:', line)
          return null
        }
      })
      .filter((obj) => obj !== null) // Remove failed parses

    // Filter out metadata objects and keep only record objects
    const records = jsonLines.filter((obj) => obj.type === 'record')
    console.log('🔍 DEBUG: After parsing jsonLines:', {
      totalLines: jsonLines.length,
      validRecords: records.length,
    })

    console.log(`Received ${records.length} UMAP data points`)

    // If we got no valid records, fall back to mock data
    if (records.length === 0) {
      console.warn(
        '🔍 DEBUG: No valid records received from API, using mock data'
      )
      return mockUmapData(500)
    }

    return records
  } catch (error) {
    console.error('Error fetching UMAP data:', error)
    // Re-throw the error so the caller knows it failed, unless it's an auth error we already handled
    if (error.message.includes('API Authentication Error')) {
      // Fallback to mock only if specifically requested or unavoidable?
      // Or just let the error propagate up to `findAllMatchesInCache`
      console.warn('Authentication failed, cannot fetch UMAP data.')
      throw error // Let the caller handle the auth failure
    } else {
      console.log('Falling back to mock UMAP data due to non-auth error.')
      return mockUmapData(500)
    }
  }
}

/**
 * Transform API response for visualization
 * @param {Array} data - Raw API response data
 * @returns {Array} Transformed data ready for visualization
 */
function transformUmapData(data) {
  console.log('Transforming UMAP data', data.length, 'points')

  // Transform the data to match our expected format
  const transformed = data.map((item, index) => {
    // Extract date information for use as the value
    const dateValue =
      item.first_date && item.first_date !== 'Unknown'
        ? new Date(item.first_date).getFullYear() / 2023 // Normalize year to 0-1 range (assuming 2023 as max)
        : Math.random() // Fallback to random if no date

    // Ensure coordinates are valid numbers
    let x = 0,
      y = 0
    if (
      item.coordinates &&
      Array.isArray(item.coordinates) &&
      item.coordinates.length >= 2
    ) {
      x = parseFloat(item.coordinates[0])
      y = parseFloat(item.coordinates[1])

      // Apply some validation
      if (isNaN(x)) x = 0
      if (isNaN(y)) y = 0
    }

    return {
      // Use API ID or generate one if not available
      index: 5000 + index, // Use high index range to avoid conflicts
      id: item.sequence_hash || `umap-${index}`,
      // Use UMAP coordinates for both geographic and scatter plot
      latitude: y, // Use Y coordinate as latitude
      longitude: x, // Use X coordinate as longitude
      X: x, // X coordinate for scatter plot
      Y: y, // Y coordinate for scatter plot
      // Extract metadata
      DNA_mutation_code: item.accession || `UMAP-${index}`,
      random_float: dateValue, // Use date as value instead of random
      // Store original data
      metadata: {
        accessions: [item.accession],
        first_country: item.first_country || 'Unknown',
        first_year: item.first_date || 'Unknown',
      },
      country: item.first_country || 'Unknown',
      year: item.first_date || 'Unknown',
      accession: item.accession,
      // Flag as UMAP data
      isUmapData: true,
    }
  })

  console.log('Transformed data:', transformed.length, 'points')
  console.log('Sample point:', transformed[0])

  return transformed
}

/**
 * Fetch data from the API
 * @param {Object} config - Request configuration from configureApiRequest
 * @returns {Promise} Promise resolving to the API response
 */
async function fetchApiData(config) {
  try {
    const response = await fetch(config.url, config.options)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    // For JSONL responses, we need to handle streaming
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/x-ndjson')) {
      return parseJsonlStream(response)
    }

    // Regular JSON response
    return await response.json()
  } catch (error) {
    console.error('Error fetching API data:', error)
    throw error
  }
}

/**
 * Parse a streaming JSONL response
 * @param {Response} response - Fetch Response object
 * @returns {Promise<Array>} Promise resolving to array of parsed objects
 */
async function parseJsonlStream(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const results = []

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      // Process any remaining data in the buffer
      if (buffer.trim()) {
        try {
          results.push(JSON.parse(buffer.trim()))
        } catch (e) {
          console.warn('Error parsing final JSONL chunk:', e)
        }
      }
      break
    }

    // Decode the chunk and add to buffer
    buffer += decoder.decode(value, { stream: true })

    // Process complete lines
    const lines = buffer.split('\n')
    buffer = lines.pop() // Keep the last (potentially incomplete) line in the buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          results.push(JSON.parse(line))
        } catch (e) {
          console.warn('Error parsing JSONL line:', e)
        }
      }
    }
  }

  return results
}

/**
 * Generate mock UMAP data for testing
 * @param {number} count - Number of mock data points to generate (default: 100)
 * @returns {Array} Array of mock UMAP data points
 */
function mockUmapData(count = 100) {
  const mockData = []
  const countries = [
    'USA',
    'China',
    'India',
    'Brazil',
    'Russia',
    'Japan',
    'Germany',
    'UK',
    'France',
    'Italy',
  ]
  const years = [
    '2015-01-01',
    '2016-01-01',
    '2017-01-01',
    '2018-01-01',
    '2019-01-01',
    '2020-01-01',
    '2021-01-01',
    '2022-01-01',
    '2023-01-01',
  ]

  console.log(`Generating ${count} mock UMAP data points`)

  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 2 - 1) * 10
    const y = (Math.random() * 2 - 1) * 10

    mockData.push({
      type: 'record',
      sequence_hash: `mock-${i}`,
      accession: `MOCK-${i}`,
      coordinates: [x, y],
      first_country: countries[Math.floor(Math.random() * countries.length)],
      first_date: years[Math.floor(Math.random() * years.length)],
    })
  }

  return mockData
}

/**
 * Uploads a sequence for embedding
 * @param {File} file - FASTA file to upload
 * @param {string} model - Model to use for embedding (e.g., 'DNABERT-S')
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Object>} Job information including job_id
 */
async function uploadSequence(file, model, apiKey) {
  // Check for API Key
  if (!apiKey) {
    console.error('❌ uploadSequence: API Key is required.')
    throw new Error('API Key is required to upload sequence.')
  }
  try {
    console.log(`Uploading sequence using model: ${model}`)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    const response = await fetch(`${API_BASE_URL}/pathtrack/sequence/embed`, {
      method: 'POST',
      headers: {
        // --- Use X-API-Key (getAuthHeaders without 'accept') ---
        // FormData sets Content-Type automatically, don't need 'accept' here
        'X-API-Key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Check for auth error
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `API Authentication Error (${response.status}). Please check your API Key.`
        )
      }
      throw new Error(
        `Failed to upload sequence: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('Sequence upload successful, job ID:', data.job_id)
    return data
  } catch (error) {
    console.error('Error uploading sequence:', error)
    throw error // Re-throw to be caught by caller
  }
}

/**
 * Checks the status of a job
 * @param {string} jobId - Job ID to check
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Object>} Job status information
 */
async function checkJobStatus(jobId, apiKey) {
  // Check for API Key
  if (!apiKey) {
    console.error(`❌ checkJobStatus (${jobId}): API Key is required.`)
    throw new Error('API Key is required to check job status.')
  }
  try {
    console.log(`Checking status for job: ${jobId}`)

    const response = await fetch(`${API_BASE_URL}/pathtrack/jobs/${jobId}`, {
      method: 'GET',
      headers: getAuthHeaders(apiKey),
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Check for auth error
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `API Authentication Error (${response.status}). Please check your API Key.`
        )
      }
      throw new Error(
        `Failed to check job status: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('Job status:', data.status)
    return data
  } catch (error) {
    console.error('Error checking job status:', error)
    throw error // Re-throw
  }
}

/**
 * Get UMAP projection for a job
 * @param {string} jobId - The job ID for the uploaded sequence.
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Object>} - UMAP projection data
 */
async function getUmapProjection(jobId, apiKey) {
  // Check for API Key
  if (!apiKey) {
    console.error(`❌ getUmapProjection (${jobId}): API Key is required.`)
    throw new Error('API Key is required to get UMAP projection.')
  }
  try {
    console.log(`Getting UMAP projection for job ${jobId}`)

    // --- ALWAYS use 'job_id' as the query parameter name ---
    const url = `${API_BASE_URL}/pathtrack/sequence/umap?job_id=${encodeURIComponent(
      jobId
    )}`

    console.log(`Sending POST request to: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(apiKey),
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Check for auth error
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `API Authentication Error (${response.status}). Please check your API Key.`
        )
      }
      throw new Error(
        `Failed to get UMAP projection: ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('UMAP projection response:', data)

    // --- ADD DETAILED LOGGING ---
    console.log('DEBUG: Checking coordinates...')
    console.log('DEBUG: data exists?', !!data)
    console.log('DEBUG: data.result exists?', !!(data && data.result))
    console.log(
      'DEBUG: data.result.coordinates exists?',
      !!(data && data.result && data.result.coordinates)
    )
    if (data && data.result && data.result.coordinates) {
      console.log(
        'DEBUG: data.result.coordinates IS an array?',
        Array.isArray(data.result.coordinates)
      )
      console.log(
        'DEBUG: data.result.coordinates length:',
        data.result.coordinates.length
      )
    }
    // --- END DETAILED LOGGING ---

    // Extract coordinates
    if (
      data?.result?.coordinates &&
      Array.isArray(data.result.coordinates) &&
      data.result.coordinates.length >= 2
    ) {
      const [x, y] = data.result.coordinates
      console.log(`Extracted UMAP coordinates: (${x}, ${y})`)
      return { x, y, jobId: jobId, rawData: data }
    } else {
      console.warn("API response doesn't contain valid coordinates:", data)
      return {
        x: 0,
        y: 0,
        jobId: jobId,
        rawData: data,
        isPlaceholder: true,
      }
    }
  } catch (error) {
    console.error('Error getting UMAP projection:', error)
    throw error // Re-throw
  }
}

/**
 * Get similar sequences for a job ID from the API.
 * @param {string} jobId - The job ID for the uploaded sequence.
 * @param {Object} options - Options for the similarity query (e.g., n_results).
 * @param {string} apiKey - The API key for authentication
 * @returns {Promise<Object>} - The full API response object containing the results.
 */
async function getSimilarSequences(jobId, options = {}, apiKey) {
  // Check for API Key
  if (!apiKey) {
    console.error(`❌ getSimilarSequences (${jobId}): API Key is required.`)
    throw new Error('API Key is required to get similar sequences.')
  }
  try {
    console.log(
      `API Service: Getting similar sequences for job ${jobId} with options:`,
      options
    )

    const defaultOptions = {
      n_results: 10,
      min_distance: -1,
      max_year: 0,
      include_unknown_dates: false, // Match the setting used in the direct call
    }
    const queryOptions = { ...defaultOptions, ...options }

    const url = `${API_BASE_URL}/pathtrack/sequence/similar?job_id=${encodeURIComponent(
      jobId
    )}`
    console.log(`API Service: Sending POST request to: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // --- Need Content-Type for POST, merge with auth ---
        'Content-Type': 'application/json',
        ...getAuthHeaders(apiKey), // Merge auth headers
      },
      body: JSON.stringify({
        n_results: queryOptions.n_results,
        min_distance: queryOptions.min_distance,
        max_year: queryOptions.max_year,
        include_unknown_dates: queryOptions.include_unknown_dates,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Check for auth error
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `API Authentication Error (${response.status}). Please check your API Key.`
        )
      }
      console.error(
        `API Service: Error fetching similar sequences: ${response.status} - ${errorText}`
      )
      throw new Error(
        `Failed to get similar sequences: ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('API Service: Similar sequences raw response:', data)
    return data // Return full response object
  } catch (error) {
    console.error('API Service: Error in getSimilarSequences:', error)
    throw error // Re-throw error
  }
}

/**
 * Toggles the visibility of similarity connections
 * @param {Object} scatterComponent - The scatter plot component
 * @param {boolean} show - Whether to show or hide connections
 */
function toggleSimilarityConnections(scatterComponent, show = true) {
  try {
    // Get the SVG element - handle different component implementations
    let svg
    if (typeof scatterComponent.getSvg === 'function') {
      svg = scatterComponent.getSvg()
    } else if (scatterComponent.svg) {
      svg = scatterComponent.svg
    } else {
      const containerId = scatterComponent.containerId || scatterComponent.id
      if (containerId) {
        const container = document.getElementById(containerId)
        if (container) {
          svg = d3.select(container).select('svg')
        }
      }
    }

    if (!svg || (svg.empty && svg.empty())) {
      console.error('Could not find SVG element in scatter component')
      return
    }

    // Toggle visibility of all similarity connections
    svg
      .selectAll('.similarity-connection')
      .style('visibility', show ? 'visible' : 'hidden')
      .style('opacity', show ? 0.7 : 0)

    console.log(`${show ? 'Showed' : 'Hid'} similarity connections`)
  } catch (error) {
    console.error('Error toggling similarity connections:', error)
  }
}

export {
  configureApiRequest,
  fetchApiData,
  fetchUmapData,
  transformUmapData,
  mockUmapData,
  uploadSequence,
  checkJobStatus,
  getUmapProjection,
  getSimilarSequences,
  toggleSimilarityConnections,
}
