// Data service component for DNA mutation dashboard
import * as d3 from 'd3'

// Function to load initial datasets
export async function loadInitialData() {
  try {
    // Check if we're in Observable environment
    const isObservable = typeof FileAttachment !== 'undefined'

    let geoData, scatterData
    let usedMockData = false

    if (isObservable) {
      try {
        // Try to load data using FileAttachment
        geoData = await FileAttachment('data/fake_latlon.csv').csv({
          typed: true,
        })
        scatterData = await FileAttachment('data/makeblob.csv').csv({
          typed: true,
        })
        console.log('Successfully loaded data using FileAttachment')
      } catch (fileError) {
        console.warn(
          'FileAttachment failed, using mock data:',
          fileError.message
        )
        // If FileAttachment fails, use mock data
        const mockData = generateMockData(50)
        geoData = mockData
        scatterData = mockData.map((d) => ({ index: d.index, X: d.X, Y: d.Y }))
        usedMockData = true
      }
    } else {
      try {
        // Non-Observable environment - use fetch
        const geoResponse = await fetch('data/fake_latlon.csv')
        const scatterResponse = await fetch('data/makeblob.csv')

        if (!geoResponse.ok || !scatterResponse.ok) {
          throw new Error('Failed to fetch data files')
        }

        geoData = d3.csvParse(await geoResponse.text(), d3.autoType)
        scatterData = d3.csvParse(await scatterResponse.text(), d3.autoType)
        console.log('Successfully loaded data using fetch')
      } catch (fetchError) {
        console.warn('Fetch failed, using mock data:', fetchError.message)
        // If fetch fails, use mock data
        const mockData = generateMockData(50)
        geoData = mockData
        scatterData = mockData.map((d) => ({ index: d.index, X: d.X, Y: d.Y }))
        usedMockData = true
      }
    }

    if (usedMockData) {
      console.log('Using mock data for visualization')
    } else {
      console.log(`Loaded ${geoData.length} geographic data points`)
      console.log(`Loaded ${scatterData.length} scatter plot data points`)
    }

    // Create a joined dataset by matching on index
    const combinedData = geoData.map((geo) => {
      // If we're using mock data, we already have X and Y
      if (usedMockData) {
        return geo
      }

      // Find matching scatter data
      const scatter = scatterData.find((s) => +s.index === +geo.index)

      return {
        ...geo,
        X: scatter
          ? scatter.X !== undefined
            ? +scatter.X
            : scatter.x !== undefined
            ? +scatter.x
            : null
          : null,
        Y: scatter
          ? scatter.Y !== undefined
            ? +scatter.Y
            : scatter.y !== undefined
            ? +scatter.y
            : null
          : null,
      }
    })

    return combinedData
  } catch (error) {
    console.error('Error loading initial data:', error)

    // Return mock data in case of error
    console.log('Falling back to mock data due to error')
    return generateMockData(50)
  }
}

// Function to generate mock data for testing or fallback
function generateMockData(count = 50) {
  const mockData = []

  for (let i = 0; i < count; i++) {
    // Generate random location in Southeast Asia
    const latitude = -15 + Math.random() * 40 // -15 to 25
    const longitude = 80 + Math.random() * 50 // 80 to 130

    // Generate random mutation code
    const mutationCode =
      `c.${Math.floor(Math.random() * 5000)}${
        ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]
      }>` + `${['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]}`

    // Generate random value
    const value = Math.random()

    // Generate random X,Y coordinates for scatter plot
    const X = Math.random() * 2 - 1 // Default to [-1, 1] range
    const Y = Math.random() * 2 - 1 // Default to [-1, 1] range

    // Create new data point
    mockData.push({
      index: i,
      latitude,
      longitude,
      DNA_mutation_code: mutationCode,
      random_float: value,
      X,
      Y,
    })
  }

  return mockData
}

