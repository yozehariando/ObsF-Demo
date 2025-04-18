/**
 * API Service Module
 * 
 * Handles data fetching and transformation for DNA Mutation Dashboard.
 * Exposes global functions for use in Observable Framework.
 */

// Base API configuration
const API_CONFIG = {
  baseUrl: 'http://54.169.186.71/api/v1',
  endpoints: {
    umap: '/pathtrack/umap/all',
    sequences: '/pathtrack/sequence',
    jobs: '/pathtrack/jobs'
  },
  defaultModel: 'DNABERT-S',
  useMock: false, // Set to false to use real data
  apiKey: 'test_key'
};

/**
 * Fetch UMAP data from the API or return mock data
 * @param {string} model - Model name to use for data fetching
 * @param {boolean} useMock - Whether to use mock data (for development)
 * @returns {Promise<Object>} - The API response with UMAP data
 */
async function fetchUmapData(model = API_CONFIG.defaultModel, useMock = API_CONFIG.useMock) {
  console.log(`Fetching UMAP data for model: ${model}, useMock: ${useMock}`);
  
  // If useMock is true or we're in development environment and explicitly requested mock data, use mock data
  if (useMock === true || (window.location.hostname === 'localhost' && useMock !== false)) {
    console.log('Using mock UMAP data as requested');
    return {
      status: 'success',
      data: mockUmapData(150)
    };
  }
  
  try {
    const apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.umap}?embedding_model=${encodeURIComponent(model)}&reduced=true`;
    console.log(`Fetching UMAP data from API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_CONFIG.apiKey,
      },
      // Add cache control to avoid stale data
      cache: 'no-cache',
      // Add reasonable timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      console.error('API request failed with details:', {
        status: response.status,
        statusText: response.statusText
      });
      
      // Try to get error details from response
      let errorText = "";
      try {
        errorText = await response.text();
        console.error('API error response:', errorText);
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      // Check if this is an API key authentication error
      if (response.status === 401 || response.status === 403 || 
          (errorText && errorText.includes("API Key"))) {
        console.warn('API authentication error detected, falling back to mock data');
        return { data: mockUmapData(150) }; // Generate 150 mock points
      }
      
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Get the text response
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.warn('API returned empty response, falling back to mock data');
      return { data: mockUmapData(150) };
    }
    
    console.log('API response received, size:', text.length, 'chars');
    console.log('API response sample (first 200 chars):', text.substring(0, 200));
    
    // Try to parse as JSON first (in case it's a single JSON object)
    try {
      const jsonData = JSON.parse(text);
      console.log('Parsed response as single JSON object');
      
      if (jsonData.data && Array.isArray(jsonData.data)) {
        console.log(`Received ${jsonData.data.length} data points from API`);
        return jsonData;
      } else if (Array.isArray(jsonData)) {
        console.log(`Received ${jsonData.length} data points from API (array format)`);
        return { data: jsonData };
      }
    } catch (e) {
      // Not a single JSON object, continue with line-by-line parsing
      console.log('Response is not a single JSON object, parsing line by line');
    }
    
    // Split the text by newlines and parse each line as JSON
    const jsonLines = text
      .split('\n')
      .filter((line) => line.trim() !== '') // Remove empty lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn('Failed to parse JSON line:', line.substring(0, 100) + '...');
          return null;
        }
      })
      .filter((obj) => obj !== null); // Remove failed parses

    // Filter out metadata objects and keep only record objects
    const records = jsonLines.filter((obj) => obj.type === 'record' || obj.id || obj.accession);
    console.log(`Received ${records.length} UMAP data points after filtering`);
    
    // If we got no valid records, fall back to mock data
    if (records.length === 0) {
      console.warn('No valid records received from API, falling back to mock data');
      return { data: mockUmapData(150) };
    }
    
    return { data: records };
  } catch (error) {
    console.error('Error fetching UMAP data:', error);
    // Fall back to mock data if API fails
    console.log('Falling back to mock UMAP data due to error');
    return { data: mockUmapData(150) }; // Generate 150 mock data points
  }
}

/**
 * Transform raw UMAP data into a format suitable for visualization
 * @param {Array} data - Raw UMAP data from API
 * @returns {Array} - Transformed data ready for visualization
 */
function transformUmapData(data) {
  if (!data || !Array.isArray(data)) {
    console.error('Invalid UMAP data format:', data);
    return [];
  }
  
  console.log(`Transforming ${data.length} UMAP data points`);
  
  // Count how many points have geographic data
  const geoCount = data.filter(item => 
    (item.latitude && item.longitude) || 
    (item.geography && item.geography.coordinates)
  ).length;
  console.log(`Found ${geoCount} points with geographic coordinates`);
  
  return data.map(item => {
    // Ensure required properties exist
    const transformed = {
      id: item.id || item.accession || item.sequence_hash || `seq-${Math.random().toString(36).substring(2, 9)}`,
      x: item.x || (item.coordinates ? item.coordinates[0] : 0),
      y: item.y || (item.coordinates ? item.coordinates[1] : 0),
      country: item.country || item.first_country || 'Unknown',
      lineage: item.lineage || 'Unknown',
      clade: item.clade || '',
      date: item.date || item.first_date || '',
      value: item.value || Math.random()
    };
    
    // Add geographic coordinates if available
    if (item.latitude !== undefined && item.longitude !== undefined) {
      transformed.latitude = item.latitude;
      transformed.longitude = item.longitude;
    } else if (item.geography && item.geography.coordinates) {
      transformed.latitude = item.geography.coordinates[1];
      transformed.longitude = item.geography.coordinates[0];
    }
    
    return transformed;
  });
}

