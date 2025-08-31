// Main Application JavaScript
// Riders Luxury - Premium Ride Sharing App

/* ===== APPLICATION STATE ===== */
const App = {
  // Application state
  state: {
    isAuthenticated: false,
    user: null,
    currentSection: 'home',
    rides: [],
    bookings: [],
    searchFilters: {},
    isLoading: false
  },
  
  // API base URL
  apiUrl: window.location.origin + '/api',
  
  // Initialize the application
  init() {
    console.log('🚗 Riders Luxury App initializing...');
    
    // Initialize components
    this.initServiceWorker();
    this.initEventListeners();
    this.initNavigation();
    this.checkAuthState();
    this.initPWA();
    this.hideLoadingScreen();
    
    console.log('✅ Riders Luxury App initialized');
  },
  
  // Hide loading screen
  hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    }, 1500); // Show loading for 1.5 seconds
  },
  
  // Initialize service worker
  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }
  },
  
  // Initialize event listeners
  initEventListeners() {
    // Navigation toggle for mobile
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
      });
    }
    
    // Price range slider
    const priceSlider = document.getElementById('maxPrice');
    const priceDisplay = document.getElementById('priceValue');
    
    if (priceSlider && priceDisplay) {
      priceSlider.addEventListener('input', (e) => {
        priceDisplay.textContent = e.target.value;
      });
    }
    
    // Search form
    const searchForm = document.getElementById('searchRideForm');
    if (searchForm) {
      searchForm.addEventListener('submit', this.handleSearchRides.bind(this));
    }
    
    // Offer ride form
    const offerForm = document.getElementById('offerRideForm');
    if (offerForm) {
      offerForm.addEventListener('submit', this.handleOfferRide.bind(this));
    }
    
    // Set minimum date to today
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
      input.setAttribute('min', today);
      if (!input.value) {
        input.value = today;
      }
    });
    
    // Tab navigation for bookings
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchBookingsTab(tab);
      });
    });
    
    // Modal close on background click
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideAuthModal();
        }
      });
    }
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAuthModal();
      }
    });
  },
  
  // Initialize navigation
  initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.showSection(section);
      });
    });
    
    // Handle URL hash changes
    window.addEventListener('hashchange', () => {
      const section = window.location.hash.substr(1) || 'home';
      this.showSection(section);
    });
    
    // Handle initial URL
    const initialSection = window.location.hash.substr(1) || 'home';
    this.showSection(initialSection);
    
    // Handle URL parameters for shortcuts
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search')) {
      this.showSection('search');
    } else if (urlParams.has('offer')) {
      this.showSection('offer');
    } else if (urlParams.has('bookings')) {
      this.showSection('bookings');
    }
  },
  
  // Show specific section
  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionName);
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === sectionName);
    });
    
    // Update state
    this.state.currentSection = sectionName;
    
    // Update URL
    window.history.replaceState(null, null, `#${sectionName}`);
    
    // Load section-specific data
    this.loadSectionData(sectionName);
  },
  
  // Load data for specific section
  async loadSectionData(sectionName) {
    switch (sectionName) {
      case 'search':
        // Auto-search for popular routes or recent searches
        break;
        
      case 'offer':
        if (this.state.isAuthenticated) {
          await Rides.loadUserVehicles();
        } else {
          this.showAuthModal('login');
        }
        break;
        
      case 'bookings':
        if (this.state.isAuthenticated) {
          await this.loadUserBookings();
        } else {
          this.showAuthModal('login');
        }
        break;
        
      case 'profile':
        if (this.state.isAuthenticated) {
          await this.loadUserProfile();
        } else {
          this.showAuthModal('login');
        }
        break;
    }
  },
  
  // Check authentication state
  async checkAuthState() {
    const token = localStorage.getItem('riders_token');
    
    if (token) {
      try {
        const response = await fetch(`${this.apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.setAuthState(true, data.data.user);
        } else {
          // Token is invalid
          localStorage.removeItem('riders_token');
          this.setAuthState(false, null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        this.setAuthState(false, null);
      }
    }
  },
  
  // Set authentication state
  setAuthState(isAuthenticated, user) {
    this.state.isAuthenticated = isAuthenticated;
    this.state.user = user;
    
    // Update UI
    const navAuth = document.getElementById('navAuth');
    const offeredTab = document.getElementById('offeredTab');
    
    if (isAuthenticated && user) {
      navAuth.innerHTML = `
        <div class="user-menu">
          <div class="user-avatar">
            ${user.profilePicture ? 
              `<img src="${user.profilePicture}" alt="${user.name}">` : 
              `<i class="fas fa-user"></i>`
            }
          </div>
          <span class="user-name">${user.name}</span>
          <button class="btn btn-ghost btn-small" onclick="App.logout()">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      `;
      
      // Show driver features if user is a driver
      if (user.role === 'driver' && offeredTab) {
        offeredTab.style.display = 'block';
      }
    } else {
      navAuth.innerHTML = `
        <button class="btn btn-ghost" onclick="App.showAuthModal('login')">
          <i class="fas fa-sign-in-alt"></i>
          <span>Login</span>
        </button>
      `;
      
      if (offeredTab) {
        offeredTab.style.display = 'none';
      }
    }
  },
  
  // Logout user
  logout() {
    localStorage.removeItem('riders_token');
    this.setAuthState(false, null);
    this.showSection('home');
    this.showToast('Logged out successfully', 'info');
  },
  
  // Show authentication modal
  showAuthModal(type = 'login') {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const forms = document.querySelectorAll('.auth-form');
    
    // Hide all forms
    forms.forEach(form => form.style.display = 'none');
    
    // Show specific form
    const targetForm = document.getElementById(`${type}Form`);
    if (targetForm) {
      targetForm.style.display = 'block';
    }
    
    // Update title
    const titles = {
      login: 'Welcome Back',
      register: 'Join Riders Luxury',
      forgot: 'Reset Password'
    };
    title.textContent = titles[type] || 'Welcome to Riders Luxury';
    
    // Show modal
    modal.classList.add('active');
    
    // Focus first input
    setTimeout(() => {
      const firstInput = targetForm.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 300);
  },
  
  // Hide authentication modal
  hideAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
  },
  
  // Handle search rides
  async handleSearchRides(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const searchData = {
      pickup: formData.get('pickup') || document.getElementById('searchPickup').value,
      destination: formData.get('destination') || document.getElementById('searchDestination').value,
      date: formData.get('date') || document.getElementById('searchDate').value,
      seats: formData.get('seats') || document.getElementById('searchSeats').value,
      maxPrice: document.getElementById('maxPrice').value,
      minRating: document.getElementById('minRating').value
    };
    
    // Validate required fields
    if (!searchData.pickup || !searchData.destination || !searchData.date) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }
    
    this.state.isLoading = true;
    this.showToast('Searching for rides...', 'info');
    
    try {
      await this.searchRides(searchData);
    } catch (error) {
      console.error('Search failed:', error);
      this.showToast('Search failed. Please try again.', 'error');
    } finally {
      this.state.isLoading = false;
    }
  },
  
  // Search for rides
  async searchRides(searchData) {
    try {
      // Simulate API call with demo data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate demo rides based on search
      const demoRides = this.generateDemoRides(searchData);
      
      this.state.rides = demoRides;
      this.displaySearchResults(demoRides, { currentPage: 1, totalPages: 1, total: demoRides.length });
      
      if (demoRides.length === 0) {
        this.showRideRequestOption(searchData);
        this.showToast('No rides found. You can post a ride request!', 'info');
      } else {
        this.showToast(`Found ${demoRides.length} rides`, 'success');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showToast('Search failed. Please try again.', 'error');
    }
  },

  // Generate demo rides for search results
  generateDemoRides(searchData) {
    const demoRides = [
      {
        _id: 'ride_1',
        driverName: 'John Driver',
        vehicleInfo: 'Honda City - White',
        from: searchData.pickup || 'Delhi',
        to: searchData.destination || 'Mumbai', 
        date: searchData.date || new Date().toISOString().split('T')[0],
        time: '09:00 AM',
        availableSeats: 3,
        pricePerSeat: 150,
        totalPrice: 450,
        driverRating: 4.8,
        verified: true
      },
      {
        _id: 'ride_2', 
        driverName: 'Sarah Khan',
        vehicleInfo: 'Toyota Innova - Silver',
        from: searchData.pickup || 'Delhi',
        to: searchData.destination || 'Mumbai',
        date: searchData.date || new Date().toISOString().split('T')[0],
        time: '02:00 PM',
        availableSeats: 5,
        pricePerSeat: 180,
        totalPrice: 900,
        driverRating: 4.9,
        verified: true
      }
    ];
    
    // Filter based on search criteria
    return demoRides.filter(ride => {
      if (searchData.maxPrice && ride.pricePerSeat > parseInt(searchData.maxPrice)) return false;
      if (searchData.seats && ride.availableSeats < parseInt(searchData.seats)) return false;
      return true;
    });
  },
  
  // Display search results
  displaySearchResults(rides, pagination) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!rides || rides.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results glass-card">
          <div class="no-results-icon">
            <i class="fas fa-search"></i>
          </div>
          <h3>No rides found</h3>
          <p>Try adjusting your search criteria or check back later for new rides.</p>
          <button class="btn btn-primary" onclick="App.showAdvancedFilters()">
            <i class="fas fa-filter"></i>
            <span>Adjust Filters</span>
          </button>
        </div>
      `;
      return;
    }
    
    const ridesHTML = rides.map(ride => this.createRideCard(ride)).join('');
    
    resultsContainer.innerHTML = `
      <div class="search-results-header">
        <h3>${rides.length} rides found</h3>
        <div class="sort-options">
          <select onchange="App.sortResults(this.value)">
            <option value="departureDateTime">Sort by departure time</option>
            <option value="pricePerSeat">Sort by price</option>
            <option value="rating">Sort by rating</option>
          </select>
        </div>
      </div>
      
      <div class="rides-grid">
        ${ridesHTML}
      </div>
      
      ${pagination && pagination.totalPages > 1 ? this.createPagination(pagination) : ''}
    `;
  },
  
  // Create ride card HTML
  createRideCard(ride) {
    const departureTime = new Date(ride.departureDateTime);
    const formattedTime = departureTime.toLocaleString();
    
    return `
      <div class="ride-card glass-card" data-ride-id="${ride._id}">
        <div class="ride-header">
          <div class="driver-info">
            <div class="driver-avatar">
              ${ride.driverInfo && ride.driverInfo[0] && ride.driverInfo[0].profilePicture ? 
                `<img src="${ride.driverInfo[0].profilePicture}" alt="${ride.driverInfo[0].name}">` : 
                `<i class="fas fa-user"></i>`
              }
            </div>
            <div class="driver-details">
              <div class="driver-name">${ride.driverInfo && ride.driverInfo[0] ? ride.driverInfo[0].name : 'Driver'}</div>
              <div class="driver-rating">
                <span class="stars">${'★'.repeat(Math.floor((ride.driverInfo && ride.driverInfo[0] && ride.driverInfo[0].rating && ride.driverInfo[0].rating.average) || 5))}</span>
                <span class="rating-text">${(ride.driverInfo && ride.driverInfo[0] && ride.driverInfo[0].rating && ride.driverInfo[0].rating.average) || '5.0'}</span>
              </div>
            </div>
          </div>
          <div class="ride-price">₹${ride.pricePerSeat}</div>
        </div>
        
        <div class="ride-route">
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
        
        <div class="ride-details">
          <div class="detail-item">
            <i class="fas fa-clock"></i>
            <span>${formattedTime}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-users"></i>
            <span>${ride.remainingSeats || ride.availableSeats} seats</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-car"></i>
            <span>${ride.vehicleInfo && ride.vehicleInfo[0] ? `${ride.vehicleInfo[0].make} ${ride.vehicleInfo[0].model}` : 'Vehicle'}</span>
          </div>
        </div>
        
        <div class="ride-actions">
          <button class="btn btn-primary ripple-effect" onclick="App.bookRide('${ride._id}')">
            <i class="fas fa-ticket-alt"></i>
            <span>Book Now</span>
          </button>
          <button class="btn btn-ghost" onclick="App.viewRideDetails('${ride._id}')">
            <i class="fas fa-info-circle"></i>
            <span>Details</span>
          </button>
        </div>
      </div>
    `;
  },
  
  // Show/hide advanced filters
  showAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    if (filters) {
      filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
    }
  },
  
    // Handle offer ride
  async handleOfferRide(e) {
    e.preventDefault();

    if (!this.state.isAuthenticated) {
      this.showAuthModal('login');
      return;
    }

    // Show ride offer form first
    this.showSection('offer-ride');
    
    // Load user vehicles for selection
    await this.loadUserVehicles();
  },
  
  // Book a ride
  async bookRide(rideId) {
    if (!this.state.isAuthenticated) {
      this.showAuthModal('login');
      return;
    }
    
    // Show booking confirmation modal
    this.showBookingModal(rideId);
  },
  
  // View ride details
  viewRideDetails(rideId) {
    // Implementation for viewing ride details
    this.showToast('Ride details functionality coming soon!', 'info');
  },

  // Show booking modal
  showBookingModal(rideId) {
    // Create booking modal if not exists
    let modal = document.getElementById('bookingModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookingModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content glass-card">
          <div class="modal-header">
            <h3>Book This Ride</h3>
            <button class="modal-close" onclick="hideBookingModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <form id="bookingForm">
              <div class="form-group">
                <label>Number of Seats</label>
                <select id="bookingSeats" required>
                  <option value="1">1 Seat</option>
                  <option value="2">2 Seats</option>
                  <option value="3">3 Seats</option>
                  <option value="4">4 Seats</option>
                </select>
              </div>
              <div class="form-group">
                <label>Pickup Point</label>
                <input type="text" id="bookingPickup" placeholder="Enter pickup location" required>
              </div>
              <div class="form-group">
                <label>Drop Point</label>
                <input type="text" id="bookingDrop" placeholder="Enter drop location" required>
              </div>
              <div class="form-group">
                <label>Special Instructions</label>
                <textarea id="bookingNotes" placeholder="Any special requests..." rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideBookingModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add form submission handler
      const form = modal.querySelector('#bookingForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.confirmBooking(rideId);
      });
    }

    modal.style.display = 'flex';
  },

  // Confirm booking
  async confirmBooking(rideId) {
    const bookingData = {
      seats: document.getElementById('bookingSeats').value,
      pickup: document.getElementById('bookingPickup').value,
      drop: document.getElementById('bookingDrop').value,
      notes: document.getElementById('bookingNotes').value
    };

    try {
      this.setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.showToast('Ride booked successfully! 🎉', 'success');
      this.hideBookingModal();
      
      // Start 12-hour contact window
      Profile.startContactWindow(rideId, 'driver_123', 'John Driver');
      
    } catch (error) {
      console.error('Booking error:', error);
      this.showToast('Booking failed. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // Hide booking modal
  hideBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // Handle ride request (when no rides found)
  async handleRideRequest(formData) {
    if (!this.state.isAuthenticated) {
      this.showAuthModal('login');
      return;
    }

    const requestData = {
      pickup: formData.get('pickup') || 'Current Location',
      destination: formData.get('destination') || 'Destination',
      vehicleType: formData.get('vehicleType'),
      seatsNeeded: parseInt(formData.get('seats')),
      budgetPerSeat: parseInt(formData.get('budget')) || 50,
      preferredDate: formData.get('date') || new Date().toISOString().split('T')[0],
      preferredTime: formData.get('time') || '09:00',
      contactNumber: Auth.getCurrentUser()?.mobile || '+91 XXXXX XXXXX',
      notes: formData.get('notes') || `Need ${formData.get('vehicleType')} ride`
    };

    try {
      this.setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store ride request
      const requestId = 'req_' + Date.now();
      const storedRequests = JSON.parse(localStorage.getItem('rideRequests') || '[]');
      storedRequests.push({
        id: requestId,
        ...requestData,
        status: 'active',
        createdAt: new Date().toISOString(),
        userId: Auth.getCurrentUser()?.id || 'demo_user'
      });
      localStorage.setItem('rideRequests', JSON.stringify(storedRequests));
      
      this.showToast('🎉 Ride request posted! Drivers will be notified.', 'success');
      
      // Hide request section
      document.getElementById('rideRequestSection').style.display = 'none';
      
      // Show confirmation
      setTimeout(() => {
        this.showToast('📱 Your request is visible to drivers nearby', 'info');
      }, 2000);
      
    } catch (error) {
      console.error('Ride request error:', error);
      this.showToast('Failed to post request. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // Get current location
  getCurrentLocation(inputId) {
    if (navigator.geolocation) {
      this.showToast('🌍 Getting your location...', 'info');
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Use reverse geocoding to get address
            const address = await this.reverseGeocode(latitude, longitude);
            const input = document.getElementById(inputId);
            if (input) {
              input.value = address;
              input.dataset.coordinates = `${latitude},${longitude}`;
            }
            this.showToast('📍 Location found!', 'success');
          } catch (error) {
            console.error('Geocoding error:', error);
            this.showToast('📍 Location found, but address lookup failed', 'warning');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          this.showToast('Could not get your location. Please enter manually.', 'error');
        }
      );
    } else {
      this.showToast('Geolocation is not supported by this browser', 'error');
    }
  },

  // Reverse geocoding (simplified)
  async reverseGeocode(lat, lng) {
    // For demo purposes, return a sample address
    return `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  },
  
  // Switch bookings tab
  switchBookingsTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Load bookings for selected tab
    this.loadUserBookings(tab);
  },
  
  // Load user bookings
  async loadUserBookings(type = 'upcoming') {
    if (!this.state.isAuthenticated) return;
    
    // Implementation for loading bookings
    const bookingsContent = document.getElementById('bookingsContent');
    if (bookingsContent) {
      bookingsContent.innerHTML = `
        <div class="no-bookings glass-card">
          <div class="no-bookings-icon">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <h3>No ${type} bookings</h3>
          <p>You don't have any ${type} bookings yet.</p>
          <button class="btn btn-primary" onclick="App.showSection('search')">
            <i class="fas fa-search"></i>
            <span>Find Rides</span>
          </button>
        </div>
      `;
    }
  },
  
  // Load user vehicles for ride offering
  async loadUserVehicles() {
    if (!this.state.isAuthenticated) return;
    
    // Load vehicles from Vehicle module
    await Vehicle.loadUserVehicles();
    
    const vehicleSelector = document.getElementById('vehicleSelector');
    if (vehicleSelector) {
      if (Vehicle.userVehicles.length === 0) {
        // Show add vehicle prompt if no vehicles
        vehicleSelector.innerHTML = `
          <div class="add-vehicle-prompt">
            <i class="fas fa-plus-circle"></i>
            <p>Add your first vehicle to start offering rides</p>
            <button type="button" class="btn btn-primary" onclick="Vehicle.showAddModal()">
              <i class="fas fa-plus"></i> Add Vehicle
            </button>
          </div>
        `;
      } else {
        // Show vehicle selection dropdown
        vehicleSelector.innerHTML = `
          <div class="vehicle-selection">
            <label for="selectedVehicle">Select Vehicle for This Ride:</label>
            <select id="selectedVehicle" class="form-control" required>
              <option value="">Choose your vehicle</option>
              ${Vehicle.userVehicles.map(vehicle => `
                <option value="${vehicle._id}">
                  ${vehicle.make} ${vehicle.model} - ${vehicle.licensePlate}
                  ${vehicle.isVerified ? '✅' : '⏳'}
                </option>
              `).join('')}
            </select>
            <button type="button" class="btn btn-secondary btn-small mt-2" onclick="Vehicle.showAddModal()">
              <i class="fas fa-plus"></i> Add Another Vehicle
            </button>
          </div>
        `;
      }
    }
  },
  
  // Show add vehicle modal
  showAddVehicleModal() {
    Vehicle.showAddModal();
  },
  
  // Load user profile
  async loadUserProfile() {
    if (!this.state.isAuthenticated) return;
    
    const profileContent = document.getElementById('profileContent');
    if (profileContent && this.state.user) {
      profileContent.innerHTML = `
        <div class="profile-card glass-card">
          <div class="profile-header">
            <div class="profile-avatar">
              ${this.state.user.profilePicture ? 
                `<img src="${this.state.user.profilePicture}" alt="${this.state.user.name}">` : 
                `<i class="fas fa-user"></i>`
              }
            </div>
            <div class="profile-info">
              <h2>${this.state.user.name}</h2>
              <p>${this.state.user.email}</p>
              <p>${this.state.user.mobile}</p>
              <span class="role-badge">${this.state.user.role}</span>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat-item">
              <div class="stat-value">${this.state.user.rating?.average || '5.0'}</div>
              <div class="stat-label">Rating</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.state.user.totalRides?.asPassenger || 0}</div>
              <div class="stat-label">Rides Taken</div>
            </div>
            ${this.state.user.role === 'driver' ? `
              <div class="stat-item">
                <div class="stat-value">${this.state.user.totalRides?.asDriver || 0}</div>
                <div class="stat-label">Rides Offered</div>
              </div>
            ` : ''}
          </div>
          
          <div class="profile-actions">
            <button class="btn btn-primary" onclick="App.editProfile()">
              <i class="fas fa-edit"></i>
              <span>Edit Profile</span>
            </button>
            <button class="btn btn-ghost" onclick="App.logout()">
              <i class="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      `;
    }
  },
  
  // Edit profile
  editProfile() {
    this.showToast('Edit profile functionality coming soon!', 'info');
  },
  
  // Initialize PWA features
  initPWA() {
    // PWA install prompt
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install prompt
      const installPrompt = document.getElementById('installPrompt');
      if (installPrompt) {
        installPrompt.classList.add('show');
      }
    });
    
    // Install PWA function
    window.installPWA = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          this.showToast('App installed successfully!', 'success');
        }
        
        deferredPrompt = null;
        this.dismissInstall();
      }
    };
    
    // Dismiss install prompt
    window.dismissInstall = () => {
      const installPrompt = document.getElementById('installPrompt');
      if (installPrompt) {
        installPrompt.classList.remove('show');
      }
    };
  },
  
  // Show toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${this.getToastIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;
    
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 5000);
  },
  
  // Get toast icon based on type
  getToastIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  },
  
  // Create pagination HTML
  createPagination(pagination) {
    if (pagination.totalPages <= 1) return '';
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (pagination.hasPrev) {
      paginationHTML += `<button class="btn btn-ghost" onclick="App.loadPage(${pagination.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
      if (i === pagination.currentPage) {
        paginationHTML += `<button class="btn btn-primary">${i}</button>`;
      } else if (i <= 3 || i > pagination.totalPages - 3 || Math.abs(i - pagination.currentPage) <= 1) {
        paginationHTML += `<button class="btn btn-ghost" onclick="App.loadPage(${i})">${i}</button>`;
      } else if (i === 4 || i === pagination.totalPages - 3) {
        paginationHTML += `<span class="pagination-dots">...</span>`;
      }
    }
    
    // Next button
    if (pagination.hasNext) {
      paginationHTML += `<button class="btn btn-ghost" onclick="App.loadPage(${pagination.currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>`;
    }
    
    paginationHTML += '</div>';
    return paginationHTML;
  },
  
  // Load specific page
  loadPage(page) {
    // Implementation for pagination
    console.log('Loading page:', page);
  },
  
  // Sort results
  sortResults(sortBy) {
    // Implementation for sorting
    console.log('Sorting by:', sortBy);
  }
};

/* ===== GLOBAL FUNCTIONS ===== */
window.App = App;
window.showSection = App.showSection.bind(App);
window.showAuthModal = App.showAuthModal.bind(App);
window.hideAuthModal = App.hideAuthModal.bind(App);

/* ===== INITIALIZE APP ===== */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

console.log('🚗 Riders Luxury App script loaded');
