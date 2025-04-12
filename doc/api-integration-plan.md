# Development Plan for Enhanced API Integration in dashboard.md

This document outlines the development plan for enhancing the API integration in the DNA Mutation Dashboard without modifying existing component files.

## 1. New Component Files

We'll create these new files to extend functionality without modifying existing components:

1. **`api-service.js`** - A new service for enhanced API integration ✅
   - Location: `src/components/api/api-service.js`
   - Purpose: Handle API requests, configuration, and data transformation

2. **`api-visualizations.js`** - Custom visualizations for API data ✅
   - Location: `src/components/api/api-visualizations.js`
   - Purpose: Provide specialized visualization components for API data

3. **`api-utils.js`** - Utility functions specific to API data processing ✅
   - Location: `src/components/api/api-utils.js`
   - Purpose: Provide helper functions for data processing and validation

## 2. Phased Development Approach

We'll implement the enhanced API integration in three distinct phases:

### Phase 1: Load and Visualize All UMAP Data

This phase focuses on fetching and displaying the database of DNA sequences:

1. **Create Basic Component Structure** ✅
   - Set up `api-service.js` with core functionality ✅
   - Set up `api-utils.js` with helper functions ✅
   - Set up `api-visualizations.js` with basic visualization support ✅

2. **Implement UMAP Data Loading** ✅
   - Add function to fetch data from `/pathtrack/umap/all` ✅
   - Implement JSONL parsing for streaming response ✅
   - Add data transformation for visualization format ✅

3. **Enhance Existing Visualizations** ✅
   - Modify map component to support UMAP coordinate space ✅
   - Update scatter plot to display UMAP data ✅
   - Add toggle between geographic and UMAP views ⏳

4. **Add UI Controls** ⏳
   - Add API configuration panel ⏳
   - Implement visualization controls (zoom, filter, etc.) ⏳
   - Add explanatory text about UMAP visualization ✅

### Phase 2: User Sequence Upload and Analysis

This phase adds the ability for users to upload and analyze their own sequences:

1. **Implement File Upload** 🔜
   - Create file upload component
   - Add model selection options
   - Implement submission to `/pathtrack/sequence/embed`

2. **Add Job Tracking** 🔜
   - Implement polling of `/pathtrack/jobs/{job_id}`
   - Create status indicator UI
   - Add error handling and retry functionality

3. **Implement UMAP Projection** 🔜
   - Add request to `/pathtrack/sequence/umap`
   - Integrate user sequence into visualizations
   - Implement highlighting for user sequence

4. **Add Similarity Analysis** 🔜
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

#### Step 1: Create api-service.js ✅
This file will handle:
- Advanced API request configuration ✅
- Multiple endpoint support (focusing on `/pathtrack/umap/all` initially) ✅
- Error handling and retry logic ✅
- Data transformation for visualization ✅

Key functions:
- `configureApiRequest(endpoint, params)` - Configure API requests ✅
- `fetchApiData(config)` - Fetch data from configured API ✅
- `transformApiResponse(data)` - Transform API response for visualization ✅
- `parseUmapData(jsonlData)` - Parse JSONL format UMAP data ✅

#### Step 2: Create api-visualizations.js ✅
This file will contain:
- Specialized visualization components for API data ✅
- Custom D3.js visualizations for UMAP data ✅
- Coordinate space mapping for the map component ✅

Key functions:
- `configureMapForUmap(mapComponent, data)` - Configure map component to display UMAP coordinates ✅
- `updateScatterPlotWithUmap(scatterComponent, data)` - Update scatter plot with UMAP data ✅
- `createUmapTooltip(point)` - Create tooltip for UMAP data points ✅
- `addUmapGridToMap(mapComponent, bounds)` - Add grid lines to indicate UMAP space ✅

#### Step 3: Create api-utils.js ✅
This file will provide:
- Helper functions for data processing ✅
- Validation utilities ✅
- Format conversion tools ✅

Key functions:
- `validateUmapResponse(data)` - Validate UMAP response data ✅
- `calculateUmapBounds(data)` - Calculate appropriate bounds for UMAP coordinate space ✅
- `mergeUmapData(existingData, newData)` - Merge new UMAP data with existing data ✅
- `groupUmapDataBy(data, property)` - Group UMAP data by a property ✅

#### Step 4: Update dashboard.md ✅
We've enhanced the dashboard with:
- Integration with API service for data fetching ✅
- Loading indicators for API requests ✅
- Error handling for API failures ✅
- Explanatory text about UMAP visualization ✅
- Controls for refreshing API data ✅

### Phase 2: User Sequence Upload and Analysis

#### Step 1: Implement File Upload 🔜
- Create file upload component with drag-and-drop support
- Add model selection dropdown (DNABERT-S, etc.)
- Implement submission to `/pathtrack/sequence/embed` endpoint

#### Step 2: Add Job Tracking 🔜
- Implement polling of `/pathtrack/jobs/{job_id}` endpoint
- Create status indicator UI with progress updates
- Add error handling and retry functionality

#### Step 3: Implement UMAP Projection 🔜
- Add request to `/pathtrack/sequence/umap` endpoint
- Integrate user sequence into visualizations
- Implement highlighting for user sequence

