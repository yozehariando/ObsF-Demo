/**
 * Tooltip Formatter
 * 
 * This module provides functions for formatting tooltips for data visualization.
 * It handles different data types and structures, extracting relevant information
 * and presenting it in a consistent format.
 */

/**
 * Format tooltip content for data points
 * @param {Object} data - The data object for the tooltip
 * @returns {string} HTML content for the tooltip
 */
export function formatTooltip(data) {
  if (!data || !data.id) {
    console.warn('Invalid data for tooltip', data);
    return '<div class="tooltip-content">No data available</div>';
  }

  let tooltipContent = `
    <div class="tooltip-content">
      <div class="tooltip-header">`;
      
  // Customize header based on type
  if (data.isUserSequence) {
    tooltipContent += `
      <div style="color: #FF5722; font-weight: bold; margin-bottom: 3px;">User Sequence</div>
      <strong>${data.label || data.id}</strong>`;
  } else {
    tooltipContent += `<strong>${data.id}</strong>`;
  }
  
  tooltipContent += `
      </div>
      <div class="tooltip-body">`;
      
  // Add sequence type information at the top if it's a similar sequence
  if (data.matchesUserSequence && !data.isUserSequence) {
    tooltipContent += `<div class="tooltip-item" style="color: #3F51B5; font-weight: bold;">Similar Sequence</div>`;
  }
      
  // Basic information
  if (data.similarity !== undefined) {
    tooltipContent += `<div class="tooltip-item">Similarity: ${(data.similarity * 100).toFixed(1)}%</div>`;
  }
  
  // For user sequences, add upload info if available
  if (data.isUserSequence) {
    // Add ID information
    tooltipContent += `<div class="tooltip-item">ID: ${data.id}</div>`;
    
    // Add coordinates with precision
    const x = data.x !== undefined ? data.x : (data.X !== undefined ? data.X : null);
    const y = data.y !== undefined ? data.y : (data.Y !== undefined ? data.Y : null);
    
    if (x !== null && y !== null) {
      tooltipContent += `<div class="tooltip-item">Coordinates: [${x.toFixed(4)}, ${y.toFixed(4)}]</div>`;
    }
    
    if (data.uploadTime) {
      const uploadDate = new Date(data.uploadTime);
      tooltipContent += `<div class="tooltip-item">Uploaded: ${uploadDate.toLocaleString()}</div>`;
    }
    
    if (data.sequenceLength) {
      tooltipContent += `<div class="tooltip-item">Length: ${data.sequenceLength.toLocaleString()} bp</div>`;
    }
  }
  
  // Add separator line if we have metadata to display
  const hasMetadata = data.accession || data.country || data.year || data.host || data.organism || data.lineage;
  const hasDetailedMetadata = data.metadata && (
    data.metadata.accessions || 
    data.metadata.country || 
    data.metadata.first_year || 
    data.metadata.host || 
    data.metadata.organism ||
    data.metadata.lineage
  );
  
  if (hasMetadata || hasDetailedMetadata) {
    tooltipContent += `<hr class="tooltip-separator">`;
  }
  
  // Direct metadata properties
  if (data.accession) {
    tooltipContent += `<div class="tooltip-item">Accession: ${data.accession}</div>`;
  }
  
  if (data.country) {
    tooltipContent += `<div class="tooltip-item">Country: ${data.country}</div>`;
  }
  
  if (data.year) {
    tooltipContent += `<div class="tooltip-item">Year: ${data.year}</div>`;
  }
  
  if (data.host) {
    tooltipContent += `<div class="tooltip-item">Host: ${data.host}</div>`;
  }
  
  if (data.organism) {
    tooltipContent += `<div class="tooltip-item">Organism: ${data.organism}</div>`;
  }
  
  if (data.lineage) {
    tooltipContent += `<div class="tooltip-item">Lineage: ${data.lineage}</div>`;
  }
  
  // Check for nested metadata
  if (data.metadata) {
    // Accessions from metadata
    if (data.metadata.accessions && data.metadata.accessions.length > 0 && !data.accession) {
      tooltipContent += `<div class="tooltip-item">Accession: ${data.metadata.accessions[0]}</div>`;
    }
    
    // Country from metadata
    if (data.metadata.country && !data.country) {
      tooltipContent += `<div class="tooltip-item">Country: ${data.metadata.country}</div>`;
    }
    
    // Year from metadata
    if (data.metadata.first_year && !data.year) {
      tooltipContent += `<div class="tooltip-item">Year: ${data.metadata.first_year}</div>`;
    }
    
    // Host from metadata
    if (data.metadata.host && !data.host) {
      tooltipContent += `<div class="tooltip-item">Host: ${data.metadata.host}</div>`;
    }
    
    // Organism from metadata
    if (data.metadata.organism && !data.organism) {
      tooltipContent += `<div class="tooltip-item">Organism: ${data.metadata.organism}</div>`;
    }
    
    // Lineage from metadata
    if (data.metadata.lineage && !data.lineage) {
      tooltipContent += `<div class="tooltip-item">Lineage: ${data.metadata.lineage}</div>`;
    }
    
    // Additional metadata fields that might be useful
    if (data.metadata.clade) {
      tooltipContent += `<div class="tooltip-item">Clade: ${data.metadata.clade}</div>`;
    }
    
    if (data.metadata.region) {
      tooltipContent += `<div class="tooltip-item">Region: ${data.metadata.region}</div>`;
    }
  }
  
  tooltipContent += `
      </div>
    </div>
  `;
  
  return tooltipContent;
}

