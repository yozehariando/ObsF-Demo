/**
 * DOM Utilities
 * 
 * This module provides utilities for common DOM operations used throughout
 * the application, including element creation, style management, and UI helpers.
 */

/**
 * Standard element IDs used throughout the application
 * These constants ensure consistency in element ID references
 */
export const ELEMENT_IDS = {
  // Containers
  SCATTER_CONTAINER: 'scatter-container',
  USER_SCATTER_CONTAINER: 'user-scatter-container',
  MAP_CONTAINER: 'map-container',
  DETAILS_PANEL: 'details-panel',
  MESSAGES_CONTAINER: 'messages-container',
  
  // Buttons and inputs
  UPLOAD_BUTTON: 'upload-fasta-button',
  RESET_BUTTON: 'reset-user-sequences',
  FASTA_INPUT: 'fasta-file-input',
  CLEAR_HIGHLIGHTS_BUTTON: 'clear-highlights-btn',
  
  // Styles
  DETAILS_PANEL_STYLES: 'details-panel-styles',
  TOOLTIP_STYLES: 'tooltip-styles'
};

/**
 * Safely get an element by ID with error handling
 * @param {string} id - The ID of the element to find
 * @param {boolean} required - Whether the element is required (throws error if not found)
 * @returns {HTMLElement|null} - The found element or null
 */
export function getElementByID(id, required = false) {
  const element = document.getElementById(id);
  if (!element && required) {
    console.error(`Required element with ID "${id}" not found`);
    throw new Error(`Required element with ID "${id}" not found`);
  }
  return element;
}

/**
 * Safely query an element with error handling
 * @param {string} selector - CSS selector to query
 * @param {HTMLElement} context - Element to search within (defaults to document)
 * @param {boolean} required - Whether the element is required (throws error if not found)
 * @returns {HTMLElement|null} - The found element or null
 */
export function querySelector(selector, context = document, required = false) {
  const element = context.querySelector(selector);
  if (!element && required) {
    console.error(`Required element with selector "${selector}" not found`);
    throw new Error(`Required element with selector "${selector}" not found`);
  }
  return element;
}

/**
 * Create an HTML element with attributes and content
 * @param {string} tagName - The HTML tag name
 * @param {Object} attributes - Attributes to set on the element
 * @param {string|HTMLElement|Array} content - The content to append to the element
 * @returns {HTMLElement} - The created element
 */
export function createElement(tagName, attributes = {}, content = null) {
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        element.style[styleKey] = styleValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event handlers (e.g., onClick, onMouseover)
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      // Dataset attributes (data-*)
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      // All other attributes
      element.setAttribute(key, value);
    }
  });
  
  // Set content
  if (content) {
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'string') {
          element.innerHTML += item;
        } else if (item instanceof HTMLElement) {
          element.appendChild(item);
        }
      });
    }
  }
  
  return element;
}

/**
 * Remove all children from an element
 * @param {HTMLElement} element - The element to clear
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Add a style element to the document head
 * @param {string} css - CSS string to add
 * @param {string} id - Optional ID for the style element
 * @returns {HTMLStyleElement} - The created style element
 */
export function addStyleToDocument(css, id = null) {
  // Check if style already exists with this ID
  if (id && document.getElementById(id)) {
    return document.getElementById(id);
  }
  
  const style = document.createElement('style');
  if (id) {
    style.id = id;
  }
  style.textContent = css;
  document.head.appendChild(style);
  
  return style;
}

/**
 * Insert HTML into document head (for styles, etc.)
 * @param {string} html - HTML string to insert
 */
export function insertHTMLToHead(html) {
  document.head.insertAdjacentHTML('beforeend', html);
}

/**
 * Create and show a notification message
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} - The created notification element
 */