#### Step 4: Add Similarity Analysis 🔜
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

1. **Scatter Plot Visualization**: ✅
   - Use UMAP coordinates directly for X and Y positions ✅
   - Color points based on available metadata (e.g., country if available) ✅
   - Enable clustering visualization of similar DNA sequences ✅

2. **Map Visualization**: ✅
   - Repurpose the map component to show UMAP coordinate space instead of geographic space ✅
   - Use UMAP coordinates directly instead of latitude/longitude ✅
   - Add grid lines and labels to indicate UMAP space ✅
   - Provide toggle between geographic view and UMAP view ⏳

3. **Details Panel**: ✅
   - Show sequence hash, accession, first date, and first country ✅
   - Potentially fetch additional sequence details on demand ⏳

## 5. Sequence Embedding Feature

We'll add a new feature allowing users to upload and analyze their own DNA sequences:

### 5.1 Upload and Embedding Workflow

1. **File Upload Interface**: 🔜
   - Add file upload component for FASTA files
   - Provide model selection options (DNABERT-S, etc.)
   - Include dimension reduction toggle

2. **Embedding Process**: 🔜
   - Submit file to `/pathtrack/sequence/embed` endpoint
   - Store job_id for tracking
   - Poll `/pathtrack/jobs/{job_id}` to monitor progress
   - Display status updates to user

3. **UMAP Projection**: 🔜
   - Once embedding is complete, request UMAP projection via `/pathtrack/sequence/umap`
   - Retrieve 2D coordinates for visualization

4. **Similarity Analysis**: 🔜
   - Request similar sequences via `/pathtrack/sequence/similar`
   - Display similarity scores and highlight similar sequences
   - Allow interactive exploration of similar sequences

### 5.2 Visualization Integration

1. **Highlight User Sequence**: 🔜
   - Display user's sequence with distinct styling
   - Position in UMAP space based on projection

2. **Show Similar Sequences**: 🔜
   - Highlight sequences similar to user's sequence
   - Use visual cues (e.g., connecting lines) to show relationships
   - Color-code by similarity score

3. **Update Details Panel**: 🔜
   - Show detailed comparison between user sequence and selected similar sequence
   - Display similarity metrics and relevant metadata

## 6. Comprehensive Workflow

The complete user experience will follow this flow:

1. **Initial Load**: ✅
   - Load all UMAP data from `/pathtrack/umap/all` ✅
   - Display in map and scatter plot visualizations ✅
   - Allow exploration of existing sequences ✅

2. **User Sequence Analysis**: 🔜
   - User uploads a FASTA file
   - System processes through embedding → UMAP → similarity analysis
   - User's sequence is added to visualizations
   - Similar sequences are highlighted

3. **Interactive Exploration**: ⏳
   - Toggle between geographic and UMAP views ⏳
   - Select sequences to view details ✅
   - Filter and sort similar sequences 🔜
   - Compare user's sequence with database sequences 🔜

4. **Results and Export**: 🔜
   - View detailed analysis results
   - Export findings or visualizations
   - Save user's sequence for future reference

## 7. Testing Strategy

- Test each new component in isolation
- Verify integration with existing components
- Test with various API response scenarios
- Ensure error handling works properly

Test cases:
- Successful API requests with UMAP data ✅
- Failed API requests with appropriate error handling ✅
- Integration with existing map and scatter plot components ✅
- Performance with large UMAP datasets ✅
- Correct visualization of UMAP coordinate space ✅
- Complete sequence upload and analysis workflow 🔜

## 8. Implementation Timeline

### Phase 1: Load and Visualize All UMAP Data
- **Step 1**: Set up project structure and create basic component files ✅
- **Step 2**: Implement UMAP data fetching and JSONL parsing ✅
- **Step 3**: Develop data transformation and integration with map component ✅
- **Step 4**: Implement scatter plot integration and toggle functionality ✅
- **Step 5**: Add UI controls and test Phase 1 functionality ⏳

### Phase 2: User Sequence Upload and Analysis 🔜
- **Step 1**: Create file upload component and implement submission to API 🔜
- **Step 2**: Develop job tracking system and status indicators 🔜
- **Step 3**: Implement UMAP projection and visualization integration 🔜
- **Step 4**: Add similarity analysis and highlighting features 🔜
- **Step 5**: Test and refine Phase 2 functionality 🔜

### Phase 3: Refinement and Advanced Features
- **Step 1**: Optimize performance for large datasets
- **Step 2**: Enhance user experience with animations and improved tooltips
- **Step 3**: Implement advanced analysis tools and filtering options
- **Step 4**: Add export and sharing functionality
- **Step 5**: Final testing, bug fixes, and documentation

## 9. Success Criteria

The implementation will be considered successful when:
- Users can fetch UMAP data from the API ✅
- UMAP data is properly visualized in both the scatter plot and map components ✅
- Users can toggle between geographic and UMAP views in the map component ⏳
- Users can upload their own sequences for analysis 🔜
- The system properly processes and visualizes user sequences 🔜
- Similar sequences are identified and displayed 🔜
- Error handling provides clear feedback to users ✅
- The solution works without modifying existing component files ✅

Legend:
- ✅ Completed
- ⏳ In progress
- 🔜 Next up 