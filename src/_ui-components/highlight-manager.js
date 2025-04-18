/**
 * Highlight Manager
 * 
 * This module provides functions for highlighting sequences in the visualization
 * and handling interactions between different visualization components.
 */

import { ELEMENT_IDS } from '../utils/dom-utils.js';

// Store state for visualization components
const state = {
  scatterComponent: null,
  userScatterComponent: null,
  detailsPanel: null
};

/**
 * Initialize the highlight manager with visualization components
 * @param {Object} components - The visualization components
 * @param {Object} components.scatterComponent - The reference scatter plot component
 * @param {Object} components.userScatterComponent - The user scatter plot component
 * @param {Object} components.detailsPanel - The details panel element (optional)
 */
export function initializeHighlightManager(components) {
  if (components.scatterComponent) {
    state.scatterComponent = components.scatterComponent;
  }
  
  if (components.userScatterComponent) {
    state.userScatterComponent = components.userScatterComponent;
  }
  
  if (components.detailsPanel) {
    state.detailsPanel = components.detailsPanel;
  }
  
  console.log('Highlight manager initialized with components:', 
    state.scatterComponent ? 'Reference UMAP' : 'No Reference UMAP', 
    state.userScatterComponent ? 'User UMAP' : 'No User UMAP',
    state.detailsPanel ? 'Details Panel' : 'No Details Panel');
}

/**
 * Get the details panel element
 * @returns {Element|null} The details panel element or null if not found
 */
function getDetailsPanel() {
  // First try the cached state reference
  if (state.detailsPanel) return state.detailsPanel;
  
  // Otherwise try to get it from the DOM
  const detailsPanel = document.getElementById(ELEMENT_IDS.DETAILS_PANEL);
  
  // Cache it if found
  if (detailsPanel) {
    state.detailsPanel = detailsPanel;
  }
  
  return detailsPanel;
}

/**
 * Highlight a sequence in the visualization
 * @param {string} sequenceId - ID of the sequence to highlight
 * @param {boolean} shouldHighlight - Whether to highlight or unhighlight
 */
export function highlightSequence(sequenceId, shouldHighlight = true) {
  // Validate sequenceId
  if (!sequenceId) {
    console.warn("Cannot highlight: sequence ID is undefined");
    return;
  }
  
  console.log(`Highlighting sequence ${sequenceId}: ${shouldHighlight ? 'on' : 'off'}`);
  
  // Get references to the UMAPs
  const referenceUmap = state.scatterComponent?.container || document.getElementById(ELEMENT_IDS.SCATTER_CONTAINER);
  const userUmap = state.userScatterComponent?.container || document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
  
  // Highlight in Reference UMAP
  if (state.scatterComponent && typeof state.scatterComponent.highlightPoint === 'function') {
    state.scatterComponent.highlightPoint(sequenceId, shouldHighlight);
  } else if (referenceUmap) {
    // Fallback: direct DOM manipulation
    const referencePoint = referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
    if (referencePoint) {
      if (shouldHighlight) {
        referencePoint.setAttribute('r', '6');
        referencePoint.style.stroke = '#FF5722';
        referencePoint.style.strokeWidth = '2px';
        referencePoint.style.fillOpacity = '1';
      } else {
        referencePoint.setAttribute('r', '4');
        referencePoint.style.stroke = 'none';
        referencePoint.style.strokeWidth = '0px';
        referencePoint.style.fillOpacity = '0.7';
      }
    }
  }
  
  // Highlight in User UMAP
  if (state.userScatterComponent && typeof state.userScatterComponent.highlightPoint === 'function') {
    state.userScatterComponent.highlightPoint(sequenceId, shouldHighlight);
  } else if (userUmap) {
    // Fallback: direct DOM manipulation
    const userPoint = userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
    if (userPoint) {
      if (shouldHighlight) {
        userPoint.setAttribute('r', '6');
        userPoint.style.stroke = '#FF5722';
        userPoint.style.strokeWidth = '2px';
        userPoint.style.fillOpacity = '1';
        
        // Also highlight connections related to this sequence
        userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#FF5722';
          line.style.strokeWidth = '2px';
          line.style.opacity = '0.8';
        });
      } else {
        userPoint.setAttribute('r', '4');
        userPoint.style.stroke = 'none';
        userPoint.style.strokeWidth = '0px';
        userPoint.style.fillOpacity = '0.7';
        
        // Reset connections
        userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
          line.style.stroke = '#999';
          line.style.strokeWidth = '1px';
          line.style.opacity = '0.4';
        });
      }
    }
  }
  
  // Highlight in details panel
  const detailsPanel = getDetailsPanel();
  if (detailsPanel) {
    const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
    if (sequenceItem) {
      if (shouldHighlight) {
        sequenceItem.classList.add('highlighted');
        // Remove auto-scrolling behavior
      } else {
        sequenceItem.classList.remove('highlighted');
      }
    }
  }
}

