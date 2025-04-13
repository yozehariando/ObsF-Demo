/**
 * API Similarity Service
 * 
 * This service handles similarity search functionality for DNA sequences.
 * It fetches and stores data from the 'all' endpoint and provides methods
 * for finding similar sequences to a user-uploaded sequence.
 */

import { fetchUmapData } from './api-service.js';

// Cache for storing the 'all' endpoint data
let allSequencesCache = null;
let isFetchingAll = false;
let fetchAllPromise = null;

/**
 * Fetch all sequences from the API and store them for similarity search
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Array>} - Promise resolving to the array of all sequences
 */
export async function fetchAllSequences(forceRefresh = false) {
  // If we're already fetching, return the existing promise
  if (isFetchingAll && !forceRefresh) {
    console.log('Already fetching all sequences, returning existing promise');
    return fetchAllPromise;
  }
  
  // If we have cached data and don't need to refresh, return it
  if (allSequencesCache && !forceRefresh) {
    console.log('Using cached sequence data:', allSequencesCache.length, 'sequences');
    console.log('Cache sample (first 3 items):', allSequencesCache.slice(0, 3));
    return allSequencesCache;
  }
  
  // Set up the fetching state
  isFetchingAll = true;
  
  // Create a new promise for the fetch operation
  fetchAllPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Fetching all sequences for similarity search...');
      
      // Use the existing fetchUmapData function from api-service.js
      const sequences = await fetchUmapData();
      
      // Store in cache
      allSequencesCache = sequences;
      
      console.log(`✅ Successfully cached ${sequences.length} sequences for similarity search`);
      console.log('Cache sample (first 3 items):', allSequencesCache.slice(0, 3));
      
      // Log memory usage if available
      if (window.performance && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        console.log('Memory usage after caching:', {
          totalJSHeapSize: (memoryInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
          usedJSHeapSize: (memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
          jsHeapSizeLimit: (memoryInfo.jsHeapSizeLimit / (1024 * 1024)).toFixed(2) + ' MB'
        });
      }
      
      // Reset fetching state
      isFetchingAll = false;
      
      // Resolve with the sequences
      resolve(sequences);
    } catch (error) {
      console.error('Error fetching all sequences:', error);
      isFetchingAll = false;
      reject(error);
    }
  });
  
  return fetchAllPromise;
}

/**
 * Find similar sequences to a given sequence
 * @param {Object} userSequence - The user's sequence with embedding data
 * @param {Object} options - Options for similarity search
 * @param {number} options.limit - Maximum number of similar sequences to return (default: 10)
 * @param {number} options.threshold - Minimum similarity score to include (default: 0.7)
 * @param {boolean} options.includeMetadata - Whether to include full metadata (default: true)
 * @returns {Promise<Array>} - Promise resolving to array of similar sequences
 */
