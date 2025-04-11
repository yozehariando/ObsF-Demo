# Development Plan for Enhanced API Integration in dashboard.md

This document outlines the development plan for enhancing the API integration in the DNA Mutation Dashboard without modifying existing component files.

## 1. New Component Files

We'll create these new files to extend functionality without modifying existing components:

1. **`api-service.js`** - A new service for enhanced API integration
   - Location: `src/components/api/api-service.js`
   - Purpose: Handle API requests, configuration, and data transformation

2. **`api-visualizations.js`** - Custom visualizations for API data
   - Location: `src/components/api/api-visualizations.js`
   - Purpose: Provide specialized visualization components for API data

3. **`api-utils.js`** - Utility functions specific to API data processing
   - Location: `src/components/api/api-utils.js`
   - Purpose: Provide helper functions for data processing and validation

## 2. Phased Development Approach

We'll implement the enhanced API integration in three distinct phases:

### Phase 1: Load and Visualize All UMAP Data

This phase focuses on fetching and displaying the database of DNA sequences:

1. **Create Basic Component Structure**
   - Set up `api-service.js` with core functionality
   - Set up `api-utils.js` with helper functions
   - Set up `api-visualizations.js` with basic visualization support

2. **Implement UMAP Data Loading**
   - Add function to fetch data from `/pathtrack/umap/all`
   - Implement JSONL parsing for streaming response
   - Add data transformation for visualization format

3. **Enhance Existing Visualizations**
   - Modify map component to support UMAP coordinate space
   - Update scatter plot to display UMAP data
   - Add toggle between geographic and UMAP views

4. **Add UI Controls**
   - Add API configuration panel
   - Implement visualization controls (zoom, filter, etc.)
   - Add explanatory text about UMAP visualization

### Phase 2: User Sequence Upload and Analysis

This phase adds the ability for users to upload and analyze their own sequences:

1. **Implement File Upload**
   - Create file upload component
   - Add model selection options
   - Implement submission to `/pathtrack/sequence/embed`

2. **Add Job Tracking**
   - Implement polling of `/pathtrack/jobs/{job_id}`
   - Create status indicator UI
   - Add error handling and retry functionality

3. **Implement UMAP Projection**
   - Add request to `/pathtrack/sequence/umap`
   - Integrate user sequence into visualizations
   - Implement highlighting for user sequence

4. **Add Similarity Analysis**
   - Implement request to `/pathtrack/sequence/similar`
   - Add similarity visualization features
   - Implement interactive highlighting

### Phase 3: Refinement and Advanced Features

This phase polishes the implementation and adds advanced features:

1. **Optimize Performance**
   - Improve data loading for large datasets
   - Add caching for API responses
   - Optimize visualization rendering

2. **Enhance User Experience**
   - Add animations and transitions
   - Improve tooltips and information display
   - Add keyboard shortcuts and accessibility features

3. **Add Advanced Analysis Tools**
   - Implement filtering and sorting options
   - Add statistical analysis features
   - Create export and sharing functionality

## 3. Implementation Details

### Phase 1: Load and Visualize All UMAP Data

#### Step 1: Create api-service.js
This file will handle:
- Advanced API request configuration
- Multiple endpoint support (focusing on `/pathtrack/umap/all` initially)
- Error handling and retry logic
- Data transformation for visualization

Key functions:
- `configureApiRequest(endpoint, params)` - Configure API requests
- `fetchApiData(config)` - Fetch data from configured API
- `transformApiResponse(data)` - Transform API response for visualization
- `parseUmapData(jsonlData)` - Parse JSONL format UMAP data

#### Step 2: Create api-visualizations.js
This file will contain:
- Specialized visualization components for API data
- Custom D3.js visualizations for UMAP data
- Coordinate space mapping for the map component

Key functions:
- `createUmapVisual(container, data)` - Create visualization for UMAP data
- `updateUmapVisual(container, data)` - Update visualization with new data
- `createUmapLegend(container)` - Create legend for UMAP data visualization
- `configureMapForUmap(mapComponent, data)` - Configure map component to display UMAP coordinates

#### Step 3: Create api-utils.js
This file will provide:
- Helper functions for data processing
- Validation utilities
- Format conversion tools

Key functions:
- `validateUmapResponse(data)` - Validate UMAP response data
- `convertUmapToVisualizationFormat(data)` - Convert UMAP data to format needed by visualizations
- `mergeUmapData(existingData, newData)` - Merge new UMAP data with existing data
- `calculateUmapBounds(data)` - Calculate appropriate bounds for UMAP coordinate space

#### Step 4: Update dashboard.md
We'll enhance the dashboard with:
- New API configuration panel for UMAP data
- Controls for UMAP visualization parameters
- Toggle between geographic and UMAP coordinate space for the map

