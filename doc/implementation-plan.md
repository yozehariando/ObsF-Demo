# DNA Mutation Dashboard - Implementation Plan

This document outlines the comprehensive implementation plan for enhancing the DNA Mutation Dashboard with API integration and sequence analysis features.

## Project Overview

This implementation will enhance the DNA Mutation Dashboard with:
- Integration with the Pathogen Tracking API
- Visualization of DNA sequence UMAP data
- User-uploaded sequence analysis
- Similarity search and comparison
- Advanced visualization tools

## Component Architecture

We'll create these component files to extend functionality without modifying existing components:

1. **`api-service.js`** - Core API integration service ✅
   - Handle API requests, configuration, and data transformation
   - Support all required endpoints and data formats
   - Provide error handling and retry logic

2. **`api-visualizations.js`** - Custom visualizations for API data ✅
   - Provide specialized visualization components for API data
   - Support coordinate transformations and styling

3. **`api-utils.js`** - Utility functions for data processing ✅
   - Process and transform API data
   - Validate input/output formats
   - Handle edge cases

4. **`api-upload-component.js`** - File upload component ✅
   - Handle FASTA file uploads and validation
   - Provide model selection interface
   - Track upload progress

5. **`api-job-tracker.js`** - Job tracking system ✅
   - Track status of asynchronous jobs
   - Provide visual feedback on progress
   - Handle job completion and error states

6. **`api-similarity-service.js`** - Similarity search service ✅
   - Store and index reference sequences
   - Calculate similarity metrics
   - Find and rank similar sequences

7. **`api-user-scatter-component.js`** - User sequence visualization ✅
   - Display user sequences in UMAP space
   - Highlight similar sequences
   - Show connections and relationships

## Phased Development Approach

### Phase 1: Load and Visualize All UMAP Data ✅

**Goal**: Fetch and display the database of DNA sequences in UMAP space.

**Key Features**:
- Fetch data from `/pathtrack/umap/all` endpoint
- Visualize sequences in map and scatter plot
- Add coordinate transformations for UMAP space
- Provide basic filtering and exploration tools

**Implementation Details**:
1. Set up API service with core functionality
2. Implement JSONL parsing for streaming response
3. Add data transformation for visualization format
4. Modify map component to support UMAP coordinate space
5. Update scatter plot to display UMAP data
6. Add basic UI controls for data exploration

### Phase 2: User Sequence Upload and Analysis ✅

**Goal**: Enable users to upload and analyze their own DNA sequences.

**Key Features**:
- Upload FASTA files for analysis
- Visualize user sequences alongside reference data
- Find similar sequences in the database
- Show relationships and similarities

**API Endpoint Flow**:
1. Upload Sequence (`/pathtrack/sequence/embed`) - Submit file, get job_id
2. Track Job Status (`/pathtrack/jobs/{job_id}`) - Poll until complete
3. Get UMAP Projection (`/pathtrack/sequence/umap`) - Get coordinates
4. Calculate Similarities - Find similar sequences in local database
5. Visualize Results - Show user sequence with similar sequences

**Implementation Details**:
1. Create file upload component with model selection
2. Implement job tracking system with status indicators
3. Add UMAP projection and visualization integration
4. Implement similarity search against stored data
5. Update visualizations to highlight user sequences
6. Show connections between similar sequences

### Phase 3: Refinement and Advanced Features 🔜

**Goal**: Polish the user experience and add advanced analytical features.

**Key Features**:
- Performance optimization for large datasets
- Enhanced user interface with animations and tooltips
- Advanced filtering and analysis tools
- Export and sharing functionality

**Implementation Details**:
1. **Performance Optimization**:
   - Implement progressive loading for large datasets
   - Add pagination support for the 'all' endpoint
   - Use web workers for processing without blocking UI
   - Implement tiered caching

2. **UX Enhancements**:
   - Add animations and transitions
   - Improve tooltips and information display
   - Add keyboard shortcuts and accessibility features

3. **Advanced Analysis Tools**:
   - Implement filtering and sorting options
   - Add statistical analysis features
   - Create export and sharing functionality

## Common Implementation Patterns

### API Integration

All API requests will follow this pattern:
1. Configure request with proper headers and authentication
2. Send request with appropriate error handling
3. Transform response data into required format
4. Cache results when appropriate
5. Update visualizations with new data

### Error Handling

Error handling will follow these guidelines:
1. Provide specific error messages for known error types
2. Implement retry logic for transient failures
3. Gracefully degrade functionality when services are unavailable
4. Log errors for debugging purposes
5. Show user-friendly error messages

### Visualization Updates

