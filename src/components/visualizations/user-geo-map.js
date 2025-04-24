import * as d3 from 'd3'
import * as topojson from 'topojson-client'

/**
 * Create a geographic map visualization for user sequences and their top similar matches
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Map component API (returns a Promise)
 */
export async function createUserGeoMap(containerId, options = {}) {
  console.log('🌍 Creating user geo map for container:', containerId)

  // Default options
  const defaults = {
    width: null,
    height: null,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    // Use a sequential color scale for similarity
    similarityColorScale: d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0.7, 1]), // Example: Blues for similarity >= 70%
    userColor: '#FF5722', // Color for the user's sequence point
    similarColor: '#3F51B5', // Base color for similar points (can be overridden by scale)
    connectionColor: '#999', // Color for lines connecting user to similar
  }

  // Merge options
  const config = { ...defaults, ...options }
  // Deep merge scales if provided
  if (options.similarityColorScale)
    config.similarityColorScale = options.similarityColorScale

  // --- Container Setup ---
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null
  }
  container.style.position = container.style.position || 'relative'

  // --- SVG Setup ---
  let width = config.width || container.clientWidth
  let height = config.height || container.clientHeight
  let innerWidth = width - config.margin.left - config.margin.right
  let innerHeight = height - config.margin.top - config.margin.bottom

  // Clear previous SVG
  d3.select(container).select('svg').remove()

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  const g = svg
    .append('g')
    .attr('class', 'geo-map-content')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // --- Projection and Path ---
  // Match projection from other maps for consistency
  const projection = d3
    .geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
    .scale(innerWidth / 6.2)
    .translate([innerWidth / 2, innerHeight / 1.8])

  const path = d3.geoPath(projection)
  const graticule = d3.geoGraticule()

  // --- Map Background Elements ---
  g.append('path')
    .attr('class', 'sphere')
    .attr('d', path({ type: 'Sphere' }))
    .attr('fill', '#f0f0f0')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5)

  g.append('path')
    .attr('class', 'graticule')
    .attr('d', path(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#e0e0e0')
    .attr('stroke-width', 0.5)

  // Group for map features and points
  const worldGroup = g.append('g').attr('class', 'world')
  const pointsGroup = g.append('g').attr('class', 'points')
  const connectionsGroup = g.append('g').attr('class', 'connections')

  // --- Tooltip ---
  const tooltip = d3
    .select('body') // Attach to body
    .append('div')
    .attr('class', 'geo-tooltip') // Use a distinct class
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('opacity', 0)
    .style('background-color', 'rgba(255, 255, 255, 0.95)')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('padding', '8px 10px')
    .style('box-shadow', '0 1px 3px rgba(0,0,0,0.15)')
    .style('font-family', 'sans-serif')
    .style('font-size', '11px') // Slightly smaller font
    .style('pointer-events', 'none')
    .style('z-index', 1001) // Ensure it's above other elements
    .style('transition', 'opacity 0.2s ease-out, visibility 0.2s ease-out')

  /**
   * Parses latitude and longitude from various possible string formats.
   * @param {string|Array} latLonInput - Input, potentially like "['lat, lon']" or [lat, lon].
   * @returns {Array|null} - [latitude, longitude] array or null if parsing fails.
   */
  function parseLatLon(latLonInput) {
    // --- DEBUG LOGGING START ---
    console.log(
      `🌍 Geo Map - parseLatLon Input:`,
      latLonInput,
      `(Type: ${typeof latLonInput})`
    )
    // --- DEBUG LOGGING END ---
    if (!latLonInput) return null

    try {
      let lat, lon
      if (Array.isArray(latLonInput)) {
        if (
          latLonInput.length === 2 &&
          typeof latLonInput[0] === 'number' &&
          typeof latLonInput[1] === 'number'
        ) {
          // Assumes [lat, lon] format
          ;[lat, lon] = latLonInput
        } else if (
          latLonInput.length >= 1 &&
          typeof latLonInput[0] === 'string'
        ) {
          // Assumes ["lat, lon"] format
          const coordStr = latLonInput[0].replace(/["'\[\]\s]/g, '') // Clean string
          ;[lat, lon] = coordStr.split(',').map((str) => parseFloat(str.trim()))
        }
      } else if (typeof latLonInput === 'string') {
        // Assumes "lat, lon" or similar string format
        const coordStr = latLonInput.replace(/["'\[\]\s]/g, '')
        ;[lat, lon] = coordStr.split(',').map((str) => parseFloat(str.trim()))
      }

      if (
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      ) {
        // --- DEBUG LOGGING START ---
        console.log(`🌍 Geo Map - parseLatLon SUCCESS: Output [${lat}, ${lon}]`)
        // --- DEBUG LOGGING END ---
        return [lat, lon]
      }
    } catch (error) {
      console.warn(
        '🌍 Geo Map - Error parsing coordinates:',
        latLonInput,
        error
      )
    }
    // --- DEBUG LOGGING START ---
    console.warn('🌍 Geo Map - parseLatLon FAILED for input:', latLonInput)
    // --- DEBUG LOGGING END ---
    return null // Return null if parsing fails or coordinates are invalid
  }

  /**
   * Update the map with user sequence and top similar sequences.
   * @param {Object|null} userSequence - The user's sequence data (must include metadata.lat_lon).
   * @param {Array} similarSequences - Array of top N similar sequences (must include metadata.lat_lon).
   */
  function updateMap(userSequence, similarSequences = []) {
    console.log(
      `🌍 User Geo Map: Updating with ${similarSequences.length} similar sequences.`
    )
    // --- DEBUG LOGGING START ---
    console.log(
      `🌍 Geo Map - Raw similarSequences data sample (first 2):`,
      similarSequences.slice(0, 2)
    )
    // --- DEBUG LOGGING END ---

    // Clear previous points and connections
    pointsGroup.selectAll('.map-point').remove()
    connectionsGroup.selectAll('.map-connection').remove()

    let userCoords = null
    let userProjected = null

    // --- Plot User Sequence Point ---
    if (userSequence && userSequence.metadata) {
      // --- DEBUG LOGGING START ---
      console.log(
        `🌍 Geo Map - Processing User Sequence: ID=${userSequence.id}, LatLon=${userSequence.metadata.lat_lon}`
      )
      // --- DEBUG LOGGING END ---
      userCoords = parseLatLon(userSequence.metadata.lat_lon)
      if (userCoords) {
        userProjected = projection([userCoords[1], userCoords[0]]) // [lon, lat] for projection
        // --- DEBUG LOGGING START ---
        console.log(
          `🌍 Geo Map - User Projected Coords: [${userProjected?.[0]}, ${userProjected?.[1]}]`
        )
        // --- DEBUG LOGGING END ---

        if (
          userProjected &&
          !isNaN(userProjected[0]) &&
          !isNaN(userProjected[1])
        ) {
          pointsGroup
            .append('circle')
            .attr('class', 'map-point user-point')
            .attr('cx', userProjected[0])
            .attr('cy', userProjected[1])
            .attr('r', 6) // Slightly larger radius
            .attr('fill', config.userColor)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.9)
            .attr('data-id', userSequence.id || 'user')
            .on('mouseover', function (event) {
              // Add tooltip for user point
              tooltip
                .html(
                  `<h4>Your Sequence</h4><p>ID: ${
                    userSequence.id || 'N/A'
                  }</p>${
                    userCoords
                      ? `<p>Coords: ${userCoords[0].toFixed(
                          2
                        )}, ${userCoords[1].toFixed(2)}</p>`
                      : ''
                  }`
                )
                .style('visibility', 'visible')
                .transition()
                .duration(100)
                .style('opacity', 1)
            })
            .on('mousemove', function (event) {
              tooltip
                .style('top', event.pageY - 15 + 'px')
                .style('left', event.pageX + 15 + 'px')
            })
            .on('mouseout', function () {
              tooltip
                .transition()
                .duration(100)
                .style('opacity', 0)
                .end()
                .then(() => tooltip.style('visibility', 'hidden'))
            })
        } else {
          console.warn(
            '🌍 Geo Map: Could not project user coordinates:',
            userCoords
          )
          userProjected = null // Reset if projection failed
        }
      } else {
        console.warn(
          '🌍 Geo Map: User sequence missing valid lat/lon metadata.'
        )
      }
    } else {
      console.warn('🌍 Geo Map: No user sequence provided or missing metadata.')
    }

    // --- Plot Similar Sequence Points and Connections ---
    similarSequences.forEach((seq, index) => {
      // --- DEBUG LOGGING START ---
      console.log(
        `🌍 Geo Map - Processing Similar Seq #${index}: ID=${seq?.id}, LatLon=${seq?.metadata?.lat_lon}`
      )
      // --- DEBUG LOGGING END ---
      if (!seq || !seq.metadata) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index}: Missing sequence or metadata.`
        )
        return // Skip if sequence or metadata is missing
      }

      const similarCoords = parseLatLon(seq.metadata.lat_lon)
      if (!similarCoords) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index} (ID: ${seq.id}): Could not parse coordinates.`
        )
        return // Skip if no valid coordinates
      }

      const similarProjected = projection([similarCoords[1], similarCoords[0]]) // [lon, lat]
      // --- DEBUG LOGGING START ---
      console.log(
        `🌍 Geo Map - Seq #${index} (ID: ${seq.id}) Projected Coords: [${similarProjected?.[0]}, ${similarProjected?.[1]}]`
      )
      // --- DEBUG LOGGING END ---
      if (
        !similarProjected ||
        isNaN(similarProjected[0]) ||
        isNaN(similarProjected[1])
      ) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index} (ID: ${seq.id}): Projection failed.`
        )
        return // Skip if projection fails
      }

      // --- Plot Similar Point ---
      // --- DEBUG LOGGING START ---
      console.log(
        `🌍 Geo Map - Appending circle for Seq #${index} (ID: ${seq.id}) at [${similarProjected[0]}, ${similarProjected[1]}]`
      )
      // --- DEBUG LOGGING END ---
      pointsGroup
        .append('circle')
        .attr('class', 'map-point similar-point')
        .attr('cx', similarProjected[0])
        .attr('cy', similarProjected[1])
        .attr('r', 4) // Standard radius
        .attr('fill', config.similarityColorScale(seq.similarity || 0)) // Color by similarity
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.7)
        .attr('data-id', seq.id) // Use sequence ID for linking
        .style('cursor', 'pointer')
        .on('mouseover', function (event) {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 6) // Enlarge on hover
            .style('opacity', 1.0)

          tooltip
            .html(getSimilarTooltipContent(seq)) // Use dedicated tooltip function
            .style('visibility', 'visible')
            .transition()
            .duration(100)
            .style('opacity', 1)
        })
        .on('mousemove', function (event) {
          tooltip
            .style('top', event.pageY - 15 + 'px')
            .style('left', event.pageX + 15 + 'px')
        })
        .on('mouseout', function () {
          d3.select(this)
            .transition()
            .duration(100)
            .attr('r', 4) // Revert size
            .style('opacity', 0.7)

          tooltip
            .transition()
            .duration(100)
            .style('opacity', 0)
            .end()
            .then(() => tooltip.style('visibility', 'hidden'))
        })

      // --- Draw Connection Line (if user point exists) ---
      if (userProjected) {
        connectionsGroup
          .append('line')
          .attr('class', 'map-connection')
          .attr('x1', userProjected[0])
          .attr('y1', userProjected[1])
          .attr('x2', similarProjected[0])
          .attr('y2', similarProjected[1])
          .attr('stroke', config.connectionColor)
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', 0.4)
          .attr('data-target', seq.id) // Link line to target point ID
      }
    })
  }

  /**
   * Generates HTML content for the tooltip for similar sequences.
   * Includes Isolation Source.
   * @param {Object} seqData - The data object for the hovered similar sequence.
   * @returns {string} HTML string for the tooltip.
   */
  function getSimilarTooltipContent(seqData) {
    const metadata = seqData.metadata || {}
    const accession = metadata.accessions?.[0] || seqData.id || 'N/A'
    const country = metadata.country || metadata.first_country || 'N/A'
    const year =
      metadata.first_year || (metadata.years && metadata.years[0]) || 'N/A'
    const host = metadata.host || 'N/A'
    const similarity =
      seqData.similarity != null
        ? (seqData.similarity * 100).toFixed(1) + '%'
        : 'N/A'
    const distance =
      seqData.distance != null ? seqData.distance.toFixed(3) : 'N/A'
    const isolationSource = metadata.isolation_source || 'N/A' // <-- Get isolation source
    const coords = parseLatLon(metadata.lat_lon)
    const coordsString = coords
      ? `${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}`
      : 'N/A'

    return `
        <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #eee; padding-bottom: 4px;">Similar Sequence</h4>
        <p style="margin: 2px 0;"><strong>Accession:</strong> ${accession}</p>
        <p style="margin: 2px 0;"><strong>Similarity:</strong> ${similarity}</p>
        <p style="margin: 2px 0;"><strong>Distance:</strong> ${distance}</p>
        <p style="margin: 2px 0;"><strong>Country:</strong> ${country}</p>
        <p style="margin: 2px 0;"><strong>Year:</strong> ${year}</p>
        <p style="margin: 2px 0;"><strong>Host:</strong> ${host}</p>
        <p style="margin: 2px 0;"><strong>Source:</strong> ${isolationSource}</p> <!-- Added Isolation Source -->
        <p style="margin: 2px 0;"><strong>Coords:</strong> ${coordsString}</p>
      `
  }

  /**
   * Highlight a sequence point and its connection on the map.
   * @param {string} id - ID of the sequence to highlight.
   * @param {boolean} highlight - Whether to highlight or unhighlight.
   */
  function highlightSequence(id, highlight) {
    const point = pointsGroup.select(`.map-point[data-id="${id}"]`)
    const connection = connectionsGroup.select(
      `.map-connection[data-target="${id}"]`
    )

    // Highlight point
    if (!point.empty()) {
      point
        .transition(`highlight-point-${highlight}`)
        .duration(150)
        .attr('r', highlight ? 6 : 4) // Enlarge point slightly
        .style('stroke-width', highlight ? 1.5 : 0.5)
        .style('opacity', highlight ? 1.0 : 0.7)
    }

    // Highlight connection
    if (!connection.empty()) {
      connection
        .transition(`highlight-conn-${highlight}`)
        .duration(150)
        .attr('stroke', highlight ? config.userColor : config.connectionColor) // Highlight line with user color
        .attr('stroke-width', highlight ? 1.5 : 0.5)
        .attr('stroke-opacity', highlight ? 0.8 : 0.4)
    }
  }

  /**
   * Handles window resize events.
   */
  function handleResize() {
    width = container.clientWidth
    height = container.clientHeight
    innerWidth = width - config.margin.left - config.margin.right
    innerHeight = height - config.margin.top - config.margin.bottom

    svg.attr('viewBox', [0, 0, width, height])

    projection
      .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
      .scale(innerWidth / 6.2)
      .translate([innerWidth / 2, innerHeight / 1.8])

    // Update map background elements
    g.select('.sphere').attr('d', path({ type: 'Sphere' }))
    g.select('.graticule').attr('d', path(graticule()))
    if (worldGroup.selectAll('.country').size() > 0) {
      worldGroup.selectAll('.country').attr('d', path)
    }

    // Update point and connection positions (requires re-querying data or storing it)
    // For simplicity, we might just require updateMap to be called after resize,
    // or store the data locally to recalculate positions here.
    // Let's keep it simple: positions update on the next call to updateMap.
    console.log(
      'User Geo Map resized. Positions will update on next data load.'
    )
  }

  window.addEventListener('resize', handleResize)

  // --- Load World Map Data ---
  let worldDataLoaded = false
  try {
    const worldMapData = await d3.json(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    )
    const worldCountries = topojson.feature(
      worldMapData,
      worldMapData.objects.countries
    )
    worldGroup
      .selectAll('.country')
      .data(worldCountries.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', '#d8d8d8')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.3)
    worldDataLoaded = true
    console.log('🌍 User Geo Map: World map data loaded.')
  } catch (error) {
    console.error('🌍 User Geo Map: Error loading world map data:', error)
    // Consider how to handle failure - maybe return null or an object indicating failure?
    // For now, log the error and continue, the map might be partially usable.
  }

  // Return public API
  return {
    updateMap,
    highlightSequence,
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
      svg.remove()
      console.log(`🌍 User Geo Map ${containerId} destroyed.`)
    },
  }
}

// // Removed parseLatLon helper if not needed or handled differently
// function parseLatLon(latLonStr) { ... } // Potentially remove if logic moved or simplified
