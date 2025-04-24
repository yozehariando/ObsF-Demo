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
  // Default data to empty array
  console.log(`Creating API map (Country Aggregation) for ${containerId}`)

  // Default options
  const defaults = {
    width: null,
    height: null,
    margin: { top: 10, right: 10, bottom: 10, left: 10 }, // Reduced bottom margin as legend is separate now
    // Define scales for color (similarity) and size (count)
    similarityColorScale: d3
      .scaleSequential(d3.interpolateViridis)
      .domain([0.5, 1]), // Color based on avg similarity (adjust domain as needed)
    countRadiusScale: d3.scaleSqrt().domain([1, 100]).range([4, 20]), // Size based on count (adjust domain/range)
    onPointClick: null, // Might be repurposed for country click
    transitionDuration: 300,
    defaultOpacity: 0.7,
    highlightOpacity: 1.0,
    // Legend options are now less relevant here as it's external
    // legendHeight: 80,
    // legendMargin: { top: 5, right: 20, bottom: 25, left: 20 },
  }

  // Merge provided options with defaults
  const config = { ...defaults, ...options }
  // Deep merge scales if provided
  if (options.similarityColorScale)
    config.similarityColorScale = options.similarityColorScale
  if (options.countRadiusScale)
    config.countRadiusScale = options.countRadiusScale

  // --- Container Setup ---
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }
  container.style.position = container.style.position || 'relative'

  // --- SVG Setup ---
  let width = config.width || container.clientWidth
  // let height = (config.height || container.clientHeight) - config.legendHeight; // Legend height removed
  let height = config.height || container.clientHeight

  // Calculate inner dimensions
  let innerWidth = width - config.margin.left - config.margin.right
  let innerHeight = height - config.margin.top - config.margin.bottom

  // Clear previous SVG
  d3.select(container).select('svg').remove()

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    // .attr('viewBox', [0, 0, width, height + config.legendHeight]) // Legend height removed
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const g = svg
    .append('g')
    .attr('class', 'map-content')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // --- Projection and Path ---
  const projection = geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
    .scale(innerWidth / 6.2)
    .translate([innerWidth / 2, innerHeight / 1.8]) // Adjusted vertical translation slightly

  const pathGenerator = geoPath().projection(projection)
  const graticule = geoGraticule()

  // --- Map Background Elements ---
  g.append('path')
    .attr('class', 'sphere')
    .attr('d', pathGenerator({ type: 'Sphere' }))
    .attr('fill', '#f0f0f0') // Lighter sphere
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5)

  g.append('path')
    .attr('class', 'graticule')
    .attr('d', pathGenerator(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#e0e0e0') // Lighter grid
    .attr('stroke-width', 0.5)

  // Groups for map layers
  const worldGroup = g.append('g').attr('class', 'world')
  const circlesGroup = g.append('g').attr('class', 'country-markers') // Renamed group

  // --- Tooltip ---
  const tooltip = d3
    .select('body') // Attach tooltip to body to avoid SVG clipping issues
    .append('div')
    .attr('class', 'map-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('opacity', 0)
    .style('background-color', 'rgba(255, 255, 255, 0.9)')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('padding', '8px 10px')
    .style('box-shadow', '0 2px 5px rgba(0,0,0,0.15)')
    .style('font-family', 'sans-serif')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', 1000)
    .style('transition', 'opacity 0.2s ease-out, visibility 0.2s ease-out')

  // --- Legend Removed ---
  // const legendBackground = svg.append('rect')... // REMOVED
  // const legendGroup = svg.append('g')... // REMOVED

  // --- Explicit Country Coordinates & Name Standardization (Keep as is) ---
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
    Unknown: [0, 0], // Default position for unknown countries
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
  function standardizeCountryName(countryName) {
    if (!countryName) return 'Unknown'
    const lowerName = countryName.toLowerCase().trim()
    if (countryNameMap[lowerName]) {
      return countryNameMap[lowerName]
    }
    for (const [key, value] of Object.entries(countryNameMap)) {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        return value
      }
    }
    // console.warn(`Country name not standardized: ${countryName}`) // Be less noisy
    return countryName.charAt(0).toUpperCase() + countryName.slice(1)
  }

  // --- Declare worldCountries in the outer scope ---
  let worldCountries = null // Use let since it will be reassigned
  let worldDataLoaded = false // Keep track of loading state

  // --- getCountryCoordinates function (ensure it checks the scoped worldCountries) ---
  function getCountryCoordinates(countryName) {
    const standardName = standardizeCountryName(countryName)
    if (countryCoordinates[standardName]) {
      const [longitude, latitude] = countryCoordinates[standardName]
      return projection([longitude, latitude])
    }

    // --- Check the SCOPED worldCountries variable ---
    if (worldCountries && worldDataLoaded) {
      // Check flag too
      const countryFeature = worldCountries.features.find(
        (f) => standardizeCountryName(f.properties.name) === standardName
      )
      if (countryFeature) {
        const centroid = geoPath().centroid(countryFeature)
        if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
          return projection(centroid)
        }
      }
    }
    // --- End check ---

    // console.warn(`No coordinates for country: ${standardName}`) // Less noisy
    return projection([0, 0]) // Fallback
  }

  /**
   * Updates the map with new sequence data, aggregating by country.
   * @param {Array} newData - Array of sequence data points (e.g., referenceMapData100).
   * @param {Object|null} userSequence - Optional user sequence for context (not directly plotted here).
   * @param {Object} updateOptions - Options for this specific update.
   */
  function updateMap(newData = [], userSequence = null, updateOptions = {}) {
    console.log(
      `API Map: Updating with ${newData.length} sequences, aggregating by country.`
    )

    // Merge update options
    const updateConfig = { ...config, ...updateOptions }

    // --- Step 1: Aggregate Data ---
    const countryData = {}
    newData.forEach((point) => {
      if (!point || !point.metadata) return // Skip points without metadata

      // Use standardized country name
      const country = standardizeCountryName(
        point.metadata.country || point.metadata.first_country || 'Unknown'
      )
      // Ensure similarity is a number
      const similarity =
        typeof point.similarity === 'number' ? point.similarity : 0

      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          count: 0,
          totalSimilarity: 0,
          sequences: [], // Store original sequences if needed for tooltips/clicks
          isolationSources: new Set(), // Collect unique sources
        }
      }

      countryData[country].count++
      countryData[country].totalSimilarity += similarity
      countryData[country].sequences.push(point)
      if (point.metadata.isolation_source) {
        countryData[country].isolationSources.add(
          point.metadata.isolation_source
        )
      }
    })

    // Calculate average similarity and convert to array
    const aggregatedData = Object.values(countryData)
      .map((d) => ({
        ...d,
        avgSimilarity: d.count > 0 ? d.totalSimilarity / d.count : 0,
        isolationSources: Array.from(d.isolationSources), // Convert Set to Array
      }))
      .filter((d) => d.count > 0) // Filter out any potential empty groups

    console.log(`API Map: Aggregated into ${aggregatedData.length} countries.`)
    // console.log('Aggregated Country Data:', aggregatedData); // Optional detailed log

    // --- Step 2: Update Scales ---
    // Update count scale domain based on current data
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1
    updateConfig.countRadiusScale.domain([1, maxCount])
    // Similarity scale domain is usually fixed (e.g., 0 to 1 or 0.5 to 1)
    // config.similarityColorScale.domain([minAvgSimilarity, maxAvgSimilarity]); // Optionally update domain

    // --- Step 3: Data Join for Country Markers ---
    const circles = circlesGroup
      .selectAll('.country-marker')
      .data(aggregatedData, (d) => d.country) // Key by country name

    // --- Step 4: Exit ---
    circles
      .exit()
      .transition('exit')
      .duration(updateConfig.transitionDuration / 2)
      .attr('r', 0)
      .remove()

    // --- Step 5: Enter ---
    const enterCircles = circles
      .enter()
      .append('circle')
      .attr('class', 'country-marker')
      .attr('r', 0) // Start radius at 0
      .style('stroke', '#333') // Darker stroke for better visibility
      .style('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .attr('data-country', (d) => d.country) // Add country attribute

    // --- Step 6: Update + Enter ---
    const mergedCircles = enterCircles.merge(circles)

    // Position circles and apply styles
    mergedCircles.each(function (d) {
      const coords = getCountryCoordinates(d.country)
      if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
        d3.select(this)
          .transition('update-pos')
          .duration(updateConfig.transitionDuration)
          .attr('cx', coords[0])
          .attr('cy', coords[1])
      } else {
        console.warn(
          `Could not get valid coordinates for ${d.country}. Hiding marker.`
        )
        d3.select(this).attr('cx', null).attr('cy', null).attr('r', 0) // Hide if no coords
      }
    })

    mergedCircles
      .transition('update-style')
      .duration(updateConfig.transitionDuration)
      .attr('r', (d) => updateConfig.countRadiusScale(d.count)) // Size by count
      .style('fill', (d) => updateConfig.similarityColorScale(d.avgSimilarity)) // Color by avg similarity
      .style('fill-opacity', updateConfig.defaultOpacity)

    // --- Step 7: Event Handlers ---
    mergedCircles
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition('mouseover')
          .duration(100)
          .style('fill-opacity', updateConfig.highlightOpacity)
          .style('stroke-width', 1.5)

        tooltip
          .html(getTooltipContent(d)) // Use updated tooltip function
          .style('visibility', 'visible')
          .transition('tooltip-in')
          .duration(100)
          .style('opacity', 1)
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', event.pageY - 15 + 'px') // Adjust position slightly
          .style('left', event.pageX + 15 + 'px')
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition('mouseout')
          .duration(100)
          .style('fill-opacity', updateConfig.defaultOpacity)
          .style('stroke-width', 0.5)

        tooltip
          .transition('tooltip-out')
          .duration(100)
          .style('opacity', 0)
          .end() // Use end() promise for reliable visibility change
          .then(() => tooltip.style('visibility', 'hidden'))
      })
      .on('click', function (event, d) {
        console.log('Clicked country marker:', d)
        if (updateConfig.onPointClick) {
          // Pass relevant country data to the click handler
          updateConfig.onPointClick({ type: 'country', data: d })
        }
        // Add visual feedback for click if desired (e.g., thicker stroke)
        d3.select(this)
          .transition('click')
          .duration(50)
          .style('stroke-width', 2.5)
          .transition()
          .delay(150)
          .duration(200)
          .style('stroke-width', 1.5) // Briefly thicken stroke
      })
  }

  // --- Legend Update Function Removed ---
  // function updateLegend(radiusScale, maxCount) { ... } // REMOVED

  /**
   * Generates HTML content for the tooltip based on aggregated country data.
   * @param {Object} aggregatedCountryData - The data object for the hovered country.
   * @returns {string} HTML string for the tooltip.
   */
  function getTooltipContent(aggregatedCountryData) {
    const { country, count, avgSimilarity, isolationSources } =
      aggregatedCountryData
    const avgSimilarityPercent = (avgSimilarity * 100).toFixed(1)

    // Display top N isolation sources
    const maxSourcesToShow = 3
    const sourcesToShow = isolationSources.slice(0, maxSourcesToShow).join(', ')
    const remainingSources = isolationSources.length - maxSourcesToShow
    const sourcesString =
      isolationSources.length > 0
        ? `${sourcesToShow}${
            remainingSources > 0 ? ` (+${remainingSources} more)` : ''
          }`
        : 'N/A'

    return `
        <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #eee; padding-bottom: 4px;">${country}</h4>
        <p style="margin: 3px 0;"><strong>Sequences:</strong> ${count}</p>
        <p style="margin: 3px 0;"><strong>Avg. Similarity:</strong> ${avgSimilarityPercent}%</p>
        <p style="margin: 3px 0;"><strong>Sources:</strong> ${sourcesString}</p>
    `
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

    // Update projection
    projection
      .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
      .scale(innerWidth / 6.2)
      .translate([innerWidth / 2, innerHeight / 1.8])

    // Update map elements
    g.select('.sphere').attr('d', pathGenerator({ type: 'Sphere' }))
    g.select('.graticule').attr('d', pathGenerator(graticule()))
    if (worldGroup.selectAll('.country').size() > 0) {
      worldGroup.selectAll('.country').attr('d', pathGenerator)
    }

    // Update country markers position
    circlesGroup.selectAll('.country-marker').each(function (d) {
      const coords = getCountryCoordinates(d.country)
      if (coords && !isNaN(coords[0]) && !isNaN(coords[1])) {
        d3.select(this).attr('cx', coords[0]).attr('cy', coords[1])
      }
    })

    // --- Legend Update Removed ---
    // if (circlesGroup.selectAll('.country-marker').size() > 0) { ... updateLegend(...) ... } // REMOVED
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // --- Load World Map Data ---
  // let worldDataLoaded = false; // Moved declaration to outer scope
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

      worldDataLoaded = true // Set flag AFTER data is processed
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
        updateMap(data, null, options)
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
