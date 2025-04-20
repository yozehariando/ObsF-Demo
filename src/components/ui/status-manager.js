/**
 * Status manager utility module for the DNA Mutation Dashboard
 * Provides functions for creating status indicators and managing status updates
 */

// For notification functionality, import the message handler
import { showMessage } from './message-handler.js';

// Track status history
const statusHistory = [];
const statusChangeCallbacks = [];

/**
 * Creates a status indicator component
 * @param {string} status - Status value
 * @param {Object} options - Configuration options
 * @param {string} options.message - Additional message
 * @param {string} options.type - Status type ('error', 'loading', 'ready')
 * @returns {HTMLElement} - The status indicator element
 */
export function createStatusIndicator(status, {message = '', type = 'info'} = {}) {
  const statusElement = document.createElement('div');
  statusElement.className = 'status-indicator';
  
  if (type) {
    statusElement.classList.add(`status-${type}`);
  }
  
  statusElement.textContent = message ? `${status}: ${message}` : status;
  
  return statusElement;
}

/**
 * Creates a job status component
 * @param {string} jobId - ID of the job
 * @param {string} status - Current status
 * @param {Object} options - Configuration options
 * @param {boolean} options.showProgress - Whether to show a progress bar
 * @returns {HTMLElement} - The job status component
 */
export function createJobStatus(jobId, status, {showProgress = true} = {}) {
  const container = document.createElement('div');
  container.className = 'job-status-container';
  
  const statusElement = document.createElement('div');
  statusElement.className = `job-status job-status-${status}`;
  statusElement.setAttribute('data-job-id', jobId);
  statusElement.textContent = status;
  
  container.appendChild(statusElement);
  
  if (showProgress) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'job-progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'job-progress';
    progressBar.setAttribute('data-job-id', jobId);
    
    // Set initial progress based on status
    if (status === 'completed') {
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#4CAF50';
    } else if (status === 'failed') {
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#e74c3c';
    } else if (status === 'processing') {
      progressBar.style.width = '50%';
      progressBar.style.backgroundColor = '#3498db';
    } else {
      progressBar.style.width = '10%';
    }
    
    progressContainer.appendChild(progressBar);
    container.appendChild(progressContainer);
  }
  
  return container;
}

/**
 * Creates a job progress tracker component
 * @param {Object} options - Configuration options
 * @param {string} options.jobId - ID of the job
 * @param {string} options.status - Initial status
 * @param {number} options.progress - Initial progress (0-100)
 * @returns {HTMLElement} - The job progress tracker element
 */
export function createJobProgressTracker({
  jobId = '',
  status = 'initializing',
  progress = 0
} = {}) {
  const container = document.createElement('div');
  container.className = 'job-tracker-container';
  container.setAttribute('data-job-id', jobId);
  
  const statusElement = document.createElement('div');
  statusElement.className = 'job-tracker-status';
  
  let statusText = status;
  if (status === 'initializing') statusText = 'Initializing...';
  if (status === 'queued') statusText = 'In Queue';
  if (status === 'processing') statusText = 'Processing';
  if (status === 'completed') statusText = 'Complete';
  if (status === 'failed') statusText = 'Failed';
  
  statusElement.textContent = statusText;
  
  const progressContainer = document.createElement('div');
  progressContainer.className = 'job-tracker-progress-container';
  
  const progressBar = document.createElement('div');
  progressBar.id = 'job-progress-bar';
  progressBar.className = 'job-progress';
  progressBar.style.width = `${progress}%`;
  
  // Set color based on status
  if (status === 'completed') {
    progressBar.style.backgroundColor = '#4CAF50';
  } else if (status === 'failed') {
    progressBar.style.backgroundColor = '#e74c3c';
  }
  
  const progressText = document.createElement('div');
  progressText.id = 'job-progress-text';
  progressText.className = 'job-progress-text';
  
  // Set message based on status and progress
  let message = 'Processing...';
  if (status === 'initializing') {
    message = 'Preparing sequence...';
  } else if (status === 'queued') {
    message = 'Waiting in queue...';
  } else if (status === 'processing') {
    // Choose message based on progress
    if (progress < 30) {
      message = 'Analyzing sequence...';
    } else if (progress < 60) {
      message = 'Processing embeddings...';
    } else {
      message = 'Calculating similarities...';
    }
  } else if (status === 'completed') {
    message = 'Analysis complete!';
  } else if (status === 'failed') {
    message = 'Analysis failed';
  }
  
  progressText.textContent = message;
  
  progressContainer.appendChild(progressBar);
  container.appendChild(statusElement);
  container.appendChild(progressContainer);
  container.appendChild(progressText);
  
  return container;
}

/**
 * Utility function to update job status in the UI
 * @param {string} jobId - ID of the job to update
 * @param {string} status - New status value
 * @returns {Object} - Status update object
 */
export function updateJobStatus(jobId, status) {
  console.log(`Updating job status for ${jobId} to ${status}`);
  
  // Find the job status element
  const jobStatusElement = document.querySelector(`.job-status[data-job-id="${jobId}"]`);
  
  if (jobStatusElement) {
    // Update the status text
    jobStatusElement.textContent = status;
    
    // Update the status class
    jobStatusElement.className = `job-status job-status-${status}`;
    
    // Update progress bar if it exists
    const progressBar = document.querySelector(`.job-progress[data-job-id="${jobId}"]`);
    if (progressBar) {
      if (status === 'completed') {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#4CAF50';
      } else if (status === 'failed') {
        progressBar.style.backgroundColor = '#e74c3c';
      } else if (status === 'processing') {
        progressBar.style.width = '50%';
        progressBar.style.backgroundColor = '#3498db';
      }
    }
  } else {
    console.warn(`Job status element not found for job ${jobId}`);
  }
  
  // Add to history
  const statusObj = {
    jobId,
    status,
    timestamp: new Date().toISOString()
  };
  
  statusHistory.push(statusObj);
  
  // Call any registered callbacks
  statusChangeCallbacks.forEach(callback => {
    try {
      callback(jobId, status);
    } catch (error) {
      console.error('Error in status change callback:', error);
    }
  });
  
  return statusObj;
}

