/**
 * Job tracking system for sequence analysis
 * Tracks status of analysis jobs and provides user feedback
 */

import { checkJobStatus } from './api-service.js'

/**
 * Creates a job tracker for monitoring job status
 * @param {string} jobId - ID of the job to track
 * @param {Object} options - Configuration options
 * @returns {Object} Job tracker controller
 */
function createJobTracker(jobId, options = {}) {
  const defaultOptions = {
    initialInterval: 2000, // Start polling every 2 seconds
    maxInterval: 10000, // Maximum polling interval of 10 seconds
    backoffFactor: 1.5, // Increase interval by 50% after each check
    container: document.body, // Default container
    onStatusChange: null, // Status change callback
    onComplete: null, // Job completion callback
    onError: null, // Error callback
  }

  const config = { ...defaultOptions, ...options }
  let currentInterval = config.initialInterval
  let isPolling = false
  let pollTimer = null
  let currentStatus = 'unknown'

  // Create job tracker UI
  const trackerElement = document.createElement('div')
  trackerElement.className = 'job-tracker'
  trackerElement.style.position = 'fixed'
  trackerElement.style.bottom = '20px'
  trackerElement.style.right = '20px'
  trackerElement.style.width = '300px'
  trackerElement.style.backgroundColor = 'white'
  trackerElement.style.borderRadius = '5px'
  trackerElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)'
  trackerElement.style.padding = '15px'
  trackerElement.style.zIndex = '1000'
  trackerElement.style.display = 'none'

  const headerElement = document.createElement('div')
  headerElement.className = 'job-tracker-header'
  headerElement.style.display = 'flex'
  headerElement.style.justifyContent = 'space-between'
  headerElement.style.alignItems = 'center'
  headerElement.style.marginBottom = '10px'

  const titleElement = document.createElement('h4')
  titleElement.textContent = 'Processing DNA Sequence'
  titleElement.style.margin = '0'
  titleElement.style.fontSize = '16px'

  const closeButton = document.createElement('button')
  closeButton.innerHTML = '&times;'
  closeButton.style.background = 'none'
  closeButton.style.border = 'none'
  closeButton.style.fontSize = '20px'
  closeButton.style.cursor = 'pointer'
  closeButton.style.padding = '0'
  closeButton.style.lineHeight = '1'
  closeButton.addEventListener('click', () => {
    trackerElement.style.display = 'none'
  })

  headerElement.appendChild(titleElement)
  headerElement.appendChild(closeButton)

  const statusElement = document.createElement('div')
  statusElement.className = 'job-status'
  statusElement.style.marginBottom = '15px'

  const progressContainer = document.createElement('div')
  progressContainer.className = 'progress-container'
  progressContainer.style.marginBottom = '10px'

  const progressBar = document.createElement('div')
  progressBar.className = 'progress-bar'
  progressBar.style.height = '8px'
  progressBar.style.backgroundColor = '#f0f0f0'
  progressBar.style.borderRadius = '4px'
  progressBar.style.overflow = 'hidden'

  const progressFill = document.createElement('div')
  progressFill.className = 'progress-fill'
  progressFill.style.height = '100%'
  progressFill.style.width = '0%'
  progressFill.style.backgroundColor = '#4CAF50'
  progressFill.style.transition = 'width 0.3s ease'

  progressBar.appendChild(progressFill)
  progressContainer.appendChild(progressBar)

  const stepsContainer = document.createElement('div')
  stepsContainer.className = 'steps-container'
  stepsContainer.style.display = 'flex'
  stepsContainer.style.justifyContent = 'space-between'
  stepsContainer.style.marginTop = '5px'

  const steps = [
    { id: 'embedding', label: 'Embedding' },
    { id: 'projecting', label: 'UMAP' },
    { id: 'similarity', label: 'Similarity' },
  ]

  const stepElements = []

  steps.forEach((step, index) => {
    const stepElement = document.createElement('div')
    stepElement.className = `step-${step.id}`
    stepElement.textContent = step.label
    stepElement.style.fontSize = '12px'
    stepElement.style.color = '#6c757d'
    stepElement.style.position = 'relative'

    stepsContainer.appendChild(stepElement)
    stepElements.push(stepElement)
  })

  progressContainer.appendChild(stepsContainer)

  trackerElement.appendChild(headerElement)
  trackerElement.appendChild(statusElement)
  trackerElement.appendChild(progressContainer)

  // Add to container
  config.container.appendChild(trackerElement)

  // Public methods
  function show() {
    trackerElement.style.display = 'block'
  }

  function hide() {
    trackerElement.style.display = 'none'
  }

  function updateUI(status, message, progress) {
    // Update status message
    statusElement.textContent = message

    // Update progress bar
    progressFill.style.width = `${progress}%`

    // Update step indicators
    let currentStepIndex = -1

    switch (status) {
      case 'embedding':
        currentStepIndex = 0
        break
      case 'projecting':
        currentStepIndex = 1
        break
      case 'similarity':
      case 'completed':
        currentStepIndex = 2
        break
    }

    // Reset all steps
    stepElements.forEach((element, i) => {
      element.style.fontWeight = 'normal'
      element.style.color = '#6c757d'
    })

    if (currentStepIndex >= 0) {
      for (let i = 0; i <= currentStepIndex; i++) {
        const element = stepElements[i]
        element.style.fontWeight = 'bold'
        element.style.color = i === currentStepIndex ? '#4CAF50' : '#000'
      }
    }
  }

  // Start polling for job status
  function startPolling() {
    if (isPolling) return

    isPolling = true
    pollForStatus()
  }

  // Stop polling
  function stopPolling() {
    isPolling = false
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  // Poll for job status
  async function pollForStatus() {
    if (!isPolling) return

    try {
      const jobStatus = await checkJobStatus(jobId)

      // Update status if changed
      if (jobStatus.status !== currentStatus) {
        currentStatus = jobStatus.status

        // Calculate progress based on status
        let progress = 0
        let message = ''

        switch (currentStatus) {
          case 'queued':
            progress = 5
            message = 'Job is queued for processing...'
            break
          case 'embedding':
            progress = 25
            message = 'Creating sequence embedding...'
            break
          case 'projecting':
            progress = 60
            message = 'Generating UMAP projection...'
            break
          case 'similarity':
            progress = 85
            message = 'Finding similar sequences...'
            break
          case 'completed':
            progress = 100
            message = 'Analysis completed successfully!'
            break
          case 'failed':
            progress = 100
            message = 'Analysis failed. Please try again.'
            break
          default:
            progress = 10
            message = 'Processing...'
        }

        // Update UI
        updateUI(currentStatus, message, progress)

        // Call status change callback
        if (config.onStatusChange) {
          config.onStatusChange(currentStatus, jobStatus)
        }

        // Handle completion
        if (currentStatus === 'completed') {
          if (config.onComplete) {
            config.onComplete(jobStatus)
          }
          stopPolling()
          return
        }

        // Handle failure
        if (currentStatus === 'failed') {
          if (config.onError) {
            config.onError(new Error(jobStatus.error || 'Job failed'))
          }
          stopPolling()
          return
        }
      }

      // Continue polling with backoff
      currentInterval = Math.min(
        currentInterval * config.backoffFactor,
        config.maxInterval
      )
      pollTimer = setTimeout(pollForStatus, currentInterval)
    } catch (error) {
      console.error('Error polling job status:', error)

      // Update UI to show error
      updateUI('error', 'Error checking job status. Retrying...', 0)

      // Try again after a delay
      pollTimer = setTimeout(pollForStatus, config.initialInterval)
    }
  }

  // Return public API
  return {
    show,
    hide,
    startPolling,
    stopPolling,
    updateUI,
  }
}

export { createJobTracker }
