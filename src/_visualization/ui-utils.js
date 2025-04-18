/**
 * UI utility functions for visualizations
 */

/**
 * Shows an empty state message in a container
 * @param {HTMLElement} container - The container element
 * @param {string} message - The message to display
 * @param {Object} options - Optional styling and behavior options
 */
export function showEmptyStateMessage(container, message = "No data available", options = {}) {
  if (!container) return;
  
  // Default options
  const {
    className = "empty-state-message",
    icon = "info-circle",
    fontSize = "16px",
    color = "#666",
    removeExisting = true,
    animate = true
  } = options;
  
  // Remove any existing empty state messages if requested
  if (removeExisting) {
    const existingMessages = container.querySelectorAll(`.${className}`);
    existingMessages.forEach(el => el.remove());
  }
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = className;
  
  // Create icon if specified
  if (icon) {
    const iconEl = document.createElement('i');
    iconEl.className = `fas fa-${icon}`;
    iconEl.style.marginRight = '8px';
    messageEl.appendChild(iconEl);
  }
  
  // Add text
  const textEl = document.createElement('span');
  textEl.textContent = message;
  messageEl.appendChild(textEl);
  
  // Apply styling
  messageEl.style.display = 'flex';
  messageEl.style.flexDirection = 'column';
  messageEl.style.alignItems = 'center';
  messageEl.style.justifyContent = 'center';
  messageEl.style.color = color;
  messageEl.style.fontSize = fontSize;
  messageEl.style.fontWeight = '400';
  messageEl.style.textAlign = 'center';
  messageEl.style.padding = '20px';
  messageEl.style.height = '100%';
  messageEl.style.width = '100%';
  messageEl.style.boxSizing = 'border-box';
  
  // Add animation if enabled
  if (animate) {
    messageEl.style.opacity = '0';
    messageEl.style.transition = 'opacity 0.3s ease-in-out';
    
    // Trigger animation after append
    setTimeout(() => {
      messageEl.style.opacity = '1';
    }, 10);
  }
  
  // Add to container
  container.appendChild(messageEl);
  
  return messageEl;
}

/**
 * Clear all content from a container
 * @param {HTMLElement} container - The container to clear
 * @param {boolean} preserveEmptyState - Whether to preserve empty state messages
 */
export function clearContainer(container, preserveEmptyState = false) {
  if (!container) return;
  
  if (preserveEmptyState) {
    // Remove all children except empty state messages
    Array.from(container.children).forEach(child => {
      if (!child.classList.contains('empty-state-message')) {
        child.remove();
      }
    });
  } else {
    // Remove all children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
}

/**
 * Check if a container has visualization content (excluding empty state messages)
 * @param {HTMLElement} container - The container to check
 * @returns {boolean} - True if the container has visualization content
 */
export function hasVisualizationContent(container) {
  if (!container) return false;
  
  // Check if container has children except for empty state message
  const hasNonEmptyStateChildren = Array.from(container.children).some(
    child => !child.classList.contains('empty-state-message')
  );
  
  // Check if container has an SVG element
  const hasSvg = container.querySelector('svg') !== null;
  
  // Check if container has a canvas element
  const hasCanvas = container.querySelector('canvas') !== null;
  
  // If container has any of the above
  return hasNonEmptyStateChildren || hasSvg || hasCanvas;
} 