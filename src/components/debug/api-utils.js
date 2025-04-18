/**
 * Utility functions for API data processing
 */

/**
 * Validate UMAP response data
 * @param {Array} data - UMAP data from API
 * @returns {boolean} True if data is valid
 */
function validateUmapResponse(data) {
  if (!Array.isArray(data)) {
    console.error('UMAP data is not an array')
    return false
  }

  if (data.length === 0) {
    console.error('UMAP data array is empty')
    return false
  }

  // Check if data has expected structure (coordinates array)
  const isValid = data.every(
    (item) =>
      item.coordinates &&
      Array.isArray(item.coordinates) &&
      item.coordinates.length === 2
  )

  if (!isValid) {
    console.error('UMAP data has invalid structure')
  }

  return isValid
}

/**
 * Calculate appropriate bounds for UMAP coordinate space
 * @param {Array} data - Transformed UMAP data
 * @returns {Object} Bounds object with min/max values
 */
function calculateUmapBounds(data) {
  if (!data || data.length === 0) {
    return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
  }

  const bounds = data.reduce(
    (acc, item) => {
      return {
        xMin: Math.min(acc.xMin, item.X),
        xMax: Math.max(acc.xMax, item.X),
        yMin: Math.min(acc.yMin, item.Y),
        yMax: Math.max(acc.yMax, item.Y),
      }
    },
    { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity }
  )

  // Add some padding
  const xPadding = (bounds.xMax - bounds.xMin) * 0.05
  const yPadding = (bounds.yMax - bounds.yMin) * 0.05

  return {
    xMin: bounds.xMin - xPadding,
    xMax: bounds.xMax + xPadding,
    yMin: bounds.yMin - yPadding,
    yMax: bounds.yMax + yPadding,
  }
}

/**
 * Merge new UMAP data with existing data
 * @param {Array} existingData - Existing UMAP data
 * @param {Array} newData - New UMAP data to merge
 * @returns {Array} Merged data with duplicates removed
 */
function mergeUmapData(existingData = [], newData = []) {
  // Create a map of existing IDs for quick lookup
  const existingIds = new Set(existingData.map((item) => item.id))

  // Filter out duplicates from new data
  const uniqueNewData = newData.filter((item) => !existingIds.has(item.id))

  // Return merged array
  return [...existingData, ...uniqueNewData]
}

/**
 * Group UMAP data by a property (e.g., country)
 * @param {Array} data - UMAP data
 * @param {string} property - Property to group by
 * @returns {Object} Grouped data
 */
function groupUmapDataBy(data, property) {
  return data.reduce((groups, item) => {
    const key = item[property] || 'Unknown'
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {})
}

export {
  validateUmapResponse,
  calculateUmapBounds,
  mergeUmapData,
  groupUmapDataBy,
}
