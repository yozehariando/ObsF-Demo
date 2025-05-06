/**
 * Job tracking system for sequence analysis
 * Tracks status of analysis jobs and provides user feedback
 */

// import { checkJobStatus } from './api-service.js'

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
    floating: true, // New option to make the tracker float
  }

  const config = { ...defaultOptions, ...options }

  // Create the tracker element
  const trackerElement = document.createElement('div')
  trackerElement.id = `job-tracker-${jobId}`
  trackerElement.className = config.floating
    ? 'job-tracker floating-tracker'
    : 'job-tracker'
  trackerElement.innerHTML = `
    <div class="job-tracker-header">
      <span class="job-tracker-status-indicator"></span>
      <span class="job-tracker-title">Processing Sequence</span>
      <span class="job-tracker-status">Initializing...</span>
    </div>
    <div class="job-tracker-progress-container">
      <div id="job-progress-bar" class="job-tracker-progress-bar" style="width: 0%;"></div>
    </div>
    <div id="job-tracker-message" class="job-tracker-message">Preparing sequence...</div>
    <div id="job-tracker-error" class="job-tracker-error-message" style="display: none;"></div>
  `

  // Add custom CSS to ensure progress bar works and position it properly
  const style = document.createElement('style')
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
      font-family: sans-serif;
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
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }
    
    .job-tracker-status-indicator {
      display: inline-block;
      width: 16px;
      height: 16px;
      line-height: 16px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .job-tracker-spinner {
      border: 2px solid #f3f3f3;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .job-tracker-title {
      font-weight: bold;
      flex-grow: 1;
      text-align: left;
    }
    
    .job-tracker-status {
      font-size: 12px;
      color: #666;
      font-weight: bold;
      white-space: nowrap;
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
      font-size: 13px;
      color: #333;
      text-align: center;
      margin-top: 8px;
    }
    
    .job-tracker-error-message {
      font-size: 12px;
      color: #D8000C;
      background-color: #FFD2D2;
      border: 1px solid #D8000C;
      border-radius: 4px;
      padding: 8px;
      margin-top: 10px;
      text-align: center;
    }
  `
  document.head.appendChild(style)

  // Current state
  let currentStatus = 'initializing'
  let progressValue = 0
  let isShown = false

  // Function to update the progress bar
  function updateProgress(value, animated = true) {
    progressValue = value
    const progressBar = trackerElement.querySelector(
      '.job-tracker-progress-bar'
    )
    if (progressBar) {
      if (animated) {
        progressBar.style.transition = 'width 0.5s ease'
      } else {
        progressBar.style.transition = 'none'
      }
      progressBar.style.width = `${value}%`

      // Force a reflow to ensure the animation happens
      void progressBar.offsetWidth

      console.log(`Updated progress bar to ${value}%`)
    } else {
      console.warn('Progress bar element not found')
    }
  }

  // Function to update the status message
  function updateStatus(status, jobData = {}) {
    currentStatus = status.toLowerCase()

    const statusIndicatorElement = trackerElement.querySelector(
      '.job-tracker-status-indicator'
    )
    const statusElement = trackerElement.querySelector('.job-tracker-status')
    const messageElement = trackerElement.querySelector('.job-tracker-message')
    const errorElement = trackerElement.querySelector(
      '.job-tracker-error-message'
    )
    const progressBar = trackerElement.querySelector(
      '.job-tracker-progress-bar'
    )

    console.log(`Updating job tracker status to: ${currentStatus}`)

    // Clear previous indicator content
    if (statusIndicatorElement) statusIndicatorElement.innerHTML = ''
    if (errorElement) errorElement.style.display = 'none' // Hide error by default

    let statusText =
      currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)
    let messageText = ''
    let progress = 0
    let showSpinner = false
    let bgColor = '#3498db' // Default blue

    switch (currentStatus) {
      case 'submitting':
        statusText = 'Submitting'
        messageText = 'Sending sequence for analysis...'
        progress = 5
        showSpinner = true
        break
      case 'pending':
      case 'queued':
        statusText = 'Pending'
        messageText = 'Waiting for analysis to start...'
        progress = 10
        showSpinner = true
        break
      case 'running':
      case 'processing': // Treat processing like running
        statusText = 'Running'
        messageText = 'Analysis in progress...'
        // Simulate progress during running state (e.g., slowly increase)
        // This is just illustrative; real progress would need backend info
        progress = Math.min(90, (progressValue || 10) + Math.random() * 5)
        showSpinner = true
        break
      case 'processing results': // Specific state called from handleJobCompletion start
        statusText = 'Processing'
        messageText = 'Processing analysis results...'
        progress = 95
        showSpinner = true
        break
      case 'completed':
        statusText = 'Completed'
        messageText = 'Analysis complete!'
        progress = 100
        showSpinner = false
        if (statusIndicatorElement) statusIndicatorElement.textContent = '✅'
        bgColor = '#4CAF50' // Green
        // Auto-hide after delay
        setTimeout(() => {
          hide()
        }, 5000)
        break
      case 'failed':
        statusText = 'Failed'
        const errorMessage =
          jobData?.error || jobData?.result?.error || 'Unknown error'
        messageText = 'Analysis failed.'
        progress = 100 // Show full bar but in red
        showSpinner = false
        if (statusIndicatorElement) statusIndicatorElement.textContent = '❌'
        if (errorElement) {
          errorElement.textContent = `Error: ${errorMessage}`
          errorElement.style.display = 'block'
        }
        bgColor = '#e74c3c' // Red
        break
      default: // Handle 'initializing' or unknown states
        statusText = 'Initializing'
        messageText = 'Preparing sequence...'
        progress = 5
        showSpinner = true
        break
    }

    if (statusElement) statusElement.textContent = statusText
    if (messageElement) messageElement.textContent = messageText

    // Update spinner/icon visibility
    if (statusIndicatorElement && showSpinner) {
      statusIndicatorElement.innerHTML =
        '<div class="job-tracker-spinner"></div>'
    }

    // Update progress bar
    if (progressBar) progressBar.style.backgroundColor = bgColor
    updateProgress(progress) // Update progress bar width

    // Call the status change callback
    if (typeof config.onStatusChange === 'function') {
      config.onStatusChange(currentStatus, jobData)
    }
  }

  // Show the tracker
  function show() {
    if (!isShown) {
      console.log('Showing job tracker')

      if (config.floating) {
        // If floating, append to body
        document.body.appendChild(trackerElement)
      } else if (config.container) {
        // If not floating, add to container
        console.log('Showing job tracker in container:', config.container.id)

        // Keep other elements but remove any "flex" message
        const flexMessage = config.container.querySelector('.flex')
        if (flexMessage) {
          flexMessage.style.display = 'none'
        }

        // Add the tracker at the beginning of the container
        if (config.container.firstChild) {
          config.container.insertBefore(
            trackerElement,
            config.container.firstChild
          )
        } else {
          config.container.appendChild(trackerElement)
        }
      } else {
        console.error('Container for job tracker not found and not floating')
        // If no container and not floating, just add to body
        document.body.appendChild(trackerElement)
      }

      isShown = true

      // Start with initial progress
      updateStatus('initializing', {})
    }
  }

  // Hide the tracker
  function hide() {
    if (isShown && trackerElement.parentNode) {
      // Add fade-out animation
      trackerElement.style.opacity = '0'
      trackerElement.style.transform = 'translateY(20px)'
      trackerElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease'

      // Remove after animation completes
      setTimeout(() => {
        if (trackerElement.parentNode) {
          trackerElement.parentNode.removeChild(trackerElement)
        }
        isShown = false
      }, 300)
    }
  }

  // Mark job as complete
  function complete(jobData = {}) {
    updateStatus('completed', jobData)

    // Call the complete callback
    if (typeof config.onComplete === 'function') {
      config.onComplete(jobData)
    }
  }

  // Mark job as failed
  function error(errorMsg) {
    updateStatus('failed', { error: errorMsg })

    // Call the error callback
    if (typeof config.onError === 'function') {
      config.onError(errorMsg)
    }
  }

  // Mark job as timed out
  function timeout() {
    updateStatus('failed', { error: 'Job timed out' })

    // Call the error callback
    if (typeof config.onError === 'function') {
      config.onError('Job timed out')
    }
  }

  // Create and expose the public API
  return {
    updateStatus,
    updateProgress,
    show,
    hide,
    complete,
    error,
    timeout,
    element: trackerElement,
    jobId: jobId,
  }
}

export { createJobTracker }
