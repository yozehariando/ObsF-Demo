/**
 * API-specific map component
 * A standalone implementation for geographic visualization of UMAP data
 */

import * as d3 from 'd3'
import { geoEquirectangular, geoPath, geoGraticule } from 'd3-geo'
import * as topojson from 'topojson-client'

/**
 * Create a map visualization for UMAP data
 * @param {string} containerId - ID of the container element
 * @param {Array} data - UMAP data points
 * @param {Object} options - Configuration options
 * @returns {Object} Map component with update method
 */
function createApiMap(containerId, data, options = {}) {
  console.log(`Creating API map with ${data?.length || 0} points`)

  // Default options
  const defaults = {
    width: null, // Will be determined from container
    height: null, // Will be determined from container
    margin: { top: 10, right: 10, bottom: 30, left: 10 }, // Increased bottom margin
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    onPointClick: null,
    transitionDuration: 500,
    defaultOpacity: 0.7,
    highlightOpacity: 1.0,
    minRadius: 5,
    maxRadius: 30,
    legendHeight: 80, // Further increased height for the legend
    legendMargin: { top: 5, right: 20, bottom: 25, left: 20 }, // Adjusted margins
  }

  // Merge provided options with defaults
  const config = { ...defaults, ...options }

  // Get the container element
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }

  // Get actual dimensions from container
  const width = config.width || container.clientWidth
  const height = (config.height || container.clientHeight) - config.legendHeight

  // Calculate inner dimensions (accounting for margins)
  const innerWidth = width - config.margin.left - config.margin.right
  const innerHeight = height - config.margin.top - config.margin.bottom

  // Create SVG with proper dimensions
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height + config.legendHeight])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create a group for the map with margins
  const g = svg
    .append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // Create a projection - using Equirectangular for better width filling
  const projection = geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
    .scale(innerWidth / 6.2) // Adjust scale to fill width better
    .translate([innerWidth / 2, innerHeight / 1.8 - 10]) // Shifted up by 10px

  // Create a path generator
  const pathGenerator = geoPath().projection(projection)

  // Create a graticule generator
  const graticule = geoGraticule()

  // Add a background
  g.append('path')
    .attr('class', 'sphere')
    .attr('d', pathGenerator({ type: 'Sphere' }))
    .attr('fill', '#f8f9fa')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 0.5)

  // Add graticules
  g.append('path')
    .attr('class', 'graticule')
    .attr('d', pathGenerator(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#eee')
    .attr('stroke-width', 0.5)

  // Create a group for the world map
  const worldGroup = g.append('g').attr('class', 'world')

  // Create a group for the aggregated circles
  const circlesGroup = g.append('g').attr('class', 'circles')

  // Create a group for the legend with a background
  const legendBackground = svg
    .append('rect')
    .attr('x', 0)
    .attr('y', height - 15)
    .attr('width', width)
    .attr('height', config.legendHeight + 15)
    .attr('fill', '#f8f9fa')
    .attr('stroke', '#eee')
    .attr('stroke-width', 1)

  const legendGroup = svg
    .append('g')
    .attr('class', 'legend')
    .attr(
      'transform',
      `translate(${config.legendMargin.left},${
        height + config.legendMargin.top
      })`
    )

  // Store world data
  let worldData = null
  let worldCountries = null

  // Create tooltip
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'map-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'white')
    .style('border', '1px solid #ddd')
    .style('border-radius', '4px')
    .style('padding', '8px')
    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', 1000)

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
    Unknown: [0, 0], // Default position for unknown countries
  }

  // Country name standardization
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

  // Function to standardize country names
  function standardizeCountryName(countryName) {
    if (!countryName) return 'Unknown'

    const lowerName = countryName.toLowerCase().trim()

    // Direct mapping
    if (countryNameMap[lowerName]) {
      return countryNameMap[lowerName]
    }

    // Try to find a partial match
    for (const [key, value] of Object.entries(countryNameMap)) {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        return value
      }
    }

    // If no match found, return the original with first letter capitalized
    console.log(`Country name not standardized: ${countryName}`)
    return countryName.charAt(0).toUpperCase() + countryName.slice(1)
  }

  // Function to get country coordinates
  function getCountryCoordinates(countryName) {
    const standardName = standardizeCountryName(countryName)

    if (countryCoordinates[standardName]) {
      const [longitude, latitude] = countryCoordinates[standardName]
      return projection([longitude, latitude])
    }

    // If country not found in our coordinates list
    console.log(`No coordinates for country: ${standardName}`)
    return projection([0, 0]) // Default to center of map
  }

  // Aggregate data by country
  function aggregateDataByCountry(data) {
    const countryData = {}

    // Count sequences by country
    data.forEach((item) => {
      if (!item) return

      const country = standardizeCountryName(item.first_country || 'Unknown')

      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          count: 0,
          sequences: [],
        }
      }

      countryData[country].count++
      countryData[country].sequences.push(item)
    })

    // Convert to array
    return Object.values(countryData)
  }

  // Update the map with new data
  function updateMap(newData, updateOptions = {}) {
    console.log(`Updating map with ${newData?.length || 0} points`)

    // Merge update options with config
    const updateConfig = { ...config, ...updateOptions }

    // Aggregate data by country
    const countryData = {}

    newData.forEach((point) => {
      const country = standardizeCountryName(
        point.first_country || point.country || 'Unknown'
      )

      if (!countryData[country]) {
        countryData[country] = {
          country: country,
          count: 0,
          sequences: [],
        }
      }

      countryData[country].count++
      countryData[country].sequences.push(point)
    })

    // Convert to array for D3
    const aggregatedData = Object.values(countryData)
    console.log(`Aggregated to ${aggregatedData.length} countries`)
    console.log('Country data:', aggregatedData)

    // Create a scale for circle radius based on count
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1
    const radiusScale = d3
      .scaleSqrt()
      .domain([1, maxCount])
      .range([updateConfig.minRadius, updateConfig.maxRadius])

    // Update the legend
    updateLegend(radiusScale, maxCount)

    // Join data with circles
    const circles = circlesGroup
      .selectAll('.country-circle')
      .data(aggregatedData, (d) => d.country)

    // Remove old circles
    circles
      .exit()
      .transition()
      .duration(updateConfig.transitionDuration)
      .attr('r', 0)
      .remove()

    // Add new circles
    const enterCircles = circles
      .enter()
      .append('circle')
      .attr('class', 'country-circle')
      .attr('r', 0)
      .style('fill', (d) => updateConfig.colorScale(d.country))
      .style('fill-opacity', updateConfig.defaultOpacity)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .style('fill-opacity', updateConfig.highlightOpacity)
          .style('stroke-width', 2)

        tooltip.style('visibility', 'visible').html(getTooltipContent(d))

        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px')
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px')
      })
      .on('mouseout', function () {
        d3.select(this)
          .style('fill-opacity', updateConfig.defaultOpacity)
          .style('stroke-width', 1)

        tooltip.style('visibility', 'hidden')
      })
      .on('click', function (event, d) {
        if (updateConfig.onPointClick) {
          updateConfig.onPointClick(d)
        }
      })

    // Position circles
    enterCircles.each(function (d) {
      const coords = getCountryCoordinates(d.country)
      if (coords) {
        d3.select(this).attr('cx', coords[0]).attr('cy', coords[1])
      }
    })

    // Animate new circles
    enterCircles
      .transition()
      .duration(updateConfig.transitionDuration)
      .attr('r', (d) => radiusScale(d.count))

    // Update existing circles
    circles
      .transition()
      .duration(updateConfig.transitionDuration)
      .attr('r', (d) => radiusScale(d.count))
      .style('fill', (d) => updateConfig.colorScale(d.country))

    // Update positions of existing circles
    circles.each(function (d) {
      const coords = getCountryCoordinates(d.country)
      if (coords) {
        d3.select(this).attr('cx', coords[0]).attr('cy', coords[1])
      }
    })
  }

  // Update the legend based on the current scale
  function updateLegend(radiusScale, maxCount) {
    // Clear existing legend
    legendGroup.selectAll('*').remove()

    // Create legend title
    legendGroup
      .append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Sequence Count')

    // Get the minimum count from the data
    const minCount =
      d3.min(
        circlesGroup.selectAll('.country-circle').data(),
        (d) => d.count
      ) || 1

    // Create 5 bubbles with specific values
    const numBubbles = 5
    const minValue = minCount
    const maxValue = maxCount
    const middleValue = Math.round(maxValue / 2)

    // Calculate values for all 5 bubbles
    const bubbleValues = [
      minValue, // First bubble: minimum count
      Math.round((minValue + middleValue) / 2), // Second bubble: middle between min and half of max
      middleValue, // Third bubble: half of max
      Math.round((middleValue + maxValue) / 2), // Fourth bubble: middle between half of max and max
      maxValue, // Fifth bubble: max
    ]

    // Calculate legend width (50% of available width)
    const legendWidth =
      (width - config.legendMargin.left - config.legendMargin.right) * 0.5

    // Calculate starting position to center the legend
    const startX =
      (width -
        config.legendMargin.left -
        config.legendMargin.right -
        legendWidth) /
      2

    // Calculate spacing between circles
    const circleSpacing = legendWidth / (numBubbles - 1)

    // Create array of bubble sizes
    const bubbleSizes = bubbleValues.map((value) => ({
      value: value,
      // Scale down the radius by 0.7 to make bubbles smaller
      radius: radiusScale(value) * 0.7,
    }))

    // Add circles and labels
    bubbleSizes.forEach((bubble, i) => {
      const cx = startX + i * circleSpacing

      // Add circle
      legendGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', 20)
        .attr('r', bubble.radius)
        .style('fill', '#6c757d')
        .style('fill-opacity', 0.7)
        .style('stroke', '#fff')
        .style('stroke-width', 1)

      // Add count value below the circle for all bubbles
      legendGroup
        .append('text')
        .attr('x', cx)
        .attr('y', 20 + bubble.radius + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text(bubble.value)
    })
  }

  // Generate tooltip content
  function getTooltipContent(aggregatedData) {
    const { country, count, sequences } = aggregatedData

    // Get years range if available
    let yearRange = ''
    if (sequences && sequences.length > 0) {
      const years = sequences
        .map((seq) => seq.first_date)
        .filter((date) => date && date !== 'Unknown')
        .map((date) => {
          // Try to extract year from date string
          const match = date.match(/(\d{4})/)
          return match ? parseInt(match[1], 10) : null
        })
        .filter((year) => year !== null)

      if (years.length > 0) {
        const minYear = Math.min(...years)
        const maxYear = Math.max(...years)
        yearRange =
          minYear === maxYear
            ? `<p style="margin: 4px 0;"><strong>Year:</strong> ${minYear}</p>`
            : `<p style="margin: 4px 0;"><strong>Years:</strong> ${minYear} - ${maxYear}</p>`
      }
    }

    return `
      <div style="font-family: sans-serif;">
        <h4 style="margin: 0 0 8px 0;">${country}</h4>
        <p style="margin: 4px 0;"><strong>Sequences:</strong> ${count}</p>
        ${yearRange}
      </div>
    `
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight - config.legendHeight

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight + config.legendHeight])

    // Update legend background
    legendBackground
      .attr('x', 0)
      .attr('y', newHeight - 15)
      .attr('width', newWidth)
      .attr('height', config.legendHeight + 15)

    // Calculate new inner dimensions
    const newInnerWidth = newWidth - config.margin.left - config.margin.right
    const newInnerHeight = newHeight - config.margin.top - config.margin.bottom

    // Update projection
    projection
      .fitSize([newInnerWidth, newInnerHeight], { type: 'Sphere' })
      .scale(newInnerWidth / 6.2) // Adjust scale to fill width better
      .translate([newInnerWidth / 2, newInnerHeight / 1.8 - 10]) // Shifted up by 10px

    // Update sphere and graticule
    g.select('.sphere').attr('d', pathGenerator({ type: 'Sphere' }))
    g.select('.graticule').attr('d', pathGenerator(graticule()))

    // Update world map
    if (worldData) {
      worldGroup.selectAll('.country').attr('d', (d) => pathGenerator(d))
    }

    // Update circles
    circlesGroup.selectAll('.country-circle').each(function (d) {
      const coords = getCountryCoordinates(d.country)
      if (coords) {
        d3.select(this).attr('cx', coords[0]).attr('cy', coords[1])
      }
    })

    // Update legend position
    legendGroup.attr(
      'transform',
      `translate(${config.legendMargin.left},${
        newHeight + config.legendMargin.top
      })`
    )

    // If we have data, update the legend
    if (circlesGroup.selectAll('.country-circle').size() > 0) {
      const maxCount =
        d3.max(
          circlesGroup.selectAll('.country-circle').data(),
          (d) => d.count
        ) || 1
      const radiusScale = d3
        .scaleSqrt()
        .domain([1, maxCount])
        .range([config.minRadius, config.maxRadius])

      updateLegend(radiusScale, maxCount)
    }
  }

  // Add resize listener
  window.addEventListener('resize', handleResize)

  // Load world map data
  d3.json('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
    .then((worldMapData) => {
      worldData = worldMapData

      // Convert TopoJSON to GeoJSON
      worldCountries = topojson.feature(
        worldMapData,
        worldMapData.objects.countries
      )

      // Add countries to the map
      worldGroup
        .selectAll('.country')
        .data(worldCountries.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', pathGenerator)
        .attr('fill', '#e0e0e0')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)

      // Initialize with data if provided
      if (data && data.length > 0) {
        updateMap(data, options)
      }
    })
    .catch((error) => {
      console.error('Error loading world map data:', error)

      // Still initialize with data if provided, even without the world map
      if (data && data.length > 0) {
        updateMap(data, options)
      }
    })

  // Return the public API
  return {
    updateMap,
    svg,
    g,
    projection,
    handleResize,
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
    },
  }
}

export { createApiMap }
