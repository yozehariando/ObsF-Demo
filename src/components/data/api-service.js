/**
 * API Service for enhanced API integration
 * Handles API requests, configuration, and data transformation
 */

import * as d3 from 'd3'

// API configuration
const API_BASE_URL = 'http://54.169.186.71/api/v1'
const API_KEY = 'test_key'

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
        'X-API-Key': API_KEY,
      },
    },
  }
}

/**
 * Fetch UMAP data from the API
 * @param {string} model - Model name (default: 'DNABERT-S')
 * @param {boolean} useMock - Whether to use mock data (default: false)
 * @returns {Promise<Array>} Array of UMAP data points
 */
async function fetchUmapData(model = 'DNABERT-S', useMock = false) {
  console.log('🔍 DEBUG: fetchUmapData called with params:', { model, useMock })

  // If useMock is true or we're in development environment, use mock data
  if (useMock || window.location.hostname === 'localhost') {
    console.log(
      'Using mock UMAP data (explicitly requested or running locally)'
    )
    return mockUmapData(500) // Generate 500 mock data points
  }

  try {
    const apiUrl = `${API_BASE_URL}/pathtrack/umap/all?embedding_model=${encodeURIComponent(
      model
    )}&reduced=true`
    console.log(`Fetching UMAP data from ${apiUrl}`)
    console.log('🔍 DEBUG: API request headers:', {
      'X-API-Key': API_KEY,
      accept: 'application/json',
    })

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY,
      },
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
    // Fall back to mock data if API fails
    console.log('Falling back to mock UMAP data')
    return mockUmapData(500) // Generate 500 mock data points
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
 * @returns {Promise<Object>} Job information including job_id
 */
async function uploadSequence(file, model) {
  try {
    console.log(`Uploading sequence using model: ${model}`)

    // Create form data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    // Make API request
    const response = await fetch(`${API_BASE_URL}/pathtrack/sequence/embed`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to upload sequence: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('Sequence upload successful, job ID:', data.job_id)
    return data
  } catch (error) {
    console.error('Error uploading sequence:', error)
    throw error
  }
}

/**
 * Checks the status of a job
 * @param {string} jobId - Job ID to check
 * @returns {Promise<Object>} Job status information
 */
async function checkJobStatus(jobId) {
  try {
    console.log(`Checking status for job: ${jobId}`)

    // Make API request
    const response = await fetch(`${API_BASE_URL}/pathtrack/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to check job status: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('Job status:', data.status)
    return data
  } catch (error) {
    console.error('Error checking job status:', error)
    throw error
  }
}

/**
 * Get UMAP projection for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - UMAP projection data
 */
async function getUmapProjection(jobId) {
  try {
    console.log(`Getting UMAP projection for job ${jobId}`)

    const url = `${API_BASE_URL}/pathtrack/sequence/umap?job_id=${encodeURIComponent(
      jobId
    )}`
    console.log(`Sending POST request to: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
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

    // Extract coordinates from the response
    // The API returns coordinates in the result.coordinates array
    if (
      data &&
      data.result &&
      data.result.coordinates &&
      Array.isArray(data.result.coordinates) &&
      data.result.coordinates.length >= 2
    ) {
      const [x, y] = data.result.coordinates
      console.log(`Extracted UMAP coordinates: (${x}, ${y})`)

      return {
        x: x,
        y: y,
        jobId: jobId,
        rawData: data,
      }
    } else {
      console.warn("API response doesn't contain valid coordinates:", data)
      // Return placeholder coordinates if not found
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
    throw error
  }
}

/**
 * Get similar sequences for a job ID from the API.
 * @param {string} jobId - The job ID for the uploaded sequence.
 * @param {Object} options - Options for the similarity query (e.g., n_results).
 * @returns {Promise<Object>} - The full API response object containing the results.
 */
async function getSimilarSequences(jobId, options = {}) {
  try {
    console.log(
      `API Service: Getting similar sequences for job ${jobId} with options:`,
      options
    )

    // Default options (aligning with the direct call in index.md)
    const defaultOptions = {
      n_results: 10,
      min_distance: -1,
      max_year: 0,
      include_unknown_dates: false, // Match the setting used in the direct call
    }

    // Merge with user options
    const queryOptions = { ...defaultOptions, ...options }

    // Prepare request URL with job_id in the query string
    const url = `${API_BASE_URL}/pathtrack/sequence/similar?job_id=${encodeURIComponent(
      jobId
    )}`
    console.log(`API Service: Sending POST request to: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      // Send options in the body as per the direct call structure
      body: JSON.stringify({
        n_results: queryOptions.n_results,
        min_distance: queryOptions.min_distance,
        max_year: queryOptions.max_year,
        include_unknown_dates: queryOptions.include_unknown_dates,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `API Service: Error fetching similar sequences: ${response.status} - ${errorText}`
      )
      throw new Error(
        `Failed to get similar sequences: ${response.status} - ${errorText}`
      )
    }

    // Parse the full JSON response
    const data = await response.json()
    console.log('API Service: Similar sequences raw response:', data)

    // Return the full response object as received from the API
    // The calling function (handleJobCompletion) will handle the 'result' field
    return data
  } catch (error) {
    console.error('API Service: Error in getSimilarSequences:', error)
    // Return a default error structure or null to indicate failure
    // Returning null might be simpler for the caller to check
    return null
    // Alternatively, re-throw the error if the caller should handle it:
    // throw error;
  }
}

/**
 * Gets embedding data for a job
 * @param {string} jobId - Job ID to get embedding data for
 * @returns {Promise<Object>} Embedding data
 */
async function getEmbedding(jobId) {
  try {
    console.log(`Getting embedding data for job: ${jobId}`)

    const response = await fetch(
      `${API_BASE_URL}/pathtrack/embedding/${jobId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Error getting embedding data: ${response.status} ${errorText}`
      )
    }

    const data = await response.json()
    console.log(
      `Received embedding data with ${data.embedding.length} dimensions`
    )
    return data
  } catch (error) {
    console.error('Error getting embedding data:', error)
    throw error
  }
}

/**
 * Fetch and cache all sequences for similarity search
 * @returns {Promise<Array>} Array of all sequences
 */
async function fetchAllSequences() {
  try {
    if (cachedSequences) {
      console.log('Using cached sequences')
      return cachedSequences
    }

    console.log('Fetching all sequences for similarity search')
    const sequences = await fetchUmapData()

    // Cache the sequences
    cachedSequences = sequences
    console.log(`Cached ${sequences.length} sequences for similarity search`)

    return sequences
  } catch (error) {
    console.error('Error fetching all sequences:', error)
    throw error
  }
}

/**
 * Find similar sequences for a job
 * @param {string} jobId - Job ID to find similar sequences for
 * @param {Object} options - Options for similarity search
 * @param {number} options.limit - Maximum number of similar sequences to return
 * @param {number} options.threshold - Similarity threshold (0-1)
 * @returns {Promise<Array>} Array of similar sequences
 */
async function findSimilarSequencesForJob(jobId, options = {}) {
  try {
    console.log(`Finding similar sequences for job: ${jobId}`)

    // Default options
    const defaultOptions = {
      limit: 10,
      threshold: 0.7,
    }

    // Merge with user options
    const searchOptions = { ...defaultOptions, ...options }

    // Get embedding for the job
    const embeddingData = await getEmbedding(jobId)
    const userEmbedding = embeddingData.embedding

    // Make sure we have all sequences
    const allSequences = await fetchAllSequences()

    // Find similar sequences
    const similarSequences = await findSimilarSequences(
      userEmbedding,
      allSequences,
      searchOptions
    )

    console.log(`Found ${similarSequences.length} similar sequences`)
    return similarSequences
  } catch (error) {
    console.error('Error finding similar sequences for job:', error)
    throw error
  }
}

/**
 * Find similar sequences based on embedding
 * @param {Array} embedding - Embedding vector to compare against
 * @param {Array} sequences - Array of sequences to search
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of similar sequences
 */
async function findSimilarSequences(embedding, sequences, options) {
  try {
    console.log(`Finding similar sequences among ${sequences.length} sequences`)

    // Get UMAP projection for the embedding
    const umapProjection = await getUmapProjectionForEmbedding(embedding)

    // Calculate similarity for each sequence
    const similarSequences = sequences
      .map((seq) => {
        // Skip sequences without coordinates
        if (
          !seq.coordinates ||
          !Array.isArray(seq.coordinates) ||
          seq.coordinates.length < 2
        ) {
          return null
        }

        // Calculate Euclidean distance in UMAP space
        const distance = calculateEuclideanDistance(
          [umapProjection.x, umapProjection.y],
          [seq.coordinates[0], seq.coordinates[1]]
        )

        // Convert distance to similarity (inverse relationship)
        // Normalize to 0-1 range where 1 is most similar
        const similarity = 1 / (1 + distance)

        return {
          id: seq.sequence_hash,
          x: seq.coordinates[0],
          y: seq.coordinates[1],
          similarity,
          accession: seq.accession,
          first_country: seq.first_country,
          first_date: seq.first_date,
        }
      })
      .filter((seq) => seq !== null && seq.similarity >= options.threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit)

    return similarSequences
  } catch (error) {
    console.error('Error finding similar sequences:', error)
    throw error
  }
}

/**
 * Calculate Euclidean distance between two points
 * @param {Array} point1 - First point coordinates
 * @param {Array} point2 - Second point coordinates
 * @returns {number} Euclidean distance
 */
function calculateEuclideanDistance(point1, point2) {
  const squaredDiffs = point1.map((coord, i) => {
    const diff = coord - point2[i]
    return diff * diff
  })

  const sumSquaredDiffs = squaredDiffs.reduce((sum, diff) => sum + diff, 0)
  return Math.sqrt(sumSquaredDiffs)
}

/**
 * Get UMAP projection for an embedding
 * @param {Array} embedding - Embedding vector
 * @returns {Promise<Object>} UMAP projection
 */
async function getUmapProjectionForEmbedding(embedding) {
  // This is a mock implementation
  // In a real implementation, you would send the embedding to the API
  // and get back the UMAP projection

  // For now, we'll just return random coordinates
  return {
    x: Math.random() * 10 - 5,
    y: Math.random() * 10 - 5,
  }
}

/**
 * Visualizes connections between a user sequence and similar sequences
 * @param {Object} scatterComponent - The scatter plot component
 * @param {Object} userSequence - The user's sequence data
 * @param {Array} similarSequences - Array of similar sequences
 * @param {Object} options - Visualization options
 */
function visualizeSimilarityConnections(
  scatterComponent,
  userSequence,
  similarSequences,
  options = {}
) {
  console.log('Visualizing similarity connections')

  try {
    // Default options
    const defaultOptions = {
      lineColor: 'rgba(255, 0, 0, 0.3)',
      lineWidth: 1,
      minSimilarity: 0,
      maxConnections: 10,
    }

    // Merge with user options
    const visualOptions = { ...defaultOptions, ...options }

    // Check if the component is valid
    if (!scatterComponent) {
      console.error('Invalid scatter component')
      return
    }

    // Get the SVG element - handle different component implementations
    let svg
    if (typeof scatterComponent.getSvg === 'function') {
      // If the component has a getSvg method, use it
      svg = scatterComponent.getSvg()
    } else if (scatterComponent.svg) {
      // If the component has an svg property, use it
      svg = scatterComponent.svg
    } else {
      // Try to find the SVG element within the component's container
      const containerId = scatterComponent.containerId || scatterComponent.id
      if (containerId) {
        const container = document.getElementById(containerId)
        if (container) {
          svg = d3.select(container).select('svg')
        }
      }

      // If we still don't have an SVG, try one more approach
      if (!svg || svg.empty()) {
        // Try to get the container element directly
        const container =
          scatterComponent.container ||
          (scatterComponent.element
            ? d3.select(scatterComponent.element)
            : null)

        if (container) {
          svg = container.select('svg')
        }
      }
    }

    // If we still couldn't find the SVG, log an error and return
    if (!svg || (svg.empty && svg.empty())) {
      console.error('Could not find SVG element in scatter component')
      return
    }

    // Check if we have valid user sequence and similar sequences
    if (
      !userSequence ||
      !similarSequences ||
      !Array.isArray(similarSequences) ||
      similarSequences.length === 0
    ) {
      console.warn('No valid sequences to visualize connections')
      return
    }

    // Remove any existing connections
    svg.selectAll('.similarity-connection').remove()

    // Get the scales from the component
    let xScale, yScale

    if (typeof scatterComponent.getScales === 'function') {
      const scales = scatterComponent.getScales()
      xScale = scales.x
      yScale = scales.y
    } else {
      // Try to access scales directly
      xScale = scatterComponent.xScale || scatterComponent.x
      yScale = scatterComponent.yScale || scatterComponent.y
    }

    // If we still don't have scales, try to recreate them
    if (!xScale || !yScale) {
      console.warn(
        'Could not find scales in scatter component, attempting to recreate'
      )

      // Get the dimensions of the SVG
      const width = parseInt(svg.attr('width'), 10) || 500
      const height = parseInt(svg.attr('height'), 10) || 400

      // Create simple scales based on the data
      const allPoints = [userSequence, ...similarSequences]
      const xExtent = d3.extent(allPoints, (d) => d.X || d.x || 0)
      const yExtent = d3.extent(allPoints, (d) => d.Y || d.y || 0)

      xScale = d3
        .scaleLinear()
        .domain(xExtent)
        .range([50, width - 50])

      yScale = d3
        .scaleLinear()
        .domain(yExtent)
        .range([height - 50, 50])
    }

    // Filter and sort similar sequences
    const filteredSequences = similarSequences
      .filter((seq) => seq.similarity >= visualOptions.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, visualOptions.maxConnections)

    // Get user sequence coordinates
    const userX = xScale(userSequence.X || userSequence.x || 0)
    const userY = yScale(userSequence.Y || userSequence.y || 0)

    // Create a group for the connections
    const connectionsGroup = svg
      .append('g')
      .attr('class', 'similarity-connections')

    // Draw connections
    filteredSequences.forEach((seq) => {
      // Get sequence coordinates
      const seqX = xScale(seq.X || seq.x || 0)
      const seqY = yScale(seq.Y || seq.y || 0)

      // Calculate line opacity based on similarity
      const opacity = seq.similarity || 0.5

      // Draw the connection line
      connectionsGroup
        .append('line')
        .attr('class', 'similarity-connection')
        .attr('x1', userX)
        .attr('y1', userY)
        .attr('x2', seqX)
        .attr('y2', seqY)
        .attr('stroke', visualOptions.lineColor)
        .attr('stroke-width', visualOptions.lineWidth)
        .attr('stroke-opacity', opacity)
        .attr('data-source', userSequence.id)
        .attr('data-target', seq.id)
        .attr('data-similarity', seq.similarity)
    })

    console.log(`Drew ${filteredSequences.length} similarity connections`)
    return connectionsGroup
  } catch (error) {
    console.error('Error visualizing similarity connections:', error)
    return null
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

/**
 * Highlight a similar sequence in the visualization
 * @param {string} sequenceId - ID of the sequence to highlight
 * @param {boolean} highlight - Whether to highlight (true) or unhighlight (false)
 */
function highlightSimilarSequence(sequenceId, highlight = true) {
  try {
    console.log(
      `${highlight ? 'Highlighting' : 'Unhighlighting'} sequence: ${sequenceId}`
    )

    // Highlight in scatter plot
    const scatterPoints = d3.selectAll('.scatter-point')
    scatterPoints
      .filter((d) => d && d.id === sequenceId)
      .transition()
      .duration(200)
      .attr('r', highlight ? 8 : 5)
      .style('fill', highlight ? '#ff0000' : null)
      .style('stroke', highlight ? '#000000' : null)
      .style('stroke-width', highlight ? 2 : 1)

    // Highlight in map
    const mapPoints = d3.selectAll('.map-point')
    mapPoints
      .filter((d) => d && d.id === sequenceId)
      .transition()
      .duration(200)
      .attr('r', highlight ? 8 : 5)
      .style('fill', highlight ? '#ff0000' : null)
      .style('stroke', highlight ? '#000000' : null)
      .style('stroke-width', highlight ? 2 : 1)

    // Highlight connection lines - safely check for data structure
    const connectionLines = d3.selectAll('.similarity-connection')
    connectionLines
      .filter(function (d) {
        // Safely check if this line connects to our target sequence
        if (!d) return false

        // Different possible data structures for connection lines
        if (d.target && d.target.id === sequenceId) return true
        if (d.targetId === sequenceId) return true
        if (d.id === sequenceId) return true

        // For debugging
        if (d.target) console.log('Connection line target:', d.target)

        return false
      })
      .transition()
      .duration(200)
      .style('stroke-width', highlight ? 3 : 1)
      .style('stroke-opacity', highlight ? 0.8 : 0.3)
  } catch (error) {
    console.error(
      `Error ${highlight ? 'highlighting' : 'unhighlighting'} sequence:`,
      error
    )
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
  getEmbedding,
  fetchAllSequences,
  findSimilarSequencesForJob,
  findSimilarSequences,
  visualizeSimilarityConnections,
  highlightSimilarSequence,
  toggleSimilarityConnections,
}
