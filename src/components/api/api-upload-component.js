/**
 * FASTA file upload component for sequence analysis
 * Handles file uploads, validation, and submission to the API
 */

/**
 * Creates a modal dialog for FASTA file upload
 * @param {Object} options - Configuration options
 * @param {Function} options.onUpload - Callback when file is uploaded
 * @param {Function} options.onCancel - Callback when upload is canceled
 * @returns {Object} Modal controller object
 */
function createUploadModal(options = {}) {
  // Create modal container
  const modalContainer = document.createElement('div')
  modalContainer.className = 'upload-modal-container'
  modalContainer.style.position = 'fixed'
  modalContainer.style.top = '0'
  modalContainer.style.left = '0'
  modalContainer.style.width = '100%'
  modalContainer.style.height = '100%'
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  modalContainer.style.display = 'flex'
  modalContainer.style.justifyContent = 'center'
  modalContainer.style.alignItems = 'center'
  modalContainer.style.zIndex = '1000'

  // Create modal content
  const modalContent = document.createElement('div')
  modalContent.className = 'upload-modal-content'
  modalContent.style.backgroundColor = 'white'
  modalContent.style.borderRadius = '5px'
  modalContent.style.padding = '20px'
  modalContent.style.width = '500px'
  modalContent.style.maxWidth = '90%'
  modalContent.style.maxHeight = '90%'
  modalContent.style.overflowY = 'auto'
  modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'

  // Create modal header
  const modalHeader = document.createElement('div')
  modalHeader.className = 'upload-modal-header'
  modalHeader.style.display = 'flex'
  modalHeader.style.justifyContent = 'space-between'
  modalHeader.style.alignItems = 'center'
  modalHeader.style.marginBottom = '20px'

  const modalTitle = document.createElement('h3')
  modalTitle.textContent = 'Upload FASTA Sequence'
  modalTitle.style.margin = '0'

  const closeButton = document.createElement('button')
  closeButton.innerHTML = '&times;'
  closeButton.style.background = 'none'
  closeButton.style.border = 'none'
  closeButton.style.fontSize = '24px'
  closeButton.style.cursor = 'pointer'
  closeButton.style.padding = '0'
  closeButton.style.lineHeight = '1'
  closeButton.addEventListener('click', () => {
    if (options.onCancel) options.onCancel()
    closeModal()
  })

  modalHeader.appendChild(modalTitle)
  modalHeader.appendChild(closeButton)

  // Create upload area
  const uploadArea = document.createElement('div')
  uploadArea.className = 'upload-area'
  uploadArea.style.border = '2px dashed #ccc'
  uploadArea.style.borderRadius = '5px'
  uploadArea.style.padding = '40px 20px'
  uploadArea.style.textAlign = 'center'
  uploadArea.style.marginBottom = '20px'
  uploadArea.style.cursor = 'pointer'
  uploadArea.style.transition = 'background-color 0.3s'

  const uploadIcon = document.createElement('div')
  uploadIcon.innerHTML =
    '<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'
  uploadIcon.style.marginBottom = '10px'

  const uploadText = document.createElement('p')
  uploadText.textContent =
    'Drag and drop your FASTA file here, or click to browse'
  uploadText.style.margin = '0'

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.fasta,.fa'
  fileInput.style.display = 'none'

  uploadArea.appendChild(uploadIcon)
  uploadArea.appendChild(uploadText)
  uploadArea.appendChild(fileInput)

  // Add drag and drop functionality
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.style.backgroundColor = '#f0f0f0'
    uploadArea.style.borderColor = '#999'
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = ''
    uploadArea.style.borderColor = '#ccc'
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.style.backgroundColor = ''
    uploadArea.style.borderColor = '#ccc'

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelection(file)
    }
  })

  uploadArea.addEventListener('click', () => {
    fileInput.click()
  })

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelection(file)
    }
  })

  // Create model selection
  const modelSelectionContainer = document.createElement('div')
  modelSelectionContainer.className = 'model-selection'
  modelSelectionContainer.style.marginBottom = '20px'

  const modelLabel = document.createElement('label')
  modelLabel.textContent = 'Select Model:'
  modelLabel.style.display = 'block'
  modelLabel.style.marginBottom = '5px'
  modelLabel.style.fontWeight = 'bold'

  const modelSelect = document.createElement('select')
  modelSelect.className = 'model-select'
  modelSelect.style.width = '100%'
  modelSelect.style.padding = '8px'
  modelSelect.style.borderRadius = '4px'
  modelSelect.style.border = '1px solid #ccc'

  const models = [
    { value: 'DNABERT-S', label: 'DNABERT-S (Recommended)' },
    { value: 'DNABERT-2', label: 'DNABERT-2' },
    { value: 'ESM-2', label: 'ESM-2' },
  ]

  models.forEach((model) => {
    const option = document.createElement('option')
    option.value = model.value
    option.textContent = model.label
    modelSelect.appendChild(option)
  })

  modelSelectionContainer.appendChild(modelLabel)
  modelSelectionContainer.appendChild(modelSelect)

  // Create file info area (initially hidden)
  const fileInfoContainer = document.createElement('div')
  fileInfoContainer.className = 'file-info'
  fileInfoContainer.style.marginBottom = '20px'
  fileInfoContainer.style.display = 'none'
  fileInfoContainer.style.padding = '10px'
  fileInfoContainer.style.backgroundColor = '#f8f9fa'
  fileInfoContainer.style.borderRadius = '4px'

  // Create action buttons
  const actionButtons = document.createElement('div')
  actionButtons.className = 'action-buttons'
  actionButtons.style.display = 'flex'
  actionButtons.style.justifyContent = 'flex-end'
  actionButtons.style.gap = '10px'

  const cancelButton = document.createElement('button')
  cancelButton.textContent = 'Cancel'
  cancelButton.className = 'btn btn-secondary'
  cancelButton.style.padding = '8px 16px'
  cancelButton.style.borderRadius = '4px'
  cancelButton.style.border = '1px solid #ccc'
  cancelButton.style.backgroundColor = '#f8f9fa'
  cancelButton.style.cursor = 'pointer'
  cancelButton.addEventListener('click', () => {
    if (options.onCancel) options.onCancel()
    closeModal()
  })

  const uploadButton = document.createElement('button')
  uploadButton.textContent = 'Upload'
  uploadButton.className = 'btn btn-primary'
  uploadButton.style.padding = '8px 16px'
  uploadButton.style.borderRadius = '4px'
  uploadButton.style.border = 'none'
  uploadButton.style.backgroundColor = '#007bff'
  uploadButton.style.color = 'white'
  uploadButton.style.cursor = 'pointer'
  uploadButton.disabled = true
  uploadButton.style.opacity = '0.5'
  uploadButton.addEventListener('click', () => {
    if (selectedFile) {
      if (options.onUpload) {
        const model = modelSelect.value
        options.onUpload(selectedFile, model)
      }
      closeModal()
    }
  })

  actionButtons.appendChild(cancelButton)
  actionButtons.appendChild(uploadButton)

  // Assemble modal
  modalContent.appendChild(modalHeader)
  modalContent.appendChild(uploadArea)
  modalContent.appendChild(modelSelectionContainer)
  modalContent.appendChild(fileInfoContainer)
  modalContent.appendChild(actionButtons)
  modalContainer.appendChild(modalContent)

  // Add to document
  document.body.appendChild(modalContainer)

  // Track selected file
  let selectedFile = null

  // Handle file selection
  function handleFileSelection(file) {
    if (validateFastaFile(file)) {
      selectedFile = file
      displayFileInfo(file)
      uploadButton.disabled = false
      uploadButton.style.opacity = '1'
    } else {
      selectedFile = null
      fileInfoContainer.style.display = 'block'
      fileInfoContainer.innerHTML = `
        <div style="color: #721c24; background-color: #f8d7da; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb;">
          <strong>Error:</strong> Invalid file format. Please upload a valid FASTA file (.fasta or .fa).
        </div>
      `
      uploadButton.disabled = true
      uploadButton.style.opacity = '0.5'
    }
  }

  // Display file info
  function displayFileInfo(file) {
    fileInfoContainer.style.display = 'block'
    fileInfoContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="flex-shrink: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div style="flex-grow: 1;">
          <div style="font-weight: bold;">${file.name}</div>
          <div style="font-size: 0.875rem; color: #6c757d;">${formatFileSize(
            file.size
          )}</div>
        </div>
      </div>
    `
  }

  // Close modal function
  function closeModal() {
    document.body.removeChild(modalContainer)
  }

  // Return controller object
  return {
    close: closeModal,
  }
}

/**
 * Validates if a file is a valid FASTA file
 * @param {File} file - File to validate
 * @returns {Promise<boolean>} True if file is valid FASTA
 */
function validateFastaFile(file) {
  // Basic validation based on file extension
  const validExtensions = ['.fasta', '.fa']
  const fileName = file.name.toLowerCase()

  return validExtensions.some((ext) => fileName.endsWith(ext))
}

/**
 * Formats file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Reads a FASTA file and returns its content
 * @param {File} file - FASTA file to read
 * @returns {Promise<string>} File content
 */
async function readFastaFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      resolve(event.target.result)
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsText(file)
  })
}

/**
 * Parses FASTA content and extracts sequences
 * @param {string} content - FASTA file content
 * @returns {Array<Object>} Array of sequence objects
 */
function parseFastaContent(content) {
  const sequences = []
  const lines = content.split('\n')

  let currentHeader = ''
  let currentSequence = ''

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('>')) {
      // If we already have a sequence, save it before starting a new one
      if (currentHeader && currentSequence) {
        sequences.push({
          header: currentHeader,
          sequence: currentSequence,
        })
      }

      // Start a new sequence
      currentHeader = trimmedLine.substring(1)
      currentSequence = ''
    } else if (trimmedLine && currentHeader) {
      // Add to the current sequence
      currentSequence += trimmedLine
    }
  }

  // Add the last sequence if there is one
  if (currentHeader && currentSequence) {
    sequences.push({
      header: currentHeader,
      sequence: currentSequence,
    })
  }

  return sequences
}

export {
  createUploadModal,
  validateFastaFile,
  readFastaFile,
  parseFastaContent,
}
