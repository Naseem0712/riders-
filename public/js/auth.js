// Authentication Module
// Handles login, registration, password reset, and user management

const Auth = {
  // API endpoints
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    me: '/api/auth/me',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password'
  },
  
  // Initialize authentication
  init() {
    this.initEventListeners();
    console.log('🔐 Auth module initialized');
  },
  
  // Initialize event listeners
  initEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }
    
    // Forgot password form
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', this.handleForgotPassword.bind(this));
    }
  },
  
  // Handle login
  async handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      App.showToast('Please fill in all fields', 'error');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading state
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing in...</span>';
      submitBtn.disabled = true;
      
      const loginData = {
        password
      };
      
      // Determine if email or mobile
      if (email.includes('@')) {
        loginData.email = email;
      } else {
        loginData.mobile = email;
      }
      
      const response = await fetch(App.apiUrl + this.endpoints.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token
        localStorage.setItem('riders_token', data.data.token);
        
        // Update app state
        App.setAuthState(true, data.data.user);
        
        // Hide modal
        App.hideAuthModal();
        
        // Show success message
        App.showToast(`Welcome back, ${data.data.user.name}!`, 'success');
        
        // Redirect to appropriate section
        if (App.state.currentSection === 'home') {
          App.showSection('search');
        }
        
      } else {
        App.showToast(data.message || 'Login failed', 'error');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      App.showToast('Login failed. Please check your connection.', 'error');
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },
  
  // Handle registration
  async handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const mobile = document.getElementById('registerMobile').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    // Validation
    if (!name || !email || !mobile || !password) {
      App.showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (password.length < 6) {
      App.showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      App.showToast('Please enter a valid email address', 'error');
      return;
    }
    
    if (!this.isValidMobile(mobile)) {
      App.showToast('Please enter a valid mobile number', 'error');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading state
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating account...</span>';
      submitBtn.disabled = true;
      
      const registerData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile.trim(),
        password,
        role
      };
      
      const response = await fetch(App.apiUrl + this.endpoints.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token
        localStorage.setItem('riders_token', data.data.token);
        
        // Update app state
        App.setAuthState(true, data.data.user);
        
        // Hide modal
        App.hideAuthModal();
        
        // Show success message
        App.showToast(`Welcome to Riders Luxury, ${data.data.user.name}!`, 'success');
        
        // Show appropriate section based on role
        if (data.data.user.role === 'driver') {
          App.showSection('offer');
        } else {
          App.showSection('search');
        }
        
      } else {
        App.showToast(data.message || 'Registration failed', 'error');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      App.showToast('Registration failed. Please check your connection.', 'error');
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },
  
  // Handle forgot password
  async handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
      App.showToast('Please enter your email or mobile number', 'error');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Show loading state
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
      submitBtn.disabled = true;
      
      const forgotData = {};
      
      // Determine if email or mobile
      if (email.includes('@')) {
        forgotData.email = email;
      } else {
        forgotData.mobile = email;
      }
      
      const response = await fetch(App.apiUrl + this.endpoints.forgotPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forgotData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Password reset instructions sent!', 'success');
        
        // Show development token if available
        if (data.resetToken) {
          App.showToast(`Dev token: ${data.resetToken}`, 'info');
        }
        
        // Switch to login form
        setTimeout(() => {
          App.showAuthModal('login');
        }, 2000);
        
      } else {
        App.showToast(data.message || 'Failed to send reset instructions', 'error');
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      App.showToast('Failed to send reset instructions. Please try again.', 'error');
    } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },
  
  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(App.apiUrl + this.endpoints.resetPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Password reset successful!', 'success');
        App.showAuthModal('login');
        return true;
      } else {
        App.showToast(data.message || 'Password reset failed', 'error');
        return false;
      }
      
    } catch (error) {
      console.error('Reset password error:', error);
      App.showToast('Password reset failed. Please try again.', 'error');
      return false;
    }
  },
  
  // Update user profile
  async updateProfile(profileData) {
    try {
      const token = localStorage.getItem('riders_token');
      
      if (!token) {
        App.showToast('Please login first', 'error');
        return false;
      }
      
      const response = await fetch(App.apiUrl + this.endpoints.profile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update app state
        App.setAuthState(true, data.data.user);
        App.showToast('Profile updated successfully!', 'success');
        return true;
      } else {
        App.showToast(data.message || 'Profile update failed', 'error');
        return false;
      }
      
    } catch (error) {
      console.error('Update profile error:', error);
      App.showToast('Profile update failed. Please try again.', 'error');
      return false;
    }
  },
  
  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const token = localStorage.getItem('riders_token');
      
      if (!token) {
        App.showToast('Please login first', 'error');
        return false;
      }
      
      const response = await fetch(App.apiUrl + this.endpoints.changePassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Password changed successfully!', 'success');
        return true;
      } else {
        App.showToast(data.message || 'Password change failed', 'error');
        return false;
      }
      
    } catch (error) {
      console.error('Change password error:', error);
      App.showToast('Password change failed. Please try again.', 'error');
      return false;
    }
  },
  
  // Get authenticated user
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('riders_token');
      
      if (!token) {
        return null;
      }
      
      const response = await fetch(App.apiUrl + this.endpoints.me, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.user;
      } else {
        // Token is invalid
        localStorage.removeItem('riders_token');
        return null;
      }
      
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },
  
  // Validation helpers
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidMobile(mobile) {
    const mobileRegex = /^\+?[\d\s-()]{10,15}$/;
    return mobileRegex.test(mobile);
  },
  
  // Format mobile number
  formatMobile(mobile) {
    // Remove all non-digit characters except +
    let formatted = mobile.replace(/[^\d+]/g, '');
    
    // Add +91 if it's an Indian number without country code
    if (formatted.length === 10 && !formatted.startsWith('+')) {
      formatted = '+91' + formatted;
    }
    
    return formatted;
  },
  
  // Logout user
  logout() {
    localStorage.removeItem('riders_token');
    App.setAuthState(false, null);
    App.showSection('home');
    App.showToast('Logged out successfully', 'info');
  },
  
  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('riders_token');
  },
  
  // Get stored token
  getToken() {
    return localStorage.getItem('riders_token');
  },
  
  // Make authenticated API request
  async apiRequest(endpoint, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    const response = await fetch(App.apiUrl + endpoint, mergedOptions);
    
    // Handle unauthorized responses
    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
    
    return response;
  },
  
  // Social login placeholders (for future implementation)
  async loginWithGoogle() {
    App.showToast('Google login coming soon!', 'info');
  },
  
  async loginWithFacebook() {
    App.showToast('Facebook login coming soon!', 'info');
  },
  
  // Biometric authentication (for future implementation)
  async enableBiometric() {
    if ('credentials' in navigator) {
      App.showToast('Biometric login coming soon!', 'info');
    } else {
      App.showToast('Biometric authentication not supported', 'error');
    }
  }
};

