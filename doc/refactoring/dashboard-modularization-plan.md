# Dashboard Modularization Plan

This document outlines the plan to modularize the `dashboard.md` file into smaller, more maintainable components following Observable Framework patterns.

## Current Challenges

- The `dashboard.md` file has grown to over 1,000 lines, making it difficult to maintain
- Multiple concerns are mixed in a single file (UI, data fetching, visualization, event handling)
- Debug functionality is scattered throughout the code
- Function dependencies are implicit rather than explicit
- Repeated code patterns that could be abstracted

## Goals

1. Break down the monolithic dashboard into modular components
2. Create reusable UI utilities and visualization components
3. Improve maintainability and readability
4. Follow Observable Framework's component patterns
5. Ensure backward compatibility during transition
6. Facilitate future enhancements

## Observable Framework Component Pattern

Following Observable Framework's recommendations, components should be:

1. Functions that return DOM elements
2. Accept data as the first parameter
3. Accept options as an optional second parameter with destructuring
4. Be imported into Markdown files where needed

Example pattern:
```js
// Component in src/components/my-component.js
export function myComponent(data, {width = 600, height = 400} = {}) {
  const element = document.createElement('div');
  // Add functionality to element
  return element;
}

// Usage in dashboard.md
import { myComponent } from "./components/my-component.js";
const element = myComponent(data, {width: 800});
display(element);
```

## Directory Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── message-handler.js       // UI notifications
│   │   ├── loading-indicator.js     // Loading indicators and spinners
│   │   ├── status-manager.js        // Status tracking and display
│   │   └── dom-utils.js             // DOM manipulation utilities
│   ├── data/
│   │   ├── data-fetcher.js          // API data fetching
│   │   ├── data-transformer.js      // Data transformation utilities
│   │   └── cache-manager.js         // Data caching
│   ├── visualizations/
│   │   ├── map-visualization.js     // Map visualization component
│   │   ├── scatter-plot.js          // Scatter plot visualization
│   │   └── user-scatter-plot.js     // User scatter plot visualization
│   ├── event-handlers/
│   │   ├── event-manager.js         // Event delegation system
│   │   └── interaction-handlers.js  // User interaction handlers
│   └── debug/
│       ├── debug-panel.js           // Debug panel component
│       └── debug-utils.js           // Debug utilities
├── dashboard.md                     // Main dashboard (original)
├── dashboard-modular.md             // New modular dashboard
└── data/
    └── mock-data.json               // Sample data for testing
```

## Phase 1: UI Utilities Extraction (First Priority)

### 1. Message Handler Component

**File**: `src/components/ui/message-handler.js`

**Functionality**:
- Display messages to users (success, error, info, warning)
- Manage message timeouts and removal
- Support for stacked messages

**Functions to Extract**:
- `showMessage(type, message, duration)` from dashboard.md

**Implementation Pattern**:
```js
/**
 * Display a message to the user
 * @param {string} type - Message type ('success', 'error', 'info', 'warning')
 * @param {string} message - Message text
 * @param {object} options - Configuration options
 * @returns {object} - Message control object
 */
export function showMessage(type, message, {
  duration = 3000,
  container = 'message-container',
  autoHide = true
} = {}) {
  // Implementation
  return {
    element,
    remove() { /* Remove the message */ }
  };
}
```

### 2. Loading Indicator Component

**File**: `src/components/ui/loading-indicator.js`

**Functionality**:
- Show/hide loading indicators
- Support progress indication for known progress
- Manage multiple concurrent loading states

**Functions to Extract**:
- `showLoading(show)` from dashboard.md

**Implementation Pattern**:
```js
/**
 * Show or hide a loading indicator
 * @param {boolean} show - Whether to show the indicator
 * @param {object} options - Configuration options
 * @returns {object} - Loading indicator control object
 */
export function showLoading(show = true, {
  message = 'Loading...',
  container = 'loading-container',
  fullscreen = true
} = {}) {
  // Implementation
  return {
    element,
    setMessage(message) { /* Update message */ },
    setProgress(percent) { /* Update progress if known */ },
    show() { /* Show the indicator */ },
    hide() { /* Hide the indicator */ }
  };
}
```

### 3. Status Manager Component

**File**: `src/components/ui/status-manager.js`

**Functionality**:
- Track application status
- Update status indicators in the UI
- Provide status change notifications

**Functions to Extract**:
- `updateStatus(status, message)` from dashboard.md

**Implementation Pattern**:
```js
/**
 * Update application status
 * @param {string} status - New status ('initializing', 'ready', 'loading', 'error')
 * @param {string} message - Optional status message
 * @param {object} options - Configuration options
 * @returns {object} - Current status information
 */
