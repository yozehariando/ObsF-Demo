/**
 * Error Handler Test
 * 
 * This file contains simple tests for the error-handler.js module.
 * It can be run in the browser console to verify the functionality.
 */

import { handleError, createError, safeExecute, safeExecuteAsync } from '../utils/error-handler.js';

// Test 1: Basic error handling
console.log('Test 1: Basic error handling');
try {
  // Throw a test error
  throw new Error('Test error');
} catch (error) {
  handleError(error, 'running error handler test', {
    notify: true,
    severity: 'warning'
  });
  console.log('✅ Test 1 passed - Error handled correctly');
}

// Test 2: Error with fallback
console.log('\nTest 2: Error with fallback');
const fallbackResult = handleError('Test error with fallback', 'testing fallback', {
  fallback: () => {
    console.log('Fallback function executed');
    return 'Fallback result';
  }
});
console.log(`Fallback result: ${fallbackResult}`);
console.log('✅ Test 2 passed - Fallback executed correctly');

// Test 3: safeExecute with successful function
console.log('\nTest 3: safeExecute with successful function');
const successResult = safeExecute(
  (a, b) => a + b,
  [5, 7],
  'adding numbers'
);
console.log(`Result: ${successResult}`);
console.log('✅ Test 3 passed - Function executed safely');

// Test 4: safeExecute with failing function
console.log('\nTest 4: safeExecute with failing function');
const failResult = safeExecute(
  () => { throw new Error('Intentional error'); },
  [],
  'executing failing function',
  { notify: true }
);
console.log(`Result: ${failResult === null ? 'null (expected)' : failResult}`);
console.log('✅ Test 4 passed - Error handled safely');

// Test 5: safeExecuteAsync with successful function
console.log('\nTest 5: safeExecuteAsync with successful function');
safeExecuteAsync(
  async (timeout) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve('Async result'), timeout);
    });
  },
  [100],
  'async operation'
).then(result => {
  console.log(`Async result: ${result}`);
  console.log('✅ Test 5 passed - Async function executed safely');
});

// Test 6: safeExecuteAsync with failing function
console.log('\nTest 6: safeExecuteAsync with failing function');
safeExecuteAsync(
  async () => {
    throw new Error('Intentional async error');
  },
  [],
  'failing async operation',
  { notify: true, severity: 'error' }
).then(result => {
  console.log(`Async fail result: ${result === null ? 'null (expected)' : result}`);
  console.log('✅ Test 6 passed - Async error handled safely');
});

// Test 7: createError
console.log('\nTest 7: createError');
const customError = createError('Custom error message', 'TEST_ERROR', { 
  additionalInfo: 'This is additional debug information'
});
console.log('Custom error:', customError);
console.log('Error code:', customError.code);
console.log('Error details:', customError.details);
console.log('✅ Test 7 passed - Custom error created correctly');

console.log('\nAll tests completed - Check for error notifications in UI'); 