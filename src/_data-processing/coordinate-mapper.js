/**
 * Coordinate Mapper Module
 * 
 * This module provides utilities for transforming and scaling coordinates
 * for UMAP and other visualizations, handling coordinate normalization,
 * bounds calculations, and mapping between different coordinate spaces.
 */

/**
 * Calculate bounds of a dataset with optional padding
 * @param {Array} data - Array of data points with x and y coordinates
 * @param {Object} options - Options for calculation
 * @param {number} options.padding - Padding percentage (0.05 = 5% padding)
 * @param {string} options.xKey - Key for x coordinate in data objects (default: 'x')
 * @param {string} options.yKey - Key for y coordinate in data objects (default: 'y')
 * @returns {Object} Bounds object with xMin, xMax, yMin, yMax
 */
export function calculateDataBounds(data, options = {}) {
  const {
    padding = 0.05,
    xKey = 'x',
    yKey = 'y'
  } = options;
  
  if (!data || data.length === 0) {
    console.warn('No data provided for bounds calculation, using defaults');
    return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  }

  // Initialize bounds with extreme values
  let bounds = {
    xMin: Infinity,
    xMax: -Infinity,
    yMin: Infinity,
    yMax: -Infinity
  };
  
  // Find actual min/max values in the data
  data.forEach(item => {
    const x = item[xKey];
    const y = item[yKey];
    
    if (x !== undefined && !isNaN(x)) {
      bounds.xMin = Math.min(bounds.xMin, x);
      bounds.xMax = Math.max(bounds.xMax, x);
    }
    
    if (y !== undefined && !isNaN(y)) {
      bounds.yMin = Math.min(bounds.yMin, y);
      bounds.yMax = Math.max(bounds.yMax, y);
    }
  });
  
  // Check if we found valid bounds
  if (bounds.xMin === Infinity || bounds.yMin === Infinity) {
    console.warn('No valid coordinates found in data, using defaults');
    return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  }
  
  // Add padding
  const xPadding = (bounds.xMax - bounds.xMin) * padding;
  const yPadding = (bounds.yMax - bounds.yMin) * padding;
  
  return {
    xMin: bounds.xMin - xPadding,
    xMax: bounds.xMax + xPadding,
    yMin: bounds.yMin - yPadding,
    yMax: bounds.yMax + yPadding
  };
}

/**
 * Create scale functions for mapping data coordinates to view coordinates
 * @param {Object} dataBounds - Data bounds object (xMin, xMax, yMin, yMax)
 * @param {Object} viewBounds - View bounds object (width, height)
 * @returns {Object} Object with scale functions (x, y) and invert functions (invertX, invertY)
 */
export function createScaleFunctions(dataBounds, viewBounds) {
  const { xMin, xMax, yMin, yMax } = dataBounds;
  const { width, height } = viewBounds;
  
  // Create scale functions
  const xScale = value => {
    return ((value - xMin) / (xMax - xMin)) * width;
  };
  
  const yScale = value => {
    return height - ((value - yMin) / (yMax - yMin)) * height;
  };
  
  // Create inverse functions
  const invertX = pixel => {
    return xMin + (pixel / width) * (xMax - xMin);
  };
  
  const invertY = pixel => {
    return yMin + ((height - pixel) / height) * (yMax - yMin);
  };
  
  return {
    x: xScale,
    y: yScale,
    invertX,
    invertY
  };
}

/**
 * Transform a point from data coordinates to view coordinates
 * @param {Object} point - Point object with x and y properties
 * @param {Object} scales - Scale functions object from createScaleFunctions
 * @param {Object} options - Options for transformation
 * @param {string} options.xKey - Key for x coordinate in point object (default: 'x')
 * @param {string} options.yKey - Key for y coordinate in point object (default: 'y')
 * @returns {Object} Transformed point with view coordinates (viewX, viewY)
 */
export function transformPointToView(point, scales, options = {}) {
  const {
    xKey = 'x',
    yKey = 'y'
  } = options;
  
  if (!point || !scales) return null;
  
  const x = point[xKey];
  const y = point[yKey];
  
  if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
    console.warn('Invalid coordinates for point transformation:', point);
    return null;
  }
  
  return {
    ...point,
    viewX: scales.x(x),
    viewY: scales.y(y)
  };
}

/**
 * Transform an array of points from data coordinates to view coordinates
 * @param {Array} points - Array of point objects with x and y properties
 * @param {Object} scales - Scale functions object from createScaleFunctions
 * @param {Object} options - Options for transformation
 * @returns {Array} Array of transformed points with view coordinates
 */
export function transformPointsToView(points, scales, options = {}) {
  if (!points || !Array.isArray(points) || points.length === 0 || !scales) {
    return [];
  }
  
  return points.map(point => transformPointToView(point, scales, options))
    .filter(point => point !== null);
}

/**
 * Normalize a dataset to a specific range (e.g., 0-1 or -1 to 1)
 * @param {Array} data - Array of data points
 * @param {Object} options - Options for normalization
 * @param {number} options.minTarget - Target minimum value (default: 0)
 * @param {number} options.maxTarget - Target maximum value (default: 1)
 * @param {string} options.xKey - Key for x coordinate in data objects (default: 'x')
 * @param {string} options.yKey - Key for y coordinate in data objects (default: 'y')
 * @returns {Array} Normalized data points
 */
