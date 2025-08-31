// UI Module
// Handles user interface interactions, animations, and visual effects

const UI = {
  // State
  state: {
    isMenuOpen: false,
    activeToasts: [],
    animationQueue: []
  },
  
  // Initialize UI module
  init() {
    this.initRippleEffects();
    this.initScrollEffects();
    this.initResponsiveNavigation();
    this.initKeyboardNavigation();
    this.initAnimationObserver();
    this.initThemeSystem();
    console.log('🎨 UI module initialized');
  },
  
  // Initialize ripple effects for buttons
  initRippleEffects() {
    document.addEventListener('click', (e) => {
      const rippleBtn = e.target.closest('.ripple-effect');
      if (!rippleBtn) return;
      
      this.createRipple(rippleBtn, e);
    });
  },
  
  // Create ripple effect
  createRipple(element, event) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out;
      pointer-events: none;
      z-index: 1000;
    `;
    
    // Ensure element has relative positioning
    const originalPosition = element.style.position;
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
      // Restore original position
      if (originalPosition) {
        element.style.position = originalPosition;
      }
    }, 600);
  },
  
  // Initialize scroll effects
  initScrollEffects() {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const updateNavbar = () => {
      const navbar = document.getElementById('navbar');
      if (!navbar) return;
      
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      
      // Hide navbar on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
      
      lastScrollY = currentScrollY;
      ticking = false;
    };
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    });
    
    // Parallax effect for hero section
    this.initParallaxEffect();
  },
  
  // Initialize parallax effect
  initParallaxEffect() {
    const parallaxElements = document.querySelectorAll('.floating-card');
    
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.1;
      
      parallaxElements.forEach(element => {
        element.style.transform = `translateY(${parallax}px)`;
      });
    });
  },
  
  // Initialize responsive navigation
  initResponsiveNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (!navToggle || !navMenu) return;
    
    navToggle.addEventListener('click', () => {
      this.toggleMobileMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        this.closeMobileMenu();
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileMenu();
      }
    });
    
    // Close menu when navigating
    navMenu.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-link')) {
        this.closeMobileMenu();
      }
    });
  },
  
  // Toggle mobile menu
  toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.getElementById('navToggle');
    
    this.state.isMenuOpen = !this.state.isMenuOpen;
    
    navMenu.classList.toggle('active', this.state.isMenuOpen);
    navToggle.classList.toggle('active', this.state.isMenuOpen);
    
    // Update aria attributes for accessibility
    navToggle.setAttribute('aria-expanded', this.state.isMenuOpen);
    navMenu.setAttribute('aria-hidden', !this.state.isMenuOpen);
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = this.state.isMenuOpen ? 'hidden' : '';
  },
  
  // Close mobile menu
  closeMobileMenu() {
    if (!this.state.isMenuOpen) return;
    
    const navMenu = document.getElementById('navMenu');
    const navToggle = document.getElementById('navToggle');
    
    this.state.isMenuOpen = false;
    
    navMenu.classList.remove('active');
    navToggle.classList.remove('active');
    
    navToggle.setAttribute('aria-expanded', false);
    navMenu.setAttribute('aria-hidden', true);
    
    document.body.style.overflow = '';
  },
  
  // Initialize keyboard navigation
  initKeyboardNavigation() {
    // Focus management for modals
    document.addEventListener('keydown', (e) => {
      const activeModal = document.querySelector('.modal.active');
      if (!activeModal) return;
      
      if (e.key === 'Tab') {
        this.handleModalTabNavigation(e, activeModal);
      }
    });
    
    // Arrow key navigation for star ratings
    document.addEventListener('keydown', (e) => {
      const starRating = e.target.closest('.star-rating');
      if (!starRating) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.handleStarKeyNavigation(e, starRating);
      }
    });
  },
  
  // Handle modal tab navigation
  handleModalTabNavigation(e, modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  },
  
  // Handle star rating keyboard navigation
  handleStarKeyNavigation(e, starRating) {
    e.preventDefault();
    
    const stars = starRating.querySelectorAll('.star');
    const currentRating = parseInt(starRating.dataset.rating) || 0;
    let newRating = currentRating;
    
    if (e.key === 'ArrowRight' && newRating < 5) {
      newRating++;
    } else if (e.key === 'ArrowLeft' && newRating > 0) {
      newRating--;
    }
    
    if (newRating !== currentRating) {
      starRating.dataset.rating = newRating;
      stars.forEach((star, index) => {
        star.classList.toggle('active', index < newRating);
      });
      
      // Trigger click event for compatibility
      if (stars[newRating - 1]) {
        stars[newRating - 1].click();
      }
    }
  },
  
  // Initialize animation observer
  initAnimationObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    // Observe elements that should animate in
    document.querySelectorAll('.feature-card, .ride-card, .booking-card').forEach(el => {
      observer.observe(el);
    });
  },
  
  // Initialize theme system
  initThemeSystem() {
    // Check for system dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.updateTheme(e.matches ? 'dark' : 'light');
    });
    
    // Initialize with system preference
    this.updateTheme(prefersDark ? 'dark' : 'light');
  },
  
  // Update theme
  updateTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#000000' : '#ffffff';
    }
  },
  
  // Show loading state
  showLoading(element, text = 'Loading...') {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (!element) return;
    
    element.classList.add('loading');
    element.dataset.originalContent = element.innerHTML;
    
    element.innerHTML = `
      <div class="loading-content">
        <i class="fas fa-spinner fa-spin"></i>
        <span>${text}</span>
      </div>
    `;
  },
  
  // Hide loading state
  hideLoading(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (!element) return;
    
    element.classList.remove('loading');
    
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
  },
  
  // Create toast notification
  createToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    toast.className = `toast ${type}`;
    
    const icon = this.getToastIcon(type);
    
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${icon}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="UI.removeToast('${toastId}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="toast-progress"></div>
    `;
    
    container.appendChild(toast);
    this.state.activeToasts.push(toastId);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Auto remove
    const timer = setTimeout(() => {
      this.removeToast(toastId);
    }, duration);
    
    toast.dataset.timer = timer;
    
    return toastId;
  },
  
  // Remove toast
  removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    // Clear timer
    if (toast.dataset.timer) {
      clearTimeout(parseInt(toast.dataset.timer));
    }
    
    // Animate out
    toast.classList.remove('show');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove from active toasts
      this.state.activeToasts = this.state.activeToasts.filter(id => id !== toastId);
    }, 300);
  },
  
  // Get toast icon
  getToastIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  },
  
  // Smooth scroll to element
  smoothScrollTo(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;
    
    const targetPosition = element.offsetTop - offset;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  },
  
  // Animate number counting
  animateNumber(element, target, duration = 1000) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  },
  
  // Debounce function
  debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Format currency
  formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },
  
  // Format date
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('en-IN', { ...defaultOptions, ...options }).format(new Date(date));
  },
  
  // Format time
  formatTime(date, options = {}) {
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-IN', { ...defaultOptions, ...options }).format(new Date(date));
  },
  
  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.createToast('Copied to clipboard', 'success', 2000);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        textArea.remove();
        this.createToast('Copied to clipboard', 'success', 2000);
        return true;
      } catch (err) {
        textArea.remove();
        this.createToast('Failed to copy', 'error', 2000);
        return false;
      }
    }
  },
  
  // Validate form
  validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      const isFieldValid = this.validateField(input);
      if (!isFieldValid) {
        isValid = false;
      }
    });
    
    return isValid;
  },
  
  // Validate individual field
  validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    let isValid = true;
    let message = '';
    
    // Check required
    if (input.hasAttribute('required') && !value) {
      isValid = false;
      message = 'This field is required';
    }
    
    // Type-specific validation
    if (value && type === 'email' && !this.isValidEmail(value)) {
      isValid = false;
      message = 'Please enter a valid email address';
    }
    
    if (value && type === 'tel' && !this.isValidPhone(value)) {
      isValid = false;
      message = 'Please enter a valid phone number';
    }
    
    if (value && input.minLength && value.length < input.minLength) {
      isValid = false;
      message = `Minimum ${input.minLength} characters required`;
    }
    
    // Update field state
    this.updateFieldValidation(input, isValid, message);
    
    return isValid;
  },
  
  // Update field validation state
  updateFieldValidation(input, isValid, message) {
    const parent = input.closest('.form-group');
    if (!parent) return;
    
    // Remove existing validation
    parent.classList.remove('field-valid', 'field-invalid');
    const existingError = parent.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    
    if (!input.value.trim()) {
      return; // Don't show validation for empty fields
    }
    
    if (isValid) {
      parent.classList.add('field-valid');
    } else {
      parent.classList.add('field-invalid');
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = message;
      parent.appendChild(errorDiv);
    }
  },
  
  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Phone validation
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s-()]{10,15}$/;
    return phoneRegex.test(phone);
  }
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  .navbar.scrolled {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(30px);
  }
  
  .navbar.hidden {
    transform: translateY(-100%);
  }
  
  .animate-in {
    animation: slideInUp 0.6s ease-out;
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--tertiary-white);
  }
  
  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: currentColor;
    width: 100%;
    animation: progress 5s linear;
  }
  
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  .toast-close {
    background: none;
    border: none;
    color: currentColor;
    cursor: pointer;
    padding: 0.25rem;
    margin-left: auto;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .toast-close:hover {
    opacity: 1;
  }
  
  .field-valid input,
  .field-valid select,
  .field-valid textarea {
    border-color: rgba(34, 197, 94, 0.5);
  }
  
  .field-invalid input,
  .field-invalid select,
  .field-invalid textarea {
    border-color: rgba(239, 68, 68, 0.5);
  }
  
  .field-error {
    color: rgba(239, 68, 68, 0.9);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  .nav-menu.active {
    display: flex !important;
    flex-direction: column;
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(30px);
    padding: 1rem;
    z-index: 999;
  }
  
  .nav-toggle.active span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }
  
  .nav-toggle.active span:nth-child(2) {
    opacity: 0;
  }
  
  .nav-toggle.active span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
  }
  
  @media (max-width: 768px) {
    .nav-menu {
      display: none;
    }
    
    .nav-toggle {
      display: flex !important;
    }
  }
`;

document.head.appendChild(style);

// Initialize UI module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});

// Export for global access
window.UI = UI;

console.log('🎨 UI module loaded');
