import * as d3 from "d3";
import * as topojson from "topojson-client";

/**
 * Create a geographic map visualization for user sequences and their similar matches
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 * @returns {Object} Map component API
 */
export async function createUserGeoMap(containerId, options = {}) {
  console.log("🌍 Creating user geo map for container:", containerId);
  
  // Default options
  const defaults = {
    width: null,  // Will be determined from container
    height: null, // Will be determined from container
    center: [0, 0], // Center at [0,0] to show the whole world
    scale: null,  // Will be calculated based on width
    colorScale: d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateViridis)
  };

  // Merge options
  const config = { ...defaults, ...options };

  // Get container
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return null;
  }

  // Get dimensions
  const width = config.width || container.clientWidth;
  const height = config.height || container.clientHeight;

  // Calculate scale if not provided
  if (!config.scale) {
    config.scale = Math.min(width / 2.5, height / 2); // Better scale for world view
  }

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Create main group
  const g = svg.append('g');

  // Create projection
  const projection = d3.geoMercator()
    .scale(config.scale)
    .center(config.center)
    .translate([width / 2, height / 2]);

  // Create path generator
  const path = d3.geoPath(projection);

  // Load and draw world map
  const worldMap = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  
  g.append('path')
    .datum(topojson.feature(worldMap, worldMap.objects.countries))
    .attr('d', path)
    .attr('fill', '#f0f0f0')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Create tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'white')
    .style('border', '1px solid #ddd')
    .style('border-radius', '3px')
    .style('padding', '10px')
    .style('pointer-events', 'none')
    .style('opacity', 0);

  // Store highlight callback
  let onHighlight = null;

  /**
   * Update the map with user sequence and similar sequences
   * @param {Object} userSequence - The user's sequence data
   * @param {Array} similarSequences - Array of similar sequences with coordinates
   */
  function updateMap(userSequence, similarSequences = []) {
    console.log("🌍 updateMap called with:", {
      userSequence: userSequence ? {
        id: userSequence.id,
        hasLatLon: !!userSequence?.metadata?.lat_lon,
        coordinates: userSequence?.metadata?.lat_lon
      } : 'No user sequence',
      similarSequencesCount: similarSequences.length,
      similarSequencesWithCoords: similarSequences.filter(seq => seq.metadata?.lat_lon).length
    });

    // Clear existing points and connections
    g.selectAll('.map-point, .map-connection').remove();

    // Process sequences to ensure valid coordinates
    const validSequences = similarSequences.filter(seq => {
      const coords = parseLatLon(seq.metadata?.lat_lon);
      if (coords) {
        seq.metadata.lat_lon = coords; // Update with parsed coordinates
        console.log(`🌍 Valid coordinates for ${seq.id}: [${coords[0]}, ${coords[1]}]`);
        return true;
      }
      return false;
    });

    console.log(`🌍 Found ${validSequences.length} sequences with valid coordinates`);

    // Draw similar sequence points first
    validSequences.forEach(seq => {
      const [lat, lon] = seq.metadata.lat_lon;
      // Note: d3 projection expects [longitude, latitude]
      const [x, y] = projection([lon, lat]);

      if (!x || !y || isNaN(x) || isNaN(y)) {
        console.warn(`🌍 Invalid projection for sequence ${seq.id} at [${lat}, ${lon}]`);
        return;
      }

      console.log(`🌍 Drawing point for ${seq.id} at [${lat}, ${lon}] -> [${x}, ${y}]`);

      const pointGroup = g.append('g')
        .attr('class', 'map-point')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('data-id', seq.id);

      pointGroup.append('circle')
        .attr('r', 5)
        .attr('fill', d3.interpolateBlues(seq.similarity || 0.5))
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .attr('opacity', 0.7)
        .on('mouseover', function(event) {
          d3.select(this)
            .attr('r', 7)
            .attr('stroke-width', 2);

          tooltip.style('opacity', 1)
            .html(`
              <strong>${seq.metadata?.accessions?.[0] || 'Unknown'}</strong><br>
              Country: ${seq.metadata?.country || 'Unknown'}<br>
              Year: ${seq.metadata?.first_year || 'Unknown'}<br>
              Similarity: ${(seq.similarity * 100).toFixed(1)}%<br>
              Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');

          if (onHighlight) onHighlight(seq.id, true);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('r', 5)
            .attr('stroke-width', 1);

          tooltip.style('opacity', 0);

          if (onHighlight) onHighlight(seq.id, false);
        });
    });

    // Draw connections if user sequence has coordinates
    if (userSequence?.metadata?.lat_lon) {
      const userCoords = parseLatLon(userSequence.metadata.lat_lon);
      if (userCoords) {
        const [userLat, userLon] = userCoords;
        console.log(`🌍 User sequence location: [${userLat}, ${userLon}]`);

        // Draw user point
        const [ux, uy] = projection([userLon, userLat]);
        if (ux && uy && !isNaN(ux) && !isNaN(uy)) {
          const userPoint = g.append('g')
            .attr('class', 'map-point user-point')
            .attr('transform', `translate(${ux}, ${uy})`)
            .attr('data-id', userSequence.id);

          userPoint.append('circle')
            .attr('r', 8)
            .attr('fill', '#FF5722')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.9);

          // Draw connections to similar sequences
          validSequences.forEach(seq => {
            const [seqLat, seqLon] = seq.metadata.lat_lon;
            const [sx, sy] = projection([seqLon, seqLat]);

            g.append('path')
              .attr('class', 'map-connection')
              .attr('d', `M${ux},${uy}L${sx},${sy}`)
              .attr('stroke', '#999')
              .attr('stroke-width', 1)
              .attr('stroke-opacity', 0.4)
              .attr('fill', 'none')
              .attr('data-source', userSequence.id)
              .attr('data-target', seq.id);
          });
        }
      }
    }

    // Add graticules and sphere
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#eee')
      .attr('stroke-width', 0.2);

    g.append('path')
      .datum({type: 'Sphere'})
      .attr('class', 'sphere')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);

    // Zoom to fit points
    if (validSequences.length > 0) {
      const initialTransform = d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.9);
      svg.call(zoom.transform, initialTransform);
    }
  }

  /**
   * Highlight a sequence on the map
   * @param {string} id - ID of the sequence to highlight
   * @param {boolean} highlight - Whether to highlight or unhighlight
   */
  function highlightSequence(id, highlight) {
    // Find and highlight the point
    const point = g.select(`.map-point[data-id="${id}"]`);
    if (!point.empty()) {
      point.select('circle')
        .attr('r', highlight ? 7 : 5)
        .attr('stroke-width', highlight ? 2 : 1);

      // Highlight connections
      g.selectAll(`.map-connection[data-source="${id}"], .map-connection[data-target="${id}"]`)
        .attr('stroke', highlight ? '#FF5722' : '#999')
        .attr('stroke-width', highlight ? 2 : 1)
        .attr('stroke-opacity', highlight ? 0.8 : 0.4);
    }
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    svg.attr('viewBox', [0, 0, newWidth, newHeight]);
    projection
      .scale(newWidth / 1.5)
      .translate([newWidth / 2, newHeight / 2]);
    
    g.selectAll('path').attr('d', path);
  }

  window.addEventListener('resize', handleResize);

  // Return public API
  return {
    updateMap,
    highlightSequence,
    setHighlightCallback: (callback) => {
      onHighlight = callback;
    },
    destroy: () => {
      window.removeEventListener('resize', handleResize);
      tooltip.remove();
    }
  };
}

function parseLatLon(latLonStr) {
  if (!latLonStr) {
    console.warn("🌍 No lat_lon data provided");
    return null;
  }
  
  try {
    // Handle array format with string ["lat,lon"]
    if (Array.isArray(latLonStr) && latLonStr.length > 0) {
      const coordStr = latLonStr[0].replace(/["\[\]]/g, '');
      const [lat, lon] = coordStr.split(',').map(str => parseFloat(str.trim()));
      
      if (!isNaN(lat) && !isNaN(lon)) {
        console.log(`🌍 Successfully parsed coordinates: [${lat}, ${lon}] from ${JSON.stringify(latLonStr)}`);
        return [lat, lon];
      }
    }
    
    console.warn(`🌍 Failed to parse coordinates from:`, latLonStr);
    return null;
  } catch (error) {
    console.error(`🌍 Error parsing coordinates:`, error);
    return null;
  }
}
