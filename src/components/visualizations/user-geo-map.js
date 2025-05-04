import * as d3 from 'd3'
import * as topojson from 'topojson-client'

/**
 * Create a geographic map visualization for user sequences and their top similar matches,
 * including encapsulated time-lapse functionality.
 * @param {string} containerId - ID of the container element
 * @param {Array} initialData - The initial subset of similar sequences to display.
 * @param {Object|null} initialUserSequence - The initial user sequence data.
 * @param {Object} options - Configuration options
 * @returns {Promise<Object|null>} Map component API (returns a Promise), or null on critical error.
 */
export async function createUserGeoMap(
  containerId,
  initialData = [],
  initialUserSequence = null,
  options = {}
) {
  console.log(
    '🌍 Creating user geo map with time-lapse for container:',
    containerId
  )

  // Default options
  const defaults = {
    width: null, // If null, uses container width
    height: 500, // Default height if not provided
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    similarityColorScale: d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0.7, 1]),
    userColor: '#FF5722',
    similarColor: '#3F51B5',
    connectionColor: '#999',
    animationSpeedMs: 1000, // Default animation speed
  }

  const config = { ...defaults, ...options }
  if (options.similarityColorScale)
    config.similarityColorScale = options.similarityColorScale

  // --- Encapsulated State ---
  let _isPlaying = false
  let _currentTime = null // Current year filter/highlight
  let _timeMin = null // Min year from data
  let _timeMax = null // Max year from data
  let _animationTimer = null
  let _similarityThreshold = 0 // 0-1 range
  let _userSequence = initialUserSequence
  let _currentDataSubset = initialData // Store the subset passed initially

  // --- Container Setup ---
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`)
    return null // Return null on critical error
  }
  container.style.position = container.style.position || 'relative'
  container.style.minHeight = `${config.height}px` // Ensure container has min height

  // --- SVG Setup ---
  let width = config.width || container.clientWidth
  let height = config.height // Use fixed or default height
  let innerWidth = width - config.margin.left - config.margin.right
  let innerHeight = height - config.margin.top - config.margin.bottom

  d3.select(container).select('svg').remove() // Clear previous SVG

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height) // Use fixed height
    .attr('viewBox', [0, 0, width, height])
    .style('display', 'block') // Ensure SVG takes block space

  const g = svg
    .append('g')
    .attr('class', 'geo-map-content')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`)

  // --- Projection and Path ---
  const projection = d3
    .geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })

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

  // <<<--- START NEW ZOOM CODE --->>>
  // Define the zoom behavior
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 8]) // Map specific extent (min zoom 1x, max 8x)
    .filter((event) => !(event.type === 'wheel')) // Disable wheel zoom, keep drag pan
    .on('zoom', _zoomed) // Attach the zoom event handler

  // Define the zoom event handler function
  function _zoomed(event) {
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
   * Redraws the map points and connections based on internal state
   * (_userSequence, _currentDataSubset, _currentTime, _similarityThreshold).
   */
  function _redrawMap() {
    const yearFilter = _currentTime // Use internal state
    const similarityThreshold = _similarityThreshold // Use internal state
    const userSequence = _userSequence // Use internal state
    const sequencesToPlot = _currentDataSubset || [] // Use internal state

    console.log(
      `🌍 Geo Map: Redrawing. Year: ${
        yearFilter ?? 'None'
      }, Sim: ${similarityThreshold.toFixed(2)}, Points: ${
        sequencesToPlot.length
      }`
    )

    pointsGroup.selectAll('.map-point').remove()
    connectionsGroup.selectAll('.map-connection').remove()

    let userCoords = null
    let userProjected = null

    if (userSequence) {
      console.log(
        `🌍 Geo Map - Processing User Sequence: ID=${userSequence.id}`
      )
      // Keep using placeholder for user sequence
      userCoords = [0, -30] // Mid-Atlantic
      console.warn(
        '🌍 Geo Map: Using static placeholder coordinates for user sequence.'
      )
      userProjected = projection([userCoords[1], userCoords[0]])
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

    // --- Jittering SETUP ---
    const occupiedCoordinates = {}
    const jitterRadiusBase = 2
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    // --- SPLIT DATA for drawing order ---
    const top10Ids = new Set(sequencesToPlot.slice(0, 10).map((s) => s.id))
    const top10Sequences = sequencesToPlot.filter((seq) => top10Ids.has(seq.id))
    const otherSequences = sequencesToPlot.filter(
      (seq) => !top10Ids.has(seq.id)
    )

    // --- Function to plot a single sequence (avoids code duplication) ---
    const plotSequencePoint = (seq, index, isTop10) => {
      if (!seq || !seq.metadata) return
      const similarCoords = parseLatLon(seq.metadata.lat_lon)
      if (!similarCoords) return
      const similarProjected = projection([similarCoords[1], similarCoords[0]])
      if (
        !similarProjected ||
        isNaN(similarProjected[0]) ||
        isNaN(similarProjected[1])
      )
        return

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
      } else {
        occupiedCoordinates[coordKey] = 1
      }

      // Determine Styles based on internal state (_currentTime, _similarityThreshold)
      const meetsSimilarity = (seq.similarity ?? 0) >= similarityThreshold
      const sequenceYear = getSequenceYear(seq.metadata)
      const isTimeHighlighted =
        yearFilter !== null && sequenceYear === yearFilter
      // isTop10 is passed as argument

      let pointFill, pointStroke, pointStrokeWidth, pointOpacity, pointRadius

      if (!meetsSimilarity) {
        pointFill = '#e0e0e0'
        pointStroke = '#bdbdbd'
        pointStrokeWidth = 0.2
        pointOpacity = 0.1 // Very low opacity for points below similarity threshold
        pointRadius = 3
      } else {
        // *** UPDATED FILL COLOR LOGIC ***
        if (isTop10) {
          pointFill = '#e91e62' // Red for Top 10
        } else {
          pointFill = '#607D8B' // Blue Grey for others (11+)
        }

        pointStroke = isTop10 ? config.userColor : '#333'
        pointStrokeWidth = isTop10 ? 1.5 : 0.5
        pointRadius = isTop10 ? 5 : 4
        // Set base opacity based on whether it's Top 10 or not
        pointOpacity = isTop10 ? 1.0 : 0.7 // Higher base opacity for Top 10

        // Apply time-based adjustments ONLY if yearFilter is active (not null)
        if (yearFilter !== null) {
          const isTimeHighlighted = sequenceYear === yearFilter
          if (isTimeHighlighted) {
            // Keep full opacity or even enhance slightly if desired
            pointOpacity = 1.0
            pointRadius = isTop10 ? 6.5 : 5.5
            pointStrokeWidth = isTop10 ? 2.0 : 1.5
          } else {
            // Fade points not matching the current year filter
            pointOpacity = 0.25
            pointRadius = isTop10 ? 4.5 : 3.5
          }
        }
        // If yearFilter IS null, the base opacity (0.7 or 1.0) set above is used.
      }

      // Append similar point circle
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
          d3.select(this)
            .transition()
            .duration(50)
            .style('stroke-width', pointStrokeWidth)
        })

      // Draw Connection Line
      if (userProjected) {
        let connectionOpacity = 0.4
        if (!meetsSimilarity) connectionOpacity = 0.05
        else if (yearFilter !== null && !isTimeHighlighted)
          connectionOpacity = 0.1
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
    }

    // --- Plot Similar Sequence Points (Other first, then Top 10) ---
    otherSequences.forEach((seq, index) =>
      plotSequencePoint(seq, index + 10, false)
    ) // Plot 11+ first
    top10Sequences.forEach((seq, index) => plotSequencePoint(seq, index, true)) // Plot Top 10 last

    // --- Plot User Sequence Point LAST (logic remains the same) ---
    if (userProjected) {
      const userPointOpacity = 1.0
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
              `<h4>Your Sequence</h4><p>ID: ${
                userSequence?.id || 'N/A'
              }</p><p style="color: #777;">(Placeholder Location)</p>`
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

  // --- Time-Lapse Logic (Internal) ---

  function _getAnimationSpeed() {
    return config.animationSpeedMs || 1000 // Use configured or default speed
  }

  function _stepTime() {
    if (!_isPlaying || _timeMin === null || _timeMax === null) {
      _stopAnimation() // Ensure stopped if state is inconsistent
      return
    }

    let currentYear = _currentTime
    if (currentYear === null) currentYear = _timeMin - 1 // Start before first year

    if (currentYear < _timeMax) {
      currentYear++
      _currentTime = currentYear // Update internal state
      _redrawMap() // Redraw with new time highlight
      // External UI update needed here - consider callback or event
      _updateExternalUI() // Call function to update external sliders/labels

      if (_isPlaying) {
        // Check again before scheduling next step
        _animationTimer = setTimeout(_stepTime, _getAnimationSpeed())
      }
    } else {
      console.log('🌍 Geo Map: Reached end year. Stopping animation.')
      _stopAnimation() // Stop at the end
      // Ensure UI reflects stopped state and final year
      _updateExternalUI()
    }
  }

  function _startAnimation() {
    if (_isPlaying) return
    if (_timeMin === null || _timeMax === null) {
      console.warn('🌍 Geo Map: Cannot start animation - time range not set.')
      return
    }
    console.log('🌍 Geo Map: ▶️ Starting animation')
    _isPlaying = true

    // If current time is at end or null, reset to start before playing
    if (_currentTime === null || _currentTime >= _timeMax) {
      _currentTime = _timeMin
    }
    _updateExternalUI() // Update button text etc.

    _stepTime() // Start the first step
  }

  function _stopAnimation() {
    if (!_isPlaying && _animationTimer === null) return // Already stopped
    console.log('🌍 Geo Map: ⏸️ Stopping animation')
    _isPlaying = false
    if (_animationTimer) {
      clearTimeout(_animationTimer)
      _animationTimer = null
    }
    _updateExternalUI() // Update button text etc.
  }

  // --- External UI Interaction (Internal Helper) ---
  /** Updates the external slider/label UI based on internal state */
  function _updateExternalUI() {
    // This function needs access to the DOM elements outside the component.
    // Best practice: Use a callback passed in options, or emit custom events.
    // Simple approach for now: Direct DOM manipulation (less ideal but works).
    const timeSlider = document.getElementById('time-slider-geo')
    const currentTimeDisplay = document.getElementById(
      'current-time-display-geo'
    )
    const playPauseButton = document.getElementById('play-pause-button-geo')
    const timeMinLabel = document.getElementById('time-min-label-geo')
    const timeMaxLabel = document.getElementById('time-max-label-geo')
    const similaritySlider = document.getElementById('similarity-slider-geo')
    const similarityValue = document.getElementById('similarity-value-geo')
    const resetTimeButton = document.getElementById('reset-time-button-geo') // Get reset button

    const hasTimeRange = _timeMin !== null && _timeMax !== null

    if (timeSlider) {
      timeSlider.min = _timeMin ?? 1900
      timeSlider.max = _timeMax ?? new Date().getFullYear()
      // Set slider value to max if _currentTime is null, otherwise use _currentTime
      timeSlider.value = _currentTime ?? _timeMax ?? timeSlider.min
      timeSlider.disabled = !hasTimeRange
    }
    if (currentTimeDisplay) {
      // Display "All" if _currentTime is null, otherwise the year
      currentTimeDisplay.textContent = `Year: ${_currentTime ?? 'All'}`
    }
    if (playPauseButton) {
      playPauseButton.textContent = _isPlaying ? 'Pause' : 'Play'
      playPauseButton.disabled = !hasTimeRange
    }
    if (resetTimeButton) {
      resetTimeButton.disabled = !hasTimeRange // Enable reset only if time range is valid
    }
    if (timeMinLabel) timeMinLabel.textContent = _timeMin ?? 'N/A'
    if (timeMaxLabel) timeMaxLabel.textContent = _timeMax ?? 'N/A'

    // Also update similarity slider display (value doesn't change, just ensure it's enabled)
    if (similaritySlider) {
      // Enable/disable based on whether data exists? Or always enabled?
      // similaritySlider.disabled = !_currentDataSubset || _currentDataSubset.length === 0;
      similaritySlider.value = (_similarityThreshold * 100).toFixed(0)
    }
    if (similarityValue) {
      similarityValue.textContent = `${(_similarityThreshold * 100).toFixed(
        0
      )}%`
    }
  }

  // --- Public API Methods ---

  /** Plays the time-lapse animation. */
  function play() {
    _startAnimation()
  }

  /** Pauses the time-lapse animation. */
  function pause() {
    _stopAnimation()
  }

  /** Resets the time filter state and stops animation. */
  function resetTime() {
    console.log('🌍 Geo Map: Resetting time filter.')
    _stopAnimation()
    _currentTime = null // Reset to null to signify "show all"
    _redrawMap()
    _updateExternalUI()
  }

  /** Sets the current year filter and redraws the map. Stops animation if playing. */
  function setYear(year) {
    if (_isPlaying) _stopAnimation() // Stop animation on manual change
    const newYear = parseInt(year)
    if (
      !isNaN(newYear) &&
      newYear >= (_timeMin ?? -Infinity) &&
      newYear <= (_timeMax ?? Infinity)
    ) {
      _currentTime = newYear
      console.log(`🌍 Geo Map: Setting year filter to: ${_currentTime}`)
      _redrawMap()
      _updateExternalUI()
    } else {
      console.warn(`🌍 Geo Map: Invalid year set: ${year}`)
    }
  }

  /** Sets the minimum similarity threshold and redraws the map. */
  function setSimilarity(thresholdPercent) {
    const newThreshold =
      Math.max(0, Math.min(100, parseFloat(thresholdPercent))) / 100
    if (!isNaN(newThreshold)) {
      _similarityThreshold = newThreshold
      console.log(
        `🌍 Geo Map: Setting similarity threshold to: ${(
          _similarityThreshold * 100
        ).toFixed(0)}%`
      )
      _redrawMap()
      _updateExternalUI() // Update external UI slider value display
    } else {
      console.warn(
        `🌍 Geo Map: Invalid similarity threshold set: ${thresholdPercent}`
      )
    }
  }

  /** Updates the time range (min/max years) for the component and controls. */
  function setTimeRange(minYear, maxYear) {
    _timeMin = minYear
    _timeMax = maxYear
    console.log(`🌍 Geo Map: Time range set: ${_timeMin} - ${_timeMax}`)
    // Reset currentTime if it's outside the new range? Or keep it?
    if (
      _currentTime !== null &&
      (_currentTime < _timeMin || _currentTime > _timeMax)
    ) {
      _currentTime = _timeMax // Default to max if current is out of bounds
    }
    _updateExternalUI() // Update sliders etc.
  }

  /** Returns true if the animation is currently playing. */
  function isPlaying() {
    return _isPlaying
  }

  /** Updates the data used by the map and redraws. */
  function updateData(newUserSequence, newSimilarSequences) {
    _userSequence = newUserSequence
    _currentDataSubset = newSimilarSequences || []
    console.log(
      `🌍 Geo Map: Data updated. User: ${!!_userSequence}, Subset Size: ${
        _currentDataSubset.length
      }`
    )
    // Decide whether to reset time filter on data update. Currently keeps existing filter.
    // _currentTime = _timeMax; // Optionally reset time
    _redrawMap()
    _updateExternalUI()
  }

  /** Cleans up the component, removes listeners and elements. */
  function destroy() {
    _stopAnimation() // Stop animation timer
    window.removeEventListener('resize', handleResize)
    tooltip.remove()
    svg.on('.zoom', null) // Remove zoom listeners
    svg.remove()
    console.log(`🌍 User Geo Map ${containerId} destroyed.`)
  }

  /** Highlight a sequence point and its connection on the map.
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

  // --- Resize Handling ---
  function handleResize() {
    width = container.clientWidth
    // height = container.clientHeight; // Keep fixed height
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

  // --- Initial Draw ---
  _redrawMap() // Draw initial state using internal data

  // --- Return Public API ---
  return {
    svg: svg,
    projection: projection,
    highlightSequence,
    zoomBehavior: zoomBehavior,
    // Time-lapse controls
    play,
    pause,
    resetTime,
    setYear,
    setSimilarity,
    setTimeRange,
    isPlaying,
    // Data update
    updateData,
    // Cleanup
    destroy,
  }
}