export function showNotification(message, type = 'info', duration = 5000) {
  let messagesContainer = document.getElementById('messages-container');
  
  if (!messagesContainer) {
    messagesContainer = createElement('div', {
      id: 'messages-container',
      className: 'messages-container',
      style: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999'
      }
    });
    document.body.appendChild(messagesContainer);
  }
  
  const messageElement = createElement('div', {
    className: `message message-${type}`,
    style: {
      backgroundColor: getColorForType(type),
      color: '#fff',
      padding: '10px 15px',
      borderRadius: '4px',
      marginTop: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    }
  }, `
    <span>${message}</span>
    <button class="message-close" style="background: none; border: none; color: #fff; cursor: pointer; margin-left: 10px;">&times;</button>
  `);
  
  messagesContainer.appendChild(messageElement);
  
  // Ensure we have the styles for messages
  addNotificationStyles();
  
  // Fade in
  setTimeout(() => {
    messageElement.style.opacity = '1';
  }, 10);
  
  // Add close button listener
  const closeButton = messageElement.querySelector('.message-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      messageElement.style.opacity = '0';
      setTimeout(() => {
        messageElement.remove();
      }, 300);
    });
  }
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.style.opacity = '0';
        setTimeout(() => {
          if (messageElement.parentNode) {
            messageElement.remove();
          }
        }, 300);
      }
    }, duration);
  }
  
  return messageElement;
}

/**
 * Add notification styles to document
 */
function addNotificationStyles() {
  if (document.getElementById('notification-styles')) return;
  
  addStyleToDocument(`
    .messages-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .message {
      min-width: 200px;
      max-width: 400px;
    }
    
    .message-success { 
      background-color: #4CAF50; 
    }
    
    .message-error { 
      background-color: #F44336; 
    }
    
    .message-info { 
      background-color: #2196F3; 
    }
    
    .message-warning { 
      background-color: #FF9800; 
    }
  `, 'notification-styles');
}

/**
 * Get color for notification type
 * @param {string} type - Message type
 * @returns {string} - Color code
 */
function getColorForType(type) {
  switch (type) {
    case 'success': return '#4CAF50';
    case 'error': return '#F44336';
    case 'warning': return '#FF9800';
    case 'info':
    default: return '#2196F3';
  }
}

/**
 * Show a loading indicator
 * @param {string} message - Loading message to display
 * @returns {HTMLElement} - The loading indicator element
 */
export function showLoadingIndicator(message = 'Loading...') {
  let loadingIndicator = document.getElementById('loading-indicator');
  
  if (!loadingIndicator) {
    loadingIndicator = createElement('div', {
      id: 'loading-indicator',
      className: 'loading-indicator',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000'
      }
    }, `
      <div class="loading-content" style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <div class="loading-spinner"></div>
        <div style="margin-top: 15px;">${message}</div>
      </div>
    `);
    
    document.body.appendChild(loadingIndicator);
    
    // Add spinner styles
    if (!document.getElementById('loading-styles')) {
      addStyleToDocument(`
        .loading-spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `, 'loading-styles');
    }
  } else {
    // Update message if indicator already exists
    const messageElement = loadingIndicator.querySelector('.loading-content div:last-child');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    // Make sure it's visible
    loadingIndicator.style.display = 'flex';
  }
  
  return loadingIndicator;
}

/**
 * Hide the loading indicator
 */
export function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

/**
 * Check if element has specific content or is empty
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - Whether the element is empty
 */
export function isElementEmpty(element) {
  if (!element) return true;
  return element.innerHTML.trim() === '';
}

/**
 * Safely add an event listener with error handling
 * @param {HTMLElement} element - Element to add listener to
 * @param {string} eventType - Type of event (click, mouseover, etc.)
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options
 */
export function addEventListenerSafely(element, eventType, handler, options = {}) {
  if (!element) {
    console.warn(`Cannot add ${eventType} event listener: element is null or undefined`);
    return;
  }
  
  try {
    element.addEventListener(eventType, handler, options);
  } catch (error) {
    console.error(`Error adding ${eventType} event listener:`, error);
  }
}

