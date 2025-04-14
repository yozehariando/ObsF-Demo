# Phase 2 Implementation Plan: User Sequence Upload and Analysis

This document outlines the detailed implementation plan for Phase 2 of our DNA Mutation Dashboard enhancement, focusing on enabling users to upload and analyze their own DNA sequences.

## 1. Overview

Phase 2 builds upon our existing API integration to allow users to:
- Upload their own FASTA sequence files ✅
- Process these sequences through embedding models ✅
- Visualize their sequences in the context of the database ✅
- Identify and explore similar sequences ✅

## 2. Component Structure

### Completed Components
- ✅ `api-upload-component.js` - FASTA file upload interface
- ✅ `api-job-tracker.js` - Job status tracking system
- ✅ `api-service.js` - Enhanced with sequence analysis endpoints
- ✅ `api-similarity-service.js` - Service for similarity search
- ✅ `api-user-scatter-component.js` - Dedicated user sequence scatter plot

### Components to Enhance
- ✅ Dashboard integration - Connect upload workflow to visualization
- ✅ Visualization components - Display user sequences and similarities
- ✅ Progress bar animation - Fixed the progress indicator during job processing

## 3. API Endpoint Flow

The complete workflow uses these endpoints in sequence:

1. **Upload Sequence** (`/pathtrack/sequence/embed`) ✅
   - Submit FASTA file for embedding
   - Returns job_id for tracking

2. **Track Job Status** (`/pathtrack/jobs/{job_id}`) ✅
   - Poll until status is "completed"
   - Job result contains embedding_id

3. **Get UMAP Projection** (`/pathtrack/sequence/umap`) ✅
   - POST request with job_id
   - Returns UMAP coordinates for visualization

4. **Get Similar Sequences** ✅
   - Use stored data from 'all' endpoint for local similarity calculations
   - Calculate similarity based on UMAP coordinates

5. **Get All Sequences** (`/pathtrack/umap/all`) ✅
   - GET request to retrieve all sequences
   - Store in JSON format for similarity search

## 4. Implementation Steps

### Step 1: Complete Upload Workflow ✅
- ✅ Create upload modal with model selection
- ✅ Implement file validation and processing
- ✅ Connect to API for sequence submission
- ✅ Implement job tracking system

### Step 2: Implement Similarity Search ✅
- ✅ Create `api-similarity-service.js` to:
  - ✅ Fetch and store data from 'all' endpoint
  - ✅ Implement similarity search against stored data
  - ✅ Process and format similarity results
  - ✅ Provide interface for visualization components

### Step 3: Results Processing ✅
- ✅ Create `api-results-processor.js` to:
  - ✅ Process UMAP projection data
  - ✅ Format similar sequences data
  - ✅ Generate details panel HTML
  - ✅ Prepare visualization updates

### Step 4: Visualization Integration ✅
- ✅ Add user sequence marker with distinct styling
- ✅ Highlight similar sequences with visual connections
- ✅ Update both map and scatter plot components
- ✅ Add toggle for showing/hiding similarity connections
- ✅ Fix job polling mechanism to properly handle job completion and update progress bar

### Step 5: UI Enhancements ⏳
- ⏳ Create similarity panel showing top matches
- ⏳ Add sequence comparison view
- 🔜 Implement filtering options for similar sequences
- 🔜 Add embedding visualization

### Step 6: Advanced Features 🔜
- 🔜 Implement embedding visualization for detailed analysis
- 🔜 Add sequence export functionality
- 🔜 Create history of analyzed sequences
- 🔜 Enable saving/loading of analysis results

## 5. User Experience Flow

1. **Initial State** ✅
   - Dashboard loads with database sequences
   - Upload button is prominently displayed

2. **Upload Process** ✅
   - User clicks "Upload FASTA Sequence"
   - Upload modal appears with model selection
   - User selects file and submits

3. **Processing State** ✅
   - Job tracker appears showing progress
   - Status updates as embedding and analysis proceed
   - Progress bar animates to indicate activity
   - Status text updates with current processing stage

4. **Results View** ✅
   - User's sequence appears highlighted in visualizations
   - Similar sequences are connected with lines/highlights
   - Similarity panel shows top matches with scores

5. **Interactive Analysis** ✅
   - User can click on similar sequences for comparison
   - Filter options allow refining similarity results
   - "View Embedding Details" button shows embedding visualization

## 6. Implementation Details

### 6.1 State Management ✅

We've extended the dashboard state to include:
- User sequence data
- Similar sequences array
- Job tracker reference
- Similarity visualization toggle
- Embedding data for visualization

### 6.2 Similarity Search Implementation ✅

We've implemented the similarity search to:
1. Fetch data from 'all' endpoint
2. Store in JSON format for efficient access
3. When user uploads a sequence:
   - Get UMAP projection
   - Search through local data based on UMAP coordinates
   - Calculate similarity using Euclidean distance
   - Return top matches with similarity scores
4. Display results in visualization and similarity panel

### 6.3 Visualization Updates ✅

We've enhanced the visualization components to:
1. Add user sequence with distinct styling
2. Highlight similar sequences
3. Draw connections between user sequence and similar sequences
4. Update details panel with similarity information
5. Provide toggle for showing/hiding similarity connections

### 6.4 Similarity Panel ⏳

We're working on a similarity panel that will:
1. Show list of similar sequences
2. Display similarity scores
3. Include metadata (accession, country, date)
4. Allow clicking to highlight specific sequences
5. Provide filtering and sorting options

### 6.5 Embedding Visualization 🔜

We're planning an embedding visualization that will:
1. Show the embedding vector as a visual representation
2. Provide insight into sequence characteristics
3. Include controls for exploring the embedding
4. Help users understand the basis for similarity calculations

## 7. Progress Bar Implementation ✅

We've successfully implemented a floating progress tracker that:

1. Appears in the bottom right corner during sequence processing
2. Shows smooth animation to indicate progress
3. Displays current status and processing stage
4. Updates text based on the current operation
5. Changes color to indicate success or failure
6. Auto-hides when processing is complete

## 8. Testing Strategy

- ✅ Test each step of the workflow independently
- ✅ Verify correct visualization of user sequences
- ✅ Test with various FASTA file formats and sizes
- ✅ Ensure error handling for all API requests
- ✅ Test performance with multiple similar sequences
- ✅ Verify similarity search accuracy and performance
- ✅ Test progress bar animation and status updates

## 9. Success Criteria

Phase 2 will be considered successful when:
- ✅ Users can upload FASTA files and see processing progress
- ✅ User sequences are properly visualized in both map and scatter plot
- ✅ Similar sequences are identified and highlighted
- ✅ Users can interact with similar sequences to see details
- ⏳ The embedding visualization provides insight into sequence characteristics
- ✅ The system handles errors gracefully with clear feedback
- ✅ Progress bar properly animates and shows current status

## 10. Next Steps After Phase 2

- 🔜 Add advanced filtering and sorting options
- 🔜 Create sequence export functionality
- 🔜 Enhance visualization with animations and tooltips
- 🔜 Optimize performance for large datasets
- 🔜 Implement additional embedding visualizations

---

Legend:
- ✅ Completed
- ⏳ In progress
- 🔜 Next up
