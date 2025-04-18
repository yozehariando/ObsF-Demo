/**
 * State Manager
 * 
 * A simple state management system for the DNA Mutation Dashboard.
 * Handles application state and provides event emitters for component communication.
 */

const StateManager = (function() {
  // Private state
  const state = {
    // Selected sequence data
    selectedSequence: null,
    
    // List of highlighted sequence IDs
    highlightedSequences: [],
    
    // Data collections
    referenceData: [],
    userSequences: [],
    
    // UI state
    isLoading: false,
    colorBy: 'country', // Default coloring option
    
    // Cached data from API
    apiCache: null,
    umapDataCache: null
  };
  
  // Event listeners
  const listeners = {
    'state:change': [],
    'sequence:select': [],
    'sequence:highlight': [],
    'data:update': [],
    'loading:change': [],
    'color:change': []
  };
  
  // Add event listener
  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    return () => off(event, callback); // Return unsubscribe function
  }
  
  // Remove event listener
  function off(event, callback) {
    if (!listeners[event]) return;
    const index = listeners[event].indexOf(callback);
    if (index !== -1) {
      listeners[event].splice(index, 1);
    }
  }
  
  // Emit event to all listeners
  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(callback => callback(data));
  }
  
  // Get current state (immutable copy)
  function getState() {
    return { ...state };
  }
  
  // Update state
  function setState(newState) {
    const oldState = { ...state };
    Object.assign(state, newState);
    
    // Emit change events
    emit('state:change', { oldState, newState: { ...state } });
    
    // Emit specific events based on what changed
    if (newState.selectedSequence !== undefined && oldState.selectedSequence !== newState.selectedSequence) {
      emit('sequence:select', state.selectedSequence);
    }
    
    if (newState.highlightedSequences !== undefined && 
        JSON.stringify(oldState.highlightedSequences) !== JSON.stringify(state.highlightedSequences)) {
      emit('sequence:highlight', state.highlightedSequences);
    }
    
    if ((newState.referenceData !== undefined && oldState.referenceData !== state.referenceData) ||
        (newState.userSequences !== undefined && oldState.userSequences !== state.userSequences)) {
      emit('data:update', { 
        referenceData: state.referenceData, 
        userSequences: state.userSequences 
      });
    }
    
    if (newState.isLoading !== undefined && oldState.isLoading !== state.isLoading) {
      emit('loading:change', state.isLoading);
    }
    
    if (newState.colorBy !== undefined && oldState.colorBy !== state.colorBy) {
      emit('color:change', state.colorBy);
    }
  }
  
  // Select a sequence
  function selectSequence(sequence) {
    setState({ selectedSequence: sequence });
  }
  
  // Highlight sequences by ID
  function highlightSequences(sequenceIds) {
    setState({ highlightedSequences: Array.isArray(sequenceIds) ? sequenceIds : [sequenceIds] });
  }
  
  // Set reference data
  function setReferenceData(data) {
    setState({ referenceData: data });
  }
  
  // Set user sequences data
  function setUserSequences(data) {
    setState({ userSequences: data });
  }
  
  // Set loading state
  function setLoading(isLoading) {
    setState({ isLoading });
  }
  
  // Set color by option
  function setColorBy(colorBy) {
    setState({ colorBy });
  }
  
  // Set cached data
  function setCachedData(apiData, umapData) {
    setState({ 
      apiCache: apiData,
      umapDataCache: umapData
    });
  }
  
  // Clear selections and highlights
  function resetSelections() {
    setState({
      selectedSequence: null,
      highlightedSequences: []
    });
  }
  
  // Public API
  return {
    // State getters
    getState,
    
    // State setters
    setState,
    selectSequence,
    highlightSequences,
    setReferenceData,
    setUserSequences,
    setLoading,
    setColorBy,
    setCachedData,
    resetSelections,
    
    // Event system
    on,
    off,
    emit
  };
})();

// Expose globally
window.StateManager = StateManager; 