/**
 * Get all elements matching a selector with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Element to search within (defaults to document)
 * @returns {Array<HTMLElement>} - Array of matching elements
 */
export function querySelectorAll(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    console.error(`Error querying selector "${selector}":`, error);
    return [];
  }
}

/**
 * Measure an element's dimensions
 * @param {HTMLElement} element - Element to measure
 * @returns {Object} - Object with width, height, top, left, right, bottom
 */
export function getElementDimensions(element) {
  if (!element) return null;
  
  try {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY
    };
  } catch (error) {
    console.error('Error measuring element dimensions:', error);
    return null;
  }
}

/**
 * Append multiple children to an element
 * @param {HTMLElement} parent - Parent element
 * @param {Array<HTMLElement>} children - Array of child elements
 */
export function appendChildren(parent, children) {
  if (!parent) return;
  
  children.forEach(child => {
    if (child) {
      parent.appendChild(child);
    }
  });
}

/**
 * Set multiple CSS properties on an element
 * @param {HTMLElement} element - Element to style
 * @param {Object} styles - Object with style properties
 */
export function setStyles(element, styles) {
  if (!element) return;
  
  Object.entries(styles).forEach(([property, value]) => {
    element.style[property] = value;
  });
}

/**
 * Create an empty state message for containers
 * @param {string} message - Message to display
 * @param {string} subMessage - Optional secondary message
 * @returns {HTMLElement} - The empty state element
 */
export function createEmptyState(message, subMessage = null) {
  const emptyState = createElement('div', {
    className: 'empty-state-message',
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '20px',
      textAlign: 'center'
    }
  });
  
  emptyState.appendChild(
    createElement('p', {
      style: {
        color: '#6b7280',
        marginBottom: subMessage ? '0.5rem' : '0',
        fontSize: '1rem'
      }
    }, message)
  );
  
  if (subMessage) {
    emptyState.appendChild(
      createElement('p', {
        style: {
          color: '#9ca3af',
          fontSize: '0.875rem'
        }
      }, subMessage)
    );
  }
  
  return emptyState;
}

/**
 * Centralized error handling utility
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} options - Additional options
 * @param {boolean} options.notify - Whether to show a notification to the user
 * @param {boolean} options.silent - Whether to suppress console output
 * @param {Function} options.fallback - Fallback function to execute
 * @returns {*} - Result of the fallback function if provided
 */
export function handleError(error, context, options = {}) {
  const { 
    notify = true, 
    silent = false, 
    fallback = null,
    severity = 'error'  // 'error', 'warning', or 'info'
  } = options;
  
  // Log to console unless silent is true
  if (!silent) {
    console.error(`Error in ${context}:`, error);
  }
  
  // Show notification if requested
  if (notify) {
    const message = error.userMessage || `An error occurred${context ? ' in ' + context : ''}: ${error.message}`;
    showNotification(message, severity);
  }
  
  // Execute fallback if provided
  if (typeof fallback === 'function') {
    try {
      return fallback(error);
    } catch (fallbackError) {
      if (!silent) {
        console.error(`Error in fallback for ${context}:`, fallbackError);
      }
    }
  }
  
  return null;
}

/**
 * Execute a function with error handling
 * @param {Function} fn - Function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {string} context - Context for error reporting
 * @param {Object} options - Error handling options
 * @returns {*} - Result of the function or fallback
 */
export function safeExecute(fn, args = [], context = 'unknown', options = {}) {
  try {
    return fn(...args);
  } catch (error) {
    return handleError(error, context, options);
  }
}

/**
 * Execute an async function with error handling
 * @param {Function} fn - Async function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {string} context - Context for error reporting
 * @param {Object} options - Error handling options
 * @returns {Promise<*>} - Result of the function or fallback
 */
export async function safeExecuteAsync(fn, args = [], context = 'unknown', options = {}) {
  try {
    return await fn(...args);
  } catch (error) {
    return handleError(error, context, options);
  }
} 