export function updateStatus(status, message = '', {
  statusElement = 'status-text',
  indicatorElement = 'data-source-indicator',
  logToConsole = true
} = {}) {
  // Implementation
  return {
    status,
    message,
    timestamp: new Date().toISOString()
  };
}
```

### 4. DOM Utilities Component

**File**: `src/components/ui/dom-utils.js`

**Functionality**:
- Create and manage DOM elements
- Handle element selection and manipulation
- Provide utility functions for common DOM operations

**Functions to Extract**:
- Various DOM manipulation functions from dashboard.md

**Implementation Pattern**:
```js
/**
 * Create a DOM element with attributes
 * @param {string} tag - Element tag name
 * @param {object} attributes - Element attributes
 * @param {string|Node} content - Element content
 * @returns {HTMLElement} - Created element
 */
export function createElement(tag, attributes = {}, content = '') {
  // Implementation
}

/**
 * Get or create an element by ID
 * @param {string} id - Element ID
 * @param {string} tag - Element tag if creation needed
 * @param {object} attributes - Element attributes if created
 * @returns {HTMLElement} - Found or created element
 */
export function getOrCreateElement(id, tag = 'div', attributes = {}) {
  // Implementation
}

// Other utility functions
```

## Phase 2: Data Handling Components

### 1. Data Fetcher Component

**File**: `src/components/data/data-fetcher.js`

**Functions to Extract**:
- `fetchUmapData(useMock)` and related functions
- API configuration

### 2. Data Transformer Component

**File**: `src/components/data/data-transformer.js`

**Functions to Extract**:
- `transformUmapData(data)` and related functions

### 3. Cache Manager Component

**File**: `src/components/data/cache-manager.js`

**Functions to Extract**:
- Cache-related functionality from dashboard.md

## Phase 3: Visualization Components

### 1. Map Visualization Component

**File**: `src/components/visualizations/map-visualization.js`

**Functions to Extract**:
- Map rendering and update functions

### 2. Scatter Plot Component

**File**: `src/components/visualizations/scatter-plot.js`

**Functions to Extract**:
- Scatter plot creation and update functions

### 3. User Scatter Plot Component

**File**: `src/components/visualizations/user-scatter-plot.js`

**Functions to Extract**:
- User-specific scatter plot functionality

## Phase 4: Event Handling Components

### 1. Event Manager Component

**File**: `src/components/event-handlers/event-manager.js`

**Functions to Extract**:
- Event bridge functionality
- Event registration and triggering

### 2. Interaction Handlers Component

**File**: `src/components/event-handlers/interaction-handlers.js`

**Functions to Extract**:
- Event handler setup
- DOM event listeners

## Integration Plan

### Step 1: Create UI Utility Components
1. Create `message-handler.js` with extracted `showMessage` functionality
2. Create `loading-indicator.js` with extracted `showLoading` functionality
3. Create `status-manager.js` with extracted `updateStatus` functionality
4. Create `dom-utils.js` with DOM manipulation utilities

### Step 2: Create New Dashboard File
1. Create `dashboard-modular.md` as the target for our modular dashboard
2. Import UI utility components
3. Use these components for basic functionality

### Step 3: Extract Data Handling Components
1. Create data fetching, transformation, and caching components
2. Import these into the modular dashboard
3. Test data flow through the modular components

### Step 4: Extract Visualization Components
1. Create visualization components for map and scatter plots
2. Import these into the modular dashboard
3. Test visualization rendering and updates

### Step 5: Extract Event Handling Components
1. Create event handling components
2. Import these into the modular dashboard
3. Test user interactions and event flow

### Step 6: Testing and Migration
1. Ensure feature parity between original and modular dashboards
2. Test all functionality in the modular dashboard
3. Transition to the modular dashboard as the primary implementation

## Code Migration Examples

### Example 1: Message Handler

Original code in `dashboard.md`:
```js
function showMessage(type, message) {
  console.log(`[${type}] ${message}`);
  // In Observable, we would use reactivity to show messages
}
```

Modular version in `components/ui/message-handler.js`:
```js
/**
 * Display a message to the user
 * @param {string} type - Message type ('success', 'error', 'info', 'warning')
 * @param {string} message - Message text
 * @param {object} options - Configuration options
 * @returns {object} - Message control object
 */
