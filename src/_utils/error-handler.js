/**
 * Error Handler Module
 * 
 * Provides centralized error handling utilities for the application,
 * including error logging, user notifications, and graceful fallbacks.
 */

/**
 * Handle errors consistently across the application
 * @param {Error|string} error - The error object or message
 * @param {string} context - Description of what was being attempted when the error occurred
 * @param {Object} options - Error handling options
 * @param {boolean} options.notify - Whether to show user notification
 * @param {string} options.severity - Error severity ('error', 'warning', 'info')
 * @param {boolean} options.silent - Whether to suppress console output
 * @param {Function} options.fallback - Optional fallback function to execute
 * @returns {*} - Result of fallback function if provided, otherwise undefined
 */
export function handleError(error, context = 'unknown operation', options = {}) {
  // Default options
  const {
    notify = false,
    severity = 'error',
    silent = false,
    fallback = null
  } = options;

  // Create consistent error message
  const errorMessage = error instanceof Error ? error.message : error;
  const fullMessage = `Error while ${context}: ${errorMessage}`;
  
  // Log error to console (unless silent)
  if (!silent) {
    if (severity === 'warning') {
      console.warn(fullMessage);
      console.warn(error);
    } else {
      console.error(fullMessage);
      console.error(error);
    }
  }
  
  // Show notification to user if requested
  if (notify) {
    try {
      showNotification(fullMessage, severity);
    } catch (notifyError) {
      console.error('Failed to show notification:', notifyError);
    }
  }
  
  // Execute fallback if provided
  if (typeof fallback === 'function') {
    try {
      return fallback();
    } catch (fallbackError) {
      console.error('Error in fallback handler:', fallbackError);
    }
  }
  
  // Re-throw if no fallback (useful for async/await)
  if (!fallback) {
    return null;
  }
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - Notification type ('error', 'warning', 'info', 'success')
 * @param {number} duration - How long to show notification in ms
 */
function showNotification(message, type = 'error', duration = 5000) {
  // Create notification element if it doesn't exist
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 10000;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  // Create the notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `<span>${message}</span>`;
  
  // Style the notification based on type
  const colors = {
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    success: '#4caf50'
  };
  
  notification.style.cssText = `
    background-color: ${colors[type] || colors.error};
    color: white;
    padding: 12px 16px;
    margin-bottom: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease;
    word-break: break-word;
  `;
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    background: transparent;
    border: none;
    color: white;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    float: right;
    margin-left: 10px;
    line-height: 14px;
  `;
  
  closeButton.addEventListener('click', () => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });
  
  notification.prepend(closeButton);
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
  
  return notification;
}

/**
 * Create an error with debug information
 * @param {string} message - Error message
 * @param {string} code - Error code for identification
 * @param {Object} details - Additional debugging details
 * @returns {Error} - Enhanced error object
 */
export function createError(message, code = 'UNKNOWN_ERROR', details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Safely execute a function with error handling
 * @param {Function} fn - Function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {string} context - Description of operation for error messages
 * @param {Object} options - Error handling options
 * @returns {*} - Result of function or undefined on error
 */
export function safeExecute(fn, args = [], context = 'executing function', options = {}) {
  if (typeof fn !== 'function') {
    handleError('Not a function', context, options);
    return null;
  }
  
  try {
    return fn(...args);
  } catch (error) {
    return handleError(error, context, options);
  }
}

/**
 * Safely execute an async function with error handling
 * @param {Function} fn - Async function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {string} context - Description of operation for error messages
 * @param {Object} options - Error handling options
 * @returns {Promise<*>} - Promise resolving to function result or undefined on error
 */
export async function safeExecuteAsync(fn, args = [], context = 'executing async function', options = {}) {
  if (typeof fn !== 'function') {
    handleError('Not a function', context, options);
    return null;
  }
  
  try {
    return await fn(...args);
  } catch (error) {
    return handleError(error, context, options);
  }
} 