// Form validation helpers
const FormValidation = {
  // Real-time validation
  addRealTimeValidation() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
      input.addEventListener('blur', (e) => {
        this.validateEmail(e.target);
      });
    });
    
    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.validatePassword(e.target);
      });
    });
    
    // Mobile validation
    const mobileInputs = document.querySelectorAll('input[type="tel"]');
    mobileInputs.forEach(input => {
      input.addEventListener('blur', (e) => {
        this.validateMobile(e.target);
      });
    });
  },
  
  validateEmail(input) {
    const isValid = Auth.isValidEmail(input.value);
    this.updateFieldState(input, isValid, 'Please enter a valid email address');
    return isValid;
  },
  
  validatePassword(input) {
    const isValid = input.value.length >= 6;
    this.updateFieldState(input, isValid, 'Password must be at least 6 characters');
    return isValid;
  },
  
  validateMobile(input) {
    const isValid = Auth.isValidMobile(input.value);
    this.updateFieldState(input, isValid, 'Please enter a valid mobile number');
    return isValid;
  },
  
  updateFieldState(input, isValid, errorMessage) {
    const parent = input.closest('.form-group');
    if (!parent) return;
    
    // Remove existing validation classes
    parent.classList.remove('field-valid', 'field-invalid');
    
    // Remove existing error message
    const existingError = parent.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    
    if (input.value.trim() === '') {
      // Field is empty, don't show validation
      return;
    }
    
    if (isValid) {
      parent.classList.add('field-valid');
    } else {
      parent.classList.add('field-invalid');
      
      // Add error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = errorMessage;
      parent.appendChild(errorDiv);
    }
  }
};

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  FormValidation.addRealTimeValidation();
});

// Export for global access
window.Auth = Auth;
window.FormValidation = FormValidation;

console.log('🔐 Auth module loaded');
