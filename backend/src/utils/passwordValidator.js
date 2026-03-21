/**
 * Password Policy Enforcement
 * Implements strong password validation requirements
 */

class PasswordValidator {
  static validate(password) {
    const errors = [];
    
    // Minimum length requirement
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    // Uppercase letter requirement
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least 1 uppercase letter');
    }
    
    // Lowercase letter requirement
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least 1 lowercase letter');
    }
    
    // Number requirement
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least 1 number');
    }
    
    // Special character requirement
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least 1 special character');
    }
    
    // Common weak passwords check
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon',
      'football', 'baseball', 'iloveyou', '123456'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password.');
    }
    
    // Sequential characters check
    if (/(.)\1{2,}/.test(password) || /(.)\2{2,}/.test(password)) {
      errors.push('Password cannot contain sequential characters');
    }
    
    // Repeated characters check
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }
  
  static calculateStrength(password) {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length bonus
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;
    
    // Character variety bonus
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
    
    // Complexity bonus
    if (password.length >= 8 && 
        /[a-z]/.test(password) && 
        /[A-Z]/.test(password) && 
        /\d/.test(password) && 
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength += 2; // Strong password bonus
    }
    
    // Deduction for common patterns
    if (/(.)\1{2,}/.test(password)) strength -= 1;
    if (/(.)\2{2,}/.test(password)) strength -= 1;
    
    return Math.max(0, Math.min(5, strength));
  }
  
  static getStrengthLabel(strength) {
    const labels = {
      0: 'Very Weak',
      1: 'Weak',
      2: 'Fair',
      3: 'Good',
      4: 'Strong',
      5: 'Very Strong'
    };
    
    return labels[strength] || 'Unknown';
  }
  
  static generatePasswordRequirements() {
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      forbiddenPatterns: ['sequential', 'repeated', 'common'],
      allowedSpecialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      strengthLevels: {
        0: 'Very Weak',
        1: 'Weak', 
        2: 'Fair',
        3: 'Good',
        4: 'Strong',
        5: 'Very Strong'
      }
    };
  }
}

export default PasswordValidator;
