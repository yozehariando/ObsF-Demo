/**
 * Message display utility module for the DNA Mutation Dashboard
 * Provides functions for creating message components
 */

/**
 * Creates an information message component
 * @param {string} message - Message to display
 * @param {Object} options - Configuration options
 * @param {number} options.duration - Duration in milliseconds (0 for persistent)
 * @returns {HTMLElement} - The message element
 */
export function createInfoMessage(message, {duration = 5000} = {}) {
  return createMessage(message, {type: 'info', duration});
}

/**
 * Creates a warning message component
 * @param {string} message - Message to display
 * @param {Object} options - Configuration options
 * @param {number} options.duration - Duration in milliseconds (0 for persistent)
 * @returns {HTMLElement} - The message element
 */
export function createWarningMessage(message, {duration = 8000} = {}) {
  return createMessage(message, {type: 'warning', duration});
}

/**
 * Creates an error message component
 * @param {string} message - Message to display
 * @param {Object} options - Configuration options
 * @param {number} options.duration - Duration in milliseconds (0 for persistent)
 * @returns {HTMLElement} - The message element
 */
export function createErrorMessage(message, {duration = 8000} = {}) {
  return createMessage(message, {type: 'error', duration});
}

/**
 * Creates a message component
 * @param {string} message - Message to display
 * @param {Object} options - Configuration options
 * @param {string} options.type - Message type ('info', 'warning', 'error')
 * @param {number} options.duration - Duration in milliseconds (0 for persistent)
 * @returns {HTMLElement} - The message element
 */
export function createMessage(message, {type = 'info', duration = 5000} = {}) {
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message message-${type}`;
  messageElement.innerHTML = `
    <div class="message-content">${message}</div>
    <button class="message-close">&times;</button>
  `;
  
  // Add close button handler
  const closeButton = messageElement.querySelector('.message-close');
  closeButton.addEventListener('click', () => {
    messageElement.classList.add('message-hiding');
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
  });
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      messageElement.classList.add('message-hiding');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }, duration);
  }
  
  // Add animation class after a short delay
  setTimeout(() => {
    messageElement.classList.add('message-visible');
  }, 10);
  
  // Log the message to console
  console.log(`Message (${type}): ${message}`);
  
  return messageElement;
}

/**
 * Creates a messages container component
 * @param {Object} options - Configuration options
 * @param {string} options.id - Container ID
 * @returns {HTMLElement} - The messages container element
 */
export function createMessagesContainer({id = 'messages-container'} = {}) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'messages-container';
  return container;
}

/**
 * Utility function to show a message in the document
 * @param {string} message - Message to display
 * @param {string} type - Message type ('info', 'warning', 'error')
 * @param {number} duration - Duration in milliseconds (0 for persistent)
 * @returns {Object} - Control object with remove method
 */
export function showMessage(message, type = 'info', duration = 5000) {
  // Get or create messages container
  let messagesContainer = document.getElementById('messages-container');
  
  if (!messagesContainer) {
    messagesContainer = createMessagesContainer();
    document.body.appendChild(messagesContainer);
  }
  
  // Create message element
  const messageElement = createMessage(message, {type, duration});
  
  // Add to container
  messagesContainer.appendChild(messageElement);
  
  // Return control object
  return {
    element: messageElement,
    remove() {
      if (messageElement.parentNode === messagesContainer) {
        messageElement.classList.add('message-hiding');
        setTimeout(() => {
          if (messageElement.parentNode === messagesContainer) {
            messagesContainer.removeChild(messageElement);
          }
        }, 300);
      }
    },
    update(newMessage) {
      const contentEl = messageElement.querySelector('.message-content');
      if (contentEl) {
        contentEl.textContent = newMessage;
      }
    }
  };
}

// Convenience methods that use the showMessage utility
export function showInfoMessage(message, duration = 5000) {
  return showMessage(message, 'info', duration);
}

export function showWarningMessage(message, duration = 8000) {
  return showMessage(message, 'warning', duration);
}

export function showErrorMessage(message, duration = 8000) {
  return showMessage(message, 'error', duration);
}

// // Add required CSS by linking to the centralized CSS file
// export function addMessageStyles() {
//   if (!document.getElementById('ui-components-styles')) {
//     const linkEl = document.createElement('link');
//     linkEl.id = 'ui-components-styles';
//     linkEl.rel = 'stylesheet';
//     linkEl.href = './components/ui/styles/ui-components.css';
//     document.head.appendChild(linkEl);
//   }
// }

// // Initialize styles when module is imported
// addMessageStyles();
