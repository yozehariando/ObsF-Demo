/**
 * API Results Processor
 * 
 * This module handles processing of sequence analysis results,
 * including UMAP projection data and similar sequences formatting.
 */

import { 
  getUmapProjection, 
  findSimilarSequencesForJob 
} from './api-service.js';

/**
 * Process the results of a sequence analysis job
 * @param {string} jobId - The ID of the completed job
 * @param {Object} jobData - The job data from the API
 * @returns {Promise<Object>} - Processed results including user sequence and similar sequences
 */
export async function processSequenceResults(jobId, jobData) {
  try {
    console.log("Processing sequence results for job:", jobId);
    
    // Verify job is completed
    if (jobData.status !== 'completed') {
      throw new Error(`Cannot process results for incomplete job. Status: ${jobData.status}`);
    }
    
    // Get UMAP projection for the user sequence
    const umapData = await getUmapProjection(jobId);
    console.log("UMAP projection received:", umapData);
    
    // Create user sequence object
    const userSequence = createUserSequenceObject(jobId, umapData, jobData);
    
    // Find similar sequences
    console.log("Finding similar sequences...");
    const similarSequences = await findSimilarSequencesForJob(jobId, {
      limit: 20,
      threshold: 0.7
    });
    
    console.log(`Found ${similarSequences.length} similar sequences`);
    
    // Return processed results
    return {
      userSequence,
      similarSequences,
      umapData
    };
  } catch (error) {
    console.error("Error processing sequence results:", error);
    throw error;
  }
}

/**
 * Create a user sequence object from job and UMAP data
 * @param {string} jobId - The job ID
 * @param {Object} umapData - UMAP projection data
 * @param {Object} jobData - Job data from the API
 * @returns {Object} - User sequence object
 */
export function createUserSequenceObject(jobId, umapData, jobData) {
  return {
    id: jobId,
    x: umapData.x,
    y: umapData.y,
    isUserSequence: true,
    embeddingId: jobData.embedding_id,
    uploadedAt: new Date().toISOString(),
    // Add any other properties needed for visualization
  };
}

/**
 * Format similar sequences for display
 * @param {Array} similarSequences - Array of similar sequences
 * @returns {Array} - Formatted similar sequences
 */
export function formatSimilarSequences(similarSequences) {
  return similarSequences.map((seq, index) => {
    return {
      ...seq,
      rank: index + 1,
      similarityPercentage: (seq.similarity * 100).toFixed(2) + '%',
      displayName: seq.accession || seq.id || `Sequence ${index + 1}`,
      displayLocation: seq.first_country || 'Unknown',
      displayDate: seq.first_date || 'Unknown',
    };
  });
}

/**
 * Generate HTML for the details panel
 * @param {Object} userSequence - User sequence object
 * @param {Array} similarSequences - Array of similar sequences
 * @returns {string} - HTML for details panel
 */
export function generateDetailsHTML(userSequence, similarSequences) {
  const formattedSequences = formatSimilarSequences(similarSequences);
  
  return `
    <h3>Your Sequence</h3>
    <p>Job ID: ${userSequence.id}</p>
    <p>UMAP Coordinates: (${userSequence.x.toFixed(4)}, ${userSequence.y.toFixed(4)})</p>
    <p>Uploaded: ${new Date(userSequence.uploadedAt).toLocaleString()}</p>
    
    <h3>Similar Sequences (${formattedSequences.length})</h3>
    <div class="similar-sequences-list">
      ${formattedSequences.map(seq => `
        <div class="similar-sequence-item" data-id="${seq.id}">
          <div class="similarity-score">${seq.similarityPercentage}</div>
          <div class="sequence-details">
            <p><strong>${seq.displayName}</strong></p>
            <p>
              ${seq.displayLocation} 
              ${seq.displayDate !== 'Unknown' ? `• ${seq.displayDate}` : ''}
            </p>
          </div>
        </div>
      `).join('')}
    </div>
    
    <style>
      .similar-sequences-list {
        max-height: 400px;
        overflow-y: auto;
        margin-top: 10px;
      }
      .similar-sequence-item {
        display: flex;
        padding: 8px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
      }
      .similar-sequence-item:hover {
        background-color: #f5f5f5;
      }
      .similarity-score {
        font-weight: bold;
        min-width: 60px;
        color: #2c7bb6;
      }
      .sequence-details {
        flex: 1;
      }
      .sequence-details p {
        margin: 0 0 5px 0;
      }
    </style>
  `;
}

/**
 * Prepare data for visualization update
 * @param {Object} userSequence - User sequence object
 * @param {Array} similarSequences - Array of similar sequences
 * @returns {Object} - Data prepared for visualization
 */
export function prepareVisualizationData(userSequence, similarSequences) {
  // Combine user sequence and similar sequences for visualization
  const allData = [userSequence, ...similarSequences];
  
  // Create a color scale based on similarity
  const colorScale = (d) => {
    if (d.isUserSequence) return '#ff0000'; // Red for user sequence
    
    // Color similar sequences based on similarity
    const similarity = d.similarity || 0;
    if (similarity > 0.9) return '#1a9850'; // Very similar - green
    if (similarity > 0.8) return '#91cf60'; // Similar - light green
    if (similarity > 0.7) return '#d9ef8b'; // Somewhat similar - yellow-green
    if (similarity > 0.6) return '#fee08b'; // Less similar - yellow
    return '#d73027'; // Not very similar - red
  };
  
  // Create a size scale based on similarity
  const sizeScale = (d) => {
    if (d.isUserSequence) return 8; // Larger for user sequence
    
    // Size similar sequences based on similarity
    const similarity = d.similarity || 0;
    return 3 + (similarity * 5); // 3 to 8 based on similarity
  };
  
  return {
    data: allData,
    colorScale,
    sizeScale
  };
}

/**
 * Add event listeners to similar sequence items
 * @param {Function} highlightFunction - Function to call when highlighting a sequence
 */
export function addSimilarSequenceListeners(highlightFunction) {
  // Add event listeners to similar sequence items
  document.querySelectorAll('.similar-sequence-item').forEach(item => {
    const sequenceId = item.getAttribute('data-id');
    
    item.addEventListener('mouseenter', () => {
      highlightFunction(sequenceId, true);
      item.style.backgroundColor = '#e6f3ff';
    });
    
    item.addEventListener('mouseleave', () => {
      highlightFunction(sequenceId, false);
      item.style.backgroundColor = '';
    });
    
    item.addEventListener('click', () => {
      // Could add additional functionality on click
      console.log('Sequence clicked:', sequenceId);
    });
  });
}
