# UI Utilities Extraction Plan

This document outlines the detailed plan to extract UI utility functions from `dashboard.md` as the first phase of our dashboard modularization effort.

## Overview

UI utilities are an ideal starting point for modularization because:
1. They have minimal dependencies on other parts of the code
2. They provide clear, focused functionality 
3. They can be easily reused across the dashboard
4. They follow predictable patterns that align with Observable Framework components

## Components to Extract

We will extract the following UI utility components:

1. **Message Handler** (`message-handler.js`)
2. **Loading Indicator** (`loading-indicator.js`)
3. **Status Manager** (`status-manager.js`) 
4. **DOM Utilities** (`dom-utils.js`)

## Implementation Details

### 1. Message Handler

**Source File**: `src/components/ui/message-handler.js`

**Functions to Extract**:
- `showMessage(type, message)` from dashboard.md

**Enhancement Opportunities**:
- Add support for different message types (success, error, info, warning)
- Support configurable duration
- Allow stacking multiple messages
- Add animation for message appearance/disappearance
- Support message actions (like dismiss button or click actions)

**Implementation Example**:
```js
/**
 * Display a message to the user
 * @param {string} type - Message type ('success', 'error', 'info', 'warning')
 * @param {string} message - Message text
 * @param {object} options - Configuration options
 * @returns {object} - Message control object
 */
export function showMessage(type, message, {
  duration = 3000,
  container = 'message-container',
  autoHide = true,
  actions = []
} = {}) {
  console.log(`[${type}] ${message}`);
  
  // Get or create message container
  let containerElement = document.getElementById(container);
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = container;
    containerElement.style.position = 'fixed';
    containerElement.style.bottom = '20px';
    containerElement.style.right = '20px';
    containerElement.style.zIndex = '1000';
    document.body.appendChild(containerElement);
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${type}`;
  messageElement.style.padding = '10px 15px';
  messageElement.style.margin = '5px 0';
  messageElement.style.borderRadius = '4px';
  messageElement.style.backgroundColor = 
    type === 'error' ? '#f8d7da' : 
    type === 'success' ? '#d4edda' : 
    type === 'warning' ? '#fff3cd' : '#d1ecf1';
  messageElement.style.color = 
    type === 'error' ? '#721c24' : 
    type === 'success' ? '#155724' : 
    type === 'warning' ? '#856404' : '#0c5460';
  
  // Add message text
  const textElement = document.createElement('div');
  textElement.textContent = message;
  messageElement.appendChild(textElement);
  
  // Add actions if provided
  if (actions.length > 0) {
    const actionsContainer = document.createElement('div');
    actionsContainer.style.marginTop = '8px';
    actionsContainer.style.display = 'flex';
    actionsContainer.style.gap = '8px';
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.style.padding = '4px 8px';
      button.style.border = 'none';
      button.style.borderRadius = '2px';
      button.style.cursor = 'pointer';
      button.addEventListener('click', () => {
        if (action.onClick) action.onClick();
        if (action.closeOnClick) removeMessage();
      });
      actionsContainer.appendChild(button);
    });
    
    messageElement.appendChild(actionsContainer);
  }
  
  containerElement.appendChild(messageElement);
  
  // Add entrance animation
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(20px)';
  messageElement.style.transition = 'opacity 0.3s, transform 0.3s';
  
  // Force reflow to enable transition
  messageElement.offsetHeight;
  
  // Show message
  messageElement.style.opacity = '1';
  messageElement.style.transform = 'translateY(0)';
  
  // Auto-hide if enabled
  let timeoutId;
  
  function removeMessage() {
    // Exit animation
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(-20px)';
    
    // Remove after animation completes
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
  
  if (autoHide && duration > 0) {
    timeoutId = setTimeout(removeMessage, duration);
  }
  
  // Add hover pause functionality
  messageElement.addEventListener('mouseenter', () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
  
  messageElement.addEventListener('mouseleave', () => {
    if (autoHide && duration > 0 && !timeoutId) {
      timeoutId = setTimeout(removeMessage, duration);
    }
  });
  
  // Return control object
  return {
    element: messageElement,
    remove: removeMessage
  };
}
```

### 2. Loading Indicator

**Source File**: `src/components/ui/loading-indicator.js`

**Functions to Extract**:
- `showLoading(show)` from dashboard.md

**Enhancement Opportunities**:
- Add support for configurable loading messages
- Create different loading indicator types (spinner, progress bar, etc.)
- Allow for progress updates (when progress is known)
- Support multiple concurrent loading indicators
- Add animation for smooth transitions

**Implementation Example**:
```js
/**
 * Show or hide a loading indicator
 * @param {boolean} show - Whether to show the indicator
 * @param {object} options - Configuration options
 * @returns {object} - Loading indicator control object
 */
export function showLoading(show = true, {
  message = 'Loading...',
  container = 'loading-container',
  fullscreen = true,
  type = 'spinner',
  progress = -1,
  cancelable = false,
  onCancel = null
} = {}) {
  // Get or create loading container
  let containerElement = document.getElementById(container);
  let progressElement;
  let messageElement;
  let cancelButton;
  
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = container;
    
    if (fullscreen) {
      containerElement.style.position = 'fixed';
      containerElement.style.top = '0';
      containerElement.style.left = '0';
      containerElement.style.width = '100%';
      containerElement.style.height = '100%';
      containerElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      containerElement.style.display = 'flex';
      containerElement.style.alignItems = 'center';
      containerElement.style.justifyContent = 'center';
      containerElement.style.zIndex = '2000';
      containerElement.style.flexDirection = 'column';
      containerElement.style.transition = 'opacity 0.3s';
    } else {
      containerElement.style.display = 'flex';
      containerElement.style.alignItems = 'center';
      containerElement.style.flexDirection = 'column';
      containerElement.style.padding = '20px';
      containerElement.style.borderRadius = '4px';
      containerElement.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      containerElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    
    if (type === 'spinner') {
      loadingIndicator.style.border = '5px solid #f3f3f3';
      loadingIndicator.style.borderTop = '5px solid #3498db';
      loadingIndicator.style.borderRadius = '50%';
      loadingIndicator.style.width = '50px';
      loadingIndicator.style.height = '50px';
      loadingIndicator.style.animation = 'spin 1s linear infinite';
      
      // Add animation style
      const style = document.createElement('style');
      style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    } else if (type === 'progress') {
      loadingIndicator.style.width = '200px';
      loadingIndicator.style.height = '8px';
      loadingIndicator.style.backgroundColor = '#f3f3f3';
      loadingIndicator.style.borderRadius = '4px';
      loadingIndicator.style.overflow = 'hidden';
      loadingIndicator.style.position = 'relative';
      
      progressElement = document.createElement('div');
      progressElement.className = 'progress-bar';
      progressElement.style.height = '100%';
      progressElement.style.backgroundColor = '#3498db';
      progressElement.style.width = progress >= 0 ? `${progress}%` : '30%';
      
      if (progress < 0) {
        progressElement.style.animation = 'progress-indeterminate 1.5s ease-in-out infinite';
        
        // Add animation style
        const style = document.createElement('style');
        style.innerHTML = `
          @keyframes progress-indeterminate {
            0% { width: 30%; left: -30%; }
            60% { width: 30%; left: 100%; }
            100% { width: 30%; left: 100%; }
          }
        `;
        document.head.appendChild(style);
      }
      
      loadingIndicator.appendChild(progressElement);
    }
    
    messageElement = document.createElement('div');
    messageElement.className = 'loading-message';
    messageElement.style.marginTop = '15px';
    messageElement.textContent = message;
    
    containerElement.appendChild(loadingIndicator);
    containerElement.appendChild(messageElement);
    
    if (cancelable && onCancel) {
      cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.marginTop = '15px';
      cancelButton.style.padding = '5px 10px';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.backgroundColor = '#f8f9fa';
      cancelButton.style.cursor = 'pointer';
      cancelButton.addEventListener('click', () => {
        if (onCancel) onCancel();
      });
      
      containerElement.appendChild(cancelButton);
    }
    
    document.body.appendChild(containerElement);
  } else {
    // Get existing elements
    progressElement = containerElement.querySelector('.progress-bar');
    messageElement = containerElement.querySelector('.loading-message');
    cancelButton = containerElement.querySelector('button');
    
    // Update elements if they exist
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    if (progressElement && progress >= 0) {
      progressElement.style.width = `${progress}%`;
      // Remove animation if we have a specific progress
      progressElement.style.animation = 'none';
      progressElement.style.left = '0';
    }
    
    if (cancelButton) {
      cancelButton.style.display = cancelable && onCancel ? 'block' : 'none';
      if (cancelable && onCancel) {
        // Update event handler
        cancelButton.onclick = onCancel;
      }
    }
  }
  
  // Show or hide
  containerElement.style.display = show ? 'flex' : 'none';
  containerElement.style.opacity = show ? '1' : '0';
  
  // If hiding, remove after transition
  if (!show) {
    setTimeout(() => {
      containerElement.style.display = 'none';
    }, 300);
  }
  
  // Return control object
  return {
    element: containerElement,
    setMessage(newMessage) {
      if (messageElement) {
        messageElement.textContent = newMessage;
      }
    },
    setProgress(newProgress) {
      if (progressElement && newProgress >= 0) {
        progressElement.style.width = `${newProgress}%`;
        progressElement.style.animation = 'none';
        progressElement.style.left = '0';
      }
    },
    show() {
      containerElement.style.display = 'flex';
      setTimeout(() => {
        containerElement.style.opacity = '1';
      }, 10);
    },
    hide() {
      containerElement.style.opacity = '0';
      setTimeout(() => {
        containerElement.style.display = 'none';
      }, 300);
    }
  };
}
```

### 3. Status Manager

**Source File**: `src/components/ui/status-manager.js`

**Functions to Extract**:
- `updateStatus(status, message)` from dashboard.md

**Enhancement Opportunities**:
- Add support for different status types (info, success, error, warning)
- Create a persistent status history
- Support status change callbacks
- Add visual indicators for different status types

**Implementation Example**:
```js
// Status history
const statusHistory = [];
const statusChangeCallbacks = [];

/**
 * Update application status
 * @param {string} status - New status ('initializing', 'ready', 'loading', 'error')
 * @param {string} message - Optional status message
 * @param {object} options - Configuration options
 * @returns {object} - Current status information
 */
export function updateStatus(status, message = '', {
  statusElement = 'status-text',
  indicatorElement = 'data-source-indicator',
  logToConsole = true,
  notify = false,
  type = 'info'
} = {}) {
  // Create status object
  const statusObj = {
    status,
    message,
    type,
    timestamp: new Date().toISOString()
  };
  
  // Log to console if needed
  if (logToConsole) {
    console.log(`Status updated to ${status}: ${message || ''}`);
  }
  
  // Update UI status indicator if it exists
  const statusTextElement = document.getElementById(statusElement);
  if (statusTextElement) {
    statusTextElement.textContent = message ? `${status}: ${message}` : status;
    
    // Update CSS classes based on status
    statusTextElement.className = 'status-indicator';
    if (status === 'error') {
      statusTextElement.classList.add('status-error');
    } else if (status === 'loading') {
      statusTextElement.classList.add('status-loading');
    } else if (status === 'ready') {
      statusTextElement.classList.add('status-ready');
    } else {
      statusTextElement.classList.add('status-initializing');
    }
  }
  
  // Update data source indicator if it exists
  const dataSourceElement = document.getElementById(indicatorElement);
  if (dataSourceElement) {
    // Update indicator as needed
  }
  
  // Update global state if available
  if (window.dashboardState) {
    window.dashboardState.status = status;
  }
  
  // Add to history
  statusHistory.push(statusObj);
  
  // Call status change callbacks
  statusChangeCallbacks.forEach(callback => {
    try {
      callback(statusObj);
    } catch (error) {
      console.error('Error in status change callback:', error);
    }
  });
  
  // Show notification if requested
  if (notify && typeof showMessage === 'function') {
    showMessage(type, message);
  }
  
  // Return current status
  return statusObj;
}

/**
 * Register a callback for status changes
 * @param {Function} callback - Function to call when status changes
 * @returns {Function} - Function to unregister the callback
 */
export function onStatusChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  statusChangeCallbacks.push(callback);
  
  // Return unregister function
  return () => {
    const index = statusChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      statusChangeCallbacks.splice(index, 1);
    }
  };
}