/**
 * Clear all highlighted sequences
 */
export function clearAllHighlights() {
  const detailsPanel = getDetailsPanel();
  
  // Remove highlight class from all sequence items in details panel
  if (detailsPanel) {
    detailsPanel.querySelectorAll('.similar-sequence-item.highlighted').forEach(item => {
      item.classList.remove('highlighted');
      
      // Unhighlight the sequence in the visualization
      const sequenceId = item.dataset.id;
      if (sequenceId) {
        highlightSequence(sequenceId, false);
      }
    });
  }
  
  // Get all visible sequence points and reset them
  const referenceUmap = state.scatterComponent?.container || document.getElementById(ELEMENT_IDS.SCATTER_CONTAINER);
  const userUmap = state.userScatterComponent?.container || document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
  
  if (referenceUmap) {
    referenceUmap.querySelectorAll('circle[style*="stroke"]').forEach(point => {
      point.setAttribute('r', '4');
      point.style.stroke = 'none';
      point.style.strokeWidth = '0px';
      point.style.fillOpacity = '0.7';
    });
  }
  
  if (userUmap) {
    userUmap.querySelectorAll('circle[style*="stroke"]').forEach(point => {
      point.setAttribute('r', '4');
      point.style.stroke = 'none';
      point.style.strokeWidth = '0px';
      point.style.fillOpacity = '0.7';
    });
    
    // Reset all connection lines
    userUmap.querySelectorAll('line').forEach(line => {
      line.style.stroke = '#999';
      line.style.strokeWidth = '1px';
      line.style.opacity = '0.4';
    });
  }
}

/**
 * Flash highlight a sequence (temporarily highlight and then unhighlight)
 * @param {string} sequenceId - ID of the sequence to flash highlight
 * @param {number} duration - Duration of highlight in milliseconds
 */
export function flashHighlightSequence(sequenceId, duration = 1000) {
  if (!sequenceId) return;
  
  highlightSequence(sequenceId, true);
  
  setTimeout(() => {
    highlightSequence(sequenceId, false);
  }, duration);
}

/**
 * Enable cross-panel highlighting between visualization components
 * This sets up bidirectional highlighting between user and reference UMAPs
 * @returns {boolean} True if successfully enabled, false otherwise
 */
