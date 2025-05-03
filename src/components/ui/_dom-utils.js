// UI utilities component for DNA mutation dashboard
import * as d3 from 'd3'

// Function to update the details panel with selected point info
export function updateDetailsPanel(detailsPanelId, selectedPoint, colorScale) {
  const detailsPanel = document.getElementById(detailsPanelId)
  if (!detailsPanel) return

  // If no point is selected, show default message
  if (!selectedPoint) {
    detailsPanel.innerHTML = `<p class="text-center text-gray-500">Select a mutation point to view details</p>`
    return
  }

  // Create a bar chart for the mutation value
  const barWidth = 200
  const barHeight = 30
  const valueWidth = Math.max(5, barWidth * selectedPoint.random_float)

  // Determine significance text based on value
  let significanceText = ''
  if (selectedPoint.random_float > 0.7) {
    significanceText = 'High significance - potential clinical relevance'
  } else if (selectedPoint.random_float > 0.4) {
    significanceText = 'Moderate significance - further investigation needed'
  } else {
    significanceText = 'Low significance - likely benign variant'
  }

  // Create HTML for details panel with grid layout
  detailsPanel.innerHTML = `
    <h3 style="color: #ff3333; margin-bottom: 15px; font-weight: bold;">${
      selectedPoint.DNA_mutation_code || 'Unknown'
    }</h3>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <p><strong>Index:</strong> ${selectedPoint.index}</p>
        <p><strong>Location:</strong> ${selectedPoint.latitude.toFixed(
          4
        )}, ${selectedPoint.longitude.toFixed(4)}</p>
        <p><strong>Coordinates:</strong> X=${
          selectedPoint.X?.toFixed(4) || 'N/A'
        }, Y=${selectedPoint.Y?.toFixed(4) || 'N/A'}</p>
      </div>
      
      <div>
        <p><strong>Mutation Significance:</strong></p>
        <div style="margin: 10px 0;">
          <svg width="${barWidth}" height="${barHeight}">
            <rect width="${barWidth}" height="${barHeight}" fill="#f0f0f0" rx="5" ry="5"></rect>
            <rect width="${valueWidth}" height="${barHeight}" fill="${colorScale(
    selectedPoint.random_float
  )}" rx="5" ry="5"></rect>
            <text x="${valueWidth / 2}" y="${barHeight / 2 + 5}" 
                  fill="${
                    selectedPoint.random_float > 0.5 ? 'white' : 'black'
                  }" 
                  text-anchor="middle" font-size="14px">
              ${selectedPoint.random_float.toFixed(3)}
            </text>
          </svg>
        </div>
        <p style="font-size: 0.9rem; margin-top: 5px;">${significanceText}</p>
      </div>
    </div>
  `
}

// // Function to add CSS styles for proper container sizing
// export function addContainerStyles() {
//   if (!document.getElementById('ui-components-styles')) {
//     const linkEl = document.createElement('link');
//     linkEl.id = 'ui-components-styles';
//     linkEl.rel = 'stylesheet';
//     linkEl.href = './components/ui/styles/ui-components.css';
//     document.head.appendChild(linkEl);
//   }
//   return linkEl;
// }
