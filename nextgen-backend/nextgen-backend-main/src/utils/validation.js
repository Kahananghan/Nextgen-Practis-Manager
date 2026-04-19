// ============================================
// src/utils/validation.js
// Validation Utilities
// ============================================

/**
 * Validate required fields in an object
 * @param {object} data - Object to validate
 * @param {array} requiredFields - Array of required field names
 * @returns {object} - Validation result
 */
function validateRequired(data, requiredFields = []) {
  const errors = [];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!data[field] || data[field] === '' || data[field] === null) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      errors: missingFields.map(field => `${field} is required`)
    };
  }

  return {
    isValid: true,
    errors: []
  };
}

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {object} - Validation result
 */
function validateDate(dateString) {
  if (!dateString) {
    return {
      isValid: false,
      error: 'Date is required'
    };
  }

  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format'
    };
  }

  // Check if date is in the past or future (optional validation)
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (date > oneYearFromNow) {
    return {
      isValid: false,
      error: 'Date cannot be more than 1 year in the future'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - Validation result
 */
function validateEmail(email) {
  if (!email) {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validate string length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {object} - Validation result
 */
function validateLength(value, minLength = 0, maxLength = 255) {
  if (!value) {
    return {
      isValid: false,
      error: 'Value is required'
    };
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} characters`
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `Must be no more than ${maxLength} characters`
    };
  }

  return {
    isValid: true
  };
}

/**
 * Sanitize string input
 * @param {string} value - Value to sanitize
 * @returns {string} - Sanitized value
 */
function sanitizeString(value) {
  if (!value) return '';
  
  return value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '');
}

/**
 * Validate priority value
 * @param {string} priority - Priority to validate
 * @returns {object} - Validation result
 */
function validatePriority(priority) {
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  
  if (!validPriorities.includes(priority)) {
    return {
      isValid: false,
      error: 'Invalid priority. Must be one of: low, normal, high, urgent'
    };
  }

  return {
    isValid: true
  };
}

module.exports = {
  validateRequired,
  validateDate,
  validateEmail,
  validateLength,
  sanitizeString,
  validatePriority
};
