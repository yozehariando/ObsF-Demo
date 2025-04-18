/**
 * Point styling utilities for UMAP visualizations
 * 
 * This module provides functions for consistent styling of data points
 * in UMAP visualizations, including colors, sizes, and highlight effects.
 */

/**
 * Get standard color for different point types
 * @param {Object} point - Data point with type information
 * @returns {string} - Color code
 */
export function getStandardPointColor(point) {
  if (!point) return '#999'; // Default gray
  
  if (point.isUserSequence) {
    return '#FF5722'; // User Sequence - orange
  } else if (point.matchesUserSequence) {
    return '#3F51B5'; // Similar Sequence - blue
  } else if (point.isHighlighted) {
    return '#FFC107'; // Highlighted point - amber
  }
  
  // Default color based on country if available
  if (point.country) {
    // Simple hash function to get consistent colors by country
    const hash = point.country.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Use a subset of D3 category colors
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    return colors[hash % colors.length];
  }
  
  return '#999'; // Default gray
}

/**
 * Get standard radius for different point types
 * @param {Object} point - Data point with type information
 * @returns {number} - Radius in pixels
 */
export function getStandardPointRadius(point) {
  if (!point) return 4; // Default size
  
  if (point.isUserSequence) {
    return 7; // User sequence - larger
  } else if (point.matchesUserSequence) {
    // Size based on similarity if available
    if (point.similarity !== undefined) {
      // Scale from 4 to 6 based on similarity (0.0 to 1.0)
      return 4 + (point.similarity * 2);
    }
    return 5; // Default for similar sequences
  } else if (point.isHighlighted) {
    return 6; // Highlighted point
  }
  
  return 4; // Default size
}

/**
 * Highlight or unhighlight a point in the visualization
 * @param {Object} point - D3 selection for the point
 * @param {boolean} highlight - Whether to highlight or unhighlight
 * @param {string} color - Color to use for highlighting (default #FF5722)
 */
export function setPointHighlight(point, highlight, color = '#FF5722') {
  if (!point || point.empty()) return;
  
  const d = point.datum();
  
  if (highlight) {
    // Store original values if not already stored
    if (!d._originalRadius) {
      d._originalRadius = getStandardPointRadius(d);
      d._originalOpacity = point.style('fill-opacity') || 0.7;
    }
    
    point.attr("r", d._originalRadius + 2)
      .style("stroke", color)
      .style("stroke-width", "2px")
      .style("fill-opacity", 1);
  } else {
    // Restore original values or use defaults
    point.attr("r", d._originalRadius || getStandardPointRadius(d))
      .style("stroke", "none")
      .style("stroke-width", "0px")
      .style("fill-opacity", d._originalOpacity || 0.7);
    
    // Clean up stored values
    delete d._originalRadius;
    delete d._originalOpacity;
  }
}

/**
 * Determine color class based on similarity score
 * @param {number} similarity - Similarity score (0-1)
 * @returns {string} - CSS class name for similarity level
 */
export function getSimilarityColor(similarity) {
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
}

/**
 * Add global CSS for visualization styling
 * This should be called once during initialization
 */
export function addVisualizationStyles() {
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      /* Ensure containers size properly for info panels */
      #user-scatter-container {
        display: flex;
        flex-direction: column;
        padding-bottom: 0;
        height: 460px; /* Fixed height to accommodate all elements */
        position: relative;
      }
      
      #user-scatter-container svg {
        width: 100%;
        height: 350px; /* Fixed height */
        max-height: 350px; /* Max height to prevent overflow */
        display: block;
        margin-bottom: 10px; /* Exactly 10px space to legend */
      }
      
      .umap-info-container {
        box-shadow: none;
        height: 90px; /* Fixed height of 90px */
        margin-top: 0;
        margin-bottom: 10px; /* Exactly 10px space to buttons */
        border: 1px solid #eee;
        background: #f9f9f9;
        border-radius: 4px;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-size: 12px;
        width: 100%;
        overflow: visible;
      }
      
      /* Make sequence legend stand out better */
      .sequence-legend {
        padding: 0;
        background-color: transparent;
      }
      
      /* Adjust tooltip size for better fit in smaller visualization */
      .tooltip-content {
        max-width: 250px;
        font-size: 12px;
      }
      
      /* Ensure point labels are visible but not overwhelming */
      .point-label {
        font-size: 9px;
      }
      
      /* Add empty state message styling */
      .empty-state-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .empty-state-message p {
        text-align: center;
        color: #6b7280;
        margin-bottom: 1rem;
      }
    </style>
  `);
} 