Visualization updates will follow this pattern:
1. Prepare data in the required format
2. Update scales and domains based on data
3. Use D3.js enter/update/exit pattern for smooth transitions
4. Apply consistent styling based on data attributes
5. Provide interactive elements for exploration

## Testing Strategy

- Unit test each component in isolation
- Integration test the entire workflow
- Test with various API response scenarios
- Test performance with large datasets
- Verify error handling and recovery

## Success Criteria

The implementation will be considered successful when:
- Users can fetch and visualize UMAP data from the API
- Users can upload their own sequences for analysis
- The system properly identifies and visualizes similar sequences
- Performance is acceptable with typical dataset sizes
- The solution works without modifying existing component files

## Future Development Items

The following items from the original development plan are planned for future implementation:

### User Interface Enhancements
- Toggle between geographic and UMAP views in the map component
- Add API configuration panel for customizing API requests
- Implement visualization controls (zoom, filter, etc.)
- Create help tooltips for complex features
- Add similarity panel showing top matches
- Implement sequence comparison view

### Advanced Visualizations
- Create embedding visualization for detailed analysis
- Add visualization of embedding vectors
- Implement dimensionality reduction visualization
- Add visual comparison of multiple sequences
- Create dendrogram visualization of evolutionary relationships

### Data Management
- Add pagination support for the 'all' endpoint
- Implement progressive loading for large datasets
- Create data export functionality for analysis results
- Add saving/loading of user sequences
- Implement history of analyzed sequences

### Performance Optimization
- Use web workers for processing large datasets without blocking UI
- Implement tiered caching (memory → IndexedDB → API)
- Add cache expiration and refresh policies
- Use service workers for offline capability
- Implement data streaming for continuous loading
- Use canvas instead of SVG for very large datasets (>10,000 points)
- Implement data downsampling for overview visualizations
- Add level-of-detail rendering based on zoom level
- Use WebGL for hardware-accelerated rendering of large datasets

### Network Optimization
- Implement request batching for multiple API calls
- Add compression for API responses
- Use HTTP/2 for parallel requests
- Implement retry with exponential backoff for failed requests
- Add background refresh of cached data

### User Experience
- Add animations and transitions
- Improve tooltips and information display
- Add keyboard shortcuts and accessibility features
- Implement filtering and sorting options
- Add statistical analysis features
- Create export and sharing functionality

### In-Depth Sequence Analysis
- Fetch additional sequence details on demand
- Implement advanced filtering options for similar sequences
- Add sequence mutation highlighting
- Create detailed metrics for sequence comparison
- Implement evolutionary analysis tools

## Refinement Plan

The following refinements will be implemented to enhance existing functionality:

### Map Refinements
- **Zoom and Pan**: Add controls to focus on specific regions
- **Time-based Visualization**: Show the spread of sequences over time

### User UMAP Refinements
- Enable uploading multiple FASTA files (maintain upload button after completion)
- Add Reset button to clear all uploaded FASTA files
- **Bi-directional Cross-UMAP Highlighting**: 
  - When a sequence in the User Sequence UMAP panel is clicked, highlight the corresponding sequence in the Reference Database UMAP panel
  - Remove auto-scrolling behavior in details panel
  - Focus interactions between the two UMAP panels, not with the mutations details list
  - Ensure clear visual feedback when sequences are highlighted across panels

### User Interface Refinements
- Improve job tracker styling for better visibility
- Add animation transitions between visualization states
- Polish tooltip formatting and content
- Enhance error messages with more specific guidance

### Job Status & Progress Tracking Refinements
- **Progress Bar Animation**: Fix animation with more reliable DOM updates and transitions
  - Use direct DOM updates for critical progress bar state
  - Ensure progress bar updates even if job tracker component changes
  - Fix "width" styling issues that previously caused stalling
- **Job Status Synchronization**: Enhance status updates between components
  - Fix TypeError in `setupJobPolling` when accessing job tracker methods
  - Add job status persistence between page refreshes using localStorage
  - Implement retry mechanism for job status API failures
  - Add graceful error recovery for orphaned jobs
- **Multiple Job Handling**: Properly manage multiple concurrent jobs
  - Add unique identifier tracking for each job
  - Implement job queue system for handling multiple uploads
  - Fix DOM element conflicts when multiple jobs run concurrently

### Performance Refinements
- Optimize UMAP data loading with chunked responses
- Implement memory management for large datasets
- Add render optimization for scatter plots with many points
- Optimize similarity calculations with spatial indexing

