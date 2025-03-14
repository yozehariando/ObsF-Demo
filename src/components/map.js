import * as d3 from 'd3'
import * as topojson from 'topojson-client'

export function createUSMap(
  container,
  data = [],
  {
    width = 960,
    height = 600,
    projection = d3
      .geoAlbersUsa()
      .scale(1300)
      .translate([width / 2, height / 2]),
    colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]),
    tooltipFormat = (d) => `${d.name}: ${d.value}`,
    onClick = () => {},
  } = {}
) {
  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto;')

  // Create a group for the map
  const g = svg.append('g')

  // Add zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Function to update the map with data
  function update(statesData, mapData) {
    // Create a map for quick lookup of data values by state id
    const dataById = new Map(statesData.map((d) => [d.id, d]))

    // Draw states
    g.selectAll('path')
      .data(topojson.feature(mapData, mapData.objects.states).features)
      .join('path')
      .attr('fill', (d) => {
        const stateData = dataById.get(d.id)
        return stateData ? colorScale(stateData.value) : '#ccc'
      })
      .attr('d', d3.geoPath().projection(projection))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', function (event, d) {
        const stateData = dataById.get(d.id)
        if (stateData) {
          d3.select(this).attr('stroke-width', 1.5)

          // Show tooltip
          const [x, y] = d3.pointer(event)
          d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('padding', '10px')
            .style('border-radius', '3px')
            .style('pointer-events', 'none')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`)
            .html(tooltipFormat(stateData))
        }
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke-width', 0.5)
        d3.select('body').selectAll('.tooltip').remove()
      })
      .on('click', (event, d) => {
        const stateData = dataById.get(d.id)
        if (stateData) {
          onClick(stateData)
        }
      })
  }

  return {
    update,
    svg,
  }
}
