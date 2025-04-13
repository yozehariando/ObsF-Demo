/**
 * API Sequence Analysis Component
 * Handles processing and visualization of sequence analysis results
 */

import { updateDetailsPanel } from "../ui-utils.js";

/**
 * Process sequence analysis results and update visualizations
 * @param {Object} state - Application state object
 * @param {string} jobId - Job ID of the completed analysis
 * @param {Object} projection - UMAP projection data with x,y coordinates
 * @param {Array} similarSequences - Array of similar sequences with metadata
 */
export function processSequenceResults(state, jobId, projection, similarSequences) {
  try {
    console.log("Processing sequence results:", { jobId, projection, similarSequences });
    
    // 1. Extract user sequence data
    const userSequence = {
      id: jobId,
      x: projection.x,
      y: projection.y,
      isUserSequence: true,
      label: "Your Sequence"
    };
    
    // 2. Format similar sequences
    const formattedSimilarSequences = similarSequences.map(seq => ({
      ...seq,
      isSimilar: true,
      similarityScore: 1 - seq.distance
    }));
    
    // 3. Update state
    state.userSequence = userSequence;
    state.similarSequences = formattedSimilarSequences;
    
    // 4. Show success message
    showInfoMessage("Sequence analysis complete! Your sequence has been added to the visualization.");
    
    // 5. Show similarity panel
    showSimilarityPanel(state, formattedSimilarSequences);
  } catch (error) {
    console.error("Error processing sequence results:", error);
    showErrorMessage("Error processing sequence results. Please try again.");
  }
}

/**
 * Show similarity panel with similar sequences
 * @param {Object} state - Application state object
 * @param {Array} similarSequences - Array of similar sequences
 */
export function showSimilarityPanel(state, similarSequences) {
  try {
    console.log("Showing similarity panel with", similarSequences.length, "sequences");
    
    // Remove existing panel if present
    const existingPanel = document.querySelector('.similarity-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // Create panel
    const panel = document.createElement('div');
    panel.className = 'similarity-panel';
    panel.innerHTML = `
      <div class="similarity-panel-header">
        <h3>Similar Sequences</h3>
        <button class="close-button">&times;</button>
      </div>
      <div class="similarity-list">
        ${similarSequences.length > 0 ? 
          similarSequences.map(seq => `
            <div class="similarity-item" data-id="${seq.id}" data-score="${seq.similarityScore}">
              <div class="similarity-score">${(seq.similarityScore * 100).toFixed(1)}%</div>
              <div class="similarity-details">
                <div class="similarity-accession">${seq.accession || 'Unknown'}</div>
                <div class="similarity-metadata">
                  <span class="similarity-country">${seq.country || 'Unknown'}</span>
                  ${seq.year ? `<span class="similarity-year">${seq.year}</span>` : ''}
                </div>
              </div>
            </div>
          `).join('') : 
          '<div class="no-similar-sequences">No similar sequences found</div>'
        }
      </div>
    `;
    
    // Add to dashboard
    document.querySelector('.grid').parentNode.appendChild(panel);
    
    // Add event listeners
    panel.querySelector('.close-button').addEventListener('click', () => {
      panel.remove();
    });
    
    // Add event listeners for similarity items
    panel.querySelectorAll('.similarity-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const sequence = similarSequences.find(s => s.id === id);
        if (sequence) {
          // Highlight the sequence in visualizations
          if (state.mapComponent && state.mapComponent.highlightPoint) {
            state.mapComponent.highlightPoint(id);
          }
          
          // Update details panel
          updateDetailsPanel(sequence);
        }
      });
    });
  } catch (error) {
    console.error("Error showing similarity panel:", error);
  }
}

/**
 * Show info message
 * @param {string} message - Message to display
 */
function showInfoMessage(message) {
  const infoDiv = document.createElement('div');
  infoDiv.className = 'info-message';
  infoDiv.style.position = 'fixed';
  infoDiv.style.top = '20px';
  infoDiv.style.left = '50%';
  infoDiv.style.transform = 'translateX(-50%)';
  infoDiv.style.background = '#d1ecf1';
  infoDiv.style.color = '#0c5460';
  infoDiv.style.padding = '10px 20px';
  infoDiv.style.borderRadius = '5px';
  infoDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
  infoDiv.style.zIndex = '1000';
  infoDiv.textContent = message;
  document.body.appendChild(infoDiv);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    infoDiv.remove();
  }, 5000);
}

/**
 * Show error message
 * @param {string} message - Message to display
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '20px';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translateX(-50%)';
  errorDiv.style.background = '#f8d7da';
  errorDiv.style.color = '#721c24';
  errorDiv.style.padding = '10px 20px';
  errorDiv.style.borderRadius = '5px';
  errorDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
  errorDiv.style.zIndex = '1000';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}
