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

5. **Get Embedding Data** (`/pathtrack/embedding/{job_id}`)
   - Retrieves raw embedding vector data
   - Useful for advanced analysis and visualization

## 4. Implementation Steps

### Step 1: Complete Upload Workflow ✅
- ✅ Create upload modal with model selection
- ✅ Implement file validation and processing
- ✅ Connect to API for sequence submission
- ✅ Implement job tracking system

### Step 2: Results Processing 🔜
- Create `processSequenceResults` function to:
  - Process UMAP projection data
  - Format similar sequences data
  - Prepare visualization updates
  - Update state with user sequence information

### Step 3: Visualization Integration 🔜
- Add user sequence marker with distinct styling
- Highlight similar sequences with visual connections
- Update both map and scatter plot components
- Add toggle for showing/hiding similarity connections

### Step 4: UI Enhancements 🔜
- Create similarity panel showing top matches
- Add sequence comparison view
- Implement filtering options for similar sequences
- Add embedding heatmap visualization

### Step 5: Advanced Features 🔜
- Implement embedding heatmap for detailed analysis
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
   - "View Embedding Details" button shows embedding heatmap

## 6. Implementation Details

### 6.1 State Management

We'll extend the dashboard state to include:

```javascript
// Add to existing state object
state.userSequence = null;        // Current user sequence data
state.similarSequences = [];      // Array of similar sequences
state.jobTracker = null;          // Reference to job tracker
state.showSimilarities = true;    // Toggle for similarity visualization
state.embeddingData = null;       // Raw embedding data for heatmap
```

### 6.2 Results Processing Function

```javascript
async function processSequenceResults(jobId, projection, similarSequences) {
  // 1. Extract user sequence data
  const userSequence = {
    id: jobId,
    x: projection.x,
    y: projection.y,
    isUserSequence: true
  };
  
  // 2. Format similar sequences
  const formattedSimilarSequences = similarSequences.map(seq => ({
    ...seq,
    isSimilar: true,
    similarityScore: seq.distance
  }));
  
  // 3. Update state
  state.userSequence = userSequence;
  state.similarSequences = formattedSimilarSequences;
  
  // 4. Update visualizations
  updateVisualizationsWithUserData(userSequence, formattedSimilarSequences);
  
  // 5. Show similarity panel
  showSimilarityPanel(formattedSimilarSequences);
  
  // 6. Fetch embedding data for heatmap (optional, can be loaded on demand)
  try {
    const embeddingData = await getEmbeddingData(jobId);
    state.embeddingData = embeddingData;
    // Add "View Embedding Details" button to UI
    addEmbeddingDetailsButton();
  } catch (error) {
    console.error("Error fetching embedding data:", error);
    // Non-critical error, don't show error message to user
  }
}
```

### 6.3 Visualization Update Function

```javascript
function updateVisualizationsWithUserData(userSequence, similarSequences) {
  // 1. Add user sequence to map
  state.mapComponent.addUserSequence(userSequence);
  
  // 2. Add user sequence to scatter plot
  state.scatterComponent.addUserSequence(userSequence);
  
  // 3. Highlight similar sequences
  state.mapComponent.highlightSimilarSequences(similarSequences);
  state.scatterComponent.highlightSimilarSequences(similarSequences);
  
  // 4. Update details panel
  updateDetailsPanel(userSequence);
}
```

### 6.4 Similarity Panel

