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
  // Keep the projection you confirmed works
  const projection = d3
    .geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
  // .scale(innerWidth / 6.2) // Rely on fitSize
  // .translate([innerWidth / 2, innerHeight / 1.8]); // Rely on fitSize

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

  // <<<--- START NEW ZOOM CODE --->>>
  // Define the zoom behavior
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 8]) // Map specific extent (min zoom 1x, max 8x)
    .filter((event) => !(event.type === 'wheel')) // Disable wheel zoom, keep drag pan
    .on('zoom', zoomed) // Attach the zoom event handler

  // Define the zoom event handler function
  function zoomed(event) {
    // Apply the transform to the main content group 'g'
    // This will move/scale the world paths, points, and connections
    g.attr('transform', event.transform)
  }

  // Apply the zoom behavior to the SVG element
  svg
    .call(zoomBehavior)
    .style('pointer-events', 'all') // Ensure SVG intercepts drag events
    .style('cursor', 'grab') // Optional: Change cursor

  // Optional: Update cursor during drag for better UX
  zoomBehavior.on('start.cursor', () => svg.style('cursor', 'grabbing'))
  zoomBehavior.on('end.cursor', () => svg.style('cursor', 'grab'))
  // <<<--- END NEW ZOOM CODE --->>>

  /**
   * Safely parses the year from sequence metadata.
   * @param {Object} metadata - The metadata object for a sequence.
   * @returns {number|null} The parsed year as an integer, or null if invalid.
   */
  function getSequenceYear(metadata) {
    if (!metadata) return null
    const yearSource = metadata.first_year ?? metadata.years?.[0] // Prefer first_year, fallback to years array
    if (yearSource === null || yearSource === undefined) return null
    const year = parseInt(yearSource)
    return !isNaN(year) ? year : null
  }

  /**
   * Update the map with user sequence and similar sequences, applying filters and time highlighting.
   * @param {Object|null} userSequence - The user's sequence data.
   * @param {Array} allSimilarSequences - The *full* array of similar sequences.
   * @param {number|null} yearFilter - The year to highlight sequences for. If null, no time highlighting is applied.
   * @param {number} similarityThreshold - The minimum similarity (0-1 range) required to display a point prominently.
   */
  function updateMap(
    userSequence,
    allSimilarSequences = [],
    yearFilter = null,
    similarityThreshold = 0
  ) {
    console.log(
      `🌍 User Geo Map: Updating. Year Highlight: ${
        yearFilter ?? 'None'
      }, Min Similarity: ${similarityThreshold.toFixed(2)}`
    )

    // We are plotting ALL sequences passed in, but styling based on filters.
    const sequencesToPlot = Array.isArray(allSimilarSequences)
      ? allSimilarSequences
      : []
    console.log(
      `🌍 User Geo Map: Plotting ${sequencesToPlot.length} sequences.` // Log total sequences being plotted
    )

    // Clear previous points and connections
    pointsGroup.selectAll('.map-point').remove()
    connectionsGroup.selectAll('.map-connection').remove()

    let userCoords = null
    let userProjected = null
    let userCoordIsPlaceholder = true

    // --- Process User Sequence Data ---
    if (userSequence) {
      console.log(
        `🌍 Geo Map - Processing User Sequence: ID=${userSequence.id}`
      )
      // Keep using placeholder for user sequence
      userCoords = [0, -30] // Mid-Atlantic
      console.warn(
        '🌍 Geo Map: Using static placeholder coordinates for user sequence.'
      )
      userProjected = projection([userCoords[1], userCoords[0]]) // [lon, lat]
      if (
        !userProjected ||
        isNaN(userProjected[0]) ||
        isNaN(userProjected[1])
      ) {
        console.error(
          '🌍 Geo Map: Could not project user placeholder coordinates!'
        )
        userProjected = null
      }
    } else {
      console.warn('🌍 Geo Map: No user sequence provided.')
      userProjected = null
    }

    // --- JITTERING SETUP ---
    const occupiedCoordinates = {}
    const jitterRadiusBase = 2
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    // Determine Top 10 IDs (assuming input is sorted by similarity)
    const top10Ids = new Set(sequencesToPlot.slice(0, 10).map((s) => s.id))

    // --- Plot Similar Sequence Points ---
    sequencesToPlot.forEach((seq, index) => {
      console.log(
        `🌍 Geo Map - Processing Similar Seq #${index}: ID=${seq?.id}, LatLon=${seq?.metadata?.lat_lon}`
      )
      if (!seq || !seq.metadata) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index}: Missing sequence or metadata.`
        )
        return
      }

      const similarCoords = parseLatLon(seq.metadata.lat_lon)
      if (!similarCoords) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index} (ID: ${seq.id}): Could not parse coordinates.`
        )
        return
      }

      const similarProjected = projection([similarCoords[1], similarCoords[0]])
      console.log(
        `🌍 Geo Map - Seq #${index} (ID: ${seq.id}) Initial Projected Coords: [${similarProjected?.[0]}, ${similarProjected?.[1]}]`
      )

      if (
        !similarProjected ||
        isNaN(similarProjected[0]) ||
        isNaN(similarProjected[1])
      ) {
        console.warn(
          `🌍 Geo Map - Skipping Seq #${index} (ID: ${seq.id}): Projection failed.`
        )
        return
      }

      // --- Jittering Logic ---
      let finalX = similarProjected[0]
      let finalY = similarProjected[1]
      const coordKey = `${finalX.toFixed(3)},${finalY.toFixed(3)}`

      if (occupiedCoordinates[coordKey]) {
        occupiedCoordinates[coordKey]++
        const count = occupiedCoordinates[coordKey]
        const angle = count * goldenAngle
        const radius = jitterRadiusBase * Math.sqrt(count)
        finalX += radius * Math.cos(angle)
        finalY += radius * Math.sin(angle)
        console.log(
          `🌍 Geo Map - Jittering Seq #${index} (ID: ${
            seq.id
          }). Count at location: ${count}, Offset: [${(
            radius * Math.cos(angle)
          ).toFixed(2)}, ${(radius * Math.sin(angle)).toFixed(2)}]`
        )
      } else {
        occupiedCoordinates[coordKey] = 1
      }

      // --- Determine Styles based on Similarity and Time ---
      const meetsSimilarity = (seq.similarity ?? 0) >= similarityThreshold
      const sequenceYear = getSequenceYear(seq.metadata)
      // Highlight only if yearFilter is active AND sequence year matches
      const isTimeHighlighted =
        yearFilter !== null && sequenceYear === yearFilter
      const isTop10 = top10Ids.has(seq.id)

      let pointFill, pointStroke, pointStrokeWidth, pointOpacity, pointRadius

      if (!meetsSimilarity) {
        // Style for below similarity threshold (always very faded)
        pointFill = '#e0e0e0' // Light grey
        pointStroke = '#bdbdbd'
        pointStrokeWidth = 0.2
        pointOpacity = 0.1
        pointRadius = 3
      } else {
        // Base style for sequences meeting similarity threshold
        pointFill = config.similarityColorScale(seq.similarity || 0) // Color by similarity
        pointStroke = isTop10 ? config.userColor : '#333' // Top 10 border
        pointStrokeWidth = isTop10 ? 1.5 : 0.5
        pointRadius = isTop10 ? 5 : 4
        pointOpacity = 0.7

        // Apply time-based adjustments *if* a year filter is active
        if (yearFilter !== null) {
          if (isTimeHighlighted) {
            // Time-highlighted style
            pointOpacity = 1.0
            pointRadius = isTop10 ? 6.5 : 5.5 // Enlarge
            pointStrokeWidth = isTop10 ? 2.0 : 1.5 // Thicker border
          } else {
            // Time-faded style (meets similarity, but wrong year)
            pointOpacity = 0.25 // Moderately faded
            pointRadius = isTop10 ? 4.5 : 3.5 // Slightly smaller
            // Optional: Desaturate fill slightly? For now, just use opacity.
            // pointFill = d3.color(pointFill).brighter(-0.5).formatHex();
          }
        }
        // If yearFilter is null, the base style from above is used (no time fading/highlighting)
      }
      // --- End Style Determination ---

      console.log(
        `🌍 Geo Map - Appending circle for Seq #${index} (ID: ${seq.id}) at [${finalX}, ${finalY}]`
      )
      // Append similar point circle with dynamic styles
      pointsGroup
        .append('circle')
        .attr(
          'class',
          `map-point similar-point ${isTop10 ? 'top-10' : ''} ${
            isTimeHighlighted ? 'time-highlight' : 'time-faded'
          }`
        )
        .attr('cx', finalX)
        .attr('cy', finalY)
        .attr('r', pointRadius)
        .attr('fill', pointFill)
        .attr('stroke', pointStroke)
        .attr('stroke-width', pointStrokeWidth)
        .attr('opacity', pointOpacity)
        .attr('data-id', seq.id)
        .style('cursor', 'pointer')
        .on('mouseover', function (event) {
          tooltip
            .html(getSimilarTooltipContent(seq, similarCoords))
            .style('visibility', 'visible')
            .transition()
            .duration(100)
            .style('opacity', 1)
          // Optional: Slightly enhance hover even if faded/highlighted
          d3.select(this)
            .raise()
            .transition()
            .duration(50)
            .style('stroke-width', pointStrokeWidth + 1)
        })
        .on('mousemove', function (event) {
          tooltip
            .style('top', event.pageY - 15 + 'px')
            .style('left', event.pageX + 15 + 'px')
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0).style('visibility', 'hidden')
          // Revert hover enhancement
          d3.select(this)
            .transition()
            .duration(50)
            .style('stroke-width', pointStrokeWidth)
        })

      // --- Draw Connection Line ---
      if (userProjected) {
        // Fade connection if the *target* point is faded (either by similarity or time)
        let connectionOpacity = 0.4 // Default
        if (!meetsSimilarity) {
          connectionOpacity = 0.05 // Very faint if below similarity
        } else if (yearFilter !== null && !isTimeHighlighted) {
          connectionOpacity = 0.1 // Faint if time-faded
        }

        connectionsGroup
          .append('line')
          .attr('class', 'map-connection')
          .attr('x1', userProjected[0])
          .attr('y1', userProjected[1])
          .attr('x2', finalX)
          .attr('y2', finalY)
          .attr('stroke', config.connectionColor)
          .attr('stroke-width', 0.5)
          .attr('stroke-opacity', connectionOpacity)
          .attr('data-target', seq.id)
      }
    })

    // --- Plot User Sequence Point LAST ---
    if (userProjected) {
      // Apply similar time-based styling logic to user point?
      // For now, user point always prominent.
      const userPointOpacity = 1.0 // Keep user point fully visible
      const userPointRadius = 6
      const userPointStrokeWidth = 1.5

      pointsGroup
        .append('circle')
        .attr('class', 'map-point user-point')
        .attr('cx', userProjected[0])
        .attr('cy', userProjected[1])
        .attr('r', userPointRadius)
        .attr('fill', config.userColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', userPointStrokeWidth)
        .attr('opacity', userPointOpacity)
        .attr('data-id', userSequence?.id || 'user')
        .style('cursor', 'help')
        .on('mouseover', function (event) {
          tooltip
            .html(
              `<h4>Your Sequence</h4>
                     <p>ID: ${userSequence?.id || 'N/A'}</p> 
                     <p style="color: #777;">(Placeholder Location)</p>`
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
          tooltip.style('opacity', 0).style('visibility', 'hidden')
        })
      console.log(
        '🌍 Geo Map - User point drawn on top at placeholder location.'
      )
    }
  }

  /**
   * Generates HTML content for the tooltip for similar sequences.
   * @param {Object} seqData - The data object for the hovered similar sequence.
   * @param {Array|null} originalCoords - The original [lat, lon] before jittering.
   * @returns {string} HTML string for the tooltip.
   */
  function getSimilarTooltipContent(seqData, originalCoords) {
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
    // const distance =
    //   seqData.distance != null ? seqData.distance.toFixed(3) : 'N/A'
    const isolationSource = metadata.isolation_source || 'N/A'
    // Use the passed originalCoords for display
    const coordsString = originalCoords
      ? `${originalCoords[0].toFixed(2)}, ${originalCoords[1].toFixed(2)}`
      : 'N/A'

    return `
        <h4 style="margin: 0 0 6px 0; border-bottom: 1px solid #eee; padding-bottom: 4px;">Similar Sequence</h4>
        <p style="margin: 2px 0;"><strong>Accession:</strong> ${accession}</p>
        <p style="margin: 2px 0;"><strong>Similarity:</strong> ${similarity}</p>
        <p style="margin: 2px 0;"><strong>Country:</strong> ${country}</p>
        <p style="margin: 2px 0;"><strong>Year:</strong> ${year}</p>
        <p style="margin: 2px 0;"><strong>Host:</strong> ${host}</p>
        <p style="margin: 2px 0;"><strong>Isolation Source:</strong> ${isolationSource}</p>
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

    // --- ADD ZOOM RESET ON RESIZE ---
    // Reset zoom to identity on resize to avoid strange scaling issues
    svg.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity)
    // --- END ZOOM RESET ---

    console.log(
      'User Geo Map resized. Positions will update on next data load (updateMap call). Zoom reset.'
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
    svg: svg,
    projection: projection,
    updateMap: updateMap,
    highlightSequence,
    zoomBehavior: zoomBehavior,
    destroy: () => {
      window.removeEventListener('resize', handleResize)
      tooltip.remove()
      svg.on('.zoom', null) // Remove zoom listeners
      svg.remove()
      console.log(`🌍 User Geo Map ${containerId} destroyed.`)
    },
  }
}

// // Removed parseLatLon helper if not needed or handled differently
// function parseLatLon(latLonStr) { ... } // Potentially remove if logic moved or simplified
