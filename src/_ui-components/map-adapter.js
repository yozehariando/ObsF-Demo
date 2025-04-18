/**
 * Map Component Adapter
 * 
 * This file adapts the existing map component to work without ES modules.
 * It exposes a global createMap function that handles the initialization properly.
 * Uses D3 and TopoJSON for map visualization.
 */

// Create a map visualization for DNA mutation data
function createMap(containerId, options = {}) {
  console.log(`Creating map for container ${containerId}`);
  
  // Default options
  const defaults = {
    width: null, // Will be determined from container
    height: null, // Will be determined from container
    center: [110, 5], // Centered to show more of the world
    scale: null, // Will be calculated based on width
    colorScale: d3.scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateViridis)
  };

  // Merge provided options with defaults
  const config = { ...defaults, ...options };

  // Get the container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return null;
  }

  // Clear container first
  container.innerHTML = '';

  // Get actual dimensions from container
  const width = config.width || container.clientWidth;
  const height = config.height || container.clientHeight;

  // Calculate scale if not provided - use a smaller scale to show more of the world
  if (!config.scale) {
    config.scale = Math.min(width, height) / 3;
  }

  // Create SVG element for the map
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Create a group for the map elements
  const g = svg.append('g');

  // Create a projection for the map
  const projection = d3.geoNaturalEarth1() // Use a more global projection
    .scale(config.scale)
    .center(config.center)
    .translate([width / 2, height / 2]);

  // Create a path generator
  const path = d3.geoPath(projection);

  // Create map tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'map-tooltip')
    .style('opacity', 0);

  // Variable to store world map data
  let worldMap = null;

  // Function to initialize the map with world data
  async function initializeMap() {
    try {
      // Load world map TopoJSON if not already provided
      if (!worldMap) {
        worldMap = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      }

      // Draw the world map
      g.append('path')
        .datum(topojson.feature(worldMap, worldMap.objects.countries))
        .attr('d', path)
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5);
        
      // Add graticules (latitude/longitude lines) for better orientation
      const graticule = d3.geoGraticule();
      g.append('path')
        .datum(graticule)
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#eee')
        .attr('stroke-width', 0.2);
        
      // Add the outline of the world sphere for a nice boundary
      g.append('path')
        .datum({type: 'Sphere'})
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5);

      // Add zoom behavior with initial centering
      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);
      
      // Optional: Initial zoom to better fit the world in view
      svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.9));

      console.log('Map initialization complete');
      
      // If we have pending data, update the map now
      if (pendingData.length > 0) {
        updateMap(pendingData);
        pendingData = [];
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  // Store data points for later use
  let pendingData = [];
  
  // Function to update the map with new data
  function updateMap(data, updateOptions = {}) {
    console.log(`Updating map with ${data?.length || 0} points`);
    
    // If world map isn't loaded yet, store the data for later
    if (!worldMap) {
      pendingData = data;
      return;
    }
    
    // Default update options
    const updateDefaults = {
      colorScale: config.colorScale,
      selectedIndex: null,
      onPointClick: null
    };

    // Merge provided options with defaults
    const updateConfig = { ...updateDefaults, ...updateOptions };

    // Clear existing points
    g.selectAll('.map-point').remove();

    if (!data || data.length === 0) {
      return;
    }

    // Draw new points
    data.forEach(d => {
      // Skip points without valid coordinates
      if (isNaN(d.latitude) || isNaN(d.longitude)) return;

      // Convert lat/lon to x/y coordinates
      const [x, y] = projection([d.longitude, d.latitude]);

      // Skip if projection returns null (point is outside the map)
      if (x === null || y === null || isNaN(x) || isNaN(y)) return;

      // Determine if this point is selected
      const isSelected = d.index === updateConfig.selectedIndex;

      // Create a group for the point
      const pointGroup = g
        .append('g')
        .attr('class', 'map-point')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer');

      // Add the circle
      pointGroup
        .append('circle')
        .attr('r', isSelected ? 8 : 5)
        .attr('fill', updateConfig.colorScale(d.random_float || d.value || Math.random()))
        .attr('stroke', isSelected ? '#ff0000' : '#333')
        .attr('stroke-width', isSelected ? 2 : 1)
        .attr('opacity', 0.7)
        .on('mouseover', function(event) {
          // Increase size on hover
          d3.select(this)
            .attr('r', isSelected ? 10 : 7)
            .attr('stroke-width', isSelected ? 3 : 2);

          // Show tooltip
          tooltip
            .style('opacity', 1)
            .html(`
              <strong>${d.country || d.DNA_mutation_code || 'Unknown'}</strong><br>
              Value: ${(d.random_float || d.value || 0).toFixed(3)}<br>
              Location: ${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          // Restore original size
          d3.select(this)
            .attr('r', isSelected ? 8 : 5)
            .attr('stroke-width', isSelected ? 2 : 1);

          // Hide tooltip
          tooltip.style('opacity', 0);
        })
        .on('click', function() {
          // Call click handler if provided
          if (typeof updateConfig.onPointClick === 'function') {
            updateConfig.onPointClick(d);
          }
        });
    });
  }

  // Handle window resize
  function handleResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    // Update viewBox
    svg.attr('viewBox', [0, 0, newWidth, newHeight]);

    // Update projection
    const newScale = Math.min(newWidth, newHeight) / 3;
    projection.scale(newScale).translate([newWidth / 2, newHeight / 2]);

    // Redraw paths
    g.selectAll('path').attr('d', path);
  }

  // Add resize listener
  window.addEventListener('resize', handleResize);

  // Initialize the map
  initializeMap();

  // Return the public API
  return {
    updateMap,
    projection,
    svg,
    g,
    handleResize,
    // Method to clean up resources
    destroy: () => {
      window.removeEventListener('resize', handleResize);
      tooltip.remove();
    }
  };
}

// Expose globally
window.createMap = createMap; 