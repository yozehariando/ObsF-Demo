/**
 * API Data Service
 * Primary data loading service that prioritizes API data
 */

import { loadInitialData } from '../data-service.js'
import { fetchUmapData, transformUmapData } from './api-service.js'
import { validateUmapResponse } from './api-utils.js'

/**
 * Load data from API first, fall back to local data if API fails
 * @returns {Promise<Object>} Object containing data and source information
 */
export async function loadData() {
  try {
    console.log('Attempting to load data from API first...')

    // Show loading indicator
    showLoadingIndicator('Loading data from API...')

    // Try to load from API first
    const apiData = await fetchUmapData('DNABERT-S', true)

    // Validate the API response
    if (!validateUmapResponse(apiData)) {
      throw new Error('Invalid API response format')
    }

    // Transform the API data to match our visualization format
    const transformedData = transformUmapData(apiData)

    console.log(
      `Successfully loaded ${transformedData.length} data points from API`
    )
    hideLoadingIndicator()

    return {
      data: transformedData,
      source: 'api',
      isUmapData: true,
    }
  } catch (apiError) {
    console.warn('Failed to load data from API:', apiError)
    console.log('Falling back to local data...')

    try {
      // Fall back to local data
      showLoadingIndicator('Loading local data...')
      const localData = await loadInitialData()
      hideLoadingIndicator()

      return {
        data: localData,
        source: 'local',
        isUmapData: false,
      }
    } catch (localError) {
      console.error('Failed to load local data:', localError)
      hideLoadingIndicator()
      throw new Error('Failed to load data from any source')
    }
  }
}

/**
 * Show a loading indicator
 * @param {string} message - Message to display
 */
function showLoadingIndicator(message) {
  // Remove any existing loading indicator
  hideLoadingIndicator()

  // Create loading indicator
  const loadingDiv = document.createElement('div')
  loadingDiv.className = 'loading-indicator'
  loadingDiv.style.position = 'fixed'
  loadingDiv.style.top = '50%'
  loadingDiv.style.left = '50%'
  loadingDiv.style.transform = 'translate(-50%, -50%)'
  loadingDiv.style.background = 'rgba(255, 255, 255, 0.9)'
  loadingDiv.style.padding = '20px'
  loadingDiv.style.borderRadius = '5px'
  loadingDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)'
  loadingDiv.style.zIndex = '1000'
  loadingDiv.innerHTML = `
    <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; margin: 0 auto 10px; animation: spin 2s linear infinite;"></div>
    <p style="margin: 0; text-align: center;">${message || 'Loading...'}</p>
  `
  document.body.appendChild(loadingDiv)

  // Add the spin animation
  if (!document.querySelector('style#loading-animation')) {
    const style = document.createElement('style')
    style.id = 'loading-animation'
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * Hide the loading indicator
 */
function hideLoadingIndicator() {
  const loadingDiv = document.querySelector('.loading-indicator')
  if (loadingDiv) {
    loadingDiv.remove()
  }
}
