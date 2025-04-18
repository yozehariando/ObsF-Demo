/**
 * Hover Effects
 * 
 * This module provides functionality for handling hover interactions between
 * visualization components and the details panel. It sets up bidirectional
 * hover effects between points in the visualizations and items in the details panel.
 */

import { highlightSequence } from './highlight-manager.js';

// Store references to DOM elements
const state = {
  referenceUmap: null,
  userUmap: null,
  detailsPanel: null
};

/**
 * Set up hover effects for sequence points and detail panel items
 * @param {Object} options - Configuration options
 * @param {HTMLElement|Object} options.referenceUmap - The reference UMAP container or component
 * @param {HTMLElement|Object} options.userUmap - The user UMAP container or component
 * @param {HTMLElement} options.detailsPanel - The details panel element
 */
export function setupPointHoverEffects({ referenceUmap, userUmap, detailsPanel } = {}) {
  console.log("Setting up point hover effects for UMAPs");
  
  // Get references to containers
  state.referenceUmap = getReferenceElement(referenceUmap);
  state.userUmap = getReferenceElement(userUmap);
  state.detailsPanel = detailsPanel || document.getElementById('details-panel');
  
  // Add hover events to points in both UMAPs
  addHoverEvents(state.referenceUmap);
  addHoverEvents(state.userUmap);
  
  // Setup hover for detail panel items
  setupDetailsPanelHover();
  
  // Add style for hover highlight if not already present
  addHoverStyles();
}

/**
 * Get reference element from component or use directly
 * @param {HTMLElement|Object} ref - Reference to component or DOM element
 * @returns {HTMLElement} The DOM element
 */
function getReferenceElement(ref) {
  if (!ref) return null;
  
  // If it's a component with a container property, use that
  if (ref.container) {
    return ref.container;
  }
  
  // If it's already a DOM element, use it directly
  if (ref instanceof HTMLElement) {
    return ref;
  }
  
  // If it's a string ID, query the DOM
  if (typeof ref === 'string') {
    return document.getElementById(ref);
  }
  
  return null;
}

/**
 * Function to handle point hover
 * @param {HTMLElement} point - The point element being hovered
 * @param {boolean} isHovering - Whether the point is being hovered or not
 */
function handlePointHover(point, isHovering) {
  const sequenceId = point.getAttribute('data-id');
  if (!sequenceId) return;
  
  console.log(`Point hover: ${sequenceId} - ${isHovering ? 'entering' : 'leaving'}`);
  
  // Check if the point is already clicked (permanently highlighted)
  const isClicked = point.classList.contains('clicked') || 
                   (point.style.stroke === 'rgb(255, 87, 34)'); // #FF5722 in RGB
  
  // Don't remove highlighting on mouseleave if it's clicked
  if (!isHovering && isClicked) return;
  
  // Apply temporary visual changes on hover
  if (isHovering) {
    // Don't highlight if the point is already highlighted (clicked)
    if (!isClicked) {
      point.setAttribute('r', '6');
      point.style.stroke = '#2196F3';  // Use blue for hover to differentiate from click highlight
      point.style.strokeWidth = '2px';
      point.style.fillOpacity = '1';
      
      // Find and highlight corresponding item in details panel
      if (state.detailsPanel) {
        const sequenceItem = state.detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
        if (sequenceItem) {
          sequenceItem.classList.add('hover-highlight');
          // Remove auto-scrolling behavior
        }
      }
      
      // For user UMAP, highlight connections too
      if (point.closest('#user-scatter-container') && state.userUmap) {
        state.userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#2196F3';
          line.style.strokeWidth = '1.5px';
          line.style.opacity = '0.6';
        });
      }
    }
  } else {
    // Only unhighlight if this point wasn't clicked (permanent highlight)
    if (!isClicked) {
      point.setAttribute('r', '4');
      point.style.stroke = 'none';
      point.style.strokeWidth = '0px';
      point.style.fillOpacity = '0.7';
      
      // Remove hover highlight from the details panel
      if (state.detailsPanel) {
        const sequenceItem = state.detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
        if (sequenceItem) {
          sequenceItem.classList.remove('hover-highlight');
        }
      }
      
      // For user UMAP, reset connections
      if (point.closest('#user-scatter-container') && state.userUmap) {
        state.userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#999';
          line.style.strokeWidth = '1px';
          line.style.opacity = '0.4';
        });
      }
    }
  }
}

