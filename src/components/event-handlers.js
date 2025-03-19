// Event handlers component for DNA mutation dashboard
import * as d3 from 'd3'
import {
  fetchAPIData,
  processCSVData,
  generateRandomMutation,
} from './data-service.js'

// Function to set up event handlers for the dashboard
export function setupEventHandlers(state, components, updateVisualizations) {
  // API button handler
  document
    .getElementById('api-button')
    ?.addEventListener('click', async function () {
      this.disabled = true
      this.textContent = 'Loading...'

      try {
        const { data: apiData, newApiCallCount } = await fetchAPIData(
          state.currentData,
          state.apiCallCount
        )

        // Update state
        state.currentData = [...state.currentData, ...apiData]
        state.apiCallCount = newApiCallCount

        // Update visualizations
        updateVisualizations()

        // Show success message
        alert(`Successfully loaded ${apiData.length} data points from API`)
      } catch (error) {
        console.error('Error fetching API data:', error)
      } finally {
        this.disabled = false
        this.textContent = 'Fetch API Data'
      }
    })

  // Upload button handler
  document
    .getElementById('upload-button')
    ?.addEventListener('click', function () {
      // Trigger file input click
      document.getElementById('file-input')?.click()
    })

  // File input change handler
  document
    .getElementById('file-input')
    ?.addEventListener('change', function (event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = function (e) {
        try {
          // Parse CSV data
          const csvData = d3.csvParse(e.target.result)
          const { data: processedData, newApiCallCount } = processCSVData(
            csvData,
            state.currentData,
            state.apiCallCount
          )

          // Update state
          state.currentData = [...state.currentData, ...processedData]
          state.apiCallCount = newApiCallCount

          // Update visualizations
          updateVisualizations()

          // Show success message
          alert(
            `Successfully loaded ${processedData.length} data points from CSV`
          )
        } catch (error) {
          console.error('Error parsing uploaded file:', error)
          alert(
            "Error parsing file. Please ensure it's a valid CSV with the correct format."
          )
        }
      }

      reader.readAsText(file)
    })

  // Random button handler
  document
    .getElementById('random-button')
    ?.addEventListener('click', async function () {
      this.disabled = true
      this.textContent = 'Generating...'

      try {
        const { data: newPoint, newApiCallCount } =
          await generateRandomMutation(state.currentData, state.apiCallCount)

        // Update state
        state.currentData = [...state.currentData, newPoint]
        state.apiCallCount = newApiCallCount
        state.selectedIndex = newPoint.index

        // Update visualizations
        updateVisualizations()
      } catch (error) {
        console.error('Error generating random mutation:', error)
      } finally {
        this.disabled = false
        this.textContent = 'Generate Random'
      }
    })

  // Reset button handler
  document
    .getElementById('reset-button')
    ?.addEventListener('click', function () {
      // Reset state
      state.currentData = state.originalData
      state.selectedIndex = null
      state.apiCallCount = 0

      // Update visualizations
      updateVisualizations()
    })
}