/**
 * Utility function to update progress text and indicators
 * @param {string} status - Status string
 * @param {number} progress - Progress percentage (0-100)
 * @returns {Object} - Progress update object
 */
export function updateProgressText(status, progress) {
  console.log(`Updating progress text - Status: ${status}, Progress: ${progress}%`);
  
  // Directly update status element
  const statusElement = document.querySelector('.job-tracker-status');
  if (statusElement) {
    let statusText = status;
    if (status === 'initializing') statusText = 'Initializing...';
    if (status === 'queued') statusText = 'In Queue';
    if (status === 'processing') statusText = 'Processing';
    if (status === 'completed') statusText = 'Complete';
    if (status === 'failed') statusText = 'Failed';
    
    console.log(`Setting status text to: ${statusText}`);
    statusElement.textContent = statusText;
  }
  
  // Directly update progress message
  const messageElement = document.getElementById('job-progress-text');
  if (messageElement) {
    let message = 'Processing...';
    
    if (status === 'initializing') {
      message = 'Preparing sequence...';
    } else if (status === 'queued') {
      message = 'Waiting in queue...';
    } else if (status === 'processing') {
      // Choose message based on progress
      if (progress < 30) {
        message = 'Analyzing sequence...';
      } else if (progress < 60) {
        message = 'Processing embeddings...';
      } else {
        message = 'Calculating similarities...';
      }
    } else if (status === 'completed') {
      message = 'Analysis complete!';
    } else if (status === 'failed') {
      message = 'Analysis failed';
    }
    
    console.log(`Setting message text to: ${message}`);
    messageElement.textContent = message;
  }
  
  // Directly update progress bar
  const progressBar = document.getElementById('job-progress-bar');
  if (progressBar) {
    console.log(`Setting progress bar width to: ${progress}%`);
    progressBar.style.width = `${progress}%`;
    
    if (status === 'completed') {
      progressBar.style.backgroundColor = '#4CAF50';
    } else if (status === 'failed') {
      progressBar.style.backgroundColor = '#e74c3c';
    }
  }
  
  const progressObj = {
    status,
    progress,
    timestamp: new Date().toISOString()
  };
  
  // Add to history
  statusHistory.push(progressObj);
  
  return progressObj;
}

/**
 * Utility function to update application status
 * @param {string} status - Status string
 * @param {Object} options - Configuration options
 * @param {string} options.message - Status message
 * @param {string} options.type - Status type (info, warning, error)
 * @param {string} options.statusElement - ID of status text element
 * @param {string} options.indicatorElement - ID of indicator element
 * @param {boolean} options.logToConsole - Whether to log to console
 * @param {boolean} options.notify - Whether to show notification
 * @returns {Object} - Status object
 */
export function updateStatus(status, {
  message = '',
  type = 'info',
  statusElement = 'status-text',
  indicatorElement = 'data-source-indicator',
  logToConsole = true,
  notify = false
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
    showMessage(message, type);
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
  if (typeof callback === 'function') {
    statusChangeCallbacks.push(callback);
    
    // Return function to remove the callback
    return () => {
      const index = statusChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        statusChangeCallbacks.splice(index, 1);
      }
    };
  }
}

/**
 * Get status history
 * @returns {Array} - Array of status history objects
 */
export function getStatusHistory() {
  return [...statusHistory];
}

// // Add required CSS by linking to the centralized CSS file
// export function addStatusStyles() {
//   if (!document.getElementById('ui-components-styles')) {
//     const linkEl = document.createElement('link');
//     linkEl.id = 'ui-components-styles';
//     linkEl.rel = 'stylesheet';
//     linkEl.href = './components/ui/styles/ui-components.css';
//     document.head.appendChild(linkEl);
//   }
// }

// // Initialize styles when module is imported
// addStatusStyles();

/**
 * Creates a message component
 * @param {string} message - Message to display
 * @param {Object} options - Configuration options
 * @param {string} options.type - Message type ('info', 'warning', 'error')
 * @param {number} options.duration - Duration in milliseconds
 * @returns {HTMLElement} - The message element
 */
export function createMessage(message, {type = 'info', duration = 5000} = {}) {
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${type}`;
  messageElement.innerHTML = `
    <div class="message-content">${message}</div>
    <button class="message-close">&times;</button>
  `;
  
  // Add close button handler
  const closeButton = messageElement.querySelector('.message-close');
  closeButton.addEventListener('click', () => {
    messageElement.classList.add('message-hiding');
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      messageElement.classList.add('message-hiding');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }, duration);
  }
  
  // Add animation class after a short delay
  setTimeout(() => {
    messageElement.classList.add('message-visible');
  }, 10);
  
  return messageElement;
}

/**
 * Creates a messages container component
 * @returns {HTMLElement} - The messages container element
 */
export function createMessagesContainer() {
  const container = document.createElement('div');
  container.id = 'messages-container';
  container.className = 'messages-container';
  return container;
}

/**
 * Creates a loading indicator component
 * @param {string} message - Message to display
 * @returns {HTMLElement} - The loading indicator element
 */
export function createLoadingIndicator(message = "Loading...") {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  return indicator;
}