### Similar Sequences UMAP Visualization Refinements
- **Scientific Accuracy Improvements**: Ensure similar sequences are correctly positioned in UMAP space
  - Match similar sequences to the UMAP data cache using **only accession numbers** from metadata
  - Only display sequences with real, verified UMAP coordinates in the visualization
  - Never generate artificial coordinates for similar sequences without real UMAP data
  - Clearly distinguish between sequences with and without UMAP coordinates in the interface
- **Cache Enhancement**: Improve sequence matching in the UMAP data cache
  - Create an efficient lookup index for the UMAP data cache by accession number
  - Implement a fast search algorithm to find exact accession matches
  - Add clear visual documentation explaining that only sequences with real coordinates are shown
  - Include coordinate source information in metadata tooltips
- **Interface Improvements**: Better handle sequences without UMAP coordinates
  - List sequences without UMAP coordinates in the Mutations Details panel only
  - Provide clear visual indication of which sequences have UMAP coordinates
  - Add filtering options to focus on sequences with available coordinates
  - Ensure the user understands why some sequences aren't displayed on the UMAP

### Refined Similar Sequences Workflow

The correct workflow for handling similar sequences is as follows:

1. **Upload sequence** (via `/pathtrack/sequence/embed` endpoint)
   - User uploads FASTA file
   - System returns job_id for tracking

2. **Poll job status** (via `/pathtrack/jobs/{job_id}` endpoint)
   - Check status every few seconds
   - Continue until status is "completed"

3. **Get UMAP projection for user sequence** (via `/pathtrack/sequence/umap` endpoint)
   - Use job_id to fetch UMAP coordinates
   - Place user sequence on UMAP visualization

4. **Get similar sequences** (via `/pathtrack/sequence/similar` endpoint)
   - Use original job_id to fetch similar sequences
   - Similar sequences contain metadata with accession numbers, but no UMAP coordinates

5. **Match similar sequences to UMAP coordinates**
   - Use accession numbers from similar sequences to lookup coordinates in UMAP data cache
   - UMAP data cache comes from the `/pathtrack/umap/all` endpoint
   - Only show sequences on the UMAP visualization if coordinates are found
   - List all similar sequences in the Details panel regardless of coordinate availability

This workflow ensures scientific accuracy by only displaying sequences with real UMAP coordinates while still providing users with a complete list of similar sequences.

### FASTA File Requirements

User-uploaded FASTA files should conform to the following specifications:

- Standard FASTA format with sequence header lines starting with ">"
- Support for both nucleotide (DNA/RNA) and protein sequences
- Recommended maximum file size: 5MB
- Single or multiple sequences per file (multiple sequences will be processed as separate jobs)
- Header line format: should contain identifier information that can be parsed
- Example of a valid FASTA sequence:

```fasta
>NZ_QTIX00000000 Mycobacterium tuberculosis strain XDR1219, South Africa
ATGCCGCGTGAGTGATGAAGGCTTTCGGGTCGTAAAACTCTGTTGTTAGGGAAGAACAAGTGCTAGTTGAATA
AGCTGGCACCTTGACGGTACCTAACCAGAAAGCCACGGCTAACTACGTGCCAGCAGCCGCGGTAATACGTAGG
TGGCAAGCGTTGTCCGGAATTATTGGGCGTAAAGCGCGCGCAGGCGGTTTCTTAAGTCTGATGTGAAAGCCCA
CGGCTCAACCGTGGAGGGTCATTGGAAACTGGGGAACTTGAGTGCAGAAGAGGAAAGTGGAATTCCATGTGTA
GCGGTGAAATGCGCAGAGATATGGAGGAACACCAGTGGCGAAGGCGACTTTCTGGTCTGTAACTGACGCTGAT
GTGCGAAAGCGTGGGGATCAAACAGGGATT
```

These FASTA files are processed through our embedding pipeline to generate embeddings, which are then used for similarity search and UMAP projection.

### Code Quality Refinements
- Improve modularization of long functions
- Add inline documentation for complex algorithms
- Refactor duplicated code into shared utilities
- Implement more robust error boundaries

### Planned Timeline
| Category | Refinements | Target Date |
|----------|-------------|-------------|
| Similar Sequences | Accurate UMAP coordinate matching | Week 1 |
| Similar Sequences | Enhanced cache with accession lookup | Week 1 |
| User UMAP | Multiple file upload & Reset button | Week 2 |
| User UMAP | Cross-UMAP highlighting | Week 3 |
| Map | Zoom/Pan controls & Time-based visualization | Week 4 |
| UI | Job tracker & animations | Week 5 |
| UI | Tooltips & error messages | Week 6 |
| Performance | Data loading & memory mgmt | Week 7 |
| Performance | Rendering & calculations | Week 8 |
| Code | Modularization & documentation | Week 9 |
| Code | Refactoring & error handling | Week 10 | 