export function showMessage(type, message, {
  duration = 3000,
  container = 'message-container',
  autoHide = true
} = {}) {
  console.log(`[${type}] ${message}`);
  
  // Get or create message container
  let containerElement = document.getElementById(container);
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = container;
    containerElement.style.position = 'fixed';
    containerElement.style.bottom = '20px';
    containerElement.style.right = '20px';
    containerElement.style.zIndex = '1000';
    document.body.appendChild(containerElement);
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${type}`;
  messageElement.textContent = message;
  messageElement.style.padding = '10px 15px';
  messageElement.style.margin = '5px 0';
  messageElement.style.borderRadius = '4px';
  messageElement.style.backgroundColor = 
    type === 'error' ? '#f8d7da' : 
    type === 'success' ? '#d4edda' : 
    type === 'warning' ? '#fff3cd' : '#d1ecf1';
  messageElement.style.color = 
    type === 'error' ? '#721c24' : 
    type === 'success' ? '#155724' : 
    type === 'warning' ? '#856404' : '#0c5460';
  
  containerElement.appendChild(messageElement);
  
  // Auto-hide if enabled
  let timeoutId;
  if (autoHide && duration > 0) {
    timeoutId = setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, duration);
  }
  
  // Return control object
  return {
    element: messageElement,
    remove() {
      if (timeoutId) clearTimeout(timeoutId);
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }
  };
}
```

Usage in `dashboard-modular.md`:
```js
import { showMessage } from "./components/ui/message-handler.js";

// Later in the code
showMessage('success', 'Data loaded successfully', { duration: 5000 });
```

### Example 2: Loading Indicator

Original code in `dashboard.md`:
```js
function showLoading(show) {
  state.isLoading = show;
  // Observable doesn't have direct DOM access, so we'll use a state variable
}
```

Modular version in `components/ui/loading-indicator.js`:
```js
/**
 * Show or hide a loading indicator
 * @param {boolean} show - Whether to show the indicator
 * @param {object} options - Configuration options
 * @returns {object} - Loading indicator control object
 */
export function showLoading(show = true, {
  message = 'Loading...',
  container = 'loading-container',
  fullscreen = true
} = {}) {
  // Get or create loading container
  let containerElement = document.getElementById(container);
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = container;
    
    if (fullscreen) {
      containerElement.style.position = 'fixed';
      containerElement.style.top = '0';
      containerElement.style.left = '0';
      containerElement.style.width = '100%';
      containerElement.style.height = '100%';
      containerElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      containerElement.style.display = 'flex';
      containerElement.style.alignItems = 'center';
      containerElement.style.justifyContent = 'center';
      containerElement.style.zIndex = '2000';
      containerElement.style.flexDirection = 'column';
    }
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.border = '5px solid #f3f3f3';
    spinner.style.borderTop = '5px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.animation = 'spin 1s linear infinite';
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'loading-message';
    messageElement.style.marginTop = '15px';
    messageElement.textContent = message;
    
    // Add animation style
    const style = document.createElement('style');
    style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    containerElement.appendChild(spinner);
    containerElement.appendChild(messageElement);
    document.body.appendChild(containerElement);
  }
  
  // Update message
  const messageElement = containerElement.querySelector('.loading-message');
  if (messageElement) {
    messageElement.textContent = message;
  }
  
  // Show or hide
  containerElement.style.display = show ? 'flex' : 'none';
  
  // Return control object
  return {
    element: containerElement,
    setMessage(newMessage) {
      if (messageElement) {
        messageElement.textContent = newMessage;
      }
    },
    show() {
      containerElement.style.display = 'flex';
    },
    hide() {
      containerElement.style.display = 'none';
    }
  };
}
```

Usage in `dashboard-modular.md`:
```js
import { showLoading } from "./components/ui/loading-indicator.js";

// Later in the code
const loader = showLoading(true, { message: 'Fetching UMAP data...' });

// Update message
loader.setMessage('Processing data...');

// Hide when done
loader.hide();
```

## Conclusion

This modularization plan provides a clear path to transform the monolithic dashboard into a maintainable, component-based architecture. By starting with UI utilities, we establish patterns that will guide the extraction of more complex components. The resulting modular dashboard will be easier to maintain, extend, and debug while adhering to Observable Framework's recommended patterns.

## Next Steps

1. Begin implementation of UI utility components (message-handler.js, loading-indicator.js, status-manager.js)
2. Create dashboard-modular.md and integrate UI utilities
3. Continue with data handling components
4. Proceed with visualization and event handling components
5. Thoroughly test all functionality
6. Complete transition to the modular architecture 