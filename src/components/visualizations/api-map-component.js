/**
 * API-specific map component
 * A standalone implementation for geographic visualization of UMAP data.
 * This version aggregates sequences by country and displays country markers.
 */

import * as d3 from 'd3'
import { geoEquirectangular, geoPath, geoGraticule } from 'd3-geo'
import * as topojson from 'topojson-client'

/**
 * Create a map visualization for UMAP data, aggregating by country.
 * @param {string} containerId - ID of the container element
 * @param {Array} data - Initial data points (can be empty). Expected format includes sequence info with metadata like country and similarity.
 * @param {Object} options - Configuration options
 * @returns {Object} Map component API
 */
function createApiMap(containerId, data = [], options = {}) {
  const functionName = 'API Map (Country Aggregation)' // Name for logging
  console.log(`Creating ${functionName} for ${containerId}`)

  // Default options
  const defaults = {
    width: null,
    height: null,
    margin: { top: 10, right: 10, bottom: 30, left: 10 },
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    onPointClick: null,
    transitionDuration: 500,
    defaultOpacity: 0.7,
    highlightOpacity: 1.0,
    minRadius: 5,
    maxRadius: 30,
    legendHeight: 80,
    legendMargin: { top: 5, right: 20, bottom: 25, left: 20 },
    fallbackWidth: 600, // Fallback size if container size is 0
    fallbackHeight: 400, // Fallback size if container size is 0
  }

  // Merge provided options with defaults
  const config = { ...defaults, ...options }

  // --- Defensive Checks ---
  // Ensure legendHeight is a valid number
  config.legendHeight =
    typeof config.legendHeight === 'number' && !isNaN(config.legendHeight)
      ? config.legendHeight
      : defaults.legendHeight
  // Ensure legendMargin is a valid object
  config.legendMargin =
    typeof config.legendMargin === 'object' && config.legendMargin !== null
      ? { ...defaults.legendMargin, ...config.legendMargin }
      : defaults.legendMargin
  // --- End Defensive Checks ---

  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }

  // Get actual dimensions from container OR use fallbacks
  const containerWidth = container.clientWidth || config.fallbackWidth
  const containerHeight =
    container.clientHeight || config.fallbackHeight + config.legendHeight // Ensure fallback includes legend space

  const width = config.width || containerWidth
  // Calculate map height defensively
  let mapHeight = (config.height || containerHeight) - config.legendHeight
  if (isNaN(mapHeight) || mapHeight <= 0) {
    console.warn(
      `${functionName}: Calculated map height is invalid (${mapHeight}), using fallback.`
    )
    mapHeight = config.fallbackHeight // Use fallback map height
  }
  const totalSvgHeight = mapHeight + config.legendHeight // Recalculate total height

  // Calculate inner dimensions
  const innerWidth = width - config.margin.left - config.margin.right
  const innerHeight = mapHeight - config.margin.top - config.margin.bottom

  if (innerWidth <= 0 || innerHeight <= 0) {
    console.error(
      `${functionName}: Invalid calculated inner dimensions (w: ${innerWidth}, h: ${innerHeight}). Check container size and margins.`
    )
    // Optionally set minimum dimensions
    // innerWidth = Math.max(100, innerWidth);
    // innerHeight = Math.max(100, innerHeight);
    return null // Stop if dimensions are invalid
  }

  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, totalSvgHeight]) // Use total calculated height
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const g = svg
    .append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // --- Projection and Path ---
  const projection = geoEquirectangular().fitSize([innerWidth, innerHeight], {
    type: 'Sphere',
  })

  const pathGenerator = geoPath().projection(projection)
  const graticule = geoGraticule()

  // --- Map Background Elements ---
  g.append('path')
    .attr('class', 'sphere')
    .attr('d', pathGenerator({ type: 'Sphere' }))
    .attr('fill', '#f8f9fa')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 0.5)

  g.append('path')
    .attr('class', 'graticule')
    .attr('d', pathGenerator(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#eee')
    .attr('stroke-width', 0.5)

  // Groups for map layers
  const worldGroup = g.append('g').attr('class', 'world')
  const circlesGroup = g.append('g').attr('class', 'circles')

  // --- LEGEND INITIALIZATION ---
  // Ensure legend height calculation is valid
  const legendRectHeight = config.legendHeight + 15
  if (isNaN(legendRectHeight)) {
    console.error(
      `${functionName}: Invalid legend background height calculation.`
    )
    return null // Stop if calculation failed
  }

  const legendBackground = svg
    .append('rect')
    .attr('x', 0)
    .attr('y', mapHeight - 15) // Position relative to calculated map height
    .attr('width', width)
    .attr('height', legendRectHeight) // Use calculated valid height
    .attr('fill', '#f8f9fa')
    .attr('stroke', '#eee')
    .attr('stroke-width', 1)

  // Ensure legend group positioning calculation is valid
  const legendTranslateX = config.legendMargin.left
  const legendTranslateY = mapHeight + config.legendMargin.top
  if (isNaN(legendTranslateX) || isNaN(legendTranslateY)) {
    console.error(
      `${functionName}: Invalid legend group translation calculation (x: ${legendTranslateX}, y: ${legendTranslateY}).`
    )
    return null // Stop if calculation failed
  }

  const legendGroup = svg
    .append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendTranslateX},${legendTranslateY})`) // Use calculated valid translation
  // --- END LEGEND INITIALIZATION ---

  // Store world data
  let worldData = null
  let worldCountries = null

  // --- Tooltip ---
  const tooltip = d3
    .select('body') // Attach tooltip to body to avoid SVG clipping issues
    .append('div')
    .attr('class', 'map-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden') // Start hidden
    .style('opacity', 0) // Start fully transparent
    .style('background-color', 'rgba(255, 255, 255, 0.9)')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('padding', '8px 10px')
    .style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)')
    .style('font-family', 'sans-serif')
    .style('font-size', '12px')
    .style('pointer-events', 'none') // Important: prevents tooltip from blocking mouse events
    .style('z-index', 1000)
  // --- REMOVE CSS TRANSITION FOR DEBUGGING ---
  // .style('transition', 'opacity 0.2s ease-out, visibility 0.2s ease-out');

  // Explicit country coordinates (longitude, latitude)
  const countryCoordinates = {
    'United States': [-98.5795, 39.8283],
    China: [104.1954, 35.8617],
    Japan: [138.2529, 36.2048],
    'South Korea': [127.7669, 35.9078],
    'United Kingdom': [-3.436, 55.3781],
    Germany: [10.4515, 51.1657],
    France: [2.2137, 46.2276],
    Italy: [12.5674, 41.8719],
    Spain: [-3.7492, 40.4637],
    Canada: [-106.3468, 56.1304],
    Australia: [133.7751, -25.2744],
    India: [78.9629, 20.5937],
    Brazil: [-51.9253, -14.235],
    Russia: [105.3188, 61.524],
    'South Africa': [22.9375, -30.5595],
    Mexico: [-102.5528, 23.6345],
    Indonesia: [113.9213, -0.7893],
    Netherlands: [5.2913, 52.1326],
    Switzerland: [8.2275, 46.8182],
    Sweden: [18.6435, 60.1282],
    Belgium: [4.4699, 50.5039],
    Poland: [19.1451, 51.9194],
    Turkey: [35.2433, 38.9637],
    Denmark: [9.5018, 56.2639],
    Norway: [8.4689, 60.472],
    Finland: [25.7482, 61.9241],
    Greece: [21.8243, 39.0742],
    Portugal: [-8.2245, 39.3999],
    Ireland: [-8.2439, 53.4129],
    'Czech Republic': [15.473, 49.8175],
    Austria: [14.5501, 47.5162],
    Israel: [34.8516, 31.0461],
    Singapore: [103.8198, 1.3521],
    'New Zealand': [174.886, -40.9006],
    Vietnam: [108.2772, 14.0583],
    Thailand: [100.9925, 15.87],
    Malaysia: [101.9758, 4.2105],
    Philippines: [121.774, 12.8797],
    Pakistan: [69.3451, 30.3753],
    Bangladesh: [90.3563, 23.685],
    Egypt: [30.8025, 26.8206],
    Nigeria: [8.6753, 9.082],
    Kenya: [37.9062, -0.0236],
    Argentina: [-63.6167, -38.4161],
    Chile: [-71.543, -35.6751],
    Colombia: [-74.2973, 4.5709],
    Peru: [-75.0152, -9.19],
    Venezuela: [-66.5897, 6.4238],
    'Saudi Arabia': [45.0792, 23.8859],
    'United Arab Emirates': [53.8478, 23.4241],
    Iran: [53.688, 32.4279],
    Iraq: [43.6793, 33.2232],
    Morocco: [-7.0926, 31.7917],
    Romania: [24.9668, 45.9432],
    Unknown: [0, 0], // Keep fallback for truly unknown
  }
  const countryNameMap = {
    usa: 'United States',
    'united states': 'United States',
    'united states of america': 'United States',
    us: 'United States',
    'u.s.': 'United States',
    'u.s.a.': 'United States',
    america: 'United States',
    uk: 'United Kingdom',
    'great britain': 'United Kingdom',
    england: 'United Kingdom',
    britain: 'United Kingdom',
    china: 'China',
    prc: 'China',
    'peoples republic of china': 'China',
    "people's republic of china": 'China',
    japan: 'Japan',
    korea: 'South Korea',
    'south korea': 'South Korea',
    'republic of korea': 'South Korea',
    'north korea': 'North Korea',
    'democratic peoples republic of korea': 'North Korea',
    "democratic people's republic of korea": 'North Korea',
    india: 'India',
    'republic of india': 'India',
    vietnam: 'Vietnam',
    'viet nam': 'Vietnam',
    'socialist republic of vietnam': 'Vietnam',
    thailand: 'Thailand',
    'kingdom of thailand': 'Thailand',
    singapore: 'Singapore',
    'republic of singapore': 'Singapore',
    malaysia: 'Malaysia',
    indonesia: 'Indonesia',
    'republic of indonesia': 'Indonesia',
    philippines: 'Philippines',
    'republic of the philippines': 'Philippines',
    australia: 'Australia',
    'commonwealth of australia': 'Australia',
    'new zealand': 'New Zealand',
    canada: 'Canada',
    mexico: 'Mexico',
    brazil: 'Brazil',
    'federative republic of brazil': 'Brazil',
    argentina: 'Argentina',
    chile: 'Chile',
    colombia: 'Colombia',
    peru: 'Peru',
    venezuela: 'Venezuela',
    germany: 'Germany',
    deutschland: 'Germany',
    'federal republic of germany': 'Germany',
    france: 'France',
    'french republic': 'France',
    italy: 'Italy',
    'italian republic': 'Italy',
    spain: 'Spain',
    'kingdom of spain': 'Spain',
    russia: 'Russia',
    'russian federation': 'Russia',
    'south africa': 'South Africa',
    'republic of south africa': 'South Africa',
    netherlands: 'Netherlands',
    'the netherlands': 'Netherlands',
    holland: 'Netherlands',
    switzerland: 'Switzerland',
    'swiss confederation': 'Switzerland',
    sweden: 'Sweden',
    'kingdom of sweden': 'Sweden',
    belgium: 'Belgium',
    'kingdom of belgium': 'Belgium',
    poland: 'Poland',
    'republic of poland': 'Poland',
    turkey: 'Turkey',
    'republic of turkey': 'Turkey',
    denmark: 'Denmark',
    'kingdom of denmark': 'Denmark',
    norway: 'Norway',
    'kingdom of norway': 'Norway',
    finland: 'Finland',
    'republic of finland': 'Finland',
    greece: 'Greece',
    'hellenic republic': 'Greece',
    portugal: 'Portugal',
    'portuguese republic': 'Portugal',
    ireland: 'Ireland',
    'republic of ireland': 'Ireland',
    'czech republic': 'Czech Republic',
    czechia: 'Czech Republic',
    austria: 'Austria',
    'republic of austria': 'Austria',
    israel: 'Israel',
    'state of israel': 'Israel',
    pakistan: 'Pakistan',
    'islamic republic of pakistan': 'Pakistan',
    bangladesh: 'Bangladesh',
    "people's republic of bangladesh": 'Bangladesh',
    egypt: 'Egypt',
    'arab republic of egypt': 'Egypt',
    nigeria: 'Nigeria',
    'federal republic of nigeria': 'Nigeria',
    kenya: 'Kenya',
    'republic of kenya': 'Kenya',
    'saudi arabia': 'Saudi Arabia',
    'kingdom of saudi arabia': 'Saudi Arabia',
    'united arab emirates': 'United Arab Emirates',
    uae: 'United Arab Emirates',
    iran: 'Iran',
    'islamic republic of iran': 'Iran',
    iraq: 'Iraq',
    'republic of iraq': 'Iraq',
    unknown: 'Unknown',
  }

  // --- MOVE HELPER FUNCTIONS HERE (Before they are needed by updateMap) ---
  function standardizeCountryName(countryName) {
    if (!countryName) return 'Unknown'
    const lowerName = countryName.toLowerCase().trim()
    if (countryNameMap[lowerName]) {
      return countryNameMap[lowerName]
    }
    // Try to find a partial match (optional, can be noisy)
    // for (const [key, value] of Object.entries(countryNameMap)) {
    //   if (lowerName.includes(key) || key.includes(lowerName)) {
    //     return value
    //   }
    // }
    // console.log(`Country name not standardized: ${countryName}`) // Less noisy log
    return countryName.charAt(0).toUpperCase() + countryName.slice(1)
  }

  function getCountryCoordinates(countryName) {
    const standardName = standardizeCountryName(countryName)
    if (countryCoordinates[standardName]) {
      const [longitude, latitude] = countryCoordinates[standardName]
      // Ensure projection is ready before using it
      if (projection) {
        return projection([longitude, latitude])
      }
    }
    console.warn(`${functionName}: No coordinates for country: ${standardName}`)
    return projection ? projection([0, 0]) : [innerWidth / 2, innerHeight / 2] // Fallback
  }

  function aggregateDataByCountry(aggregationData) {
    const countryData = {}
    ;(aggregationData || []).forEach((point) => {
      if (!point) return
      const country = standardizeCountryName(
        point.metadata?.country ||
          point.first_country ||
          point.country ||
          'Unknown'
      )

      if (!countryData[country]) {
        let representativeLatLon = null
        if (
          point.metadata?.lat_lon &&
          Array.isArray(point.metadata.lat_lon) &&
          point.metadata.lat_lon.length > 0
        ) {
          const latLonStr = point.metadata.lat_lon[0]
          if (
            typeof latLonStr === 'string' &&
            latLonStr.includes(',') &&
            /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(latLonStr)
          ) {
            representativeLatLon = latLonStr
            console.log(
              `[aggregateData] Found representative lat/lon for ${country}: ${representativeLatLon}`
            )
          } else {
            console.warn(
              `[aggregateData] Invalid lat_lon format for ${country}: ${latLonStr}`
            )
          }
        } else {
          console.warn(
            `[aggregateData] Missing lat_lon metadata for first sequence of ${country}`
          )
        }

        countryData[country] = {
          country: country,
          count: 0,
          sequences: [],
          representativeLatLon: representativeLatLon,
        }
      }
      countryData[country].count++
      countryData[country].sequences.push(point)
    })
    console.log(
      `Aggregation complete. Countries found: ${
        Object.keys(countryData).length
      }`
    )
    return Object.values(countryData)
  }

  function getTooltipContent(aggregatedData) {
    const { country, count, representativeLatLon } = aggregatedData // Destructure needed data

    // Format the representative coordinates for display
    let coordString = 'N/A'
    if (representativeLatLon) {
      try {
        const [latStr, lonStr] = representativeLatLon.split(',')
        const lat = parseFloat(latStr).toFixed(4) // Format to 4 decimal places
        const lon = parseFloat(lonStr).toFixed(4)
        if (!isNaN(lat) && !isNaN(lon)) {
          coordString = `Lat: ${lat}, Lon: ${lon}`
        }
      } catch (e) {
        console.warn(
          `Could not parse lat/lon for tooltip: ${representativeLatLon}`
        )
        coordString = 'Error parsing'
      }
    } else if (country === 'Unknown') {
      coordString = 'No specific coordinates'
    }

    return `
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px;">${country}</h4>
        <div style="margin-bottom: 4px;"><strong>Sequences:</strong> ${count}</div>
        <div style="color: #555;"><strong>Location Used:</strong> ${coordString}</div>
      </div>
    `
  }
  // --- END MOVE HELPER FUNCTIONS ---

  /**
   * Updates the map with new sequence data, aggregating by country.
   * @param {Array} newData - Array of sequence data points (e.g., referenceMapData100).
   * @param {Object|null} userSequence - Optional user sequence for context (not directly plotted here).
   * @param {Object} updateOptions - Options for this specific update.
   */
  function updateMap(newData = [], userSequence = null, updateOptions = {}) {
    const functionName = 'API Map (Country Aggregation)' // Add function name for logging
    console.log(
      `${functionName}: Updating with ${
        newData?.length || 0
      } sequences, aggregating by country.`
    )

    // --- FIX: Ensure config is accessible and radiusScale is valid ---
    const currentConfig = { ...config, ...updateOptions } // Use a merged config locally
    const aggregatedData = aggregateDataByCountry(newData || [])
    console.log(
      `${functionName}: Aggregated into ${aggregatedData.length} countries.`
    )

    let radiusScale // Declare radiusScale
    try {
      const maxCount = d3.max(aggregatedData, (d) => d?.count) || 1 // Add safe navigation for d.count
      radiusScale = d3
        .scaleSqrt()
        .domain([1, maxCount]) // Domain should be [min, max]
        .range([currentConfig.minRadius, currentConfig.maxRadius]) // Use merged config

      // Check if scale creation was successful
      if (
        typeof radiusScale !== 'function' ||
        typeof radiusScale.domain !== 'function'
      ) {
        throw new Error('Failed to create radius scale.')
      }
    } catch (scaleError) {
      console.error(`${functionName}: Error creating radius scale:`, scaleError)
      console.error('Aggregated data sample:', aggregatedData.slice(0, 5)) // Log data sample
      // Use a fallback scale if creation failed
      radiusScale = d3
        .scaleSqrt()
        .domain([1, 1])
        .range([currentConfig.minRadius, currentConfig.minRadius])
      console.warn(`${functionName}: Using fallback radius scale.`)
    }
    // --- END FIX ---

    // Call updateLegend (ensure legendGroup is valid)
    if (legendGroup && !legendGroup.empty()) {
      updateLegend(radiusScale, aggregatedData, legendGroup)
    } else {
      console.warn(
        `${functionName}: legendGroup not ready when updateMap called.`
      )
    }

    // Join data with circles
    const circles = circlesGroup
      .selectAll('.country-circle')
      .data(aggregatedData, (d) => d.country)

    // Remove old circles
    circles
      .exit()
      .transition()
      .duration(currentConfig.transitionDuration) // Use merged config
      .attr('r', 0)
      .remove()

    // Add new circles
    const enterCircles = circles
      .enter()
      .append('circle')
      .attr('class', 'country-circle')
      .attr('r', 0) // Start radius at 0 for animation
      .style('fill', (d) => currentConfig.colorScale(d.country)) // Use merged config
      .style('fill-opacity', currentConfig.defaultOpacity) // Use merged config
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')

    // Apply event handlers only to enter selection
    enterCircles
      .on('mouseover', function (event, d) {
        console.log('[mouseover] Event triggered for:', d.country) // Log handler trigger
        // --- APPLY HOVER STYLES DIRECTLY ---
        d3.select(this)
          // .transition().duration(50) // Remove transition
          .style('fill-opacity', currentConfig.highlightOpacity)
          .style('stroke-width', 2)

        // --- SET TOOLTIP STYLES DIRECTLY & LOG ---
        tooltip
          .style('visibility', 'visible') // Make it visible
          .style('opacity', 1) // Make it fully opaque
          .html(getTooltipContent(d))

        console.log(
          '[mouseover] Tooltip visibility:',
          tooltip.style('visibility')
        ) // Log state
        console.log('[mouseover] Tooltip opacity:', tooltip.style('opacity')) // Log state

        // --- POSITIONING (Keep existing logic for now) ---
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px')

        console.log(
          `[mouseover] Tooltip position: top=${tooltip.style(
            'top'
          )}, left=${tooltip.style('left')}`
        ) // Log position
      })
      .on('mousemove', function (event) {
        // Keep mousemove for position updates
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px')
      })
      .on('mouseout', function () {
        console.log('[mouseout] Event triggered') // Log handler trigger
        // --- APPLY MOUSEOUT STYLES DIRECTLY ---
        d3.select(this)
          // .transition().duration(150) // Remove transition
          .style('fill-opacity', currentConfig.defaultOpacity)
          .style('stroke-width', 1)

        // --- HIDE TOOLTIP DIRECTLY & LOG ---
        tooltip
          .style('visibility', 'hidden') // Hide it
          .style('opacity', 0) // Make it transparent

        console.log(
          '[mouseout] Tooltip visibility:',
          tooltip.style('visibility')
        ) // Log state
      })
      .on('click', function (event, d) {
        if (currentConfig.onPointClick) {
          currentConfig.onPointClick(d)
        }
        circlesGroup
          .selectAll('.country-circle')
          .style('stroke', '#fff')
          .style('stroke-width', 1)
        d3.select(this).style('stroke', '#333').style('stroke-width', 2)
      })

    const allCircles = enterCircles.merge(circles)

    allCircles.each(function (d) {
      // --- MODIFIED COORDINATE LOGIC WITH LOGGING ---
      console.log(`[updateMap] Processing country: ${d.country}`) // Log country being processed
      let coords = null
      let coordSource = 'unknown' // Track where the coordinate came from

      // Try to use the representativeLatLon first
      if (d.representativeLatLon) {
        console.log(
          `[updateMap] Attempting representativeLatLon: "${d.representativeLatLon}"`
        )
        try {
          const [latStr, lonStr] = d.representativeLatLon.split(',')
          const lat = parseFloat(latStr)
          const lon = parseFloat(lonStr)
          console.log(`[updateMap] Parsed lat: ${lat}, lon: ${lon}`) // Log parsed values

          if (
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180
          ) {
            coords = projection([lon, lat])
            if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
              console.log(
                `[updateMap] Projected representative coords: [${coords[0]}, ${coords[1]}]`
              )
              coordSource = 'representative'
            } else {
              console.warn(
                `[updateMap] Projection of representative coords failed: [${coords}]`
              )
              coords = null // Reset coords if projection failed
            }
          } else {
            console.warn(
              `[updateMap] Parsed lat/lon numbers invalid or out of range: lat=${lat}, lon=${lon}`
            )
          }
        } catch (parseError) {
          console.error(
            `[updateMap] Error parsing lat/lon string: "${d.representativeLatLon}"`,
            parseError
          )
        }
      } else {
        console.log(
          `[updateMap] No representativeLatLon found for ${d.country}.`
        )
      }

      // Fallback to predefined country coordinates
      if (!coords) {
        console.log(
          `[updateMap] Falling back to getCountryCoordinates for ${d.country}`
        )
        coords = getCountryCoordinates(d.country) // Keep the old lookup as fallback
        if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
          // Check if it returned the fallback [0, 0] projection
          const fallbackProjected = projection([0, 0])
          if (
            coords[0] === fallbackProjected[0] &&
            coords[1] === fallbackProjected[1]
          ) {
            console.warn(
              `[updateMap] getCountryCoordinates returned fallback projection for ${d.country}.`
            )
            coordSource = 'predefined_fallback'
          } else {
            console.log(
              `[updateMap] Used predefined coords: [${coords[0]}, ${coords[1]}]`
            )
            coordSource = 'predefined'
          }
        } else {
          console.warn(
            `[updateMap] getCountryCoordinates returned invalid coords: [${coords}]`
          )
          coords = null // Reset coords if invalid
        }
      }

      // Apply the coordinates (with final validation and fallback)
      let finalCx = innerWidth / 2 // Default to center X
      let finalCy = innerHeight / 2 // Default to center Y

      if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
        finalCx = coords[0]
        finalCy = coords[1]
      } else {
        console.error(
          `[updateMap] Failed to get *any* valid coordinates for ${d.country}. Using center fallback.`
        )
        coordSource = 'center_fallback'
      }

      console.log(
        `[updateMap] Applying coords for ${d.country}: cx=${finalCx}, cy=${finalCy} (Source: ${coordSource})`
      )

      // --- CHANGE: Apply cx/cy directly, NOT in transition ---
      d3.select(this).attr('cx', finalCx).attr('cy', finalCy)
      // --- END CHANGE ---
    }) // End of allCircles.each

    // Keep transition for radius and fill on the merged selection
    allCircles
      .transition()
      .duration(currentConfig.transitionDuration) // Use merged config
      .attr('r', (d) => radiusScale(d.count))
      .style('fill', (d) => currentConfig.colorScale(d.country)) // Use merged config
  }

  /**
   * Updates the legend display (both size and color)
   * @param {d3.Scale} radiusScale - The scale for circle radius based on count.
   * @param {Array} aggregatedData - The data aggregated by country.
   * @param {d3.Selection} lg - The D3 selection for the legend group element.
   */
  function updateLegend(radiusScale, aggregatedData, lg) {
    if (!lg || lg.empty()) {
      console.error(
        `${functionName}: legendGroup selection is not available in updateLegend.`
      )
      return
    }
    lg.selectAll('*').remove()

    // --- Size Legend (KEEP THIS) ---
    const sizeLegendGroup = lg.append('g').attr('class', 'size-legend')
    sizeLegendGroup
      .append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Sequence Count')

    const minCount = d3.min(aggregatedData, (d) => d.count) || 1
    const numBubbles = 5
    const currentMaxCount = d3.max(aggregatedData, (d) => d.count) || 1
    let bubbleValues = d3
      .ticks(minCount, currentMaxCount, numBubbles)
      .filter((v) => v >= minCount)
    if (bubbleValues.length === 0 && currentMaxCount >= minCount) {
      bubbleValues = [minCount, currentMaxCount].filter(
        (v, i, a) => a.indexOf(v) === i
      ) // Handle edge case with just min/max
    } else {
      if (bubbleValues.length < numBubbles && !bubbleValues.includes(minCount))
        bubbleValues.unshift(minCount)
      if (
        bubbleValues.length < numBubbles &&
        !bubbleValues.includes(currentMaxCount) &&
        currentMaxCount > minCount
      )
        bubbleValues.push(currentMaxCount)
    }
    // Ensure uniqueness and handle case where min === max
    bubbleValues = [...new Set(bubbleValues)].sort((a, b) => a - b)
    if (bubbleValues.length === 0 && currentMaxCount >= minCount)
      bubbleValues = [currentMaxCount]

    const bubbleSizes = bubbleValues.map((value) => ({
      value: value,
      // --- Adjust radius calculation slightly for better spacing ---
      radius: Math.max(2, radiusScale(value) * 0.7),
    }))

    const sizeLegendWidth = 150
    const sizeStartX = 0
    // Calculate positioning based on accumulated width + padding
    let currentX = sizeStartX
    const padding = 10

    bubbleSizes.forEach((bubble, i) => {
      // Position based on previous bubble's right edge + radius + padding
      const cx = currentX + bubble.radius

      sizeLegendGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', 25)
        .attr('r', bubble.radius)
        .style('fill', '#6c757d')
        .style('fill-opacity', 0.7)
        .style('stroke', '#fff')
        .style('stroke-width', 1)

      sizeLegendGroup
        .append('text')
        .attr('x', cx)
        .attr('y', 25 + bubble.radius + 15) // Adjust text position based on radius
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text(bubble.value)

      // Update currentX for the next bubble
      currentX = cx + bubble.radius + padding
    })

    // --- Color Legend (COMMENT OUT / REMOVE THIS SECTION) ---
    /* 
    const colorLegendGroup = lg
      .append('g')
      .attr('class', 'color-legend')
      .attr('transform', `translate(${sizeLegendWidth + 30}, 0)`) // Adjust sizeLegendWidth if necessary

    colorLegendGroup
      .append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Country') // REMOVED

    const uniqueCountries = [
      ...new Set(aggregatedData.map((d) => d.country)),
    ].slice(0, 8)
    const legendItemHeight = 18
    const legendColorBoxSize = 12

    const colorLegendItems = colorLegendGroup
      .selectAll('.legend-item')
      .data(uniqueCountries)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${15 + i * legendItemHeight})`)

    colorLegendItems
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendColorBoxSize)
      .attr('height', legendColorBoxSize)
      .style('fill', (d) => config.colorScale(d)) // Correct scale name

    colorLegendItems
      .append('text')
      .attr('x', legendColorBoxSize + 8)
      .attr('y', legendColorBoxSize / 2)
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .text((d) => d) 
    */
    // --- END REMOVED COLOR LEGEND ---
  }

  /**
   * Handles window resize events.
   */
  function handleResize() {
    width = container.clientWidth
    // height = container.clientHeight - config.legendHeight; // Legend height removed
    height = container.clientHeight
    innerWidth = width - config.margin.left - config.margin.right
    innerHeight = height - config.margin.top - config.margin.bottom

    // Update SVG viewbox
    // svg.attr('viewBox', [0, 0, width, height + config.legendHeight]); // Legend height removed
    svg.attr('viewBox', [0, 0, width, height])

    // Update projection on resize - Apply same simplification
    projection.fitSize([innerWidth, innerHeight], { type: 'Sphere' })

    // Update map elements (paths)
    g.select('.sphere').attr('d', pathGenerator({ type: 'Sphere' }))
    g.select('.graticule').attr('d', pathGenerator(graticule()))
    if (worldGroup.selectAll('.country').size() > 0) {
      worldGroup.selectAll('.country').attr('d', pathGenerator)
    }

    // Update country markers position - using the updated projection
    circlesGroup.selectAll('.country-circle').each(function (d) {
      // Apply same logic as in updateMap, but use the *resized* projection
      let coords = null
      if (d.representativeLatLon) {
        try {
          const [latStr, lonStr] = d.representativeLatLon.split(',')
          const lat = parseFloat(latStr)
          const lon = parseFloat(lonStr)
          if (
            !isNaN(lat) &&
            !isNaN(lon) &&
            lat >= -90 &&
            lat <= 90 &&
            lon >= -180 &&
            lon <= 180
          ) {
            // Use the updated projection object directly
            coords = projection([lon, lat])
          }
        } catch (e) {
          /* ignore */
        }
      }
      if (!coords) {
        coords = getCountryCoordinates(d.country) // Fallback uses the updated projection
      }
      if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
        d3.select(this).attr('cx', coords[0]).attr('cy', coords[1])
      } else {
        d3.select(this)
          .attr('cx', innerWidth / 2)
          .attr('cy', innerHeight / 2)
      }
    })

    // Legend update was already removed/commented out
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // --- Load World Map Data ---
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then((worldMapData) => {
      // --- Assign to the SCOPED worldCountries variable ---
      worldCountries = topojson.feature(
        worldMapData,
        worldMapData.objects.countries
      )
      // --- End assignment ---

      worldGroup
        .selectAll('.country')
        .data(worldCountries.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', pathGenerator)
        .attr('fill', '#d8d8d8') // Slightly darker land color
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.3)

      console.log('World map data loaded and rendered.')

      // Initialize with data if provided *after* map is drawn AND data is processed
      if (data && data.length > 0) {
        updateMap(data, null, options)
      }
    })
    .catch((error) => {
      console.error('Error loading world map data:', error)
      // Update map even if world data fails, markers might default to 0,0
      if (data && data.length > 0) {
        console.warn(
          'World map failed to load, calling updateMap without map features.'
        )
        // Check if legendGroup is defined before calling updateMap that uses it
        if (legendGroup && !legendGroup.empty()) {
          updateMap(data, null, options) // Call updateMap from .catch()
        } else {
          console.error(
            'Cannot call updateMap from .catch as legendGroup is not ready.'
          )
          // Potentially render just the circles without the legend if needed
          // Or show an error state
        }
      }
    })

  /**
   * Highlights a specific country marker.
   * (Replaces the old highlightPoint function)
   * @param {string} countryName - The name of the country to highlight.
   * @param {boolean} highlight - True to highlight, false to unhighlight.
   */
  function highlightCountry(countryName, highlight = true) {
    const standardName = standardizeCountryName(countryName)
    const marker = circlesGroup.select(
      `.country-marker[data-country="${standardName}"]`
    )

    if (!marker.empty()) {
      marker
        .transition(`highlight-country-${highlight}`)
        .duration(150)
        .style(
          'fill-opacity',
          highlight ? config.highlightOpacity : config.defaultOpacity
        )
        .style('stroke-width', highlight ? 1.5 : 0.5)
      return true
    }
    return false
  }

  // Return the public API
  return {
    updateMap,
    highlightCountry,
    svg: svg.node(),
    g: g.node(),
    projection,
    handleResize,
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
      svg.remove()
      console.log(`API Map ${containerId} destroyed.`)
    },
  }
}

// Make the function available globally (optional, depends on usage)
// window.createApiMap = createApiMap;

// Keep the ES module export
export { createApiMap }
