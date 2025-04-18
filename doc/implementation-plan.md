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
- Code refactoring and modularization

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

4. **Code Refactoring and Modularization**: ⏳
   - Break down dashboard.md into smaller, focused modules ⏳
   - Introduce dashboard-new.md as the target for refactored code ✅
   - Move functions to appropriate modules based on their functionality ⏳
   - Implement proper ES6 import/export system ✅
   - Ensure all functionality works in both original and new dashboard files

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

### Code Refactoring Strategy ⏳

We are currently refactoring the large `dashboard.md` file into smaller, more maintainable modules. The refactoring approach follows this pattern:

1. **Extract Core Functionality into Modules** ✅
   - Break the monolithic dashboard.md into smaller, focused files ✅
   - Leverage existing components where possible ✅
   - Improve maintainability and readability ✅
   - Create dashboard-new.md as the target for our refactored implementation ✅

2. **Current Refactoring Status**
   - **Completed Modules** ✅
     - `utils/debug-utils.js` - Debugging utilities for UMAP data cache inspection
     - `utils/dom-utils.js` - DOM manipulation helpers
     - `data-processing/sequence-matcher.js` - Improved sequence matching functions
     - `data-processing/cache-manager.js` - Enhanced UMAP data cache management with centralized state
     - `data-processing/debug-integration.js` - Centralized debug utility registration
     - `data-processing/coordinate-mapper.js` - Coordinate transformation utilities
     - `visualization/point-styler.js` - Point styling and color functions
     - `visualization/legend-builder.js` - Legend creation and management
     - `visualization/umap-visualization.js` - Emergency visualization function
     - `visualization/tooltip-formatter.js` - Enhanced tooltip formatting and display
     - `ui-components/details-panel.js` - Details panel with similar sequences
     - `ui-components/hover-effects.js` - Hover interaction effects
     - `ui-components/highlight-manager.js` - Sequence highlighting functionality

   - **In-Progress Integration** ⏳
     - `dashboard-new.md` - Integrating all modules into a cohesive dashboard implementation

3. **Integration with Existing Components** ⏳
   - `api-user-scatter-component.js`: Integration complete for visualization ✅
   - `api-service.js`: Cache integration completed for API calls ✅
   - `data-service.js`: Integration in progress for data processing
   - Working on connecting remaining event handlers and interactive features

4. **Styling Improvements** 🔜
   - Move inline styles to separate CSS files
   - Create a consistent theme system
   - Use CSS variables for better maintainability

5. **Implementation Sequence**
   - Extract core visualization functions ✅
   - Move data processing functions ✅
   - Extract UI components ✅
   - Update dashboard-new.md to use new modules ⏳

6. **Dashboard Transition Strategy**
   - Keep dashboard.md functional throughout the refactoring process ✅
   - Create dashboard-new.md as the target for refactored code ✅
   - Import all extracted modules into dashboard-new.md ✅
   - Complete cache management integration ✅
   - Finalize event handler connections ⏳
   - Ensure feature parity between both implementations ⏳
   - Once fully tested, make dashboard-new.md the primary implementation 🔜

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
  - Match similar sequences to the UMAP data cache using **only accession numbers** from metadata ✅
  - Only display sequences with real, verified UMAP coordinates in the visualization ✅
  - Never generate artificial coordinates for similar sequences without real UMAP data ✅
  - Clearly distinguish between sequences with and without UMAP coordinates in the interface
- **Cache Enhancement**: Improve sequence matching in the UMAP data cache
  - Create an efficient lookup index for the UMAP data cache by accession number ✅
  - Implement a fast search algorithm to find exact accession matches ✅
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
   - Use accession numbers from similar sequences to lookup coordinates in UMAP data cache ✅
   - UMAP data cache comes from the `/pathtrack/umap/all` endpoint
   - Only show sequences on the UMAP visualization if coordinates are found ✅
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
- Improve modularization of long functions ⏳
- Add inline documentation for complex algorithms ✅
- Refactor duplicated code into shared utilities ⏳
- Implement more robust error boundaries ✅

### Recent Code Quality Improvements
- ✅ Created central error-handler.js utility module with robust error handling capabilities
- ✅ Fixed module import error with dashboard-new.md by implementing missing dependencies
- ✅ Standardized error reporting patterns across all components
- ✅ Added user-friendly error notifications through the error-handler module
- ✅ Implemented fallback mechanisms for critical component failures
- ✅ Enhanced debugging capabilities with detailed error context information