/**
 * Generate mock UMAP data for development
 * @param {number} count - Number of data points to generate
 * @returns {Array} - Array of mock data points
 */
function mockUmapData(count = 100) {
  console.log(`Generating ${count} mock UMAP data points`);
  
  // Country data with coordinates
  const countryData = [
    { name: 'USA', lat: 37.0902, lng: -95.7129 },
    { name: 'UK', lat: 55.3781, lng: -3.4360 },
    { name: 'China', lat: 35.8617, lng: 104.1954 },
    { name: 'India', lat: 20.5937, lng: 78.9629 },
    { name: 'Brazil', lat: -14.2350, lng: -51.9253 },
    { name: 'Japan', lat: 36.2048, lng: 138.2529 },
    { name: 'Germany', lat: 51.1657, lng: 10.4515 },
    { name: 'France', lat: 46.2276, lng: 2.2137 },
    { name: 'Italy', lat: 41.8719, lng: 12.5674 },
    { name: 'Canada', lat: 56.1304, lng: -106.3468 }
  ];
  const lineages = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
  const clades = ['20A', '20B', '20C', '20D', '20E', '20F', '20G', '20H', '20I', '20J'];
  const years = ['2015-01-01', '2016-01-01', '2017-01-01', '2018-01-01', '2019-01-01', '2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01'];
  
  const generateCoordinates = () => {
    // Generate random coordinates in UMAP space
    const x = (Math.random() * 2 - 1) * 10;
    const y = (Math.random() * 2 - 1) * 10;
    return [x, y];
  };
  
  const mockData = [];
  
  for (let i = 0; i < count; i++) {
    const coordinates = generateCoordinates();
    const countryIndex = Math.floor(Math.random() * countryData.length);
    const country = countryData[countryIndex];
    const lineage = lineages[Math.floor(Math.random() * lineages.length)];
    const clade = clades[Math.floor(Math.random() * clades.length)];
    const year = years[Math.floor(Math.random() * years.length)];
    
    // Add slight randomness to geographic coordinates to avoid overlap
    const latOffset = (Math.random() - 0.5) * 2; // ±1 degree
    const lngOffset = (Math.random() - 0.5) * 2; // ±1 degree
    
    mockData.push({
      type: 'record',
      sequence_hash: `mock-${i}`,
      accession: `MOCK-${i}`,
      coordinates: coordinates,
      first_country: country.name,
      first_date: year,
      lineage: lineage,
      clade: clade,
      // Add geographic coordinates
      latitude: country.lat + latOffset,
      longitude: country.lng + lngOffset,
      // Add value between 0-1 for coloring
      value: Math.random()
    });
  }
  
  return mockData;
}

/**
 * Process user sequence data
 * @param {string} sequenceData - Raw sequence data in FASTA format
 * @returns {Promise<Object>} - Processed sequence data
 */
async function processSequenceData(sequenceData) {
  console.log('Processing user sequence data');
  
  // In a real implementation, this would send the sequence to an API
  // For now, return mock data after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate mock processed data
      const userPoints = [
        {
          id: 'user-seq-1',
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          isUserSequence: true,
          similarity: 0.85,
          predictedCountry: 'USA'
        }
      ];
      
      const details = {
        id: 'user-seq-1',
        length: 29903,
        mutations: [
          { position: 241, reference: 'C', mutation: 'T', significance: 'high' },
          { position: 3037, reference: 'C', mutation: 'T', significance: 'low' },
          { position: 14408, reference: 'C', mutation: 'T', significance: 'medium' },
          { position: 23403, reference: 'A', mutation: 'G', significance: 'high' }
        ],
        similarSequences: [
          { id: 'EPI_ISL_123456', similarity: 0.982, country: 'USA' },
          { id: 'EPI_ISL_654321', similarity: 0.973, country: 'Canada' }
        ]
      };
      
      resolve({ userPoints, details });
    }, 1500);
  });
}

/**
 * Find similar sequences to a given query sequence
 * @param {string} queryId - ID of the query sequence
 * @param {Array} referenceData - Array of reference sequences
 * @returns {Promise<Array>} - Array of similar sequences with similarity scores
 */
async function findSimilarSequences(queryId, referenceData) {
  console.log(`Finding similar sequences to ${queryId}`);
  
  if (!referenceData || !Array.isArray(referenceData)) {
    console.error('Invalid reference data:', referenceData);
    return [];
  }
  
  // In a real implementation, this would call an API
  // For now, return mock data
  return new Promise(resolve => {
    setTimeout(() => {
      // Take a random subset of reference data
      const shuffled = [...referenceData].sort(() => 0.5 - Math.random());
      const similarSequences = shuffled.slice(0, 5).map(seq => ({
        ...seq,
        similarity: parseFloat((Math.random() * 0.2 + 0.8).toFixed(3))
      }));
      
      // Sort by similarity
      similarSequences.sort((a, b) => b.similarity - a.similarity);
      
      resolve(similarSequences);
    }, 500);
  });
}

/**
 * Calculate Euclidean distance between two points in UMAP space
 * @param {Object} point1 - First point with x, y coordinates
 * @param {Object} point2 - Second point with x, y coordinates
 * @returns {number} - Euclidean distance
 */
function calculateEuclideanDistance(point1, point2) {
  if (!point1 || !point2) return Infinity;
  
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  
  return Math.sqrt(dx * dx + dy * dy);
}

// Expose functions globally for use in Observable Framework
window.fetchUmapData = fetchUmapData;
window.transformUmapData = transformUmapData;
window.processSequenceData = processSequenceData;
window.findSimilarSequences = findSimilarSequences;
window.calculateEuclideanDistance = calculateEuclideanDistance;
window.mockUmapData = mockUmapData; 