# Phase 2 Implementation Plan: User Sequence Upload and Analysis

This document outlines the detailed implementation plan for Phase 2 of our DNA Mutation Dashboard enhancement, focusing on enabling users to upload and analyze their own DNA sequences.

## 1. Overview

Phase 2 builds upon our existing API integration to allow users to:
- Upload their own FASTA sequence files
- Process these sequences through embedding models
- Visualize their sequences in the context of the database
- Identify and explore similar sequences

## 2. Component Structure

### Completed Components
- ✅ `api-upload-component.js` - FASTA file upload interface
- ✅ `api-job-tracker.js` - Job status tracking system
- ✅ `api-service.js` - Enhanced with sequence analysis endpoints

### Components to Enhance
- ⏳ Dashboard integration - Connect upload workflow to visualization
- 🔜 Visualization components - Display user sequences and similarities
- 🔜 `api-similarity-service.js` - New component for similarity search

## 3. API Endpoint Flow

The complete workflow uses these endpoints in sequence:

1. **Upload Sequence** (`/pathtrack/sequence/embed`)
   - Submit FASTA file for embedding
   - Returns job_id for tracking

2. **Track Job Status** (`/pathtrack/jobs/{job_id}`)
   - Poll until status is "completed"
   - Job result contains embedding_id

3. **Get UMAP Projection** (`/pathtrack/sequence/umap`)
   - POST request with job_id
   - Returns UMAP coordinates for visualization

4. **Get Similar Sequences** (`/pathtrack/sequence/similar`)
   - POST request with job_id and filtering options
   - Returns similar sequences with metadata and similarity scores

5. **Get All Sequences** (`/pathtrack/umap/all`)
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

### Step 4: Visualization Integration 🔜
- Add user sequence marker with distinct styling
- Highlight similar sequences with visual connections
- Update both map and scatter plot components
- Add toggle for showing/hiding similarity connections

### Step 5: UI Enhancements 🔜
- Create similarity panel showing top matches
- Add sequence comparison view
- Implement filtering options for similar sequences
- Add embedding visualization

### Step 6: Advanced Features 🔜
- Implement embedding visualization for detailed analysis
- Add sequence export functionality
- Create history of analyzed sequences
- Enable saving/loading of analysis results

## 5. User Experience Flow

1. **Initial State**
   - Dashboard loads with database sequences
   - Upload button is prominently displayed

2. **Upload Process**
   - User clicks "Upload FASTA Sequence"
   - Upload modal appears with model selection
   - User selects file and submits

3. **Processing State**
   - Job tracker appears showing progress
   - Status updates as embedding and analysis proceed

4. **Results View**
   - User's sequence appears highlighted in visualizations
   - Similar sequences are connected with lines/highlights
   - Similarity panel shows top matches with scores

5. **Interactive Analysis**
   - User can click on similar sequences for comparison
   - Filter options allow refining similarity results
   - "View Embedding Details" button shows embedding visualization

## 6. Implementation Details

### 6.1 State Management

We'll extend the dashboard state to include:
- User sequence data
- Similar sequences array
- Job tracker reference
- Similarity visualization toggle
- Embedding data for visualization

### 6.2 Similarity Search Implementation

The similarity search will:
1. Fetch data from 'all' endpoint
2. Store in JSON format for efficient access
3. When user uploads a sequence:
   - Search in stored JSON data
   - Calculate similarity based on sequence features
   - Return top matches with similarity scores
4. Display results in visualization and similarity panel

### 6.3 Visualization Updates

The visualization components will be enhanced to:
1. Add user sequence with distinct styling
2. Highlight similar sequences
3. Draw connections between user sequence and similar sequences
4. Update details panel with similarity information
5. Provide toggle for showing/hiding similarity connections

### 6.4 Similarity Panel

The similarity panel will:
1. Show list of similar sequences
2. Display similarity scores
3. Include metadata (accession, country, date)
4. Allow clicking to highlight specific sequences
5. Provide filtering and sorting options

### 6.5 Embedding Visualization

The embedding visualization will:
1. Show the embedding vector as a visual representation
2. Provide insight into sequence characteristics
3. Include controls for exploring the embedding
4. Help users understand the basis for similarity calculations

## 7. Component Extensions

### 7.1 Map Component Extensions

We'll extend the map component with these capabilities:
- Add user sequence with distinct styling
- Highlight similar sequences
- Draw connections between user sequence and similar sequences
- Toggle similarity connections visibility

### 7.2 Scatter Plot Extensions

Similarly, we'll extend the scatter plot with:
- Add user sequence with distinct styling
- Highlight similar sequences
- Draw connections between user sequence and similar sequences
- Toggle similarity connections visibility

## 8. UI Controls

We'll add these UI controls to the dashboard:

1. **Similarity Filter**
   - Slider to adjust similarity threshold
   - Only show sequences above threshold

2. **Visualization Controls**
   - Toggle to show/hide similarity connections
   - Option to adjust connection line thickness based on similarity

3. **Embedding Controls**
   - Button to view embedding visualization
   - Controls for exploring embedding dimensions

4. **Export Controls**
   - Button to export analysis results
   - Options for export format (CSV, JSON)

## 9. Testing Strategy

- Test each step of the workflow independently
- Verify correct visualization of user sequences
- Test with various FASTA file formats and sizes
- Ensure error handling for all API requests
- Test performance with multiple similar sequences
- Verify similarity search accuracy and performance

## 10. Success Criteria

Phase 2 will be considered successful when:
- Users can upload FASTA files and see processing progress
- User sequences are properly visualized in both map and scatter plot
- Similar sequences are identified and highlighted
- Users can interact with similar sequences to see details
- The embedding visualization provides insight into sequence characteristics
- The system handles errors gracefully with clear feedback

## 11. Next Steps After Phase 2

- Add advanced filtering and sorting options
- Create sequence export functionality
- Enhance visualization with animations and tooltips
- Optimize performance for large datasets
- Implement additional embedding visualizations

---

Legend:
- ✅ Completed
- ⏳ In progress
- 🔜 Next up