/**
 * Helper function to add hover events to points in a container
 * @param {HTMLElement} container - The container element
 */
function addHoverEvents(container) {
  if (!container) return;
  
  const points = container.querySelectorAll('circle[data-id]');
  console.log(`Adding hover events to ${points.length} points in ${container.id || 'container'}`);
  
  points.forEach(point => {
    // Remove existing listeners to prevent duplicates
    point.removeEventListener('mouseenter', point._mouseEnterHandler);
    point.removeEventListener('mouseleave', point._mouseLeaveHandler);
    
    // Create and store handlers
    point._mouseEnterHandler = () => handlePointHover(point, true);
    point._mouseLeaveHandler = () => handlePointHover(point, false);
    
    // Add new listeners
    point.addEventListener('mouseenter', point._mouseEnterHandler);
    point.addEventListener('mouseleave', point._mouseLeaveHandler);
  });
}

/**
 * Set up hover effects for items in the details panel
 */
function setupDetailsPanelHover() {
  if (!state.detailsPanel) return;
  
  const sequenceItems = state.detailsPanel.querySelectorAll('.similar-sequence-item[data-id]');
  sequenceItems.forEach(item => {
    const sequenceId = item.dataset.id;
    
    // Remove existing listeners to prevent duplicates
    item.removeEventListener('mouseenter', item._mouseEnterHandler);
    item.removeEventListener('mouseleave', item._mouseLeaveHandler);
    
    // Create stored handlers
    item._mouseEnterHandler = () => {
      // Only apply hover effect if not already highlighted
      if (!item.classList.contains('highlighted')) {
        item.classList.add('hover-highlight');
        
        // Highlight points in both UMAPs
        if (state.referenceUmap) {
          const referencePoint = state.referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (referencePoint) handlePointHover(referencePoint, true);
        }
        
        if (state.userUmap) {
          const userPoint = state.userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (userPoint) handlePointHover(userPoint, true);
        }
      }
    };
    
    item._mouseLeaveHandler = () => {
      // Only remove hover effect if not permanently highlighted
      if (!item.classList.contains('highlighted')) {
        item.classList.remove('hover-highlight');
        
        // Remove highlighting from points
        if (state.referenceUmap) {
          const referencePoint = state.referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (referencePoint) handlePointHover(referencePoint, false);
        }
        
        if (state.userUmap) {
          const userPoint = state.userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (userPoint) handlePointHover(userPoint, false);
        }
      }
    };
    
    // Add new listeners
    item.addEventListener('mouseenter', item._mouseEnterHandler);
    item.addEventListener('mouseleave', item._mouseLeaveHandler);
  });
}

/**
 * Add CSS styles for hover highlighting
 */
function addHoverStyles() {
  // Add style for hover highlight if not already present
  if (!document.getElementById('hover-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'hover-highlight-style';
    style.textContent = `
      .similar-sequence-item.hover-highlight {
        background-color: #e3f2fd;
        border-left: 4px solid #2196F3;
      }
      
      .similar-sequence-item.highlighted {
        background-color: #fff3e0;
        border-left: 4px solid #FF5722;
      }
      
      .similar-sequence-item.hover-highlight.highlighted {
        background-color: #fff8e1;
        border-left: 4px solid #FF9800;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Update hover effects when the DOM changes
 * This should be called after points are added or removed
 */
export function refreshHoverEffects() {
  if (state.referenceUmap || state.userUmap) {
    setupPointHoverEffects({
      referenceUmap: state.referenceUmap,
      userUmap: state.userUmap,
      detailsPanel: state.detailsPanel
    });
  }
}

/**
 * Initialize hover effect event listeners
 * @param {Object} options - Configuration options
 * @param {Object|null} options.jobTracker - Job tracker component for monitoring completion events
 */
export function initializeHoverEffectListeners(options = {}) {
  // Setup event listeners to initialize and refresh hover effects
  document.addEventListener('DOMContentLoaded', () => {
    // Set up hover effects after visualizations are loaded
    window.addEventListener('visualizationsLoaded', refreshHoverEffects);
    
    // Also run setup when user sequences are loaded
    if (options.jobTracker) {
      options.jobTracker.addEventListener('complete', refreshHoverEffects);
    }
  });
} 