### Current Issues in dashboard-new.md
- 🔍 Blank panels issue: Data is correctly loaded (7889 sequences) but not displayed in visualizations
- 🔍 Analysis shows data flow differences between dashboard.md and dashboard-new.md:
  - In dashboard.md: Direct DOM manipulation with D3.js for initial visualization (not cache-dependent)
  - In dashboard-new.md: Trying to use cache for initial visualization instead of direct initialization
- 🔍 The umapDataCache is properly initialized but not correctly passed to createUmapScatterPlot
- 🔍 Debug utilities and fallback mechanisms have been added to dashboard-new.md without modifying dashboard.md
- 🔍 Solution approach: Need to implement direct D3.js visualization on component initialization similar to dashboard.md

### Dashboard-new.md Fix Plan (Priority Task)

We've created a detailed plan to fix the visualization initialization issues in dashboard-new.md permanently:

1. **Direct Initialization** ⏳
   - Create visualizations with sample/empty data during initialization
   - Don't wait for cache data to be ready before showing basic structure
   - Initialize all three containers (map, scatter, user-scatter) with D3.js directly

2. **Decoupled Cache Loading** ⏳
   - Separate visualization initialization from cache loading
   - Load cache in background without blocking visualization
   - Update visualizations when cache is ready without requiring it for initial display

3. **Enhanced Event Handling** ⏳
   - Implement proper event listeners for cache-ready events
   - Ensure event handlers update visualizations correctly
   - Add robust error handling for visualization updates

4. **Component References** ⏳
   - Ensure component references are correctly maintained
   - Store visualization references in the state object
   - Update references when visualizations are created or updated

5. **Fallback Mechanisms** ✅
   - Show proper empty state for visualization containers
   - Implement error handling for visualization failures
   - Maintain manual initialization utilities for recovery

This approach will follow the exact pattern from dashboard.md where visualizations are created directly using D3.js, instead of waiting for the cache to be ready. See `doc/plan.md` for the full detailed implementation plan.

### Planned Timeline
| Category | Refinements | Target Date | Status |
|----------|-------------|-------------|--------|
| Similar Sequences | Accurate UMAP coordinate matching | Week 1 | ✅ Completed |
| Similar Sequences | Enhanced cache with accession lookup | Week 1 | ✅ Completed |
| Code | Extracting core modules | Week 1-2 | ⏳ In Progress |
| Code | Creating dashboard-new.md | Week 2 | ✅ Completed |
| User UMAP | Multiple file upload & Reset button | Week 2 | ⏳ In Progress |
| User UMAP | Cross-UMAP highlighting | Week 3 | 🔜 Planned |
| Map | Zoom/Pan controls & Time-based visualization | Week 4 | 🔜 Planned |
| UI | Job tracker & animations | Week 5 | 🔜 Planned |
| UI | Tooltips & error messages | Week 6 | 🔜 Planned |
| Performance | Data loading & memory mgmt | Week 7 | 🔜 Planned |
| Performance | Rendering & calculations | Week 8 | 🔜 Planned |
| Code | Documentation & error handling | Week 9-10 | 🔜 Planned | 

## Recent Refactoring Notes - Dashboard-new.md

During the dashboard-new.md refactoring, several issues were identified and resolved:

1. **Duplicate Function Declarations** ✅
   - Identified and removed duplicate declaration of `createEmergencyVisualization` function that was causing a SyntaxError.
   - The function was already properly imported from `visualization/umap-visualization.js` at the top of the file.
   - Also removed duplicate declarations of `hasVisualizationContent` and `showEmptyVisualization` functions.

2. **Integration Issues** ⏳
   - The `updateVisualizationsWithUserSequence` function should be moved to `visualization/umap-visualization.js` module.
   - Need to ensure proper event handling across modules.
   - Need to ensure initialization order is correct.

3. **Next Refactoring Steps** 🔜
   - Complete moving `updateVisualizationsWithUserSequence` to the appropriate module
   - Consolidate event handlers and ensure they're properly connected
   - Verify all visualization modules are correctly integrated
   - Implement complete error handling for all modules

4. **Bug Notes from Original Implementation (dashboard.md)** 📝
   - Found syntax error in dashboard.md related to incorrectly nested CSS outside JavaScript code.
   - Fixed by removing duplicate CSS section and adding proper implementation of the `createEmergencyVisualization` function initialization.
   - This fix doesn't affect the refactoring work but should be documented for future reference.
   - Consider extracting the custom CSS into a separate stylesheet in a future refactoring iteration.

## Identified Blank Page Issue in dashboard-new.md

A critical issue has been identified in dashboard-new.md where the visualizations remain blank despite data loading correctly:

