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

4. **`api-upload-component.js`** - File upload component for sequence analysis ✅
   - Location: `src/components/api/api-upload-component.js`
   - Purpose: Handle FASTA file uploads and model selection

5. **`api-job-tracker.js`** - Job tracking system for sequence analysis ✅
   - Location: `src/components/api/api-job-tracker.js`
   - Purpose: Track status of analysis jobs and provide user feedback

6. **`api-similarity-service.js`** - Service for finding sequence similarities 🔜
   - Location: `src/components/api/api-similarity-service.js`
   - Purpose: Handle similarity calculations and data processing

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

1. **Create File Upload Component** ✅
   - Implement drag-and-drop interface for FASTA files
   - Add file validation (format, size limits)
   - Include model selection dropdown
   - Add upload progress indicator

2. **Implement API Service Enhancements** ✅
   - Add functions for sequence embedding
   - Implement job status checking
   - Add UMAP projection request handling
   - Create similar sequence retrieval

3. **Develop Job Tracking System** ✅
   - Implement job status management
   - Create polling mechanism
   - Add progress indicators
   - Implement event system for status updates

4. **Implement Similarity Search Service** ✅
   - Store 'all' endpoint data in JSON format
   - Implement similarity search against stored data
   - Add visualization of similar sequences
   - Create similarity metrics calculation

5. **Implement UMAP Projection** 🔜
   - Update visualizations to highlight user sequences
   - Add special styling for user-uploaded sequences
   - Implement functions to update visualizations with new data

6. **Enhance User Interface** 🔜
   - Add notifications for job completion
   - Implement error recovery options
   - Create help tooltips for complex features

### Phase 3: Refinement and Advanced Features

This phase polishes the implementation and adds advanced features:

1. **Optimize Performance**
   - **Data Loading Optimization**:
     - Implement progressive loading for large datasets
     - Add pagination support for the 'all' endpoint
     - Implement data streaming for continuous loading
     - Use web workers for processing large datasets without blocking UI
   
   - **Caching Strategy**:
     - Implement tiered caching (memory → IndexedDB → API)
     - Add cache expiration and refresh policies
     - Use service workers for offline capability
     - Implement background refresh of cached data
   
   - **Rendering Optimization**:
     - Use canvas instead of SVG for very large datasets (>10,000 points)
     - Implement data downsampling for overview visualizations
     - Add level-of-detail rendering based on zoom level
     - Use WebGL for hardware-accelerated rendering of large datasets
   
   - **Network Optimization**:
     - Implement request batching for multiple API calls
     - Add compression for API responses
     - Use HTTP/2 for parallel requests
     - Implement retry with exponential backoff for failed requests

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

#### Step 2: Create api-visualizations.js ✅
This file will contain:
- Specialized visualization components for API data ✅
- Custom D3.js visualizations for UMAP data ✅
- Coordinate space mapping for the map component ✅

#### Step 3: Create api-utils.js ✅
This file will provide:
- Helper functions for data processing ✅
- Validation utilities ✅
- Format conversion tools ✅

#### Step 4: Update dashboard.md ✅
We've enhanced the dashboard with:
- Integration with API service for data fetching ✅
- Loading indicators for API requests ✅
- Error handling for API failures ✅
- Explanatory text about UMAP visualization ✅
- Controls for refreshing API data ✅

### Phase 2: User Sequence Upload and Analysis

#### Step 1: Create api-upload-component.js ✅
This file will provide:
- File upload UI with drag-and-drop support
- FASTA file validation
- Model selection options
- Upload progress tracking

#### Step 2: Enhance api-service.js for sequence analysis ✅
We'll add these functions:
- `uploadSequence(file, model)` - Submit sequence to `/pathtrack/sequence/embed`
- `checkJobStatus(jobId)` - Poll `/pathtrack/jobs/{job_id}`
- `getUmapProjection(embeddingId)` - Request projection via `/pathtrack/sequence/umap`
- `getSimilarSequences(embeddingId)` - Get similar sequences via `/pathtrack/sequence/similar`

#### Step 3: Create api-job-tracker.js ✅
This file will handle:
- Job status tracking
- Polling mechanism
- Progress indicators
- Event-based status updates

#### Step 4: Create api-similarity-service.js 🔜
This file will handle:
- Storing 'all' endpoint data in JSON format
- Implementing similarity search against stored data
- Processing similarity results for visualization
- Calculating similarity metrics

#### Step 5: Update api-visualizations.js for user sequences 🔜
We'll add these functions:
- `highlightUserSequence(component, sequence)` - Highlight user sequence
- `showSimilarityConnections(component, userSeq, similarSeqs)` - Show connections
- `createSimilarityTooltip(sequence, similarity)` - Create tooltip for similar sequences

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

## 5. Similarity Search Strategy

We'll implement a new approach for finding similar sequences:

1. **Data Storage**:
   - Fetch data from 'all' endpoint
   - Store in JSON format for efficient access
   - Use this data for both visualization and similarity search

2. **Similarity Calculation**:
   - When user uploads a sequence, search in stored JSON data
   - Calculate similarity based on sequence features
   - Return top matches with similarity scores

3. **Visualization Integration**:
   - Display user sequence alongside reference data
   - Highlight similar sequences with visual indicators
   - Show similarity scores and metadata

## 6. Comprehensive Workflow

The complete user experience will follow this flow:

1. **Initial Load**: ✅
   - Load all UMAP data from `/pathtrack/umap/all` ✅
   - Display in map and scatter plot visualizations ✅
   - Allow exploration of existing sequences ✅
   - Store data in JSON format for similarity search 🔜

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
- Similarity search functionality and accuracy 🔜

## 8. Implementation Timeline

### Phase 1: Load and Visualize All UMAP Data
- **Step 1**: Set up project structure and create basic component files ✅
- **Step 2**: Implement UMAP data fetching and JSONL parsing ✅
- **Step 3**: Develop data transformation and integration with map component ✅
- **Step 4**: Implement scatter plot integration and toggle functionality ✅
- **Step 5**: Add UI controls and test Phase 1 functionality ⏳

### Phase 2: User Sequence Upload and Analysis 🔜
- **Step 1**: Create file upload component and implement submission to API ✅
- **Step 2**: Develop job tracking system and status indicators ✅
- **Step 3**: Implement similarity search service 🔜
- **Step 4**: Add UMAP projection and visualization integration 🔜
- **Step 5**: Implement similarity analysis and highlighting features 🔜
- **Step 6**: Test and refine Phase 2 functionality 🔜

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
- Users can upload their own sequences for analysis ✅
- The system properly processes and visualizes user sequences 🔜
- Similar sequences are identified and displayed 🔜
- Error handling provides clear feedback to users ✅
- The solution works without modifying existing component files ✅

Legend:
- ✅ Completed
- ⏳ In progress
- 🔜 Next up 