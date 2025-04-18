/**
 * Job tracking system for sequence analysis
 * Tracks status of analysis jobs and provides user feedback
 */

import { checkJobStatus } from './api-service.js'

/**
 * Create a job tracker component
 * @param {string} jobId - Job ID to track
 * @param {Object} options - Tracker options
 * @returns {Object} Job tracker component
 */
function createJobTracker(jobId, options = {}) {
  const defaultOptions = {
    container: document.getElementById('user-scatter-container'),
    onStatusChange: null,
    onComplete: null,
    onError: null,
    floating: true // New option to make the tracker float
  };
  
  const config = { ...defaultOptions, ...options };
  
  // Create the tracker element
  const trackerElement = document.createElement('div');
  trackerElement.id = `job-tracker-${jobId}`;
  trackerElement.className = config.floating ? 'job-tracker floating-tracker' : 'job-tracker';
  trackerElement.innerHTML = `
    <div class="job-tracker-header">
      <span class="job-tracker-title">Processing DNA Sequence</span>
      <span class="job-tracker-status">Initializing...</span>
    </div>
    <div class="job-tracker-progress-container">
      <div id="job-progress-bar" class="job-tracker-progress-bar" style="width: 0%;"></div>
    </div>
    <div id="job-progress-text" class="job-tracker-message">Preparing sequence...</div>
  `;
  
  // Add custom CSS to ensure progress bar works and position it properly
  const style = document.createElement('style');
  style.textContent = `
    .job-tracker {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 16px;
      margin-bottom: 16px;
      width: 100%;
      max-width: 400px;
      z-index: 1000;
    }
    
    .floating-tracker {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      animation: slide-in 0.3s ease-out;
    }
    
    @keyframes slide-in {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .job-tracker-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .job-tracker-title {
      font-weight: bold;
    }
    
    .job-tracker-status {
      font-size: 14px;
      color: #666;
    }
    
    .job-tracker-progress-container {
      height: 8px;
      background-color: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
      position: relative;
    }
    
    .job-tracker-progress-bar {
      height: 100%;
      background-color: #3498db;
      border-radius: 4px;
      transition: width 0.5s ease;
      width: 0%;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .job-tracker-message {
      font-size: 14px;
      color: #666;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
  
  // Current state
  let currentStatus = 'initializing';
  let progressValue = 0;
  let isShown = false;
  
  // Function to update the progress bar
  function updateProgress(value, animated = true) {
    progressValue = value;
    const progressBar = trackerElement.querySelector('.job-tracker-progress-bar');
    if (progressBar) {
      if (animated) {
        progressBar.style.transition = 'width 0.5s ease';
      } else {
        progressBar.style.transition = 'none';
      }
      progressBar.style.width = `${value}%`;
      
      // Force a reflow to ensure the animation happens
      void progressBar.offsetWidth;
      
      console.log(`Updated progress bar to ${value}%`);
    } else {
      console.warn('Progress bar element not found');
    }
  }
  
  // Function to update the status message
  function updateStatus(status, jobData = {}) {
    currentStatus = status;
    
    const statusElement = trackerElement.querySelector('.job-tracker-status');
    const messageElement = trackerElement.querySelector('.job-tracker-message');
    
    console.log(`Updating job tracker status to: ${status}`);
    
    if (statusElement) {
      // Map API status to user-friendly status text
      let statusText = status;
      if (status === 'initializing') statusText = 'Initializing...';
      if (status === 'queued') statusText = 'In Queue';
      if (status === 'processing') statusText = 'Processing';
      if (status === 'completed') statusText = 'Complete';
      if (status === 'failed') statusText = 'Failed';
      
      statusElement.textContent = statusText;
    }
    
    // Update progress based on status
    if (status === 'initializing') {
      updateProgress(5);
      if (messageElement) messageElement.textContent = 'Preparing sequence...';
    } else if (status === 'queued') {
      updateProgress(10);
      if (messageElement) messageElement.textContent = 'Waiting in queue...';
    } else if (status === 'processing') {
      // Don't update progress here, that's handled by the progress interval
      if (messageElement) {
        const progressStages = [
          'Analyzing sequence...',
          'Processing embeddings...',
          'Calculating similarities...'
        ];
        
        // Choose message based on current progress
        const messageIndex = Math.floor((progressValue / 90) * progressStages.length);
        messageElement.textContent = progressStages[Math.min(messageIndex, progressStages.length - 1)];
      }
    } else if (status === 'completed') {
      updateProgress(100);
      if (messageElement) messageElement.textContent = 'Analysis complete!';
      if (statusElement) statusElement.textContent = 'Complete';
      
      const progressBar = trackerElement.querySelector('.job-tracker-progress-bar');
      if (progressBar) progressBar.style.backgroundColor = '#4CAF50';
      
      // Auto-hide the tracker after 5 seconds when complete
      setTimeout(() => {
        hide();
      }, 5000);
    } else if (status === 'failed') {
      updateProgress(100);
      if (messageElement) messageElement.textContent = `Analysis failed: ${jobData.error || 'Unknown error'}`;
      if (statusElement) statusElement.textContent = 'Failed';
      
      const progressBar = trackerElement.querySelector('.job-tracker-progress-bar');
      if (progressBar) progressBar.style.backgroundColor = '#e74c3c';
    }
    
    // Call the status change callback
    if (typeof config.onStatusChange === 'function') {
      config.onStatusChange(status, jobData);
    }
  }
  
  // Show the tracker
  function show() {
    if (!isShown) {
      console.log("Showing job tracker");
      
      if (config.floating) {
        // If floating, append to body
        document.body.appendChild(trackerElement);
      } else if (config.container) {
        // If not floating, add to container
        console.log("Showing job tracker in container:", config.container.id);
        
        // Keep other elements but remove any "flex" message
        const flexMessage = config.container.querySelector('.flex');
        if (flexMessage) {
          flexMessage.style.display = 'none';
        }
        
        // Add the tracker at the beginning of the container
        if (config.container.firstChild) {
          config.container.insertBefore(trackerElement, config.container.firstChild);
        } else {
          config.container.appendChild(trackerElement);
        }
      } else {
        console.error("Container for job tracker not found and not floating");
        // If no container and not floating, just add to body
        document.body.appendChild(trackerElement);
      }
      
      isShown = true;
      
      // Start with initial progress
      updateProgress(5, false);
    }
  }
  
  // Hide the tracker
  function hide() {
    if (isShown && trackerElement.parentNode) {
      // Add fade-out animation
      trackerElement.style.opacity = '0';
      trackerElement.style.transform = 'translateY(20px)';
      trackerElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // Remove after animation completes
      setTimeout(() => {
        if (trackerElement.parentNode) {
          trackerElement.parentNode.removeChild(trackerElement);
        }
        isShown = false;
      }, 300);
    }
  }
  
  // Mark job as complete
  function complete(jobData = {}) {
    updateStatus('completed', jobData);
    
    // Call the complete callback
    if (typeof config.onComplete === 'function') {
      config.onComplete(jobData);
    }
  }
  
  // Mark job as failed
  function error(errorMsg) {
    updateStatus('failed', { error: errorMsg });
    
    // Call the error callback
    if (typeof config.onError === 'function') {
      config.onError(errorMsg);
    }
  }
  
  // Mark job as timed out
  function timeout() {
    updateStatus('failed', { error: 'Job timed out' });
    
    // Call the error callback
    if (typeof config.onError === 'function') {
      config.onError('Job timed out');
    }
  }
  
  // Create and expose the public API
  return {
    show,
    hide,
    updateStatus,
    updateProgress,
    complete,
    error,
    timeout,
    element: trackerElement
  };
}

export { createJobTracker };