1. **Issue Description**:
   - The dashboard-new.md file successfully loads 7889 sequences from the cache
   - The log shows the data is properly loaded and transformed
   - However, the visualizations remain blank with no visible points
   
2. **Root Cause Analysis**:
   - The initialization flow differs significantly from dashboard.md
   - In dashboard.md, visualizations are directly created with D3.js during initialization
   - In dashboard-new.md, we're trying to use component initialization functions but they appear to fail silently
   - The critical difference is in the component creation approach:
     - dashboard.md: Direct initialization (lines 1526-1531)
     - dashboard-new.md: Attempt to use wrapper functions that might not be compatible

3. **Component Method Mismatch**:
   - In dashboard-new.md's `updateReferenceScatterPlot` and `updateUserScatterPlot` functions:
     - We check for `updateScatterPlot` method but actual components might be using `updateData`
     - Function checks for `createUmapScatterPlot` and `createUserScatterPlot` but the imported functions might use different signatures

4. **Debugging Notes**:
   - Cache loading works correctly (7889 items loaded)
   - Transformation of data works correctly
   - The initialization functions in dashboard-new.md are being called
   - Data is available but not rendered in the visualizations
   
5. **Potential Fixes**:
   - Directly use D3.js to render visualizations rather than relying on wrapped component functions
   - Ensure correct component method calls (`updateData` vs `updateScatterPlot`)
   - Add more robust logging to track actual rendering process
   - Implement direct fallback to emergency visualization during initial load

This issue demonstrates the importance of maintaining compatibility with the original component APIs during refactoring. It's recommended to fix this in dashboard-new.md without modifying the original dashboard.md implementation.

### Critical Initialization Issues in dashboard-new.md

1. **Component Initialization Sequence** 🔴
   - The initialization sequence in dashboard-new.md differs significantly from dashboard.md
   - In dashboard.md, visualizations are created immediately with empty data
   - In dashboard-new.md, we're waiting for cache data before creating visualizations
   - This causes the blank visualization issue

2. **Component Method Mismatch** 🔴
   - The visualization-initializer.js is checking for `updateScatterPlot` method
   - The actual components use `updateData` method
   - This mismatch causes silent failures in visualization updates

3. **Event Handler Registration** 🔴
   - Button event handlers are registered too late in the initialization sequence
   - The debug panel buttons are not properly connected to the visualization components
   - Event handlers are duplicated in multiple places, causing conflicts

4. **Cache Dependency** 🔴
   - dashboard-new.md is overly dependent on cache data for initialization
   - Should initialize with empty data first, then update when cache is ready
   - Current implementation blocks visualization creation until cache is loaded

5. **Component Reference Management** 🔴
   - Component references are not properly maintained in window.state
   - References are lost between initialization and update phases
   - This causes the "update" methods to fail silently

6. **Debug Panel Integration** 🔴
   - Debug panel buttons are not properly connected to the visualization components
   - The force-init and direct-viz buttons don't have proper fallback mechanisms
   - Debug status updates are not properly synchronized with visualization state

### Proposed Fixes

1. **Immediate Visualization Initialization** 🔜
   - Initialize all visualizations with empty data immediately on DOMContentLoaded
   - Don't wait for cache data to be ready
   - Use the same initialization pattern as dashboard.md

2. **Component Method Standardization** 🔜
   - Standardize on `updateData` method for all visualization components
   - Add proper method existence checks before calling update methods
   - Implement fallbacks for different method names

3. **Event Handler Consolidation** 🔜
   - Move all event handlers to a single initialization point
   - Ensure handlers are registered before any visualization updates
   - Add proper error handling for event registration

4. **Cache Loading Decoupling** 🔜
   - Separate cache loading from visualization initialization
   - Load cache in background without blocking visualization creation
   - Update visualizations when cache is ready using proper event system

5. **Component Reference Management** 🔜
   - Implement proper component reference tracking
   - Store references in window.state with proper initialization
   - Add reference validation before method calls

6. **Debug Panel Enhancement** 🔜
   - Connect debug panel buttons directly to visualization components
   - Add proper fallback mechanisms for each button
   - Implement proper status updates for visualization state

### Implementation Priority

1. Fix immediate visualization initialization (highest priority)
2. Standardize component methods
3. Consolidate event handlers
4. Decouple cache loading
5. Improve component reference management
6. Enhance debug panel integration

These fixes should resolve the blank visualization issue and ensure the debug panel buttons work correctly. The fixes will be implemented in dashboard-new.md without modifying dashboard.md or its related files. 