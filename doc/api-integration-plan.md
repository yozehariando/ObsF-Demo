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

4. **`api-upload-component.js`** - File upload component for sequence analysis 🔜
   - Location: `src/components/api/api-upload-component.js`
   - Purpose: Handle FASTA file uploads and model selection

5. **`api-job-tracker.js`** - Job tracking system for sequence analysis 🔜
   - Location: `src/components/api/api-job-tracker.js`
   - Purpose: Track status of analysis jobs and provide user feedback

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

#### Development Plan for Phase 2

##### Step 1: Create File Upload Component
1. Create `api-upload-component.js` with:
   - Drag-and-drop interface for FASTA files
   - File validation (format, size limits)
   - Model selection dropdown (DNABERT-S, etc.)
   - Upload progress indicator
   - Error handling for invalid files

2. Connect to dashboard:
   - Replace current CSV upload with FASTA upload
   - Update "Upload" button functionality
   - Add modal dialog for upload options

##### Step 2: Implement API Service Enhancements
1. Add new functions to `api-service.js`:
   - `uploadSequence(file, model)` - Submit to `/pathtrack/sequence/embed`
   - `checkJobStatus(jobId)` - Poll `/pathtrack/jobs/{job_id}`
   - `getUmapProjection(embeddingId)` - Request via `/pathtrack/sequence/umap`
   - `getSimilarSequences(embeddingId)` - Get via `/pathtrack/sequence/similar`

2. Implement error handling:
   - Retry logic for failed requests
   - Timeout handling for long-running jobs
   - Validation of API responses

##### Step 3: Develop Job Tracking System
1. Create `api-job-tracker.js` with:
   - Job status management
   - Polling mechanism with configurable intervals
   - Progress indicators for multi-step processes
   - Event system for status updates

2. Add UI components:
   - Status panel showing current job state
   - Progress indicators for each step
   - Error messages and retry options

##### Step 4: Implement UMAP Projection
1. Add visualization enhancements:
   - Update `api-visualizations.js` to highlight user sequences
   - Implement special styling for user-uploaded sequences
   - Add functions to update visualizations with new data

2. Create projection integration:
   - Process UMAP projection results
   - Merge with existing visualization data
   - Update both map and scatter plot

##### Step 5: Add Similarity Analysis
1. Implement similarity visualization:
   - Add functions to show connections between similar sequences
   - Create visual indicators of similarity strength
   - Implement interactive highlighting

2. Enhance details panel:
   - Show similarity metrics
   - Display sequence comparisons
   - Add filtering and sorting options

##### Step 6: Enhance User Interface
1. Improve feedback mechanisms:
   - Add notifications for job completion
   - Implement error recovery options
   - Create help tooltips for complex features

2. Add result management:
   - Export functionality for analysis results
   - Save/load options for user sequences
   - History of previous analyses

#### General Flow for Phase 2

##### User Perspective Flow

1. **Initial State**
   - User arrives at dashboard with existing UMAP data loaded
   - Visualizations show database sequences
   - Upload button is available in control panel

2. **Sequence Upload**
   - User clicks "Upload" button
   - File upload modal appears with:
     - Drag-and-drop area or file browser button
     - Model selection dropdown
     - Upload button
   - User selects FASTA file and model, then clicks upload

3. **Processing Feedback**
   - System shows loading indicator
   - Job status panel appears showing:
     - Current step (Embedding → UMAP Projection → Similarity Analysis)
     - Progress indicator
     - Estimated time remaining (if available)

4. **Results Visualization**
   - When processing completes:
     - User's sequence appears highlighted in visualizations
     - Similar sequences are visually connected to user's sequence
     - Details panel updates with user sequence information
     - Similarity panel shows top similar sequences

5. **Interactive Exploration**
   - User can:
     - Click on similar sequences to see detailed comparison
     - Filter similar sequences by similarity score
     - Toggle visualization options
     - Export results for further analysis

##### Technical Flow

1. **File Upload Process**
   ```
   User → Upload UI → File Validation → API Request → Job ID Returned
   ```

2. **Job Tracking Process**
   ```
   Job ID → Polling Loop → Status Updates → UI Feedback → Completion
   ```

3. **Data Processing Pipeline**
   ```
   FASTA File → Embedding → UMAP Projection → Similarity Analysis → Visualization
   ```

4. **API Interaction Sequence**
   ```
   POST /pathtrack/sequence/embed → GET /pathtrack/jobs/{job_id} → 
   GET /pathtrack/sequence/umap → GET /pathtrack/sequence/similar
   ```

5. **Visualization Update Flow**
   ```
   User Data → Transform → Merge with Existing Data → Update Visualizations → Highlight Relationships
   ```

##### State Management

Throughout this flow, the application will maintain these key states:

1. **Upload State**: `idle` → `validating` → `uploading` → `uploaded`
2. **Job State**: `queued` → `processing` → `completed` | `failed`
3. **Analysis State**: `embedding` → `projecting` → `finding_similar` → `complete`
4. **UI State**: Controls which panels and visualizations are shown

##### Error Handling

The flow includes error handling at each step:

1. **Upload Errors**: File too large, invalid format, network issues
2. **Job Errors**: Job failed, timeout, server errors
3. **Analysis Errors**: Processing errors, invalid results
4. **Visualization Errors**: Data format issues, rendering problems

Each error will trigger appropriate user feedback and recovery options.

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

#### Step 1: Create api-upload-component.js 🔜
This file will provide:
- File upload UI with drag-and-drop support
- FASTA file validation
- Model selection options
- Upload progress tracking

Key functions:
- `createUploadModal()` - Create upload modal dialog
- `validateFastaFile(file)` - Validate FASTA file format
- `handleFileUpload(file, model)` - Process file upload
- `showUploadProgress(progress)` - Display upload progress

#### Step 2: Enhance api-service.js for sequence analysis 🔜
We'll add these functions:
- `uploadSequence(file, model)` - Submit sequence to `/pathtrack/sequence/embed`
- `checkJobStatus(jobId)` - Poll `/pathtrack/jobs/{job_id}`
- `getUmapProjection(embeddingId)` - Request projection via `/pathtrack/sequence/umap`
- `getSimilarSequences(embeddingId)` - Get similar sequences via `/pathtrack/sequence/similar`

#### Step 3: Create api-job-tracker.js 🔜
This file will handle:
- Job status tracking
- Polling mechanism
- Progress indicators
- Event-based status updates

Key functions:
- `createJobTracker(jobId)` - Create job tracking instance
- `startPolling(interval)` - Begin polling for job status
- `updateJobStatus(status)` - Update job status and UI
- `onJobComplete(callback)` - Register completion callback

#### Step 4: Update api-visualizations.js for user sequences 🔜
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