export async function findSimilarSequences(userSequence, options = {}) {
  const { 
    limit = 10, 
    threshold = 0.7, 
    includeMetadata = true 
  } = options;
  
  try {
    // Ensure we have all sequences data
    const allSequences = await fetchAllSequences();
    
    if (!allSequences || allSequences.length === 0) {
      throw new Error('No sequences available for similarity search');
    }
    
    console.log(`Finding similar sequences among ${allSequences.length} sequences...`);
    
    // Extract user embedding
    const userEmbedding = userSequence.embedding;
    
    if (!userEmbedding) {
      throw new Error('User sequence does not have embedding data');
    }
    
    // Calculate similarity for each sequence
    const similarSequences = allSequences
      .map(seq => {
        // Skip if sequence doesn't have embedding
        if (!seq.embedding) return null;
        
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(userEmbedding, seq.embedding);
        
        return {
          ...seq,
          similarity,
          distance: 1 - similarity
        };
      })
      .filter(seq => seq !== null && seq.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    console.log(`Found ${similarSequences.length} similar sequences`);
    
    // Format the results
    return similarSequences.map(seq => {
      if (includeMetadata) {
        return seq;
      } else {
        // Return minimal data if metadata not needed
        const { id, x, y, similarity, distance } = seq;
        return { id, x, y, similarity, distance };
      }
    });
  } catch (error) {
    console.error('Error finding similar sequences:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param {Array<number>} a - First embedding vector
 * @param {Array<number>} b - Second embedding vector
 * @returns {number} - Cosine similarity (0-1)
 */
function calculateCosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    console.error('Invalid embeddings for similarity calculation');
    return 0;
  }
  
  try {
    // Calculate dot product
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    // Calculate cosine similarity
    const similarity = dotProduct / (magnitudeA * magnitudeB);
    
    // Ensure result is between 0 and 1
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**
 * Find sequences similar to a processed job
 * @param {string} jobId - The job ID from sequence processing
 * @param {Object} options - Options for similarity search
 * @returns {Promise<Array>} - Promise resolving to array of similar sequences
 */
export async function findSimilarSequencesForJob(jobId, options = {}) {
  try {
    // First, get the embedding for this job
    const response = await fetch(`/pathtrack/jobs/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job data: ${response.status}`);
    }
    
    const jobData = await response.json();
    
    // Check if job is complete
    if (jobData.status !== 'completed') {
      throw new Error(`Job is not completed: ${jobData.status}`);
    }
    
    // Get embedding data
    const embeddingId = jobData.embedding_id;
    
    if (!embeddingId) {
      throw new Error('No embedding ID found in job data');
    }
    
    // Get the embedding vector
    const embeddingResponse = await fetch(`/pathtrack/embeddings/${embeddingId}`);
    
    if (!embeddingResponse.ok) {
      throw new Error(`Failed to fetch embedding: ${embeddingResponse.status}`);
    }
    
    const embeddingData = await embeddingResponse.json();
    
    // Create a user sequence object with the embedding
    const userSequence = {
      id: jobId,
      embedding: embeddingData.embedding,
      isUserSequence: true
    };
    
    // Find similar sequences
    return findSimilarSequences(userSequence, options);
  } catch (error) {
    console.error('Error finding similar sequences for job:', error);
    throw error;
  }
}

/**
 * Visualize similarity connections between user sequence and similar sequences
 * @param {Object} component - The visualization component (scatter plot or map)
 * @param {Object} userSequence - The user's sequence
 * @param {Array} similarSequences - Array of similar sequences
 * @param {Object} options - Visualization options
 */
export function visualizeSimilarityConnections(component, userSequence, similarSequences, options = {}) {
  if (!component || !component.svg) {
    console.error('Invalid component for similarity visualization');
    return;
  }
  
  try {
    const { 
      lineColor = 'rgba(255, 0, 0, 0.3)',
      lineWidth = 1,
      minOpacity = 0.2,
      maxOpacity = 0.8
    } = options;
    
    // Remove any existing connections
    component.svg.selectAll('.similarity-connection').remove();
    
    // Add connections between user sequence and similar sequences
    similarSequences.forEach(seq => {
      // Calculate opacity based on similarity
      const opacity = minOpacity + (seq.similarity * (maxOpacity - minOpacity));
      
      // Draw line from user sequence to this similar sequence
      component.svg.append('line')
        .attr('class', 'similarity-connection')
        .attr('x1', component.xScale(userSequence.x))
        .attr('y1', component.yScale(userSequence.y))
        .attr('x2', component.xScale(seq.x))
        .attr('y2', component.yScale(seq.y))
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('stroke-opacity', opacity)
        .attr('data-similarity', seq.similarity)
        .attr('data-sequence-id', seq.id);
    });
  } catch (error) {
    console.error('Error visualizing similarity connections:', error);
  }
}

/**
 * Toggle visibility of similarity connections
 * @param {Object} component - The visualization component
 * @param {boolean} visible - Whether connections should be visible
 */
export function toggleSimilarityConnections(component, visible) {
  if (!component || !component.svg) return;
  
  component.svg.selectAll('.similarity-connection')
    .style('display', visible ? 'block' : 'none');
}

/**
 * Highlight a specific similar sequence
 * @param {Object} component - The visualization component
 * @param {string} sequenceId - ID of the sequence to highlight
 * @param {boolean} highlight - Whether to highlight or unhighlight
 */
export function highlightSimilarSequence(component, sequenceId, highlight = true) {
  if (!component || !component.svg) return;
  
  // Highlight the connection
  component.svg.selectAll(`.similarity-connection[data-sequence-id="${sequenceId}"]`)
    .attr('stroke-width', highlight ? 3 : 1)
    .attr('stroke-opacity', highlight ? 1 : null);
  
  // Highlight the point
  component.svg.selectAll(`.point[data-id="${sequenceId}"]`)
    .attr('r', highlight ? 8 : 5)
    .attr('stroke-width', highlight ? 2 : 1);
}
