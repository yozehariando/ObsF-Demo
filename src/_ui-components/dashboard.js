/**
 * Dashboard Component
 * 
 * Initializes and manages all visualization components using the state manager.
 * Handles UI interactions, data loading, and component coordination.
 */

// Initialize the dashboard when DOM is fully loaded
const initDashboard = (options = {}) => {
  console.log('Initializing dashboard with options:', options);
  
  // Default configuration
  const config = {
    apiEndpoint: '/api/data',
    containerSelector: '#dashboard-container',
    mapContainerId: 'map-container',
    referenceScatterContainerId: 'reference-scatter-container',
    userScatterContainerId: 'user-scatter-container',
    controlsContainerId: 'dashboard-controls',
    loadingIndicatorId: 'loading-indicator',
    messageContainerId: 'message-container',
    ...options
  };
  
  // Create state manager
  const stateManager = window.createStateManager(options.stateManager || {});
  
  // Reference to dashboard container
  const container = document.querySelector(config.containerSelector);
  if (!container) {
    console.error(`Dashboard container not found: ${config.containerSelector}`);
    return null;
  }
  
  // Initialize components
  const initializeComponents = () => {
    try {
      // Initialize map component if container exists
      const mapContainer = document.getElementById(config.mapContainerId);
      if (mapContainer && window.createMap) {
        console.log('Initializing map component');
        const mapComponent = window.createMap(config.mapContainerId, [], {
          width: mapContainer.clientWidth,
          height: mapContainer.clientHeight
        });
        stateManager.registerComponent('map', mapComponent);
      } else {
        console.warn(`Map container or component not available`);
      }
      
      // Initialize reference scatter plot
      const refScatterContainer = document.getElementById(config.referenceScatterContainerId);
      if (refScatterContainer && window.createUmapScatterPlot) {
        console.log('Initializing reference scatter plot');
        const referenceScatterComponent = window.createUmapScatterPlot(
          config.referenceScatterContainerId, 
          [], 
          { 
            title: 'Reference Database',
            width: refScatterContainer.clientWidth,
            height: refScatterContainer.clientHeight,
            colorBy: 'country'
          }
        );
        stateManager.registerComponent('referenceScatter', referenceScatterComponent);
      } else {
        console.warn(`Reference scatter container or component not available`);
      }
      
      // Initialize user scatter plot
      const userScatterContainer = document.getElementById(config.userScatterContainerId);
      if (userScatterContainer && window.createUmapScatterPlot) {
        console.log('Initializing user scatter plot');
        const userScatterComponent = window.createUmapScatterPlot(
          config.userScatterContainerId, 
          [], 
          { 
            title: 'User Sequences',
            width: userScatterContainer.clientWidth,
            height: userScatterContainer.clientHeight,
            pointRadius: 5,
            colorBy: 'cluster'
          }
        );
        stateManager.registerComponent('userScatter', userScatterComponent);
      } else {
        console.warn(`User scatter container or component not available`);
      }
      
      return {
        map: stateManager.getComponent('map'),
        referenceScatter: stateManager.getComponent('referenceScatter'),
        userScatter: stateManager.getComponent('userScatter')
      };
    } catch (error) {
      console.error('Error initializing components:', error);
      showMessage('Error initializing dashboard components', 'error');
      return {};
    }
  };
  
  // Helper function to show messages
  const showMessage = (message, type = 'info') => {
    const messageContainer = document.getElementById(config.messageContainerId);
    if (!messageContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // Clear previous messages
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageElement);
    
    // Auto-clear info messages
    if (type === 'info') {
      setTimeout(() => {
        if (messageContainer.contains(messageElement)) {
          messageElement.classList.add('fade-out');
          setTimeout(() => messageElement.remove(), 500);
        }
      }, 3000);
    }
  };
  
  // Helper to show/hide loading indicator
  const setLoading = (isLoading) => {
    const loadingIndicator = document.getElementById(config.loadingIndicatorId);
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
  };
  
  // Register event listeners
  const setupEventListeners = () => {
    // Listen for loading events
    stateManager.on('loading:start', () => setLoading(true));
    stateManager.on('loading:end', () => setLoading(false));
    
    // Listen for errors
    stateManager.on('error', (error) => {
      showMessage(`Error: ${error.message}`, 'error');
    });
    
    // Setup cross-component communication
    stateManager.on('sequence:select', (sequence) => {
      if (!sequence) return;
      
      // Highlight the selected sequence in all visualizations
      const components = stateManager.getAllComponents();
      
      if (components.map && sequence.latitude && sequence.longitude) {
        components.map.highlightPoints([sequence]);
      }
      
      if (components.referenceScatter) {
        components.referenceScatter.highlightPoints([sequence]);
      }
      
      if (components.userScatter) {
        components.userScatter.highlightPoints([sequence]);
      }
      
      // Show sequence details if we have a details panel
      const detailsPanel = document.getElementById('sequence-details');
      if (detailsPanel) {
        detailsPanel.innerHTML = `
          <h3>Sequence Details</h3>
          <table>
            <tr><th>ID</th><td>${sequence.id || 'N/A'}</td></tr>
            <tr><th>Country</th><td>${sequence.country || 'N/A'}</td></tr>
            <tr><th>Date</th><td>${sequence.date || 'N/A'}</td></tr>
            <tr><th>Lineage</th><td>${sequence.lineage || 'N/A'}</td></tr>
            ${sequence.cluster ? `<tr><th>Cluster</th><td>${sequence.cluster}</td></tr>` : ''}
            ${sequence.similarity ? `<tr><th>Similarity</th><td>${(sequence.similarity * 100).toFixed(1)}%</td></tr>` : ''}
          </table>
        `;
      }
    });
    
    // Setup UI controls if they exist
    const setupControls = () => {
      const controlsContainer = document.getElementById(config.controlsContainerId);
      if (!controlsContainer) return;
      
      // Color by selector
      const colorBySelector = controlsContainer.querySelector('#color-by-selector');
      if (colorBySelector) {
        colorBySelector.addEventListener('change', (event) => {
          const colorBy = event.target.value;
          stateManager.updateVisualizationOptions({ colorBy });
          
          // Update components with new color option
          const components = stateManager.getAllComponents();
          if (components.map) {
            components.map.updateOptions({ colorBy });
          }
          if (components.referenceScatter) {
            components.referenceScatter.updateOptions({ colorBy });
          }
          if (components.userScatter) {
            components.userScatter.updateOptions({ colorBy });
          }
        });
      }
      
      // Reset view button
      const resetButton = controlsContainer.querySelector('#reset-view-button');
      if (resetButton) {
        resetButton.addEventListener('click', () => {
          const components = stateManager.getAllComponents();
          if (components.map) components.map.resetView();
          if (components.referenceScatter) components.referenceScatter.resetView();
          if (components.userScatter) components.userScatter.resetView();
          
          // Clear any selections
          stateManager.selectSequence(null);
          stateManager.clearHighlights();
        });
      }
      
      // Force init button
      const forceInitButton = controlsContainer.querySelector('#force-init-button');
      if (forceInitButton) {
        forceInitButton.addEventListener('click', () => {
          loadData(true); // Force refresh
        });
      }
    };
    
    // Setup controls
    setupControls();
  };
  
  // Load data from API
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    showMessage('Loading data from API...');
    
    try {
      const apiOptions = forceRefresh ? { noCache: true } : {};
      const data = await stateManager.loadData(config.apiEndpoint, apiOptions);
      
      if (!data) {
        throw new Error('Empty response from API');
      }
      
      // Process and update visualizations
      const processedData = transformApiData(data);
      stateManager.updateAllVisualizations(processedData);
      
      showMessage(`Loaded ${processedData.reference.length} reference sequences and ${processedData.userSequences.length} user sequences`);
      return processedData;
    } catch (error) {
      console.error('Error loading API data:', error);
      showMessage(`Failed to load data: ${error.message}`, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Transform API data to visualization format
  const transformApiData = (apiData) => {
    // Check if api data has expected structure
    if (!apiData || !apiData.reference || !apiData.userSequences) {
      console.warn('API data does not have expected structure', apiData);
      return {
        reference: [],
        userSequences: []
      };
    }
    
    // Transform reference data if needed
    const reference = Array.isArray(apiData.reference) 
      ? apiData.reference.map(item => ({
          id: item.id || `ref-${Math.random().toString(36).substr(2, 9)}`,
          x: item.x || item.coordinates?.[0] || 0,
          y: item.y || item.coordinates?.[1] || 0,
          country: item.country || 'Unknown',
          lineage: item.lineage || 'Unknown',
          date: item.date || 'Unknown',
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          color: item.color || null
        }))
      : [];
      
    // Transform user sequences if needed
    const userSequences = Array.isArray(apiData.userSequences)
      ? apiData.userSequences.map(item => ({
          id: item.id || `user-${Math.random().toString(36).substr(2, 9)}`,
          x: item.x || item.coordinates?.[0] || 0,
          y: item.y || item.coordinates?.[1] || 0,
          country: item.country || 'Unknown',
          lineage: item.lineage || 'Unknown',
          date: item.date || 'Unknown',
          cluster: item.cluster || 'Unknown',
          similarity: item.similarity || null,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          color: item.color || '#ff6600' // Default color for user sequences
        }))
      : [];
    
    return {
      reference,
      userSequences
    };
  };
  
  // Initialize the dashboard
  const components = initializeComponents();
  setupEventListeners();
  
  // Load initial data if auto-load is enabled
  if (options.autoLoad !== false) {
    loadData();
  }
  
  // Return dashboard public API
  return {
    stateManager,
    components,
    loadData,
    showMessage,
    setLoading,
    config
  };
};

// Expose globally
window.initDashboard = initDashboard;

// Auto-initialize on DOMContentLoaded if container exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#dashboard-container')) {
    window.dashboardInstance = initDashboard();
    console.log('Dashboard auto-initialized');
  }
}); 