### Phase 2: User Sequence Upload and Analysis

#### Step 1: Implement File Upload
- Create file upload component with drag-and-drop support
- Add model selection dropdown (DNABERT-S, etc.)
- Implement submission to `/pathtrack/sequence/embed` endpoint

#### Step 2: Add Job Tracking
- Implement polling of `/pathtrack/jobs/{job_id}` endpoint
- Create status indicator UI with progress updates
- Add error handling and retry functionality

#### Step 3: Implement UMAP Projection
- Add request to `/pathtrack/sequence/umap` endpoint
- Integrate user sequence into visualizations
- Implement highlighting for user sequence

#### Step 4: Add Similarity Analysis
- Implement request to `/pathtrack/sequence/similar` endpoint
- Add similarity visualization features
- Implement interactive highlighting

### Phase 3: Refinement and Advanced Features

#### Step 1: Optimize Performance
- Implement lazy loading for large datasets
- Add caching for API responses
- Optimize visualization rendering

#### Step 2: Enhance User Experience
- Add animations and transitions
- Improve tooltips and information display
- Add keyboard shortcuts and accessibility features

#### Step 3: Add Advanced Analysis Tools
- Implement filtering and sorting options
- Add statistical analysis features
- Create export and sharing functionality

## 4. UMAP Visualization Strategy

For the UMAP data from `/pathtrack/umap/all`:

1. **Scatter Plot Visualization**:
   - Use UMAP coordinates directly for X and Y positions
   - Color points based on available metadata (e.g., country if available)
   - Enable clustering visualization of similar DNA sequences

2. **Map Visualization**:
   - Repurpose the map component to show UMAP coordinate space instead of geographic space
   - Use UMAP coordinates directly instead of latitude/longitude
   - Add grid lines and labels to indicate UMAP space
   - Provide toggle between geographic view and UMAP view

3. **Details Panel**:
   - Show sequence hash, accession, first date, and first country
   - Potentially fetch additional sequence details on demand

## 5. Sequence Embedding Feature

We'll add a new feature allowing users to upload and analyze their own DNA sequences:

### 5.1 Upload and Embedding Workflow

1. **File Upload Interface**:
   - Add file upload component for FASTA files
   - Provide model selection options (DNABERT-S, etc.)
   - Include dimension reduction toggle

2. **Embedding Process**:
   - Submit file to `/pathtrack/sequence/embed` endpoint
   - Store job_id for tracking
   - Poll `/pathtrack/jobs/{job_id}` to monitor progress
   - Display status updates to user

3. **UMAP Projection**:
   - Once embedding is complete, request UMAP projection via `/pathtrack/sequence/umap`
   - Retrieve 2D coordinates for visualization
   - Add the user's sequence to the visualization with special highlighting

4. **Similarity Analysis**:
   - Request similar sequences via `/pathtrack/sequence/similar`
   - Display similarity scores and metadata
   - Highlight similar sequences in the visualization

### 5.2 UI Components for Sequence Analysis

1. **Upload Panel**:
   - File input with drag-and-drop support
   - Progress indicator
   - Configuration options

2. **Job Status Tracker**:
   - Visual indicator of current status
   - Step-by-step progress through the workflow
   - Error handling and retry options

3. **Sequence Comparison Panel**:
   - Display user's sequence details
   - Show similar sequences with similarity scores
   - Provide filtering options

### 5.3 Integration with Existing Visualizations

1. **Map and Scatter Plot**:
   - Highlight user's sequence in both visualizations
   - Show similar sequences with visual indicators of similarity
   - Add controls to focus on user's sequence or similar sequences

2. **Details Panel**:
   - Add tab for user's sequence details
   - Include similarity metrics when comparing sequences
   - Provide options to export or share results

### 5.4 Similarity Visualization Techniques

#### Visual Highlighting with Color
- **User's Sequence**: Bright, distinctive color (e.g., bright red or purple)
- **Similar Sequences**: Color gradient based on similarity score
  - More similar = closer to user's sequence color (e.g., 90% similarity = 90% color match)
  - Less similar = fading toward the default color
- **Other Sequences**: Neutral color (gray or light blue)