/**
 * Create enhanced tooltip styles
 * @returns {string} CSS styles for tooltips
 */
export function getTooltipStyles() {
  return `
    .tooltip {
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      pointer-events: none;
      z-index: 1000;
      max-width: 300px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      transition: opacity 0.2s;
      font-size: 12px;
      display: none;
    }
    
    .tooltip-content {
      display: flex;
      flex-direction: column;
    }
    
    .tooltip-header {
      margin-bottom: 8px;
      font-weight: bold;
    }
    
    .tooltip-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .tooltip-item {
      font-size: 12px;
      line-height: 1.4;
    }
    
    .tooltip-separator {
      margin: 6px 0;
      border: 0;
      height: 1px;
      background-color: #eee;
    }
  `;
}

/**
 * Create a tooltip container element
 * @param {HTMLElement} parentElement - Element to append the tooltip to
 * @returns {HTMLElement} The created tooltip element
 */
export function createTooltip(parentElement) {
  // If parent element is not provided, use document.body
  const parent = parentElement || document.body;
  
  // Check if tooltip already exists
  let tooltip = parent.querySelector('.tooltip');
  
  // Create new tooltip if it doesn't exist
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    parent.appendChild(tooltip);
    
    // Add styles to document if they don't exist
    if (!document.querySelector('style#tooltip-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'tooltip-styles';
      styleElement.textContent = getTooltipStyles();
      document.head.appendChild(styleElement);
    }
  }
  
  return tooltip;
}

/**
 * Position tooltip relative to event and target element
 * @param {HTMLElement} tooltip - The tooltip element
 * @param {Event} event - Mouse event 
 * @param {HTMLElement} container - Container element for positioning context
 */
export function positionTooltip(tooltip, event, container) {
  if (!tooltip || !event) return;
  
  const tooltipWidth = tooltip.offsetWidth || 150;
  const tooltipHeight = tooltip.offsetHeight || 80;
  
  // Position tooltip relative to mouse and container
  const containerRect = container.getBoundingClientRect();
  const mouseX = event.clientX - containerRect.left;
  const mouseY = event.clientY - containerRect.top;
  
  // Position above the point with offset
  tooltip.style.left = (mouseX - tooltipWidth / 2) + 'px';
  tooltip.style.top = (mouseY - tooltipHeight - 10) + 'px';
} 