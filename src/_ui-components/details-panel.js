/**
 * Details Panel Component
 * 
 * This module provides functions for rendering and managing the details panel 
 * that displays similar sequences and related information.
 */

import { highlightSequence, clearAllHighlights } from './highlight-manager.js';
import { getSimilarityColor } from '../visualization/point-styler.js';
import { ELEMENT_IDS } from '../utils/dom-utils.js';

/**
 * Update details panel with user sequence and similar sequences information
 * @param {string} userAccession - Accession number of the user sequence
 * @param {Array} similarSequences - Array of similar sequences to display
 * @param {Object} userData - User sequence data object
 */
export function updateDetailsWithSimilarSequences(userAccession, similarSequences, userData) {
  console.log("Updating details with similar sequences:", userAccession);
  console.log("Total similar sequences:", similarSequences ? similarSequences.length : 0);
  
  // Get or create details panel
  const detailsPanel = createDetailsPanel();
  if (!detailsPanel) return;
  
  // Clear existing content
  detailsPanel.innerHTML = '';
  
  // Add header section
  const headerDiv = document.createElement('div');
  headerDiv.className = 'details-header';
  headerDiv.innerHTML = `
    <h3>Sequence Details</h3>
    <button id="clear-highlights-btn" class="clear-button">Clear Highlights</button>
  `;
  detailsPanel.appendChild(headerDiv);
  
  // Setup clear button
  const clearBtn = headerDiv.querySelector('#clear-highlights-btn');
  clearBtn.addEventListener('click', clearAllHighlights);
  
  // Add user sequence section if available
  if (userData) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-sequence-section';
    
    // Format metadata
    const metadataHtml = userData.metadata ? `
      <div class="sequence-metadata">
        ${userData.metadata.country ? `<div class="metadata-row"><span>Country:</span> ${userData.metadata.country}</div>` : ''}
        ${userData.metadata.year ? `<div class="metadata-row"><span>Year:</span> ${userData.metadata.year}</div>` : ''}
        ${userData.metadata.host ? `<div class="metadata-row"><span>Host:</span> ${userData.metadata.host}</div>` : ''}
      </div>
    ` : '';
    
    userDiv.innerHTML = `
      <h4>User Sequence</h4>
      <div class="user-sequence-item" data-id="${userData.id || userAccession}">
        <div class="sequence-name">${userData.accession || userAccession}</div>
        ${metadataHtml}
      </div>
    `;
    detailsPanel.appendChild(userDiv);
  }
  
  // Add similar sequences section if available
  if (similarSequences && similarSequences.length > 0) {
    const similarDiv = document.createElement('div');
    similarDiv.className = 'similar-sequences-section';
    similarDiv.innerHTML = '<h4>Similar Sequences</h4>';
    
    // Sort sequences by similarity (descending)
    const sortedSequences = [...similarSequences].sort((a, b) => {
      const similarityA = a.similarity || 0;
      const similarityB = b.similarity || 0;
      return similarityB - similarityA;
    });
    
    // Create list of similar sequences
    const sequencesList = document.createElement('div');
    sequencesList.className = 'similar-sequences-list';
    
    sortedSequences.forEach(seq => {
      const sequenceItem = document.createElement('div');
      sequenceItem.className = 'similar-sequence-item';
      sequenceItem.dataset.id = seq.id;
      
      // Calculate similarity percentage (if available)
      const similarityDisplay = seq.similarity ? `${(seq.similarity * 100).toFixed(1)}%` : 'N/A';
      const similarityColor = getSimilarityColor(seq.similarity || 0);
      
      // Format distance (if available)
      const distanceDisplay = seq.distance ? `${seq.distance.toFixed(2)}` : 'N/A';
      
      // Format metadata
      const metadataHtml = seq.metadata ? `
        <div class="sequence-metadata">
          ${seq.metadata.similarity ? `<div class="metadata-row"><span>Similarity:</span> <span style="color: ${similarityColor}">${similarityDisplay}</span></div>` : ''}
          ${seq.metadata.distance || seq.distance ? `<div class="metadata-row"><span>Distance:</span> ${distanceDisplay}</div>` : ''}
          ${seq.metadata.country ? `<div class="metadata-row"><span>Country:</span> ${seq.metadata.country}</div>` : ''}
          ${seq.metadata.year ? `<div class="metadata-row"><span>Year:</span> ${seq.metadata.year}</div>` : ''}
          ${seq.metadata.host ? `<div class="metadata-row"><span>Host:</span> ${seq.metadata.host}</div>` : ''}
        </div>
      ` : '';
      
      sequenceItem.innerHTML = `
        <div class="sequence-name">${seq.accession || seq.id}</div>
        ${metadataHtml}
      `;
      
      // Add click event to highlight in visualization
      sequenceItem.addEventListener('click', () => {
        // Check if already highlighted
        const isHighlighted = sequenceItem.classList.contains('highlighted');
        
        // If already highlighted, unhighlight
        if (isHighlighted) {
          sequenceItem.classList.remove('highlighted');
          highlightSequence(seq.id, false);
        } else {
          // Highlight this sequence
          sequenceItem.classList.add('highlighted');
          highlightSequence(seq.id, true);
        }
      });
      
      sequencesList.appendChild(sequenceItem);
    });
    
    similarDiv.appendChild(sequencesList);
    detailsPanel.appendChild(similarDiv);
  } else {
    // No similar sequences
    const noDataDiv = document.createElement('div');
    noDataDiv.className = 'no-similar-sequences';
    noDataDiv.innerHTML = '<p>No similar sequences found.</p>';
    detailsPanel.appendChild(noDataDiv);
  }
  
  // Add details panel styles if not already added
  addDetailsPanelStyles();
}