/**
 * Get status history
 * @param {number} limit - Maximum number of status history items to return
 * @returns {Array} - Array of status objects
 */
export function getStatusHistory(limit = 10) {
  if (limit <= 0) {
    return [...statusHistory];
  }
  return statusHistory.slice(-limit);
}

/**
 * Clear status history
 */
export function clearStatusHistory() {
  statusHistory.length = 0;
}

/**
 * Create a status display component
 * @param {object} options - Configuration options
 * @returns {HTMLElement} - Status display element
 */
export function createStatusDisplay({
  limit = 5,
  container = 'status-display',
  showTimestamp = true,
  autoUpdate = true
} = {}) {
  const displayElement = document.createElement('div');
  displayElement.id = container;
  displayElement.className = 'status-display';
  displayElement.style.maxHeight = '200px';
  displayElement.style.overflowY = 'auto';
  
  // Initial render
  renderStatusHistory();
  
  // Setup auto-update if needed
  let updateInterval;
  if (autoUpdate) {
    updateInterval = setInterval(renderStatusHistory, 1000);
  }
  
  // Register for status changes
  const unregister = onStatusChange(renderStatusHistory);
  
  // Function to render status history
  function renderStatusHistory() {
    const history = getStatusHistory(limit);
    
    displayElement.innerHTML = '';
    
    if (history.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'status-empty';
      emptyMessage.textContent = 'No status updates yet';
      displayElement.appendChild(emptyMessage);
    } else {
      history.forEach(item => {
        const statusItem = document.createElement('div');
        statusItem.className = `status-item status-${item.type}`;
        statusItem.style.padding = '5px';
        statusItem.style.marginBottom = '5px';
        statusItem.style.borderLeft = `3px solid ${
          item.type === 'error' ? '#dc3545' :
          item.type === 'success' ? '#28a745' :
          item.type === 'warning' ? '#ffc107' : '#17a2b8'
        }`;
        
        const statusText = document.createElement('div');
        statusText.textContent = item.message || item.status;
        statusItem.appendChild(statusText);
        
        if (showTimestamp) {
          const timestamp = document.createElement('div');
          timestamp.className = 'status-timestamp';
          timestamp.style.fontSize = '0.8em';
          timestamp.style.opacity = '0.7';
          
          const date = new Date(item.timestamp);
          timestamp.textContent = date.toLocaleTimeString();
          
          statusItem.appendChild(timestamp);
        }
        
        displayElement.appendChild(statusItem);
      });
    }
  }
  
  // Handle cleanup
  displayElement.cleanup = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    unregister();
  };
  
  return displayElement;
}
```

### 4. DOM Utilities

**Source File**: `src/components/ui/dom-utils.js`

**Functions to Extract**:
- Various DOM manipulation utilities scattered throughout dashboard.md

**Enhancement Opportunities**:
- Create a comprehensive set of utility functions
- Support element creation with attributes and event listeners
- Add utility functions for showing/hiding elements
- Support element finding with fallbacks

**Implementation Example**:
```js
/**
 * Create a DOM element with attributes and content
 * @param {string} tag - Element tag name
 * @param {object} attributes - Element attributes and properties
 * @param {string|Node|Array} content - Element content (string, DOM node, or array of nodes)
 * @returns {HTMLElement} - Created element
 */
