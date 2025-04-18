/**
 * Loading indicator utility module for the DNA Mutation Dashboard
 * Provides functions for creating loading indicator components
 */

/**
 * Creates a loading indicator component
 * @param {Object} options - Configuration options
 * @param {string} options.message - Message to display
 * @param {boolean} options.fullscreen - Whether to display fullscreen
 * @returns {HTMLElement} - The loading indicator element
 */
export function createLoadingIndicator({message = "Loading...", fullscreen = true} = {}) {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  
  if (!fullscreen) {
    indicator.style.position = 'relative';
    indicator.style.height = '100px';
  }
  
  indicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  
  return indicator;
}

/**
 * Creates a custom loading indicator component
 * @param {Object} options - Configuration options
 * @param {string} options.message - Message to display
 * @param {boolean} options.fullscreen - Whether to display fullscreen
 * @param {string} options.spinnerColor - Color of the spinner
 * @param {string} options.backgroundColor - Background color
 * @returns {HTMLElement} - The loading indicator element
 */
export function createCustomLoadingIndicator({
  message = "Loading...",
  fullscreen = false,
  spinnerColor = "#3498db",
  backgroundColor = "rgba(255, 255, 255, 0.7)"
} = {}) {
  const container = document.createElement('div');
  container.className = 'custom-loading-indicator';
  
  if (fullscreen) {
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = backgroundColor;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.zIndex = '2000';
    container.style.flexDirection = 'column';
  } else {
    container.style.position = 'relative';
    container.style.padding = '20px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.flexDirection = 'column';
  }
  
  // Create spinner
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.border = '5px solid #f3f3f3';
  spinner.style.borderTop = `5px solid ${spinnerColor}`;
  spinner.style.borderRadius = '50%';
  spinner.style.width = '50px';
  spinner.style.height = '50px';
  spinner.style.animation = 'spin 1s linear infinite';
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'loading-message';
  messageElement.style.marginTop = '15px';
  messageElement.textContent = message;
  
  container.appendChild(spinner);
  container.appendChild(messageElement);
  
  return container;
}

/**
 * Utility function to show a loading indicator in the document
 * @param {string} message - Message to display
 * @returns {Object} - Control object with methods to update and hide
 */
export function showLoadingIndicator(message = "Loading...") {
  // Create loading indicator if it doesn't exist
  let loadingIndicator = document.getElementById('loading-indicator');
  
  if (!loadingIndicator) {
    loadingIndicator = createLoadingIndicator({message});
    loadingIndicator.id = 'loading-indicator';
    document.body.appendChild(loadingIndicator);
  } else {
    // Update message
    const messageEl = loadingIndicator.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
  
  // Show the indicator
  loadingIndicator.style.display = 'flex';
  
  // Return control object
  return {
    element: loadingIndicator,
    update(newMessage) {
      const messageEl = loadingIndicator.querySelector('.loading-message');
      if (messageEl) {
        messageEl.textContent = newMessage;
      }
    },
    hide() {
      hideLoadingIndicator();
    }
  };
}

/**
 * Utility function to hide the loading indicator
 */
export function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// Add required CSS if not already added
export function addLoadingStyles() {
  if (!document.getElementById('loading-indicator-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'loading-indicator-styles';
    styleEl.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      .loading-message {
        font-size: 18px;
        color: #333;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

// Initialize styles when module is imported
addLoadingStyles();