export function normalizeDataset(data, options = {}) {
  const {
    minTarget = 0,
    maxTarget = 1,
    xKey = 'x',
    yKey = 'y'
  } = options;
  
  if (!data || data.length === 0) return [];
  
  // Calculate data bounds
  const bounds = calculateDataBounds(data, { xKey, yKey, padding: 0 });
  
  return data.map(point => {
    const normalizedX = minTarget + (point[xKey] - bounds.xMin) / (bounds.xMax - bounds.xMin) * (maxTarget - minTarget);
    const normalizedY = minTarget + (point[yKey] - bounds.yMin) / (bounds.yMax - bounds.yMin) * (maxTarget - minTarget);
    
    return {
      ...point,
      [xKey]: normalizedX,
      [yKey]: normalizedY
    };
  });
}

/**
 * Generate positions for points that don't have real coordinates
 * This is useful for creating a fallback visualization when real coordinates are not available
 * @param {Array} points - Array of points, some may already have coordinates
 * @param {Object} options - Options for position generation
 * @param {string} options.xKey - Key for x coordinate (default: 'x')
 * @param {string} options.yKey - Key for y coordinate (default: 'y')
 * @param {number} options.radius - Radius for circular layout (default: 5)
 * @param {number} options.centerX - Center X position (default: 0)
 * @param {number} options.centerY - Center Y position (default: 0)
 * @returns {Array} Points with generated coordinates for those missing them
 */
export function generatePositionsForMissingCoordinates(points, options = {}) {
  const {
    xKey = 'x',
    yKey = 'y',
    radius = 5,
    centerX = 0,
    centerY = 0
  } = options;
  
  if (!points || !Array.isArray(points) || points.length === 0) {
    return [];
  }
  
  // Count how many points need positions
  const missingCoordinatesCount = points.filter(p => 
    p[xKey] === undefined || p[yKey] === undefined || 
    isNaN(p[xKey]) || isNaN(p[yKey])
  ).length;
  
  // If all points have coordinates, just return the original array
  if (missingCoordinatesCount === 0) {
    return points;
  }
  
  console.log(`Generating positions for ${missingCoordinatesCount} points without coordinates`);
  
  // Generate positions in a circle or spiral pattern
  return points.map((point, index) => {
    // If point already has valid coordinates, don't modify it
    if (point[xKey] !== undefined && point[yKey] !== undefined && 
        !isNaN(point[xKey]) && !isNaN(point[yKey])) {
      return point;
    }
    
    // For points without coordinates, generate positions
    const angleStep = (2 * Math.PI) / missingCoordinatesCount;
    const angle = index * angleStep;
    
    // Use a slight spiral pattern for better separation
    const adjustedRadius = radius * (1 + index * 0.05);
    
    return {
      ...point,
      [xKey]: centerX + adjustedRadius * Math.cos(angle),
      [yKey]: centerY + adjustedRadius * Math.sin(angle),
      coordinateSource: 'generated' // Mark as a generated position
    };
  });
}

/**
 * Calculate the distance between two points
 * @param {Object} point1 - First point with x and y coordinates
 * @param {Object} point2 - Second point with x and y coordinates
 * @param {Object} options - Options for calculation
 * @param {string} options.xKey - Key for x coordinate (default: 'x')
 * @param {string} options.yKey - Key for y coordinate (default: 'y')
 * @returns {number} Euclidean distance between the points
 */
export function calculateDistance(point1, point2, options = {}) {
  const {
    xKey = 'x',
    yKey = 'y'
  } = options;
  
  if (!point1 || !point2) return null;
  
  const x1 = point1[xKey];
  const y1 = point1[yKey];
  const x2 = point2[xKey];
  const y2 = point2[yKey];
  
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined ||
      isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
    return null;
  }
  
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if a point is inside bounds
 * @param {Object} point - Point with x and y coordinates
 * @param {Object} bounds - Bounds object with xMin, xMax, yMin, yMax
 * @param {Object} options - Options for checking
 * @param {string} options.xKey - Key for x coordinate (default: 'x')
 * @param {string} options.yKey - Key for y coordinate (default: 'y')
 * @returns {boolean} True if point is inside bounds
 */
export function isPointInBounds(point, bounds, options = {}) {
  const {
    xKey = 'x',
    yKey = 'y'
  } = options;
  
  if (!point || !bounds) return false;
  
  const x = point[xKey];
  const y = point[yKey];
  
  if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
    return false;
  }
  
  return (
    x >= bounds.xMin && 
    x <= bounds.xMax && 
    y >= bounds.yMin && 
    y <= bounds.yMax
  );
}

/**
 * Filter points to those that are inside bounds
 * @param {Array} points - Array of points
 * @param {Object} bounds - Bounds object with xMin, xMax, yMin, yMax
 * @param {Object} options - Options for filtering
 * @returns {Array} Points that are inside bounds
 */
export function filterPointsInBounds(points, bounds, options = {}) {
  if (!points || !Array.isArray(points) || points.length === 0 || !bounds) {
    return [];
  }
  
  return points.filter(point => isPointInBounds(point, bounds, options));
} 