export function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  // Set attributes and properties
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      // Handle style object
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Handle event listeners
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'className') {
      // Handle className separately (special case)
      element.className = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      // Handle dataset object
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      // Handle all other attributes
      element.setAttribute(key, value);
    }
  });
  
  // Add content
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (content instanceof Node) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (item instanceof Node) {
          element.appendChild(item);
        } else if (typeof item === 'string') {
          element.appendChild(document.createTextNode(item));
        }
      });
    }
  }
  
  return element;
}

/**
 * Get an element by ID, or create it if it doesn't exist
 * @param {string} id - Element ID
 * @param {string} tag - Element tag if creation needed
 * @param {object} attributes - Element attributes if created
 * @param {Element} parent - Parent element for the new element
 * @returns {HTMLElement} - Found or created element
 */
export function getOrCreateElement(id, tag = 'div', attributes = {}, parent = document.body) {
  let element = document.getElementById(id);
  
  if (!element) {
    element = createElement(tag, { id, ...attributes });
    parent.appendChild(element);
  }
  
  return element;
}

/**
 * Safely remove an element from the DOM
 * @param {string|Element} element - Element or element ID to remove
 * @returns {boolean} - Whether element was successfully removed
 */
export function removeElement(element) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
    return true;
  }
  
  return false;
}