/**
 * Add CSS styles for the details panel
 */
function addDetailsPanelStyles() {
  // Check if styles are already added
  if (document.getElementById(ELEMENT_IDS.DETAILS_PANEL_STYLES)) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = ELEMENT_IDS.DETAILS_PANEL_STYLES;
  styleElement.textContent = `
    #${ELEMENT_IDS.DETAILS_PANEL} {
      background-color: #f5f5f5;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      margin-top: 20px;
      padding: 15px;
      max-height: 600px;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    }
    
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    
    .details-header h3 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    
    .clear-button {
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .clear-button:hover {
      background-color: #e0e0e0;
    }
    
    .user-sequence-section,
    .similar-sequences-section {
      margin-bottom: 15px;
    }
    
    .user-sequence-section h4,
    .similar-sequences-section h4 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #555;
    }
    
    .user-sequence-item,
    .similar-sequence-item {
      background-color: white;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 8px;
      border-left: 3px solid #ccc;
      transition: all 0.2s ease;
    }
    
    .user-sequence-item {
      border-left-color: #4CAF50;
    }
    
    .similar-sequence-item {
      cursor: pointer;
      border-left-color: #2196F3;
    }
    
    .similar-sequence-item:hover {
      background-color: #f9f9f9;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .similar-sequence-item.highlighted {
      background-color: #fff8e1;
      border-left-color: #FF5722;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .similar-sequence-item.hover-highlight {
      background-color: #e3f2fd;
    }
    
    .sequence-name {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 14px;
      color: #333;
    }
    
    .sequence-metadata {
      font-size: 12px;
      color: #666;
    }
    
    .metadata-row {
      display: flex;
      margin-bottom: 3px;
    }
    
    .metadata-row span:first-child {
      width: 75px;
      font-weight: 500;
      color: #777;
    }
    
    .similar-sequences-list {
      max-height: 400px;
      overflow-y: auto;
      padding-right: 5px;
    }
    
    .no-similar-sequences {
      padding: 15px;
      text-align: center;
      background-color: #f9f9f9;
      border-radius: 4px;
      color: #777;
    }
  `;
  
  document.head.appendChild(styleElement);
}

/**
 * Create a details panel if it doesn't already exist
 * @returns {HTMLElement} The details panel element
 */
export function createDetailsPanel() {
  let detailsPanel = document.getElementById(ELEMENT_IDS.DETAILS_PANEL);
  
  if (!detailsPanel) {
    console.log("Creating new details panel");
    
    // Find the container to append to
    const container = document.querySelector('.grid:last-child .card') || document.body;
    
    // Create the panel
    detailsPanel = document.createElement('div');
    detailsPanel.id = ELEMENT_IDS.DETAILS_PANEL;
    detailsPanel.className = 'details-panel';
    detailsPanel.innerHTML = '<p class="text-center text-gray-500">Select a sequence to view details</p>';
    
    // Append to container
    container.appendChild(detailsPanel);
  }
  
  return detailsPanel;
}

/**
 * Initialize the details panel
 */
export function initializeDetailsPanel() {
  console.log('Details panel component initialized');
} 