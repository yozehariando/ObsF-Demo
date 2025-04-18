/**
 * Legend builder module for sequence visualizations
 * 
 * This module provides functions for creating consistent legend elements
 * across different visualizations.
 */

/**
 * Create a standardized legend for visualizations
 * @param {HTMLElement} container - Container to append the legend to
 * @param {Array} items - Array of legend items with label and color properties
 * @param {string} title - Optional legend title
 * @returns {HTMLElement} - The created legend element
 */
export function createLegend(container, items, title = 'Legend') {
  // Create legend container
  const legend = document.createElement('div');
  legend.className = 'sequence-legend';
  
  // Start with the title
  let legendHtml = `<div style="font-weight: bold; margin-bottom: 4px;">${title}</div>`;
  
  // Add each item
  items.forEach(item => {
    // Check if this is the similarity line item
    if (item.label === 'Similarity Line') {
      // Create a horizontal line for the similarity line legend item
      legendHtml += `
        <div style="display: flex; align-items: center; margin: 3px 0;">
          <span style="display: inline-block; width: 14px; height: 2px; background: ${item.color}; margin-right: 8px;"></span>
          <span style="font-size: 12px;">${item.label}</span>
        </div>
      `;
    } else {
      // Create a bullet point for other items
      legendHtml += `
        <div style="display: flex; align-items: center; margin: 3px 0;">
          <span style="display: inline-block; width: 12px; height: 12px; background: ${item.color}; border-radius: 50%; margin-right: 8px;"></span>
          <span style="font-size: 12px;">${item.label}</span>
        </div>
      `;
    }
  });
  
  // Set the HTML content
  legend.innerHTML = legendHtml;
  
  // Add to container if provided
  if (container) {
    container.appendChild(legend);
  }
  
  return legend;
}

/**
 * Create a simplified legend with fewer items
 * @param {HTMLElement} container - Container to append the legend to
 * @param {Array} items - Array of legend items with label and color properties
 * @returns {HTMLElement} - The created legend element
 */
export function createCompactLegend(container, items) {
  return createLegend(container, items, ''); // No title for compact legend
}

/**
 * Create a standard UMAP legend with common visualization elements
 * @param {HTMLElement} container - Container to append the legend to
 * @returns {HTMLElement} - The created legend element
 */
export function createStandardUmapLegend(container) {
  const items = [
    { color: '#FF5722', label: 'User Sequence' },
    { color: '#3F51B5', label: 'Similar Sequence' },
    { color: '#999', label: 'Similarity Line' }
  ];
  return createLegend(container, items, 'Legend');
} 