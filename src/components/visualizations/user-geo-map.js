import * as d3 from "d3";
import * as topojson from "topojson-client";

/**
 * Create a geographic map visualization for user sequences and their similar matches
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Configuration options
 * @returns {Object} Map component API
 */
export async function createUserGeoMap(containerId, options = {}) {
  console.log("Creating user geo map for container:", containerId);
  
  // Default options
  const defaults = {
    width: null,
    height: null,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
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
  const innerWidth = width - config.margin.left - config.margin.right;
  const innerHeight = height - config.margin.top - config.margin.bottom;

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Create main group
  const g = svg.append('g')
    .attr('transform', `translate(${config.margin.left},${config.margin.top})`);

  // Create projection - matching api-map-component.js settings
  const projection = d3.geoEquirectangular()
    .fitSize([innerWidth, innerHeight], { type: 'Sphere' })
    .scale(innerWidth / 6.2)
    .translate([innerWidth / 2, innerHeight / 1.8 - 10]);

  // Create path generator
  const path = d3.geoPath(projection);

  // Create graticule generator
  const graticule = d3.geoGraticule();

  // Add sphere background
  g.append('path')
    .attr('class', 'sphere')
    .attr('d', path({ type: 'Sphere' }))
    .attr('fill', '#f8f9fa')
    .attr('stroke', '#ddd')
    .attr('stroke-width', 0.5);

  // Add graticules
  g.append('path')
    .attr('class', 'graticule')
    .attr('d', path(graticule()))
    .attr('fill', 'none')
    .attr('stroke', '#eee')
    .attr('stroke-width', 0.5);

  // Load and draw world map
  const worldMap = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  
  g.append('path')
    .datum(topojson.feature(worldMap, worldMap.objects.countries))
    .attr('d', path)
    .attr('fill', '#e0e0e0')
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5);

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
        id: userSequence.id
      } : 'No user sequence',
      similarSequencesCount: similarSequences.length
    });

    // Clear existing points and connections
    g.selectAll('.map-point, .map-connection').remove();

    // Group sequences by country for bubble sizing
    const countryGroups = {};
    similarSequences.forEach(seq => {
      const coords = parseLatLon(seq.metadata?.lat_lon);
      if (!coords) return;
      
      const country = seq.metadata?.country || 'Unknown';
      if (!countryGroups[country]) {
        countryGroups[country] = {
          sequences: [],
          coordinates: coords
        };
      }
      countryGroups[country].sequences.push(seq);
    });

    // Draw country bubbles and similar sequence points
    Object.entries(countryGroups).forEach(([country, data]) => {
      const [lat, lon] = data.coordinates;
      const [x, y] = projection([lon, lat]);

      if (!x || !y || isNaN(x) || isNaN(y)) return;

      // Draw larger bubble for the country
      const sequenceCount = data.sequences.length;
      const baseRadius = 5;
      const countryRadius = baseRadius + (Math.sqrt(sequenceCount) * 3); // Scale radius based on sequence count

      // Add country bubble
      const countryGroup = g.append('g')
        .attr('class', 'map-point country-point')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer');

      countryGroup.append('circle')
        .attr('r', countryRadius)
        .attr('fill', '#3F51B5')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);

      // Add individual sequence points within the country bubble
      data.sequences.forEach((seq, index) => {
        // Calculate position within the country bubble
        const angle = (index / sequenceCount) * 2 * Math.PI;
        const offset = countryRadius * 0.5;
        const px = Math.cos(angle) * offset;
        const py = Math.sin(angle) * offset;

        const pointGroup = countryGroup.append('g')
          .attr('class', 'map-point sequence-point')
          .attr('transform', `translate(${px}, ${py})`)
          .attr('data-id', seq.id);

        pointGroup.append('circle')
          .attr('r', 5)
          .attr('fill', d3.interpolateBlues(seq.similarity || 0.5))
          .attr('stroke', '#333')
          .attr('stroke-width', 1)
          .attr('opacity', 0.7);

        // Enhanced tooltip with country information
        pointGroup.on('mouseover', function(event) {
          d3.select(this).select('circle')
            .attr('r', 7)
            .attr('stroke-width', 2);

          tooltip.style('opacity', 1)
            .html(`
              <div style="font-family: sans-serif;">
                <strong>${seq.metadata?.accessions?.[0] || 'Unknown'}</strong><br>
                <strong>Country:</strong> ${country}<br>
                <strong>Sequences in this location:</strong> ${sequenceCount}<br>
                <strong>Similarity:</strong> ${(seq.similarity * 100).toFixed(1)}%<br>
                ${seq.metadata?.first_year ? `<strong>Year:</strong> ${seq.metadata.first_year}<br>` : ''}
              </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).select('circle')
            .attr('r', 5)
            .attr('stroke-width', 1);

          tooltip.style('opacity', 0);
        });
      });

      // Add country label
      countryGroup.append('text')
        .attr('class', 'country-label')
        .attr('y', -countryRadius - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .attr('font-size', '12px')
        .text(`${country} (${sequenceCount})`);
    });

    // Draw user point with static coordinates (in the Indian Ocean)
    const staticUserCoords = [0, 80]; // [latitude, longitude]
    const [ux, uy] = projection([staticUserCoords[1], staticUserCoords[0]]);

    if (ux && uy && !isNaN(ux) && !isNaN(uy)) {
      // Add user point
      g.append('g')
        .attr('class', 'map-point user-point')
        .attr('transform', `translate(${ux}, ${uy})`)
        .append('circle')
        .attr('r', 8)
        .attr('fill', '#FF5722')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);

      // Add user point label
      g.append('text')
        .attr('class', 'user-label')
        .attr('x', ux)
        .attr('y', uy - 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FF5722')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Your Sequence');

      // Draw connections to country groups
      Object.values(countryGroups).forEach(data => {
        const [lat, lon] = data.coordinates;
        const [sx, sy] = projection([lon, lat]);

        if (!sx || !sy || isNaN(sx) || isNaN(sy)) return;

        g.append('path')
          .attr('class', 'map-connection')
          .attr('d', `M${ux},${uy}L${sx},${sy}`)
          .attr('stroke', '#999')
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.4)
          .attr('fill', 'none');
      });
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

  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    const newInnerWidth = newWidth - config.margin.left - config.margin.right;
    const newInnerHeight = newHeight - config.margin.top - config.margin.bottom;

    svg.attr('viewBox', [0, 0, newWidth, newHeight]);
    
    projection
      .fitSize([newInnerWidth, newInnerHeight], { type: 'Sphere' })
      .scale(newInnerWidth / 6.2)
      .translate([newInnerWidth / 2, newInnerHeight / 1.8 - 10]);

    // Update paths
    g.select('.sphere').attr('d', path({ type: 'Sphere' }));
    g.select('.graticule').attr('d', path(graticule()));
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
  if (!latLonStr) return null;
  
  try {
    if (Array.isArray(latLonStr) && latLonStr.length > 0) {
      const coordStr = latLonStr[0].replace(/["\[\]]/g, '');
      const [lat, lon] = coordStr.split(',').map(str => parseFloat(str.trim()));
      
      if (!isNaN(lat) && !isNaN(lon)) {
        return [lat, lon];
      }
    }
    return null;
  } catch (error) {
    console.error("Error parsing coordinates:", error);
    return null;
  }
}