```javascript
function showSimilarityPanel(similarSequences) {
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'similarity-panel';
  panel.innerHTML = `
    <h3>Similar Sequences</h3>
    <div class="similarity-list">
      ${similarSequences.map(seq => `
        <div class="similarity-item" data-id="${seq.id}">
          <div class="similarity-score">${(1-seq.distance).toFixed(2)}</div>
          <div class="similarity-details">
            <div>${seq.accession || 'Unknown'}</div>
            <div>${seq.country || 'Unknown'}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // Add to dashboard
  document.querySelector('.dashboard-container').appendChild(panel);
  
  // Add event listeners
  panel.querySelectorAll('.similarity-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const sequence = similarSequences.find(s => s.id === id);
      highlightSequence(sequence);
      updateDetailsPanel(sequence);
    });
  });
}
```

### 6.5 Embedding Heatmap Visualization

```javascript
function createEmbeddingHeatmap(embeddingData) {
  // Create container
  const container = document.createElement('div');
  container.className = 'embedding-heatmap-container';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'embedding-heatmap-header';
  header.innerHTML = `
    <h3>Embedding Heatmap</h3>
    <div class="embedding-heatmap-info">
      <div>Model: ${embeddingData.embedding_model}</div>
      <div>Dimensions: ${embeddingData.shape[0]}</div>
    </div>
  `;
  container.appendChild(header);
  
  // Create heatmap
  const heatmapContainer = document.createElement('div');
  heatmapContainer.className = 'heatmap';
  
  // Calculate grid dimensions
  const dimensions = embeddingData.embedding.length;
  const gridSize = Math.ceil(Math.sqrt(dimensions));
  
  // Set grid layout
  heatmapContainer.style.display = 'grid';
  heatmapContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  
  // Find min and max values for color scaling
  const min = Math.min(...embeddingData.embedding);
  const max = Math.max(...embeddingData.embedding);
  
  // Create cells
  embeddingData.embedding.forEach((value, index) => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    
    // Normalize value between 0 and 1
    const normalizedValue = (value - min) / (max - min);
    
    // Generate color (blue to red gradient)
    const r = Math.floor(normalizedValue * 255);
    const b = Math.floor((1 - normalizedValue) * 255);
    cell.style.backgroundColor = `rgb(${r}, 0, ${b})`;
    
    // Add tooltip with dimension index and value
    cell.title = `Dimension ${index}: ${value.toFixed(4)}`;
    
    heatmapContainer.appendChild(cell);
  });
  
  container.appendChild(heatmapContainer);
  
  // Add controls
  const controls = document.createElement('div');
  controls.className = 'embedding-heatmap-controls';
  controls.innerHTML = `
    <button id="sort-dimensions">Sort by Value</button>
    <button id="group-dimensions">Group Similar Dimensions</button>
    <div class="zoom-controls">
      <label>Zoom: </label>
      <input type="range" min="1" max="5" value="1" id="heatmap-zoom">
    </div>
  `;
  container.appendChild(controls);
  
  // Add event listeners for controls
  // (Implementation details omitted for brevity)
  
  return container;
}

function showEmbeddingHeatmap() {
  if (!state.embeddingData) {
    console.error("No embedding data available");
    return;
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal embedding-heatmap-modal';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'close-button';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  modalContent.appendChild(closeButton);
  
  // Create heatmap
  const heatmap = createEmbeddingHeatmap(state.embeddingData);
  modalContent.appendChild(heatmap);
  
  // Add modal to page
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function addEmbeddingDetailsButton() {
  const button = document.createElement('button');
  button.id = 'view-embedding-details';
  button.className = 'dashboard-button';
  button.textContent = 'View Embedding Details';
  button.addEventListener('click', showEmbeddingHeatmap);
  
  // Add to dashboard controls
  document.querySelector('.dashboard-controls').appendChild(button);
}
```

### 6.6 Get Raw Embedding Data

```javascript
async function getEmbeddingData(jobId) {
  try {
    // 1. Show loading indicator
    showLoadingIndicator("Retrieving embedding data...");
    
    // 2. Call API to get embedding data
    const embeddingData = await getEmbedding(jobId);
    
    // 3. Process embedding data (for advanced features)
    console.log("Retrieved embedding data:", embeddingData);
    
    // 4. Hide loading indicator
    hideLoadingIndicator();
    
    // 5. Return data for further processing
    return embeddingData;
  } catch (error) {
    console.error("Error retrieving embedding data:", error);
    hideLoadingIndicator();
    showErrorMessage("Error retrieving embedding data.");
    return null;
  }
}
```

## 7. Component Extensions

### 7.1 Map Component Extensions

We'll need to extend the map component with these methods:

```javascript
// Add to map component
addUserSequence(userSequence) {
  // Add user sequence with distinct styling
}

highlightSimilarSequences(sequences) {
  // Highlight similar sequences and draw connections
}

toggleSimilarityConnections(show) {
  // Show/hide similarity connections
}
```

### 7.2 Scatter Plot Extensions

Similarly, we'll extend the scatter plot:

```javascript
// Add to scatter plot component
addUserSequence(userSequence) {
  // Add user sequence with distinct styling
}

highlightSimilarSequences(sequences) {
  // Highlight similar sequences and draw connections
}

toggleSimilarityConnections(show) {
  // Show/hide similarity connections
}
```

## 8. UI Controls

We'll add these UI controls to the dashboard:

1. **Similarity Filter**
   - Slider to adjust similarity threshold
   - Only show sequences above threshold

2. **Visualization Controls**
   - Toggle to show/hide similarity connections
   - Option to adjust connection line thickness based on similarity

3. **Embedding Controls**
   - "View Embedding Details" button to show heatmap
   - Controls within heatmap for sorting and grouping dimensions

4. **Export Controls**
   - Button to export analysis results
   - Options for export format (CSV, JSON)

## 9. Testing Strategy

- Test each step of the workflow independently
- Verify correct visualization of user sequences
- Test with various FASTA file formats and sizes
- Ensure error handling for all API requests
- Test performance with multiple similar sequences
- Verify heatmap visualization with different embedding sizes

## 10. Success Criteria

Phase 2 will be considered successful when:
- Users can upload FASTA files and see processing progress
- User sequences are properly visualized in both map and scatter plot
- Similar sequences are identified and highlighted
- Users can interact with similar sequences to see details
- The embedding heatmap provides insight into sequence characteristics
- The system handles errors gracefully with clear feedback

## 11. Next Steps After Phase 2

- Add advanced filtering and sorting options
- Create sequence export functionality
- Enhance visualization with animations and tooltips
- Optimize performance for large datasets
- Implement additional embedding visualizations (dimension importance, 3D explorer)

---

Legend:
- ✅ Completed
- ⏳ In progress
- 🔜 Next up