/**
 * Show or hide an element
 * @param {string|Element} element - Element or element ID to show/hide
 * @param {boolean} show - Whether to show or hide the element
 * @param {string} displayMode - Display mode to use when showing (default: block)
 * @returns {HTMLElement|null} - The affected element or null if not found
 */
export function toggleElementVisibility(element, show = true, displayMode = 'block') {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  
  if (el) {
    el.style.display = show ? displayMode : 'none';
    return el;
  }
  
  return null;
}

/**
 * Find element by selector with fallback
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element to search within
 * @param {boolean} createIfMissing - Whether to create element if not found
 * @param {string} tag - Tag to use if creating
 * @param {object} attributes - Attributes to set if creating
 * @returns {Element|null} - Found or created element, or null
 */
export function findElement(selector, parent = document, createIfMissing = false, tag = 'div', attributes = {}) {
  const element = parent.querySelector(selector);
  
  if (element) {
    return element;
  }
  
  if (createIfMissing) {
    const newElement = createElement(tag, attributes);
    parent.appendChild(newElement);
    return newElement;
  }
  
  return null;
}

/**
 * Add a style element to the document head
 * @param {string} css - CSS string
 * @param {string} id - Optional ID for the style element
 * @returns {HTMLStyleElement} - Created style element
 */
