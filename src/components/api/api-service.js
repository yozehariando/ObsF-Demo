/**
 * API Service for enhanced API integration
 * Handles API requests, configuration, and data transformation
 */

// API configuration
const API_BASE_URL = 'http://54.169.186.71/api/v1'
const API_KEY = 'test_key'

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
  if (useMock) {
    console.log('Using mock UMAP data')
    return mockUmapData()
  }

  try {
    const apiUrl = `${API_BASE_URL}/pathtrack/umap/all?embedding_model=${encodeURIComponent(
      model
    )}&reduced=true`
    console.log(`Fetching UMAP data from ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY,
      },
    })
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    // Get the text response
    const text = await response.text()

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

    console.log(`Received ${records.length} UMAP data points`)
    return records
  } catch (error) {
    console.error('Error fetching UMAP data:', error)
    // Fall back to mock data if API fails
    console.log('Falling back to mock UMAP data')
    return mockUmapData()
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
 * Get a consistent color for a country
 * @param {string} country - Country name
 * @returns {string} Hex color code
 */
function getColorForCountry(country) {
  // Simple hash function to generate consistent colors
  if (!country) return '#cccccc' // Default gray for unknown

  let hash = 0
  for (let i = 0; i < country.length; i++) {
    hash = country.charCodeAt(i) + ((hash << 5) - hash)
  }

  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += ('00' + value.toString(16)).substr(-2)
  }

  return color
}

/**
 * Generate mock UMAP data for testing
 * @returns {Array} Mock UMAP data
 */
function mockUmapData() {
  const countries = [
    'USA',
    'China',
    'UK',
    'India',
    'Brazil',
    'South Africa',
    'Australia',
    'Japan',
  ]
  const years = ['2019', '2020', '2021', '2022', '2023']

  // Generate 100 mock data points
  const mockData = Array.from({ length: 100 }, (_, i) => {
    const country = countries[Math.floor(Math.random() * countries.length)]
    const year = years[Math.floor(Math.random() * years.length)]

    return {
      accession: `MOCK-${i.toString().padStart(5, '0')}`,
      sequence_hash: `hash-${i}`,
      coordinates: [
        Math.random() * 10 - 5, // X between -5 and 5
        Math.random() * 10 - 5, // Y between -5 and 5
      ],
      first_country: country,
      first_date: `${year}-${Math.floor(Math.random() * 12) + 1}-${
        Math.floor(Math.random() * 28) + 1
      }`,
    }
  })

  console.log('Generated mock data:', mockData.length, 'points')
  return mockData
}

export {
  configureApiRequest,
  fetchApiData,
  fetchUmapData,
  transformUmapData,
  mockUmapData,
}
