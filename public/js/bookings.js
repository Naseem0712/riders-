// Bookings Module
// Handles ride bookings, booking management, and WhatsApp location sharing

const Bookings = {
  // State
  state: {
    userBookings: [],
    currentTab: 'upcoming',
    isLoading: false
  },
  
  // API endpoints
  endpoints: {
    create: '/api/bookings',
    myBookings: '/api/bookings/my-bookings',
    get: '/api/bookings',
    cancel: '/api/bookings/cancel',
    shareLocation: '/api/bookings/share-location',
    rate: '/api/bookings/rate'
  },
  
  // Initialize bookings module
  init() {
    this.initEventListeners();
    console.log('📅 Bookings module initialized');
  },
  
  // Initialize event listeners
  initEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  },
  
  // Switch booking tabs
  switchTab(tab) {
    this.state.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Load bookings for the selected tab
    this.loadBookings(tab);
  },
  
  // Load user bookings
  async loadBookings(type = 'upcoming') {
    if (!App.state.isAuthenticated) {
      this.displayNotLoggedIn();
      return;
    }
    
    try {
      this.state.isLoading = true;
      this.showBookingsLoading();
      
      const params = new URLSearchParams({
        type,
        page: 1,
        limit: 10
      });
      
      const response = await Auth.apiRequest(`${this.endpoints.myBookings}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        this.state.userBookings = data.data.bookings;
        this.displayBookings(data.data.bookings, type);
        
        if (data.data.bookings.length === 0) {
          this.displayNoBookings(type);
        }
      } else {
        throw new Error(data.message);
      }
      
    } catch (error) {
      console.error('Load bookings error:', error);
      App.showToast('Failed to load bookings', 'error');
      this.displayBookingsError();
    } finally {
      this.state.isLoading = false;
    }
  },
  
  // Create a new booking
  async createBooking(rideId, bookingData) {
    if (!App.state.isAuthenticated) {
      App.showAuthModal('login');
      return false;
    }
    
    try {
      const response = await Auth.apiRequest(this.endpoints.create, {
        method: 'POST',
        body: JSON.stringify({
          rideId,
          ...bookingData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Ride booked successfully!', 'success');
        
        // Show booking confirmation
        this.showBookingConfirmation(data.data.booking);
        
        // Refresh bookings
        this.loadBookings(this.state.currentTab);
        
        return true;
      } else {
        App.showToast(data.message || 'Booking failed', 'error');
        return false;
      }
      
    } catch (error) {
      console.error('Create booking error:', error);
      App.showToast('Booking failed. Please try again.', 'error');
      return false;
    }
  },
  
  // Display bookings
  displayBookings(bookings, type) {
    const container = document.getElementById('bookingsContent');
    if (!container) return;
    
    if (bookings.length === 0) {
      this.displayNoBookings(type);
      return;
    }
    
    const bookingsHTML = bookings.map(booking => this.createBookingCard(booking, type)).join('');
    
    container.innerHTML = `
      <div class="bookings-grid">
        ${bookingsHTML}
      </div>
    `;
  },
  
  // Create booking card HTML
  createBookingCard(booking, type) {
    const ride = booking.ride;
    const departureTime = new Date(ride.departureDateTime);
    const isUpcoming = departureTime > new Date();
    
    return `
      <div class="booking-card glass-card" data-booking-id="${booking._id}">
        <div class="booking-header">
          <div class="booking-status status-${booking.status}">
            <i class="fas fa-${this.getStatusIcon(booking.status)}"></i>
            <span>${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
          </div>
          <div class="booking-reference">
            <span>Ref: ${booking.referenceNumber}</span>
          </div>
        </div>
        
        <div class="booking-route">
          <div class="route-point">
            <i class="fas fa-circle pickup-dot"></i>
            <span>${ride.pickup.address}</span>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <i class="fas fa-map-marker-alt destination-dot"></i>
            <span>${ride.destination.address}</span>
          </div>
        </div>
        
        <div class="booking-details">
          <div class="detail-row">
            <div class="detail-item">
              <i class="fas fa-calendar"></i>
              <span>${departureTime.toLocaleDateString()}</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-clock"></i>
              <span>${departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-item">
              <i class="fas fa-users"></i>
              <span>${booking.seatsBooked} seat${booking.seatsBooked > 1 ? 's' : ''}</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-rupee-sign"></i>
              <span>₹${booking.totalAmount}</span>
            </div>
          </div>
        </div>
        
        <div class="booking-driver">
          <div class="driver-info">
            <div class="driver-avatar">
              ${ride.driver.profilePicture ? 
                `<img src="${ride.driver.profilePicture}" alt="${ride.driver.name}">` : 
                `<i class="fas fa-user"></i>`
              }
            </div>
            <div class="driver-details">
              <div class="driver-name">${ride.driver.name}</div>
              <div class="driver-contact">${ride.driver.mobile}</div>
            </div>
          </div>
          <div class="vehicle-info">
            <span>${ride.vehicle.make} ${ride.vehicle.model}</span>
            <span class="vehicle-plate">${ride.vehicle.licensePlate}</span>
          </div>
        </div>
        
        <div class="booking-actions">
          ${this.getBookingActions(booking, isUpcoming)}
        </div>
      </div>
    `;
  },
  
  // Get status icon
  getStatusIcon(status) {
    const icons = {
      pending: 'clock',
      confirmed: 'check-circle',
      completed: 'flag-checkered',
      cancelled: 'times-circle',
      no_show: 'exclamation-triangle'
    };
    return icons[status] || 'info-circle';
  },
  
  // Get booking actions based on status and timing
  getBookingActions(booking, isUpcoming) {
    const actions = [];
    
    if (booking.status === 'confirmed' && isUpcoming) {
      // Upcoming confirmed booking
      actions.push(`
        <button class="btn btn-primary" onclick="Bookings.shareLocation('${booking._id}')">
          <i class="fab fa-whatsapp"></i>
          <span>Share Location</span>
        </button>
      `);
      
      actions.push(`
        <button class="btn btn-ghost" onclick="Bookings.viewBookingDetails('${booking._id}')">
          <i class="fas fa-info-circle"></i>
          <span>Details</span>
        </button>
      `);
      
      // Allow cancellation if not too close to departure
      const hoursUntilDeparture = (new Date(booking.ride.departureDateTime) - new Date()) / (1000 * 60 * 60);
      if (hoursUntilDeparture > 2) {
        actions.push(`
          <button class="btn btn-danger" onclick="Bookings.cancelBooking('${booking._id}')">
            <i class="fas fa-times"></i>
            <span>Cancel</span>
          </button>
        `);
      }
    } else if (booking.status === 'completed') {
      // Completed booking
      if (!booking.rating || !booking.rating.forDriver) {
        actions.push(`
          <button class="btn btn-primary" onclick="Bookings.rateRide('${booking._id}')">
            <i class="fas fa-star"></i>
            <span>Rate Ride</span>
          </button>
        `);
      }
      
      actions.push(`
        <button class="btn btn-ghost" onclick="Bookings.viewBookingDetails('${booking._id}')">
          <i class="fas fa-receipt"></i>
          <span>Receipt</span>
        </button>
      `);
    } else {
      // Other statuses
      actions.push(`
        <button class="btn btn-ghost" onclick="Bookings.viewBookingDetails('${booking._id}')">
          <i class="fas fa-info-circle"></i>
          <span>Details</span>
        </button>
      `);
    }
    
    return actions.join('');
  },
  
  // Share location via WhatsApp
  async shareLocation(bookingId) {
    try {
      const response = await Auth.apiRequest(`${this.endpoints.shareLocation.replace(':id', bookingId)}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Open WhatsApp with pre-filled message
        window.open(data.data.whatsappUrl, '_blank');
        
        App.showToast('WhatsApp opened with location message', 'success');
      } else {
        App.showToast(data.message || 'Failed to generate location share', 'error');
      }
      
    } catch (error) {
      console.error('Share location error:', error);
      App.showToast('Failed to share location', 'error');
    }
  },
  
  // Cancel booking
  async cancelBooking(bookingId) {
    const reason = prompt('Please provide a reason for cancellation (optional):');
    
    if (reason === null) return; // User cancelled the prompt
    
    try {
      const response = await Auth.apiRequest(`${this.endpoints.cancel.replace(':id', bookingId)}`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Booking cancelled successfully', 'success');
        
        // Show cancellation details
        if (data.data.cancellationFee > 0) {
          App.showToast(`Cancellation fee: ₹${data.data.cancellationFee}. Refund: ₹${data.data.refundAmount}`, 'info');
        }
        
        // Refresh bookings
        this.loadBookings(this.state.currentTab);
      } else {
        App.showToast(data.message || 'Cancellation failed', 'error');
      }
      
    } catch (error) {
      console.error('Cancel booking error:', error);
      App.showToast('Cancellation failed. Please try again.', 'error');
    }
  },
  
  // Rate a completed ride
  async rateRide(bookingId) {
    this.showRatingModal(bookingId);
  },
  
  // Show rating modal
  showRatingModal(bookingId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>Rate Your Ride</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="ratingForm">
            <div class="rating-section">
              <label>How was your ride?</label>
              <div class="star-rating" data-rating="0">
                <span class="star" data-value="1">★</span>
                <span class="star" data-value="2">★</span>
                <span class="star" data-value="3">★</span>
                <span class="star" data-value="4">★</span>
                <span class="star" data-value="5">★</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="ratingReview">Review (optional)</label>
              <textarea id="ratingReview" rows="3" placeholder="Share your experience..."></textarea>
            </div>
            
            <div class="rating-tags">
              <label>Quick tags:</label>
              <div class="tag-group">
                <button type="button" class="tag-btn" data-tag="punctual">Punctual</button>
                <button type="button" class="tag-btn" data-tag="friendly">Friendly</button>
                <button type="button" class="tag-btn" data-tag="safe_driving">Safe Driving</button>
                <button type="button" class="tag-btn" data-tag="clean_vehicle">Clean Vehicle</button>
                <button type="button" class="tag-btn" data-tag="good_music">Good Music</button>
              </div>
            </div>
            
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-star"></i>
                <span>Submit Rating</span>
              </button>
              <button type="button" class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add star rating functionality
    this.initStarRating(modal, bookingId);
  },
  
  // Initialize star rating
  initStarRating(modal, bookingId) {
    const starRating = modal.querySelector('.star-rating');
    const stars = starRating.querySelectorAll('.star');
    const form = modal.querySelector('#ratingForm');
    const tagBtns = modal.querySelectorAll('.tag-btn');
    
    let selectedRating = 0;
    let selectedTags = [];
    
    // Star rating interaction
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        selectedRating = index + 1;
        starRating.dataset.rating = selectedRating;
        
        stars.forEach((s, i) => {
          s.classList.toggle('active', i < selectedRating);
        });
      });
      
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, i) => {
          s.classList.toggle('hover', i <= index);
        });
      });
    });
    
    starRating.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('hover'));
    });
    
    // Tag selection
    tagBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        btn.classList.toggle('active');
        
        if (selectedTags.includes(tag)) {
          selectedTags = selectedTags.filter(t => t !== tag);
        } else {
          selectedTags.push(tag);
        }
      });
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (selectedRating === 0) {
        App.showToast('Please select a rating', 'error');
        return;
      }
      
      const review = modal.querySelector('#ratingReview').value;
      
      await this.submitRating(bookingId, selectedRating, review, selectedTags);
      modal.remove();
    });
  },
  
  // Submit rating
  async submitRating(bookingId, rating, review, tags) {
    try {
      const response = await Auth.apiRequest(`${this.endpoints.rate.replace(':id', bookingId)}`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          review,
          tags
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Rating submitted successfully!', 'success');
        this.loadBookings(this.state.currentTab);
      } else {
        App.showToast(data.message || 'Failed to submit rating', 'error');
      }
      
    } catch (error) {
      console.error('Submit rating error:', error);
      App.showToast('Failed to submit rating', 'error');
    }
  },
  
  // View booking details
  async viewBookingDetails(bookingId) {
    try {
      const response = await Auth.apiRequest(`${this.endpoints.get}/${bookingId}`);
      const data = await response.json();
      
      if (data.success) {
        this.showBookingDetailsModal(data.data.booking);
      } else {
        App.showToast('Failed to load booking details', 'error');
      }
      
    } catch (error) {
      console.error('View booking details error:', error);
      App.showToast('Failed to load booking details', 'error');
    }
  },
  
  // Show booking details modal
  showBookingDetailsModal(booking) {
    // Create detailed booking modal
    App.showToast('Booking details modal coming soon!', 'info');
  },
  
  // Show booking confirmation
  showBookingConfirmation(booking) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>Booking Confirmed!</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="confirmation-content">
            <div class="confirmation-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            
            <div class="booking-summary">
              <p><strong>Reference:</strong> ${booking.referenceNumber}</p>
              <p><strong>Route:</strong> ${booking.ride.pickup.address} → ${booking.ride.destination.address}</p>
              <p><strong>Date:</strong> ${new Date(booking.ride.departureDateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(booking.ride.departureDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Seats:</strong> ${booking.seatsBooked}</p>
              <p><strong>Total:</strong> ₹${booking.totalAmount}</p>
            </div>
            
            <div class="confirmation-actions">
              <button class="btn btn-primary" onclick="Bookings.shareLocation('${booking._id}'); this.closest('.modal').remove();">
                <i class="fab fa-whatsapp"></i>
                <span>Share Location</span>
              </button>
              <button class="btn btn-ghost" onclick="App.showSection('bookings'); this.closest('.modal').remove();">
                <i class="fas fa-calendar"></i>
                <span>View Bookings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        modal.remove();
      }
    }, 10000);
  },
  
  // Display no bookings
  displayNoBookings(type) {
    const container = document.getElementById('bookingsContent');
    if (!container) return;
    
    const messages = {
      upcoming: {
        title: 'No upcoming rides',
        message: 'You don\'t have any upcoming bookings.',
        action: 'Find Rides',
        section: 'search'
      },
      past: {
        title: 'No past rides',
        message: 'You haven\'t taken any rides yet.',
        action: 'Find Rides',
        section: 'search'
      },
      offered: {
        title: 'No rides offered',
        message: 'You haven\'t offered any rides yet.',
        action: 'Offer Ride',
        section: 'offer'
      }
    };
    
    const config = messages[type] || messages.upcoming;
    
    container.innerHTML = `
      <div class="no-bookings glass-card">
        <div class="no-bookings-icon">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <h3>${config.title}</h3>
        <p>${config.message}</p>
        <button class="btn btn-primary" onclick="App.showSection('${config.section}')">
          <i class="fas fa-${config.section === 'search' ? 'search' : 'plus-circle'}"></i>
          <span>${config.action}</span>
        </button>
      </div>
    `;
  },
  
  // Display not logged in message
  displayNotLoggedIn() {
    const container = document.getElementById('bookingsContent');
    if (!container) return;
    
    container.innerHTML = `
      <div class="not-logged-in glass-card">
        <div class="not-logged-in-icon">
          <i class="fas fa-user-lock"></i>
        </div>
        <h3>Login Required</h3>
        <p>Please login to view your bookings and manage your rides.</p>
        <div class="login-actions">
          <button class="btn btn-primary" onclick="App.showAuthModal('login')">
            <i class="fas fa-sign-in-alt"></i>
            <span>Login</span>
          </button>
          <button class="btn btn-ghost" onclick="App.showAuthModal('register')">
            <i class="fas fa-user-plus"></i>
            <span>Sign Up</span>
          </button>
        </div>
      </div>
    `;
  },
  
  // Show bookings loading
  showBookingsLoading() {
    const container = document.getElementById('bookingsContent');
    if (!container) return;
    
    container.innerHTML = `
      <div class="bookings-loading">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading your bookings...</p>
      </div>
    `;
  },
  
  // Display bookings error
  displayBookingsError() {
    const container = document.getElementById('bookingsContent');
    if (!container) return;
    
    container.innerHTML = `
      <div class="bookings-error glass-card">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Error Loading Bookings</h3>
        <p>We couldn't load your bookings right now. Please try again.</p>
        <button class="btn btn-primary" onclick="Bookings.loadBookings(Bookings.state.currentTab)">
          <i class="fas fa-redo"></i>
          <span>Try Again</span>
        </button>
      </div>
    `;
  }
};

// Initialize bookings module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Bookings.init();
});

// Export for global access
window.Bookings = Bookings;

console.log('📅 Bookings module loaded');