export function enableCrossPanelHighlighting() {
  // Get references to the UMAPs, preferring the state object's references
  const referenceUmap = state.scatterComponent?.container || document.getElementById(ELEMENT_IDS.SCATTER_CONTAINER);
  const userUmap = state.userScatterComponent?.container || document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
  
  // If either UMAP is missing, we can't enable cross-panel highlighting
  if (!referenceUmap || !userUmap) {
    console.warn('Cannot enable cross-panel highlighting: missing UMAP references', {
      referenceUmap: !!referenceUmap,
      userUmap: !!userUmap
    });
    return false;
  }
  
  console.log('Setting up cross-panel highlighting between UMAPs');
  
  // Setup the bidirectional highlighting between UMAPs
  // Function to handle point hover
  function handlePointHover(point, isHovering, isFromReferencePanel) {
    if (!point) return;
    
    const sequenceId = point.getAttribute('data-id');
    if (!sequenceId) return;
    
    console.log(`Point hover in ${isFromReferencePanel ? 'Reference' : 'User'} UMAP: ${sequenceId} - ${isHovering ? 'entering' : 'leaving'}`);
    
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
        
        // Find and highlight corresponding point in other panel
        if (isFromReferencePanel && userUmap) {
          const correspondingPoint = userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (correspondingPoint && !correspondingPoint.classList.contains('clicked')) {
            correspondingPoint.setAttribute('r', '6');
            correspondingPoint.style.stroke = '#2196F3';
            correspondingPoint.style.strokeWidth = '2px';
            correspondingPoint.style.fillOpacity = '1';
          }
        } else if (!isFromReferencePanel && referenceUmap) {
          const correspondingPoint = referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (correspondingPoint && !correspondingPoint.classList.contains('clicked')) {
            correspondingPoint.setAttribute('r', '6');
            correspondingPoint.style.stroke = '#2196F3';
            correspondingPoint.style.strokeWidth = '2px';
            correspondingPoint.style.fillOpacity = '1';
          }
        }
        
        // Find and highlight corresponding item in details panel
        const detailsPanel = getDetailsPanel();
        if (detailsPanel) {
          const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
          if (sequenceItem) {
            sequenceItem.classList.add('hover-highlight');
          }
        }
        
        // For user UMAP, highlight connections too
        if (userUmap) {
          userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
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
        
        // Unhighlight corresponding point in other panel
        if (isFromReferencePanel && userUmap) {
          const correspondingPoint = userUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (correspondingPoint && !correspondingPoint.classList.contains('clicked')) {
            correspondingPoint.setAttribute('r', '4');
            correspondingPoint.style.stroke = 'none';
            correspondingPoint.style.strokeWidth = '0px';
            correspondingPoint.style.fillOpacity = '0.7';
          }
        } else if (!isFromReferencePanel && referenceUmap) {
          const correspondingPoint = referenceUmap.querySelector(`circle[data-id="${sequenceId}"]`);
          if (correspondingPoint && !correspondingPoint.classList.contains('clicked')) {
            correspondingPoint.setAttribute('r', '4');
            correspondingPoint.style.stroke = 'none';
            correspondingPoint.style.strokeWidth = '0px';
            correspondingPoint.style.fillOpacity = '0.7';
          }
        }
        
        // Remove hover highlight from the details panel
        const detailsPanel = getDetailsPanel();
        if (detailsPanel) {
          const sequenceItem = detailsPanel.querySelector(`.similar-sequence-item[data-id="${sequenceId}"]`);
          if (sequenceItem) {
            sequenceItem.classList.remove('hover-highlight');
          }
        }
        
        // For user UMAP, reset connections
        if (userUmap) {
          userUmap.querySelectorAll(`line[data-source="${sequenceId}"], line[data-target="${sequenceId}"]`).forEach(line => {
            line.style.stroke = '#999';
            line.style.strokeWidth = '1px';
            line.style.opacity = '0.4';
          });
        }
      }
    }
  }
  
  // Add hover events to reference UMAP
  if (referenceUmap) {
    const referencePoints = referenceUmap.querySelectorAll('circle[data-id]');
    if (referencePoints.length > 0) {
      referencePoints.forEach(point => {
        // Remove existing listeners to prevent duplicates
        point.removeEventListener('mouseenter', point._mouseEnterHandler);
        point.removeEventListener('mouseleave', point._mouseLeaveHandler);
        
        // Create and store handlers
        point._mouseEnterHandler = () => handlePointHover(point, true, true);
        point._mouseLeaveHandler = () => handlePointHover(point, false, true);
        
        // Add new listeners
        point.addEventListener('mouseenter', point._mouseEnterHandler);
        point.addEventListener('mouseleave', point._mouseLeaveHandler);
      });
      console.log(`Added hover events to ${referencePoints.length} points in reference UMAP`);
    } else {
      console.log('No points found in reference UMAP for cross-panel highlighting');
    }
  }
  
  // Add hover events to user UMAP
  if (userUmap) {
    const userPoints = userUmap.querySelectorAll('circle[data-id]');
    if (userPoints.length > 0) {
      userPoints.forEach(point => {
        // Remove existing listeners to prevent duplicates
        point.removeEventListener('mouseenter', point._mouseEnterHandler);
        point.removeEventListener('mouseleave', point._mouseLeaveHandler);
        
        // Create and store handlers
        point._mouseEnterHandler = () => handlePointHover(point, true, false);
        point._mouseLeaveHandler = () => handlePointHover(point, false, false);
        
        // Add new listeners
        point.addEventListener('mouseenter', point._mouseEnterHandler);
        point.addEventListener('mouseleave', point._mouseLeaveHandler);
      });
      console.log(`Added hover events to ${userPoints.length} points in user UMAP`);
    } else {
      console.log('No points found in user UMAP for cross-panel highlighting');
    }
  }
  
  console.log('Cross-panel highlighting enabled between UMAP visualizations');
  return true;
} 