/**
 * UMAP Visualization
 * 
 * This module provides functions for creating and updating UMAP visualizations.
 * It includes the emergency visualization fallback that provides a direct D3
 * implementation when the main scatter plot component is not available.
 */

import * as d3 from 'd3';
import { getStandardPointColor, getStandardPointRadius, setPointHighlight } from './point-styler.js';
import { formatTooltip } from './tooltip-formatter.js';
import { highlightSequence } from '../ui-components/highlight-manager.js';
import { updateDetailsWithSimilarSequences } from '../ui-components/details-panel.js';
import { ELEMENT_IDS, safeExecute, createEmptyState } from '../utils/dom-utils.js';
import { handleError } from '../utils/error-handler.js';

/**
 * Update the UMAP visualization with the given sequences
 * @param {Array} sequences - Array of sequence data with coordinates
 */
export function updateUmapVisualization(sequences) {
  try {
    // Validate input
    if (!sequences || !Array.isArray(sequences)) {
      throw new Error('No sequence data provided or data is not an array');
    }
    
    console.log(`Updating UMAP visualization with ${sequences.length} sequences`);
    
    // Get the container
    const userScatterContainer = document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
    if (!userScatterContainer) {
      throw new Error("User scatter container not found");
    }
    
    // Debug - Count sequences by type
    const userSeqCount = sequences.filter(d => d.isUserSequence).length;
    const similarSeqCount = sequences.filter(d => d.matchesUserSequence).length;
    console.log(`Visualizing ${userSeqCount} user sequences and ${similarSeqCount} similar sequences`);
    
    // Handle case with no sequences that have coordinates
    const sequencesWithCoordinates = sequences.filter(d => 
      d.x !== undefined && d.y !== undefined && 
      !isNaN(d.x) && !isNaN(d.y)
    );
    
    if (sequencesWithCoordinates.length === 0) {
      console.warn("No sequences have valid coordinates");
      showEmptyVisualization(userScatterContainer, 
        "No sequences with coordinates", 
        "Upload a FASTA file to see it visualized here"
      );
      return;
    }
    
    // Log the coordinate ranges to help with visualization scaling
    const allX = sequencesWithCoordinates.map(d => d.x);
    const allY = sequencesWithCoordinates.map(d => d.y);
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMin = Math.min(...allY), yMax = Math.max(...allY);
    console.log(`X coordinate range: ${xMin} to ${xMax}`);
    console.log(`Y coordinate range: ${yMin} to ${yMax}`);
    
    // Use emergency visualization with the correct coordinates
    console.log(`Creating visualization with ${sequencesWithCoordinates.length} points using actual coordinates`);
    createEmergencyVisualization(userScatterContainer, sequencesWithCoordinates);
    
    // Setup hover effects - this would be imported from hover-effects.js in a future iteration
    setTimeout(() => {
      safeExecute(
        window.setupPointHoverEffects || (() => console.log("setupPointHoverEffects not available")), 
        [], 
        'setup hover effects', 
        { notify: false, silent: true }
      );
    }, 500);
    
    console.log("UMAP visualization updated successfully");
  } catch (error) {
    handleError(error, "updating UMAP visualization", {
      notify: true,
      severity: 'error',
      fallback: () => {
        // Attempt to show empty state as fallback
        try {
          const container = document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
          if (container) {
            showEmptyVisualization(container, 
              "Error visualizing sequences", 
              "Please try uploading your sequence again"
            );
          }
        } catch (fallbackError) {
          console.error("Failed to show empty visualization as fallback:", fallbackError);
        }
      }
    });
  }
}

/**
 * Create a direct visualization as emergency fallback
 * @param {HTMLElement} container - The container element for the visualization
 * @param {Array} data - The sequence data to visualize
 * @returns {Object} - Object with methods for interacting with the visualization
 */
