/**
 * API Results Processor
 * 
 * This module handles processing of sequence analysis results,
 * including UMAP projection data and similar sequences formatting.
 */

import { 
  getUmapProjection, 
  getSimilarSequences 
} from './api-service.js';

/**
 * Process the results of a sequence analysis job
 * @param {string} jobId - The ID of the completed job
 * @param {Object} jobData - The job data from the API
 * @returns {Promise<Object>} - Processed results including user sequence and similar sequences
 */
async function processSequenceResults(jobId, jobData) {
  try {
    console.log("Processing sequence results for job:", jobId);
    
    // Verify job is completed
    if (jobData && jobData.status !== 'completed') {
      throw new Error(`Cannot process results for incomplete job. Status: ${jobData?.status || 'unknown'}`);
    }
    
    // Get UMAP projection for the user sequence
    const umapData = await getUmapProjection(jobId);
    console.log("UMAP projection received:", umapData);
    
    // Create user sequence object
    const userSequence = {
      id: jobId,
      x: umapData.x,
      y: umapData.y,
      isUserSequence: true,
      embeddingId: jobData?.embedding_id,
      uploadedAt: new Date().toISOString(),
    };
    
    // Find similar sequences
    console.log("Finding similar sequences...");
    const similarSequencesOptions = {
      n_results: 10,
      min_distance: -1,
      max_year: 0,
      include_unknown_dates: true
    };
    
    const similarSequences = await getSimilarSequences(jobId, similarSequencesOptions);
    
    console.log(`Found ${similarSequences.length} similar sequences`);
    
    // Process similar sequences
    const processedSimilarSequences = similarSequences.map(seq => {
      return {
        id: seq.sequence_hash,
        accession: seq.accession,
        first_country: seq.first_country,
        first_date: seq.first_date,
        x: seq.coordinates[0],
        y: seq.coordinates[1],
        similarity: seq.similarity !== undefined ? seq.similarity : 0,
        isUserSequence: false
      };
    });
    
    // Return processed results
    return {
      userSequence,
      similarSequences: processedSimilarSequences,
      rawUmapData: umapData,
      rawSimilarSequences: similarSequences
    };
  } catch (error) {
    console.error("Error processing sequence results:", error);
    throw error;
  }
}

/**
 * Generates HTML for the details panel
 * @param {Object} userSequence - The user's sequence data
 * @param {Array} similarSequences - Array of similar sequences
 * @returns {string} HTML content for the details panel
 */
function generateDetailsHTML(userSequence, similarSequences) {
  try {
    // Validate inputs
    if (!userSequence) {
      return '<p class="text-center text-gray-500">No user sequence data available</p>';
    }
    
    if (!similarSequences || !Array.isArray(similarSequences) || similarSequences.length === 0) {
      return `
        <div class="user-sequence-details">
          <h3>Your Sequence</h3>
          <p><strong>ID:</strong> ${userSequence.id || 'N/A'}</p>
          <p><strong>Coordinates:</strong> (${(userSequence.x || 0).toFixed(2)}, ${(userSequence.y || 0).toFixed(2)})</p>
        </div>
        <p class="text-center text-gray-500 mt-4">No similar sequences found</p>
      `;
    }
    
    // Generate HTML for user sequence
    const userSequenceHTML = `
      <div class="user-sequence-details">
        <h3>Your Sequence</h3>
        <p><strong>ID:</strong> ${userSequence.id || 'N/A'}</p>
        <p><strong>Coordinates:</strong> (${(userSequence.x || 0).toFixed(2)}, ${(userSequence.y || 0).toFixed(2)})</p>
      </div>
    `;
    
    // Generate HTML for similar sequences
    const similarSequencesHTML = similarSequences.map((seq, index) => {
      // Safely handle similarity value - default to 0 if undefined
      const similarity = seq.similarity !== undefined ? seq.similarity : 0;
      const similarityPercentage = (similarity * 100).toFixed(2);
      
      return `
        <div class="similar-sequence-item" data-id="${seq.id || ''}" data-index="${index}">
          <div class="similar-sequence-header">
            <span class="similar-sequence-rank">#${index + 1}</span>
            <span class="similar-sequence-similarity">${similarityPercentage}% similar</span>
          </div>
          <div class="similar-sequence-details">
            <p><strong>ID:</strong> ${seq.id || 'N/A'}</p>
            <p><strong>Accession:</strong> ${seq.accession || 'N/A'}</p>
            <p><strong>First Country:</strong> ${seq.first_country || 'Unknown'}</p>
            <p><strong>First Date:</strong> ${seq.first_date || 'Unknown'}</p>
            <p><strong>Coordinates:</strong> (${(seq.x || 0).toFixed(2)}, ${(seq.y || 0).toFixed(2)})</p>
          </div>
        </div>
      `;
    }).join('');
    
    // Combine HTML
    return `
      ${userSequenceHTML}
      <h3 class="mt-4">Similar Sequences (${similarSequences.length})</h3>
      <div class="similar-sequences-list">
        ${similarSequencesHTML}
      </div>
      <style>
        .user-sequence-details {
          background-color: #f8f9fa;
          border-left: 4px solid #4CAF50;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .similar-sequences-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        
        .similar-sequence-item {
          border-bottom: 1px solid #e0e0e0;
          padding: 15px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .similar-sequence-item:hover {
          background-color: #f5f5f5;
        }
        
        .similar-sequence-item:last-child {
          border-bottom: none;
        }
        
        .similar-sequence-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .similar-sequence-rank {
          font-weight: bold;
          color: #666;
        }
        
        .similar-sequence-similarity {
          color: #4CAF50;
          font-weight: bold;
        }
        
        .similar-sequence-details p {
          margin: 5px 0;
        }
      </style>
    `;
  } catch (error) {
    console.error('Error generating details HTML:', error);
    return `<p class="text-center text-red-500">Error generating details: ${error.message}</p>`;
  }
}

/**
 * Prepares data for visualization
 * @param {Object} userSequence - User sequence data
 * @param {Array} similarSequences - Similar sequences data
 * @returns {Array} Combined data for visualization
 */
function prepareVisualizationData(userSequence, similarSequences) {
  // Combine user sequence and similar sequences
  const visualizationData = [
    { ...userSequence, isUserSequence: true },
    ...similarSequences.map(seq => ({ ...seq, isUserSequence: false }))
  ];
  
  return visualizationData;
}

/**
 * Adds event listeners to similar sequence items
 * @param {Function} highlightCallback - Callback function for highlighting
 */
function addSimilarSequenceListeners(highlightCallback) {
  const sequenceItems = document.querySelectorAll('.similar-sequence-item');
  
  sequenceItems.forEach(item => {
    const sequenceId = item.getAttribute('data-id');
    
    // Remove existing listeners
    item.removeEventListener('mouseenter', item._mouseenterListener);
    item.removeEventListener('mouseleave', item._mouseleaveListener);
    
    // Add mouseenter listener
    item._mouseenterListener = () => {
      if (highlightCallback) {
        highlightCallback(sequenceId, true);
      }
    };
    item.addEventListener('mouseenter', item._mouseenterListener);
    
    // Add mouseleave listener
    item._mouseleaveListener = () => {
      if (highlightCallback) {
        highlightCallback(sequenceId, false);
      }
    };
    item.addEventListener('mouseleave', item._mouseleaveListener);
  });
}

// Export functions
export {
  processSequenceResults,
  generateDetailsHTML,
  prepareVisualizationData,
  addSimilarSequenceListeners
};