Implementation:
```javascript
// Apply color highlighting based on similarity
function applyColorHighlighting(userSequenceId, similarSequences) {
  const userColor = "#FF5733";  // Bright orange-red for user sequence
  const defaultColor = "#D3D3D3";  // Light gray for regular sequences
  
  // Highlight user's sequence
  d3.select(`#sequence-${userSequenceId}`)
    .style("fill", userColor)
    .style("stroke", "#000")
    .style("stroke-width", 1.5);
    
  // Highlight similar sequences with gradient based on similarity
  similarSequences.forEach(seq => {
    // Interpolate between user color and default based on similarity
    const similarityColor = d3.interpolate(userColor, defaultColor)(1 - seq.similarity);
    
    d3.select(`#sequence-${seq.id}`)
      .style("fill", similarityColor)
      .style("stroke", "#000")
      .style("stroke-width", 0.5);
  });
}
```

#### Interactive Highlighting
- **Hover Effects**: When hovering over the user's sequence, all similar sequences pulse or glow
- **Selection Effects**: When selecting the user's sequence, draw connecting lines to similar sequences
- **Focus Mode**: Button to toggle "focus mode" that fades out all non-similar sequences

Implementation:
```javascript
// Add interactive highlighting for similar sequences
function setupInteractiveHighlighting(userSequenceId, similarSequences) {
  // When hovering over user sequence
  d3.select(`#sequence-${userSequenceId}`)
    .on("mouseover", function() {
      // Pulse effect for similar sequences
      similarSequences.forEach(seq => {
        d3.select(`#sequence-${seq.id}`)
          .transition()
          .duration(300)
          .attr("r", d => d.radius * 1.5)
          .transition()
          .duration(300)
          .attr("r", d => d.radius);
      });
    });
    
  // When selecting user sequence
  d3.select(`#sequence-${userSequenceId}`)
    .on("click", function() {
      // Clear any existing connection lines
      d3.selectAll(".connection-line").remove();
      
      // Draw connection lines to similar sequences
      const userNode = d3.select(this).node().getBBox();
      const userCenter = {
        x: userNode.x + userNode.width/2,
        y: userNode.y + userNode.height/2
      };
      
      similarSequences.forEach(seq => {
        const simNode = d3.select(`#sequence-${seq.id}`).node().getBBox();
        const simCenter = {
          x: simNode.x + simNode.width/2,
          y: simNode.y + simNode.height/2
        };
        
        // Draw line with opacity based on similarity
        svg.append("line")
          .attr("class", "connection-line")
          .attr("x1", userCenter.x)
          .attr("y1", userCenter.y)
          .attr("x2", simCenter.x)
          .attr("y2", simCenter.y)
          .style("stroke", "#000")
          .style("stroke-width", seq.similarity * 2)
          .style("opacity", seq.similarity);
      });
    });
}
```

## 6. Comprehensive Workflow

The complete user experience will follow this flow:

1. **Initial Load**:
   - Load all UMAP data from `/pathtrack/umap/all`
   - Display in map and scatter plot visualizations
   - Allow exploration of existing sequences

2. **User Sequence Analysis**:
   - User uploads a FASTA file
   - System processes through embedding → UMAP → similarity analysis
   - User's sequence is added to visualizations
   - Similar sequences are highlighted

3. **Interactive Exploration**:
   - Toggle between geographic and UMAP views
   - Select sequences to view details
   - Filter and sort similar sequences
   - Compare user's sequence with database sequences

4. **Results and Export**:
   - View detailed analysis results
   - Export findings or visualizations
   - Save user's sequence for future reference

## 7. Testing Strategy

- Test each new component in isolation
- Verify integration with existing components
- Test with various API response scenarios
- Ensure error handling works properly

Test cases:
- Successful API requests with UMAP data
- Failed API requests with appropriate error handling
- Integration with existing map and scatter plot components
- Performance with large UMAP datasets
- Correct visualization of UMAP coordinate space
- Complete sequence upload and analysis workflow

## 8. Implementation Timeline

### Phase 1: Load and Visualize All UMAP Data
- **Step 1**: Set up project structure and create basic component files
- **Step 2**: Implement UMAP data fetching and JSONL parsing
- **Step 3**: Develop data transformation and integration with map component
- **Step 4**: Implement scatter plot integration and toggle functionality
- **Step 5**: Add UI controls and test Phase 1 functionality

### Phase 2: User Sequence Upload and Analysis
- **Step 1**: Create file upload component and implement submission to API
- **Step 2**: Develop job tracking system and status indicators
- **Step 3**: Implement UMAP projection and visualization integration
- **Step 4**: Add similarity analysis and highlighting features
- **Step 5**: Test and refine Phase 2 functionality

### Phase 3: Refinement and Advanced Features
- **Step 1**: Optimize performance for large datasets
- **Step 2**: Enhance user experience with animations and improved tooltips
- **Step 3**: Implement advanced analysis tools and filtering options
- **Step 4**: Add export and sharing functionality
- **Step 5**: Final testing, bug fixes, and documentation

## 9. Success Criteria

The implementation will be considered successful when:
- Users can fetch UMAP data from the API
- UMAP data is properly visualized in both the scatter plot and map components
- Users can toggle between geographic and UMAP views in the map component
- Users can upload their own sequences for analysis
- The system properly processes and visualizes user sequences
- Similar sequences are identified and displayed
- Error handling provides clear feedback to users
- The solution works without modifying existing component files 