// Function to generate X,Y coordinates for scatter plot based on existing data distribution
export function generateScatterCoordinates(currentData) {
  // Get valid data points with X,Y coordinates
  const validData = currentData.filter(
    (d) => d.X !== null && d.Y !== null && !isNaN(d.X) && !isNaN(d.Y)
  )

  // Default values if we can't determine the extent
  let x = Math.random() * 2 - 1 // Default to [-1, 1] range
  let y = Math.random() * 2 - 1 // Default to [-1, 1] range

  if (validData.length > 0) {
    const xExtent = d3.extent(validData, (d) => d.X)
    const yExtent = d3.extent(validData, (d) => d.Y)

    if (xExtent[0] !== undefined && xExtent[1] !== undefined) {
      x = xExtent[0] + Math.random() * (xExtent[1] - xExtent[0])
    }

    if (yExtent[0] !== undefined && yExtent[1] !== undefined) {
      y = yExtent[0] + Math.random() * (yExtent[1] - yExtent[0])
    }
  }

  return { X: x, Y: y }
}

// Function to fetch data from API
export async function fetchAPIData(currentData, apiCallCount) {
  try {
    // Call the real API endpoint
    const response = await fetch('https://be.asiapgi.dev/obs-f-demo')

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // Parse the JSON response
    const data = await response.json()
    let newApiCallCount = apiCallCount

    // Process the data to match our expected format
    return {
      data: data.map((item) => {
        // Generate X,Y coordinates for scatter plot
        const { X, Y } = generateScatterCoordinates(currentData)

        return {
          index: 2000 + newApiCallCount++,
          latitude: +item.latitude || 0,
          longitude: +item.longitude || 0,
          DNA_mutation_code:
            item.DNA_mutation_code ||
            `c.${Math.floor(Math.random() * 5000)}G>A`,
          random_float: +item.random_float || Math.random(),
          X, // Add generated X coordinate
          Y, // Add generated Y coordinate
        }
      }),
      newApiCallCount,
    }
  } catch (error) {
    console.error('Error fetching API data:', error)
    alert(`Failed to fetch data: ${error.message}`)
    return { data: [], newApiCallCount: apiCallCount } // Return empty array on error
  }
}

// Function to process CSV data
export function processCSVData(csvData, currentData, apiCallCount) {
  let newApiCallCount = apiCallCount

  return {
    data: csvData.map((row, i) => {
      // Generate X,Y coordinates if not present
      let X = row.X !== undefined ? +row.X : row.x !== undefined ? +row.x : null
      let Y = row.Y !== undefined ? +row.Y : row.y !== undefined ? +row.y : null

      // If X or Y is missing or invalid, generate new coordinates
      if (X === null || Y === null || isNaN(X) || isNaN(Y)) {
        const coords = generateScatterCoordinates(currentData)
        X = coords.X
        Y = coords.Y
      }

      return {
        index: 3000 + i,
        latitude: +row.latitude || 0,
        longitude: +row.longitude || 0,
        DNA_mutation_code:
          row.DNA_mutation_code || `c.${Math.floor(Math.random() * 5000)}G>A`,
        random_float: +row.random_float || Math.random(),
        X,
        Y,
      }
    }),
    newApiCallCount,
  }
}

// Function to generate a random mutation
export async function generateRandomMutation(currentData, apiCallCount) {
  // Generate random location in Southeast Asia
  const latitude = -15 + Math.random() * 40 // -15 to 25
  const longitude = 80 + Math.random() * 50 // 80 to 130

  // Generate random mutation code
  const mutationCode =
    `c.${Math.floor(Math.random() * 5000)}${
      ['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]
    }>` + `${['A', 'T', 'G', 'C'][Math.floor(Math.random() * 4)]}`

  // Generate random value
  const value = Math.random()

  // Generate random X,Y coordinates for scatter plot
  const { X, Y } = generateScatterCoordinates(currentData)

  // Create new data point
  const newPoint = {
    index: 1000 + apiCallCount,
    latitude,
    longitude,
    DNA_mutation_code: mutationCode,
    random_float: value,
    X,
    Y,
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    data: newPoint,
    newApiCallCount: apiCallCount + 1,
  }
}
