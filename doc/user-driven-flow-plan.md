# Plan: Refactor to User-Driven Data Flow & Single Contextual UMAP

**Goal:** Shift the application from loading all reference data initially to loading and displaying data *only* after a user uploads their FASTA sequence. A single UMAP panel will display the user's sequence in the context of the **Top 100 most similar sequences** found in the database.

**Core Change:**

*   **Old Flow:** Load Full Reference Dataset (from `/pathtrack/umap/all`) -> Show Full Reference in UMAP & Map -> User Upload -> Show User Context UMAP & Geo Map & Details.
*   **New Flow:** Initial Empty State -> User Upload -> Fetch User Projection & Top 100 Similar -> **Fetch Full Reference Data (if needed)** -> Lookup Coordinates for Similar -> Show **Single Contextual UMAP** (User + Top 10 Highlighted + Next 90 Grey) & Contextual Reference Map (Top 100 Grouped) & User Geo Map (Top 10) & Details (Top 10).

**Challenge:** The `/similar` API endpoint provides sequence IDs/accessions and geographic `lat_lon`, but not the pre-calculated UMAP `coordinates`. We must still fetch/cache the full reference dataset (`window.apiCache` via `/pathtrack/umap/all`) **after the first successful user upload in a session** to look up these UMAP coordinates for plotting.

---

## Implementation Plan

**Phase 1: Modify Initialization (`src/index.md`)** - **[✅ Mostly Complete]**

1.  **Remove Initial Data Fetch:** [✅ Done]
2.  **Initialize Visualizations Empty:** [✅ Done] - Visualizations initialize empty, `user-scatter-plot` removed.
3.  **Update Empty States:** [✅ Done] - Placeholder text exists.

**Phase 2: Ensure Central Cache Availability (`api-similarity-service.js` & `src/index.md`)** - **[✅ Complete]**

1.  **(Optional) Background Caching:** [Skipped] - Relying on on-demand.
2.  **On-Demand Cache Load (Primary Mechanism):** [✅ Done] - Implemented within `findAllMatchesInCache` which is called by `handleJobCompletion`.

**Phase 3: Overhaul `handleJobCompletion` (`src/index.md`)** - **[✅ Mostly Complete]**

1.  **Get User Projection:** [✅ Done]
2.  **Ensure Reference Cache:** [✅ Done] - Handled via call to `findAllMatchesInCache`.
3.  **Fetch Similar Sequences (N=100):** [✅ Done]
4.  **Handle API Failures:** [✅ Done] - Basic error handling in place.
5.  **Extract Top 10 & Accessions:** [✅ Done]
6.  **Lookup Coordinates:** [✅ Done] - Using `findAllMatchesInCache`.
7.  **Prepare Data Subsets:** [✅ Done] - `contextualUmapData`, `referenceMapData100`, `userContextData10WithCoords` are prepared.
8.  **Update Visualizations:** [✅ Done] - Calls to update UMAP, Reference Map, Geo Map, and Details Panel are implemented.
9.  **Notifications:** [✅ Done] - Basic success/warning notifications implemented.
10. **(Optional) Timeline Plot:** [Future Consideration]

**Phase 4: Update Component Methods & Create New Components** - **[🚧 Partially Complete]**

1.  **`scatter-plot.js` (`createUmapScatterPlot`):** [✅ Done] - Updated for user/similar/top10 colors, connections, and basic tooltip info. *Refinement needed: Verify tooltip completeness.*
2.  **`api-map-component.js` (`createApiMap`):** [🚧 Needs Review/Update] - Needs modification for country grouping, avg similarity, and potentially `isolation_source` in tooltips.
3.  **`user-geo-map.js` (`createUserGeoMap`):** [✅ Done] - Updated tooltips for `isolation_source`. Async loading fixed.
4.  **Remove `user-scatter-plot.js`:** [✅ Done] - File removed, imports cleaned.
5.  **(Optional) `timeline-plot.js`:** [Future Consideration]

**Phase 5: Cleanup** - **[🚧 Partially Complete]**

1.  **Remove unused functions/variables:** [✅ Done] - `user-scatter-plot` related items removed. *Needs final check.*
2.  **Remove non-essential `console.log`:** [🚧 Needs Review] - Many debug logs remain.
3.  **Update `setupCrossHighlighting`:** [✅ Done] - References to `userScatterComponent` removed.

---

## Post-Refactor Analysis & Future Recommendations (`src/index.md`)

*(Analysis as of completion of initial user-driven flow implementation)*

*   **Overall Structure:** Reasonable. Imports, state, core functions (`handleJobCompletion`, `setupJobPolling`, visualization updates, highlighting logic), initialization/event listeners are grouped logically.
*   **`handleJobCompletion` Complexity:** High. Orchestrates multiple fetches, data processing, and updates across all components.
    *   **Recommendation:** Extract "Prepare Data Subsets" logic (Phase 3, Step 7) into a dedicated helper function for clarity and potential reuse/testing.
*   **Error Handling:** Basic `try...catch` in `handleJobCompletion` is good. `findAllMatchesInCache` handles cache fetch errors well.
    *   **Recommendation:** Add more specific `catch` blocks within `handleJobCompletion` for individual API calls (`getUmapProjection`, `getSimilarSequences`) to provide more targeted user feedback.
*   **State Management (`state` object):** Adequate for current needs. Component instances are stored appropriately.
*   **Polling Stop Function Storage:** Storing `stopPolling` function reference is duplicated in `setupJobPolling` and the `onUpload` callback.
    *   **Recommendation:** [✅ Done] Simplify by removing the redundant storage in `onUpload`. Rely only on storage within `setupJobPolling`.
*   **Component Initialization (`async`/`await`):** Essential for components loading external data (like map tiles). Fixed for `createUserGeoMap`.
    *   **Recommendation:** [✅ Done] Ensure `createApiMap` is also `async` and `await` its `d3.json` world map call. `await` the call to `createApiMap` in `handleJobCompletion`.
*   **Cross-Highlighting:** Direct event listener approach in `setupCrossHighlighting` using delegation is efficient. Relies on specific CSS classes within components (`.map-point.similar-point`).
    *   **Recommendation:** Ensure component class structures remain stable or update selectors if component internals change.
*   **`findAllMatchesInCache`:** Robust search strategies, acceptable performance currently.
    *   **Recommendation:** If performance with large caches becomes an issue, consider pre-processing the cache into lookup maps keyed by different accession variations.
*   **UI Feedback:** Loading indicators and notifications are used appropriately.
*   **Magic Numbers/Strings:** Container IDs (e.g., `'scatter-container'`) are hardcoded.
    *   **Recommendation:** Define container IDs as `const` variables at the top of the script block for better maintainability.
*   **Redundant Data in `handleSimilarSequences`:** This function became unnecessary after `handleJobCompletion` was updated to pass data directly to `userGeoMap`.
    *   **Recommendation:** [✅ Done] Remove the `handleSimilarSequences` function definition and its call.