export function createEmergencyVisualization(container, data) {
  try {
    console.log("🔍 DEBUG: Creating emergency visualization with data:", data);
    
    // Input validation
    if (!container) {
      throw new Error("No container provided for visualization");
    }
    
    // Always ensure data is an array
    if (!data) {
      console.warn("No data provided for visualization, using empty array");
      data = [];
    } else if (!Array.isArray(data)) {
      console.warn("Invalid data provided for visualization (not an array), converting to array");
      data = [data]; // Convert non-array to array with single item if it has content
    }
    
    // Ensure all data points have the minimal required properties
    data = data.map(d => {
      // Make a copy to avoid modifying the original
      const point = {...d};
      
      // Ensure ID exists
      if (!point.id) {
        point.id = `seq-${Math.random().toString(36).substring(2, 10)}`;
        console.log(`Generated ID for point: ${point.id}`);
      }
      
      // Fix coordinates if needed
      if (isNaN(point.x) || point.x === undefined) point.x = 0;
      if (isNaN(point.y) || point.y === undefined) point.y = 0;
      
      return point;
    });

    // Count the actual types of sequences we have
    const userSeqCount = data.filter(d => d.isUserSequence).length;
    const similarSeqCount = data.filter(d => d.matchesUserSequence).length;
    const otherSeqCount = data.length - userSeqCount - similarSeqCount;
    
    console.log("EMERGENCY VISUALIZATION - SEQUENCE COUNTS:");
    console.log(`User sequences: ${userSeqCount}`);
    console.log(`Similar sequences: ${similarSeqCount}`);
    console.log(`Other sequences: ${otherSeqCount}`);
    console.log(`Total sequences: ${data.length}`);
    
    // Print all sequences with their coordinates and types
    if (data.length > 0) {
      console.log("🔍 DEBUG: All sequences with coordinates and types:");
      data.forEach((seq, i) => {
        console.log(`Sequence ${i}: ID=${seq.id || 'undefined'}, x=${seq.x}, y=${seq.y}, isUser=${seq.isUserSequence}, matchesUser=${seq.matchesUserSequence}, source=${seq.coordinateSource || 'unknown'}`);
      });
    }

    // Check if the container is empty before clearing
    if (container.innerHTML.trim() === '' || !container.querySelector('svg')) {
      // If it's empty or has no SVG, clear it and set up the visualization
      container.innerHTML = '';
    
      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'viz-tooltip';
      tooltip.style.cssText = 'position: absolute; display: none; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none; z-index: 1000;';
      container.appendChild(tooltip);
      
      // Create SVG element with fixed dimensions to match the mockup
      const margin = { top: 20, right: 20, bottom: 50, left: 40 }; // Increased bottom margin
      const svgWidth = 565;
      const svgHeight = 350; // Fixed height
      const width = svgWidth - margin.left - margin.right;
      const height = svgHeight - margin.top - margin.bottom;
    
      // Check if data is not empty
      if (data.length === 0) {
        // We'll replace this with our showEmptyVisualization function
        return showEmptyVisualization(container);
      }
      
      const svg = d3.select(container)
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);
      
      // Add group with margin transform
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Create scales for the visualization
      // Find min/max values for x and y axes with some padding
      let xDomain, yDomain;
      
      if (data.length > 0) {
        const xValues = data.map(d => d.x);
        const yValues = data.map(d => d.y);
        
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        
        // Add padding to the domains
        const xPadding = (xMax - xMin) * 0.1;
        const yPadding = (yMax - yMin) * 0.1;
        
        xDomain = [xMin - xPadding, xMax + xPadding];
        yDomain = [yMin - yPadding, yMax + yPadding];
      } else {
        // Default domain if no data
        xDomain = [-1, 1];
        yDomain = [-1, 1];
        console.log('Using default domain [-1, 1] for empty data set');
      }
      
      const xScale = d3.scaleLinear()
        .domain(xDomain)
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain(yDomain)
        .range([height, 0]);
      
      // Add axes
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
      
      g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));
      
      // Add grid lines
      g.append("g")
        .attr("class", "grid x-grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
          .tickSize(-height)
          .tickFormat("")
        );
      
      g.append("g")
        .attr("class", "grid y-grid")
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("")
        );
      
      // Style the grid
      svg.selectAll(".grid line")
        .style("stroke", "#e0e0e0")
        .style("stroke-opacity", 0.7)
        .style("shape-rendering", "crispEdges");
      
      // Add axis labels
      g.append("text")
        .attr("class", "x-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .text("UMAP Dimension 1");
      
      g.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -30)
        .text("UMAP Dimension 2");
      
      // Helper functions for point attributes
      const getPointColor = (d) => getStandardPointColor(d);
      const getPointRadius = (d) => getStandardPointRadius(d);
      
      // Create links between user sequences and similar sequences
      const links = [];
      
      // For each user sequence, find its similar sequences and create links
      data.filter(d => d.isUserSequence).forEach(userSeq => {
        const similarSeqs = data.filter(d => d.matchesUserSequence === userSeq.id);
        similarSeqs.forEach(similarSeq => {
          links.push({
            source: userSeq,
            target: similarSeq
          });
        });
      });
      
      // Add links (lines) first so they appear behind the points
      g.selectAll("line.similarity-link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "similarity-link")
        .attr("x1", d => xScale(d.source.x))
        .attr("y1", d => yScale(d.source.y))
        .attr("x2", d => xScale(d.target.x))
        .attr("y2", d => yScale(d.target.y))
        .attr("data-source", d => d.source.id)
        .attr("data-target", d => d.target.id)
        .style("stroke", "#999") // Use grey for all similarity lines
        .style("stroke-width", 1)
        .style("stroke-opacity", 0.4);
      
      // Add data points (circles)
      g.selectAll("circle.point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", getPointRadius)
        .attr("data-id", d => d.id)
        .style("fill", getPointColor)
        .style("fill-opacity", 0.7)
        .style("stroke", "none")
        .on("mouseenter", function(event, d) {
          const point = d3.select(this);
          const id = point.attr("data-id");
          console.log("Emergency viz point hover:", id, d);
          
          // Show tooltip with safety checks
          tooltip.style.display = 'block';
          tooltip.innerHTML = formatTooltip(d);
          
          const tooltipWidth = tooltip.offsetWidth || 150;
          const tooltipHeight = tooltip.offsetHeight || 80;
          
          // Position tooltip relative to mouse and container
          const containerRect = container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;
          
          // Position above the point with offset
          tooltip.style.left = (mouseX - tooltipWidth / 2) + 'px';
          tooltip.style.top = (mouseY - tooltipHeight - 10) + 'px';
          
          // Only highlight if not already highlighted
          if (point.style("stroke") !== "#FF5722") {
            point.attr("r", getPointRadius(d) + 2)
              .style("stroke", "#2196F3")
              .style("stroke-width", "2px")
              .style("fill-opacity", 1);
            
            // Highlight connections
            if (id) {
              d3.selectAll(`line[data-source="${id}"], line[data-target="${id}"]`)
                .style("stroke", "#999") // Use grey for consistency
                .style("stroke-width", "1.5px")
                .style("opacity", "0.8");
            }
          }
        })
        .on("mouseleave", function(event, d) {
          const point = d3.select(this);
          const id = point.attr("data-id");
          
          // Hide tooltip with safety checks
          tooltip.style.display = 'none';
          
          // Only unhighlight if not clicked (i.e., if not orange)
          if (point.style("stroke") !== "#FF5722") {
            point.attr("r", getPointRadius(d))
              .style("stroke", "none")
              .style("stroke-width", "0px")
              .style("fill-opacity", 0.7);
            
            // Unhighlight connections
            if (id) {
              d3.selectAll(`line[data-source="${id}"], line[data-target="${id}"]`)
                .style("stroke", "#999")
                .style("stroke-width", "1px")
                .style("opacity", "0.4");
            }
          }
        })
        .on("click", function(event, d) {
          console.log("Emergency viz point clicked:", d);
          
          // Clear existing highlights
          d3.selectAll("circle.point").each(function() {
            const p = d3.select(this);
            const isThisPoint = p.attr("data-id") === d.id;
            
            if (!isThisPoint) {
              const pd = p.datum();
              p.attr("r", getPointRadius(pd))
                .style("stroke", "none")
                .style("stroke-width", "0px")
                .style("fill-opacity", 0.7);
            }
          });
          
          // Toggle highlight for this point
          const point = d3.select(this);
          const isHighlighted = point.style("stroke") === "rgb(255, 87, 34)"; // #FF5722
          
          if (!isHighlighted) {
            point.attr("r", getPointRadius(d) + 2)
              .style("stroke", "#FF5722")
              .style("stroke-width", "2px")
              .style("fill-opacity", 1);
            
            // Highlight connections
            if (d.id) {
              d3.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`)
                .style("stroke", "#FF5722")
                .style("stroke-width", "2px")
                .style("opacity", "0.8");
              
              // Call global highlight function
              highlightSequence(d.id, true);
              
              // Also update details panel with this sequence and its similar sequences
              if (d.isUserSequence) {
                const similarSequences = data.filter(seq => seq.matchesUserSequence === d.id);
                updateDetailsWithSimilarSequences(d, similarSequences);
              }
            }
          } else {
            // Unhighlight if already highlighted
            point.attr("r", getPointRadius(d))
              .style("stroke", "none")
              .style("stroke-width", "0px")
              .style("fill-opacity", 0.7);
            
            // Unhighlight connections
            if (d.id) {
              d3.selectAll(`line[data-source="${d.id}"], line[data-target="${d.id}"]`)
                .style("stroke", "#999")
                .style("stroke-width", "1px")
                .style("opacity", "0.4");
                
              // Call global highlight function to remove highlight
              highlightSequence(d.id, false);
            }
          }
        });
    }
    
    // Return the wrapper object with methods to interact with the visualization
    return {
      container,
      data,
      highlightPoint: (id, highlight) => {
        const point = container.querySelector(`circle[data-id="${id}"]`);
        if (point) {
          setPointHighlight(point, highlight);
        }
      },
      updateScatterPlot: (newData) => createEmergencyVisualization(container, newData)
    };
  } catch (error) {
    return handleError(error, "creating emergency visualization", {
      notify: true,
      severity: 'error',
      fallback: () => {
        // Return a minimal object that won't break code expecting a visualization
        return {
          container,
          data: [],
          highlightPoint: () => {},
          updateScatterPlot: () => {}
        };
      }
    });
  }
}

/**
 * Check if a container has visualization content
 * @param {HTMLElement} container - The container to check
 * @returns {boolean} - True if the container has visualization content
 */
export function hasVisualizationContent(container) {
  if (!container) return false;
  
  // Check if there's an SVG element
  return !!container.querySelector('svg');
}

/**
 * Show an empty state visualization with a message
 * @param {HTMLElement} container - The container to show the empty state in
 * @param {string} message - Primary message to display
 * @param {string} subMessage - Secondary message to display
 * @returns {Object} - Object with methods to maintain API compatibility
 */
export function showEmptyVisualization(container, message = "No data to visualize", subMessage = "Upload a sequence to see it in this visualization") {
  try {
    if (!container) {
      throw new Error("No container provided for empty visualization");
    }
    
    // Clear the container
    container.innerHTML = '';
    
    // Create and add the empty state
    const emptyState = createEmptyState(message, subMessage);
    container.appendChild(emptyState);
    
    // Create an empty SVG to maintain layout and support for grid styling
    const margin = { top: 20, right: 20, bottom: 50, left: 40 };
    const svgWidth = 565;
    const svgHeight = 350;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
    
    const svg = d3.select(container)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);
    
    // Add group with margin transform
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add empty axes with default domain
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(d3.scaleLinear().domain([-1, 1]).range([0, width])))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .text("UMAP Dimension 1");
    
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(d3.scaleLinear().domain([-1, 1]).range([height, 0])))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .text("UMAP Dimension 2");
    
    // Add grid lines
    g.append("g")
      .attr("class", "grid x-grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(d3.scaleLinear().domain([-1, 1]).range([0, width]))
        .tickSize(-height)
        .tickFormat("")
      );
    
    g.append("g")
      .attr("class", "grid y-grid")
      .call(d3.axisLeft(d3.scaleLinear().domain([-1, 1]).range([height, 0]))
        .tickSize(-width)
        .tickFormat("")
      );
    
    // Style the grid
    svg.selectAll(".grid line")
      .style("stroke", "#e0e0e0")
      .style("stroke-opacity", 0.7)
      .style("shape-rendering", "crispEdges");
    
    return {
      container,
      data: [],
      highlightPoint: () => {},
      updateScatterPlot: (newData) => createEmergencyVisualization(container, newData || [])
    };
  } catch (error) {
    handleError(error, "showing empty visualization", {
      notify: false,
      silent: true
    });
    
    // Return a minimal object to maintain API compatibility
    return {
      container,
      data: [],
      highlightPoint: () => {},
      updateScatterPlot: (newData) => {}
    };
  }
}

/**
 * Update visualizations with a new user sequence
 * @param {Object} sequenceData - The user sequence data to add to visualizations
 */
export function updateVisualizationsWithUserSequence(sequenceData) {
  console.log("🔍 DEBUG: Updating visualizations with user sequence", sequenceData);
  
  if (!sequenceData || !sequenceData.coordinates) {
    console.warn("⚠️ WARNING: Invalid user sequence data received", sequenceData);
    return;
  }
  
  try {
    // Get visualization containers
    const userContainer = document.getElementById(ELEMENT_IDS.USER_SCATTER_CONTAINER);
    const refContainer = document.getElementById(ELEMENT_IDS.SCATTER_CONTAINER);
    const mapContainer = document.getElementById(ELEMENT_IDS.MAP_CONTAINER);
    
    // Check if visualization components exist
    if (!userContainer) {
      console.warn("⚠️ WARNING: User visualization container not found");
      return;
    }
    
    // Get existing data from window cache if available
    const cachedData = window.umapDataCache || [];
    
    // Transform data for visualization
    const transformedData = cachedData.map(item => {
      return {
        id: item.accession || `item-${Math.random().toString(36).substr(2, 9)}`,
        x: item.x,
        y: item.y,
        isUserSequence: false,
        isSimilarSequence: false,
        metadata: item.metadata || {}
      };
    });
    
    // Add the new user sequence
    const userSequence = {
      id: sequenceData.accession || `user-${Math.random().toString(36).substr(2, 9)}`,
      x: sequenceData.coordinates.x,
      y: sequenceData.coordinates.y,
      isUserSequence: true,
      isSimilarSequence: false,
      metadata: sequenceData.metadata || {}
    };
    
    // Add user sequence to the data array
    transformedData.push(userSequence);
    
    // Find similar sequences if similarity data is available
    if (sequenceData.similarSequences && sequenceData.similarSequences.length > 0) {
      sequenceData.similarSequences.forEach(similar => {
        // Find the similar sequence in transformed data
        const existingIndex = transformedData.findIndex(item => item.id === similar.accession);
        
        if (existingIndex >= 0) {
          // Mark as similar sequence if found
          transformedData[existingIndex].isSimilarSequence = true;
          transformedData[existingIndex].similarity = similar.similarity || 0;
        } else if (similar.coordinates) {
          // Add as new item if not found but coordinates are available
          transformedData.push({
            id: similar.accession || `similar-${Math.random().toString(36).substr(2, 9)}`,
            x: similar.coordinates.x,
            y: similar.coordinates.y,
            isUserSequence: false,
            isSimilarSequence: true,
            similarity: similar.similarity || 0,
            metadata: similar.metadata || {}
          });
        }
      });
    }
    
    // Update user visualization
    if (window.userVisualization && typeof window.userVisualization.updateData === 'function') {
      console.log("🔍 DEBUG: Updating user visualization with new data");
      window.userVisualization.updateData(transformedData);
    } else {
      console.log("🔍 DEBUG: Creating emergency user visualization with user sequence");
      // Only call createEmergencyVisualization if the container exists and isn't empty
      if (userContainer) {
        createEmergencyVisualization(userContainer, transformedData);
      } else {
        console.warn("⚠️ WARNING: Cannot create emergency visualization - container is null or empty");
      }
    }
    
    // Update reference visualization if available
    if (refContainer && window.refVisualization && typeof window.refVisualization.updateData === 'function') {
      console.log("🔍 DEBUG: Updating reference visualization with new data");
      window.refVisualization.updateData(transformedData);
    }
    
    // Update map if available and sequence has geographic data
    if (mapContainer && window.mapComponent && typeof window.mapComponent.updateData === 'function' && 
        userSequence.metadata && userSequence.metadata.country) {
      console.log("🔍 DEBUG: Updating map with user sequence geographic data");
      window.mapComponent.updateData(transformedData);
    }
    
    // Update details panel with user sequence and similar sequences
    if (typeof updateDetailsWithSimilarSequences === 'function') {
      console.log("🔍 DEBUG: Updating details panel with user sequence and similar sequences");
      const similarSequences = transformedData.filter(item => item.isSimilarSequence);
      updateDetailsWithSimilarSequences(userSequence, similarSequences);
    }
    
    console.log("🔍 DEBUG: Successfully updated visualizations with user sequence");
  } catch (error) {
    handleError(error, "updating visualizations with user sequence", {
      notify: true,
      severity: 'error'
    });
  }
} 