export function addStyleToDocument(css, id = null) {
  const style = document.createElement('style');
  style.textContent = css;
  
  if (id) {
    style.id = id;
  }
  
  document.head.appendChild(style);
  return style;
}

/**
 * Create a button element with text and click handler
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {object} attributes - Additional attributes
 * @returns {HTMLButtonElement} - Created button
 */
export function createButton(text, onClick, attributes = {}) {
  return createElement('button', {
    ...attributes,
    onclick: onClick
  }, text);
}

/**
 * Execute a function when the DOM is loaded
 * @param {Function} callback - Function to execute
 */
export function onDOMLoaded(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}
```

## Testing Strategy

For each UI utility component:

1. Create a simple test page that imports and uses the component
2. Test basic functionality manually
3. Test all supported options and configurations
4. Verify visual appearance and behavior
5. Test integration with existing dashboard code

## Integration Steps

1. Create a new modular dashboard file:
```
└── src/
    ├── components/
    │   └── ui/
    │       ├── message-handler.js
    │       ├── loading-indicator.js
    │       ├── status-manager.js
    │       └── dom-utils.js
    └── dashboard-modular.md
```

2. Import and use UI utilities in dashboard-modular.md:
```js
import { showMessage } from "./components/ui/message-handler.js";
import { showLoading } from "./components/ui/loading-indicator.js";
import { updateStatus, createStatusDisplay } from "./components/ui/status-manager.js";
import { createElement, getOrCreateElement } from "./components/ui/dom-utils.js";

// Use imported utilities in the dashboard
const loading = showLoading(true, { message: "Initializing dashboard..." });

updateStatus('initializing', 'Setting up dashboard components');

// Create status display
const statusDisplay = createStatusDisplay({ limit: 10 });
document.getElementById('status-container').appendChild(statusDisplay);

// Show success message when ready
showMessage('success', 'Dashboard initialized successfully', { duration: 5000 });
```

## Success Criteria

The UI utility extraction will be considered successful when:

1. All UI utility functions are extracted into separate files
2. The modular dashboard uses the extracted utilities
3. The components provide enhanced functionality compared to the original
4. The code is well-documented with JSDoc comments
5. The components follow Observable Framework patterns

## Implementation Timeline

1. **Day 1**: Extract message-handler.js and loading-indicator.js
2. **Day 2**: Extract status-manager.js and dom-utils.js
3. **Day 3**: Create dashboard-modular.md with imported utilities
4. **Day 4**: Test and refine all components
5. **Day 5**: Document implementation and prepare for next phase

## Next Steps After UI Utilities

After successfully extracting UI utilities, we'll proceed to:

1. Extract data handling components
2. Extract visualization components
3. Extract event handling components
4. Complete the modular dashboard implementation 