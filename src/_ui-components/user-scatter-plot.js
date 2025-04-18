/**
 * User UMAP Scatter Plot Component
 * 
 * Extends the base UMAP scatter plot with specific functionality for user-uploaded sequences.
 * Provides additional styling and interaction for user data points.
 */

// Create user UMAP scatter plot (extends the base UMAP scatter plot)
function createUserScatterPlot(containerId, data = [], options = {}) {
  console.log(`Creating user UMAP scatter plot for container ${containerId} with ${data.length} data points`);
  
  // Default options specific to user scatter plot
  const userOptions = {
    title: 'User Sequences',
    pointRadius: 5,
    highlightRadius: 7,
    userPointColor: '#ff6600', // Orange for user points
    referencePointColor: '#aaaaaa', // Gray for reference points
    userPointOpacity: 1.0,
    referencePointOpacity: 0.3,
    showReferencePoints: true,
    ...options
  };
  
  // Create the base scatter plot
  const baseScatterPlot = createUmapScatterPlot(containerId, data, userOptions);
  
  // If base component creation failed, return null
  if (!baseScatterPlot) {
    console.error('Failed to create base scatter plot for user data');
    return null;
  }
  
  // Track reference and user data separately
  let referenceData = [];
  let userData = data.filter(d => d.isUserSequence);
  
  // Override the updateData method to handle both reference and user data
  const originalUpdateData = baseScatterPlot.updateData;
  
  // Update data with special handling for user points
  function updateData(newData) {
    // Check if this is user data or reference data
    const isUserData = newData.some(d => d.isUserSequence);
    
    if (isUserData) {
      userData = newData;
      console.log(`Updating user scatter plot with ${userData.length} user data points`);
      
      // Enhance user data with visual properties
      const enhancedUserData = userData.map(point => ({
        ...point,
        color: userOptions.userPointColor,
        opacity: userOptions.userPointOpacity,
        radius: userOptions.pointRadius,
        isUserSequence: true
      }));
      
      // If showing reference points, combine the data
      const combinedData = userOptions.showReferencePoints 
        ? [...referenceData, ...enhancedUserData] 
        : enhancedUserData;
      
      // Call original update method with the combined data
      originalUpdateData(combinedData);
    } else {
      // This is reference data
      referenceData = newData;
      console.log(`Updating user scatter plot with ${referenceData.length} reference data points`);
      
      // Enhance reference data with visual properties
      const enhancedReferenceData = referenceData.map(point => ({
        ...point,
        color: userOptions.referencePointColor,
        opacity: userOptions.referencePointOpacity,
        radius: userOptions.pointRadius * 0.8,
        isReference: true
      }));
      
      // If we already have user data, combine it
      const combinedData = userData.length > 0
        ? [...enhancedReferenceData, ...userData]
        : enhancedReferenceData;
      
      // Call original update method with the reference data
      originalUpdateData(combinedData);
    }
    
    return newData;
  }
  
  // Toggle visibility of reference points
  function toggleReferencePoints(show) {
    userOptions.showReferencePoints = show !== undefined ? show : !userOptions.showReferencePoints;
    
    // Re-update the data to apply the change
    const combinedData = userOptions.showReferencePoints 
      ? [...referenceData, ...userData] 
      : userData;
    
    originalUpdateData(combinedData);
    
    return userOptions.showReferencePoints;
  }
  
  // Highlight similar sequences
  function highlightSimilarSequences(sequenceId, similarityThreshold = 0.8) {
    // Find the sequence in user data
    const sequence = userData.find(d => d.id === sequenceId);
    if (!sequence) return;
    
    // Calculate similarities or use pre-calculated values
    const similarSequences = referenceData
      .filter(d => d.similarity !== undefined && d.similarity >= similarityThreshold)
      .map(d => d.id);
    
    // Highlight the sequences
    baseScatterPlot.highlight([sequenceId, ...similarSequences]);
    
    return similarSequences;
  }
  
  // Enhanced public API
  return {
    ...baseScatterPlot,
    updateData,
    updateUserData: updateData, // Alias for compatibility
    updateReferenceData: data => updateData(data.map(d => ({ ...d, isReference: true }))),
    toggleReferencePoints,
    highlightSimilarSequences
  };
}

// Expose globally
window.createUserScatterPlot = createUserScatterPlot; 