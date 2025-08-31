// Rides Module
// Handles ride searching, offering, and management

const Rides = {
  // State
  state: {
    currentRides: [],
    searchFilters: {},
    currentPage: 1,
    totalPages: 1,
    isLoading: false
  },
  
  // API endpoints
  endpoints: {
    search: '/api/rides/search',
    create: '/api/rides',
    get: '/api/rides',
    update: '/api/rides',
    delete: '/api/rides',
    myRides: '/api/rides/driver/my-rides'
  },
  
  // Initialize rides module
  init() {
    this.initEventListeners();
    this.initGeolocation();
    console.log('🚗 Rides module initialized');
  },
  
  // Initialize event listeners
  initEventListeners() {
    // Search form submission
    const searchForm = document.getElementById('searchRideForm');
    if (searchForm) {
      searchForm.addEventListener('submit', this.handleSearch.bind(this));
    }
    
    // Offer ride form submission
    const offerForm = document.getElementById('offerRideForm');
    if (offerForm) {
      offerForm.addEventListener('submit', this.handleOfferRide.bind(this));
    }
    
    // Advanced filters toggle
    const filtersBtn = document.querySelector('[onclick="showAdvancedFilters()"]');
    if (filtersBtn) {
      filtersBtn.addEventListener('click', this.toggleAdvancedFilters.bind(this));
    }
    
    // Price range slider
    const priceSlider = document.getElementById('maxPrice');
    if (priceSlider) {
      priceSlider.addEventListener('input', this.updatePriceDisplay.bind(this));
    }
    
    // Location inputs with autocomplete
    this.initLocationInputs();
  },
  
  // Initialize geolocation
  initGeolocation() {
    if ('geolocation' in navigator) {
      // Get user's current location for better search results
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 User location obtained');
        },
        (error) => {
          console.log('📍 Location access denied or unavailable');
        },
        { timeout: 10000, maximumAge: 300000 } // 5 minutes cache
      );
    }
  },
  
  // Initialize location inputs with autocomplete
  initLocationInputs() {
    const locationInputs = [
      'searchPickup',
      'searchDestination', 
      'offerPickup',
      'offerDestination'
    ];
    
    locationInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        this.addLocationAutocomplete(input);
      }
    });
  },
  
  // Add location autocomplete to input
  addLocationAutocomplete(input) {
    let timeout;
    let suggestions = [];
    
    // Create suggestions container
    const container = document.createElement('div');
    container.className = 'location-suggestions';
    input.parentNode.appendChild(container);
    
    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const query = e.target.value.trim();
      
      if (query.length < 3) {
        container.innerHTML = '';
        container.classList.remove('active');
        return;
      }
      
      timeout = setTimeout(() => {
        this.searchLocations(query).then(results => {
          suggestions = results;
          this.displayLocationSuggestions(container, results, input);
        });
      }, 300);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !container.contains(e.target)) {
        container.classList.remove('active');
      }
    });
  },
  
  // Search for locations (Global search)
  async searchLocations(query) {
    // Global locations database
    const globalLocations = [
      // India - Major Cities
      { name: 'Connaught Place, New Delhi, India', coordinates: [77.2196, 28.6304] },
      { name: 'India Gate, New Delhi, India', coordinates: [77.2273, 28.6129] },
      { name: 'Mumbai Airport, Mumbai, India', coordinates: [72.8777, 19.0896] },
      { name: 'Marine Drive, Mumbai, India', coordinates: [72.8235, 18.9438] },
      { name: 'Bangalore Palace, Bangalore, India', coordinates: [77.5921, 12.9981] },
      { name: 'Gurgaon Cyber City, India', coordinates: [77.0889, 28.4951] },
      { name: 'Hyderabad IT Hub, India', coordinates: [78.3406, 17.4126] },
      { name: 'Pune Station, Maharashtra, India', coordinates: [73.8567, 18.5204] },
      { name: 'Jaipur Pink City, Rajasthan, India', coordinates: [75.7873, 26.9124] },
      { name: 'Kolkata Victoria Memorial, India', coordinates: [88.3426, 22.5448] },
      
      // USA
      { name: 'Times Square, New York, USA', coordinates: [-73.9857, 40.7589] },
      { name: 'Hollywood Sign, Los Angeles, USA', coordinates: [-118.3219, 34.1341] },
      { name: 'Golden Gate Bridge, San Francisco, USA', coordinates: [-122.4783, 37.8199] },
      { name: 'Miami Beach, Florida, USA', coordinates: [-80.1300, 25.7907] },
      { name: 'Chicago Downtown, Illinois, USA', coordinates: [-87.6244, 41.8756] },
      
      // Europe
      { name: 'Eiffel Tower, Paris, France', coordinates: [2.2945, 48.8584] },
      { name: 'Big Ben, London, UK', coordinates: [-0.1246, 51.4994] },
      { name: 'Colosseum, Rome, Italy', coordinates: [12.4922, 41.8902] },
      { name: 'Brandenburg Gate, Berlin, Germany', coordinates: [13.3777, 52.5163] },
      { name: 'Sagrada Familia, Barcelona, Spain', coordinates: [2.1734, 41.4036] },
      
      // Asia
      { name: 'Tokyo Tower, Japan', coordinates: [139.7454, 35.6586] },
      { name: 'Marina Bay Sands, Singapore', coordinates: [103.8600, 1.2834] },
      { name: 'Petronas Towers, Kuala Lumpur, Malaysia', coordinates: [101.7117, 3.1578] },
      { name: 'Burj Khalifa, Dubai, UAE', coordinates: [55.2744, 25.1972] },
      { name: 'Sydney Opera House, Australia', coordinates: [151.2153, -33.8568] },
      
      // More Indian Cities
      { name: 'Gateway of India, Mumbai', coordinates: [72.8347, 18.9220] },
      { name: 'Charminar, Hyderabad', coordinates: [78.4747, 17.3616] },
      { name: 'Palace of Winds, Jaipur', coordinates: [75.8267, 26.9239] },
      { name: 'Victoria Memorial, Kolkata', coordinates: [88.3426, 22.5448] },
      { name: 'Mysore Palace, Karnataka', coordinates: [76.6553, 12.3051] }
    ];
    
    return globalLocations.filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  },
  
  // Display location suggestions
  displayLocationSuggestions(container, suggestions, input) {
    if (suggestions.length === 0) {
      container.innerHTML = '';
      container.classList.remove('active');
      return;
    }
    
    const html = suggestions.map(location => `
      <div class="location-suggestion" data-coordinates="${location.coordinates.join(',')}">
        <i class="fas fa-map-marker-alt"></i>
        <span>${location.name}</span>
      </div>
    `).join('');
    
    container.innerHTML = html;
    container.classList.add('active');
    
    // Add click handlers
    container.querySelectorAll('.location-suggestion').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.querySelector('span').textContent;
        input.dataset.coordinates = item.dataset.coordinates;
        container.classList.remove('active');
      });
    });
  },
  
  // Handle ride search
  async handleSearch(e) {
    e.preventDefault();
    
    const pickup = document.getElementById('searchPickup').value;
    const destination = document.getElementById('searchDestination').value;
    const date = document.getElementById('searchDate').value;
    const seats = document.getElementById('searchSeats').value;
    
    if (!pickup || !destination || !date) {
      App.showToast('Please fill in all required fields', 'error');
      return;
    }
    
    const searchData = {
      pickup,
      destination,
      date,
      seats: parseInt(seats),
      maxPrice: document.getElementById('maxPrice')?.value,
      minRating: document.getElementById('minRating')?.value
    };
    
    // Get selected features
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
      .map(cb => cb.value);
    
    if (features.length > 0) {
      searchData.features = features;
    }
    
    await this.searchRides(searchData);
  },
  
  // Search for rides
  async searchRides(searchData, page = 1) {
    try {
      this.state.isLoading = true;
      this.showSearchLoading();
      
      // Build query parameters
      const params = new URLSearchParams();
      Object.keys(searchData).forEach(key => {
        if (searchData[key] !== undefined && searchData[key] !== '') {
          if (Array.isArray(searchData[key])) {
            searchData[key].forEach(value => params.append(key, value));
          } else {
            params.append(key, searchData[key]);
          }
        }
      });
      
      params.append('page', page);
      params.append('limit', 10);
      
      const response = await fetch(`${App.apiUrl}${this.endpoints.search}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        this.state.currentRides = data.data.rides;
        this.state.currentPage = data.data.pagination.currentPage;
        this.state.totalPages = data.data.pagination.totalPages;
        
        this.displaySearchResults(data.data.rides, data.data.pagination);
        
        if (data.data.rides.length === 0) {
          App.showToast('No rides found. Try adjusting your filters.', 'info');
        } else {
          App.showToast(`Found ${data.data.rides.length} rides`, 'success');
        }
      } else {
        throw new Error(data.message);
      }
      
    } catch (error) {
      console.error('Search error:', error);
      App.showToast('Search failed. Please try again.', 'error');
      this.displaySearchError();
    } finally {
      this.state.isLoading = false;
    }
  },
  
  // Display search results
  displaySearchResults(rides, pagination) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    const requestSection = document.getElementById('rideRequestSection');
    
    if (rides.length === 0) {
      resultsContainer.innerHTML = this.getNoResultsHTML();
      // Show ride request section when no rides found
      if (requestSection) {
        requestSection.style.display = 'block';
        this.initRideRequestForm();
      }
      return;
    } else {
      // Hide ride request section when rides are found
      if (requestSection) {
        requestSection.style.display = 'none';
      }
    }
    
    const ridesHTML = rides.map(ride => this.createRideCard(ride)).join('');
    
    resultsContainer.innerHTML = `
      <div class="search-results-header">
        <h3>${rides.length} rides found</h3>
        <div class="sort-options">
          <select id="sortSelect" onchange="Rides.sortResults(this.value)">
            <option value="departureDateTime">Sort by departure time</option>
            <option value="pricePerSeat">Sort by price (low to high)</option>
            <option value="rating">Sort by rating (high to low)</option>
            <option value="distance">Sort by distance</option>
          </select>
        </div>
      </div>
      
      <div class="rides-grid">
        ${ridesHTML}
      </div>
      
      ${this.createPaginationHTML(pagination)}
    `;
  },
  
  // Create ride card HTML
  createRideCard(ride) {
    const departureTime = new Date(ride.departureDateTime);
    const formattedDate = departureTime.toLocaleDateString();
    const formattedTime = departureTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Get driver info
    const driver = ride.driverInfo && ride.driverInfo[0] || {};
    const vehicle = ride.vehicleInfo && ride.vehicleInfo[0] || {};
    
    return `
      <div class="ride-card glass-card" data-ride-id="${ride._id}">
        <div class="ride-header">
          <div class="driver-info">
            <div class="driver-avatar">
              ${driver.profilePicture ? 
                `<img src="${driver.profilePicture}" alt="${driver.name}">` : 
                `<i class="fas fa-user"></i>`
              }
            </div>
            <div class="driver-details">
              <div class="driver-name">${driver.name || 'Driver'}</div>
              <div class="driver-rating">
                <span class="stars">${this.generateStars(driver.rating?.average || 5)}</span>
                <span class="rating-text">${(driver.rating?.average || 5).toFixed(1)}</span>
                <span class="rating-count">(${driver.rating?.count || 0})</span>
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
          <div class="route-line">
            <div class="route-duration">${this.formatDuration(ride.estimatedDuration)}</div>
          </div>
          <div class="route-point">
            <i class="fas fa-map-marker-alt destination-dot"></i>
            <span>${ride.destination.address}</span>
          </div>
        </div>
        
        <div class="ride-details">
          <div class="detail-row">
            <div class="detail-item">
              <i class="fas fa-calendar"></i>
              <span>${formattedDate}</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-clock"></i>
              <span>${formattedTime}</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-item">
              <i class="fas fa-users"></i>
              <span>${ride.availableSeats - (ride.bookedSeats || 0)} seats left</span>
            </div>
            <div class="detail-item">
              <i class="fas fa-car"></i>
              <span>${vehicle.make ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'}</span>
            </div>
          </div>
          ${ride.totalDistance ? `
            <div class="detail-row">
              <div class="detail-item">
                <i class="fas fa-route"></i>
                <span>${ride.totalDistance} km</span>
              </div>
            </div>
          ` : ''}
        </div>
        
        ${this.getRideFeatures(vehicle.features)}
        
        <div class="ride-actions">
          <button class="btn btn-primary ripple-effect" onclick="Rides.bookRide('${ride._id}')">
            <i class="fas fa-ticket-alt"></i>
            <span>Book Ride</span>
          </button>
          <button class="btn btn-ghost" onclick="Rides.viewRideDetails('${ride._id}')">
            <i class="fas fa-info-circle"></i>
            <span>Details</span>
          </button>
        </div>
      </div>
    `;
  },
  
  // Generate star rating HTML
  generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '★';
    }
    
    if (hasHalfStar) {
      starsHTML += '☆';
    }
    
    return starsHTML;
  },
  
  // Format duration
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  },
  
  // Get ride features HTML
  getRideFeatures(features) {
    if (!features || features.length === 0) return '';
    
    const featureIcons = {
      ac: 'fas fa-snowflake',
      music: 'fas fa-music',
      wifi: 'fas fa-wifi',
      charging: 'fas fa-charging-station',
      leather_seats: 'fas fa-chair',
      gps: 'fas fa-satellite-dish',
      first_aid: 'fas fa-first-aid'
    };
    
    const featuresHTML = features.map(feature => `
      <span class="feature-tag">
        <i class="${featureIcons[feature] || 'fas fa-check'}"></i>
        ${feature.replace('_', ' ')}
      </span>
    `).join('');
    
    return `
      <div class="ride-features">
        ${featuresHTML}
      </div>
    `;
  },
  
  // Handle offer ride
  async handleOfferRide(e) {
    e.preventDefault();
    
    if (!App.state.isAuthenticated) {
      App.showAuthModal('login');
      return;
    }
    
    // Get form data
    const formData = this.getOfferFormData();
    
    // Validate form data
    if (!this.validateOfferForm(formData)) {
      return;
    }
    
    try {
      const response = await Auth.apiRequest(this.endpoints.create, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Ride offer created successfully!', 'success');
        this.resetOfferForm();
        App.showSection('bookings');
      } else {
        App.showToast(data.message || 'Failed to create ride offer', 'error');
      }
      
    } catch (error) {
      console.error('Offer ride error:', error);
      App.showToast('Failed to create ride offer. Please try again.', 'error');
    }
  },
  
  // Get offer form data
  getOfferFormData() {
    const pickup = document.getElementById('offerPickup');
    const destination = document.getElementById('offerDestination');
    const date = document.getElementById('offerDate');
    const time = document.getElementById('offerTime');
    
    return {
      vehicleId: this.getSelectedVehicle(),
      pickup: {
        address: pickup.value,
        coordinates: pickup.dataset.coordinates ? 
          pickup.dataset.coordinates.split(',').map(Number) : [0, 0]
      },
      destination: {
        address: destination.value,
        coordinates: destination.dataset.coordinates ? 
          destination.dataset.coordinates.split(',').map(Number) : [0, 0]
      },
      departureDateTime: new Date(`${date.value}T${time.value}`),
      availableSeats: parseInt(document.getElementById('availableSeats').value),
      pricePerSeat: parseFloat(document.getElementById('pricePerSeat').value),
      preferences: {
        smokingAllowed: document.querySelector('input[name="smokingAllowed"]').checked,
        petsAllowed: document.querySelector('input[name="petsAllowed"]').checked,
        musicAllowed: document.querySelector('input[name="musicAllowed"]').checked,
        conversationLevel: document.getElementById('conversationLevel').value
      },
      notes: document.getElementById('rideNotes').value
    };
  },
  
  // Get selected vehicle
  getSelectedVehicle() {
    // This would get the selected vehicle from the vehicle selector
    // For now, return a mock vehicle ID
    return 'mock-vehicle-id';
  },
  
  // Validate offer form
  validateOfferForm(formData) {
    if (!formData.pickup.address || !formData.destination.address) {
      App.showToast('Please fill in pickup and destination', 'error');
      return false;
    }
    
    if (!formData.departureDateTime || formData.departureDateTime <= new Date()) {
      App.showToast('Please select a future date and time', 'error');
      return false;
    }
    
    if (!formData.availableSeats || formData.availableSeats < 1) {
      App.showToast('Please select number of available seats', 'error');
      return false;
    }
    
    if (!formData.pricePerSeat || formData.pricePerSeat < 50) {
      App.showToast('Please enter a valid price per seat (minimum ₹50)', 'error');
      return false;
    }
    
    return true;
  },
  
  // Reset offer form
  resetOfferForm() {
    const form = document.getElementById('offerRideForm');
    if (form) {
      form.reset();
      
      // Reset location coordinates
      ['offerPickup', 'offerDestination'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          delete input.dataset.coordinates;
        }
      });
      
      // Set default date to today
      const dateInput = document.getElementById('offerDate');
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  },
  
  // Book a ride
  async bookRide(rideId) {
    if (!App.state.isAuthenticated) {
      App.showAuthModal('login');
      return;
    }
    
    // This would open a booking modal or redirect to booking page
    App.showToast('Opening booking form...', 'info');
    
    // For now, just show the bookings section
    App.showSection('bookings');
  },
  
  // View ride details
  async viewRideDetails(rideId) {
    try {
      const response = await fetch(`${App.apiUrl}${this.endpoints.get}/${rideId}`);
      const data = await response.json();
      
      if (data.success) {
        this.showRideDetailsModal(data.data.ride);
      } else {
        App.showToast('Failed to load ride details', 'error');
      }
      
    } catch (error) {
      console.error('View ride details error:', error);
      App.showToast('Failed to load ride details', 'error');
    }
  },
  
  // Show ride details modal
  showRideDetailsModal(ride) {
    // Create and show a modal with detailed ride information
    App.showToast('Ride details modal coming soon!', 'info');
  },
  
  // Toggle advanced filters
  toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    if (filters) {
      const isVisible = filters.style.display !== 'none';
      filters.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        filters.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  },
  
  // Update price display
  updatePriceDisplay(e) {
    const priceDisplay = document.getElementById('priceValue');
    if (priceDisplay) {
      priceDisplay.textContent = e.target.value;
    }
  },
  
  // Sort results
  sortResults(sortBy) {
    if (!this.state.currentRides.length) return;
    
    const rides = [...this.state.currentRides];
    
    switch (sortBy) {
      case 'pricePerSeat':
        rides.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
        break;
      case 'rating':
        rides.sort((a, b) => {
          const ratingA = (a.driverInfo && a.driverInfo[0] && a.driverInfo[0].rating && a.driverInfo[0].rating.average) || 0;
          const ratingB = (b.driverInfo && b.driverInfo[0] && b.driverInfo[0].rating && b.driverInfo[0].rating.average) || 0;
          return ratingB - ratingA;
        });
        break;
      case 'distance':
        rides.sort((a, b) => (a.totalDistance || 0) - (b.totalDistance || 0));
        break;
      default:
        rides.sort((a, b) => new Date(a.departureDateTime) - new Date(b.departureDateTime));
    }
    
    this.state.currentRides = rides;
    this.displaySearchResults(rides, { currentPage: this.state.currentPage, totalPages: this.state.totalPages });
  },
  
  // Show search loading
  showSearchLoading() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <p>Searching for rides...</p>
        </div>
      `;
    }
  },
  
  // Display search error
  displaySearchError() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-error glass-card">
          <div class="error-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Search Error</h3>
          <p>We couldn't search for rides right now. Please try again.</p>
          <button class="btn btn-primary" onclick="Rides.retrySearch()">
            <i class="fas fa-redo"></i>
            <span>Try Again</span>
          </button>
        </div>
      `;
    }
  },
  
  // Get no results HTML
  getNoResultsHTML() {
    return `
      <div class="no-results glass-card">
        <div class="no-results-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>No rides found</h3>
        <p>We couldn't find any rides matching your criteria. Try:</p>
        <ul>
          <li>Adjusting your pickup or destination</li>
          <li>Changing the date or time</li>
          <li>Reducing your filters</li>
          <li>Checking back later for new rides</li>
        </ul>
        <div class="no-results-actions">
          <button class="btn btn-primary" onclick="Rides.toggleAdvancedFilters()">
            <i class="fas fa-filter"></i>
            <span>Adjust Filters</span>
          </button>
          <button class="btn btn-secondary" onclick="App.showSection('offer')">
            <i class="fas fa-plus-circle"></i>
            <span>Offer a Ride</span>
          </button>
        </div>
      </div>
    `;
  },
  
  // Create pagination HTML
  createPaginationHTML(pagination) {
    if (pagination.totalPages <= 1) return '';
    
    let html = '<div class="pagination">';
    
    // Previous button
    if (pagination.hasPrev) {
      html += `<button class="btn btn-ghost" onclick="Rides.loadPage(${pagination.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    if (startPage > 1) {
      html += `<button class="btn btn-ghost" onclick="Rides.loadPage(1)">1</button>`;
      if (startPage > 2) {
        html += '<span class="pagination-dots">...</span>';
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === pagination.currentPage;
      html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-ghost'}" 
        ${isActive ? '' : `onclick="Rides.loadPage(${i})"`}>${i}</button>`;
    }
    
    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        html += '<span class="pagination-dots">...</span>';
      }
      html += `<button class="btn btn-ghost" onclick="Rides.loadPage(${pagination.totalPages})">${pagination.totalPages}</button>`;
    }
    
    // Next button
    if (pagination.hasNext) {
      html += `<button class="btn btn-ghost" onclick="Rides.loadPage(${pagination.currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>`;
    }
    
    html += '</div>';
    return html;
  },
  
  // Load specific page
  async loadPage(page) {
    if (page === this.state.currentPage || this.state.isLoading) return;
    
    // Get current search data from form
    const searchData = this.getCurrentSearchData();
    await this.searchRides(searchData, page);
  },
  
  // Get current search data from form
  getCurrentSearchData() {
    return {
      pickup: document.getElementById('searchPickup')?.value || '',
      destination: document.getElementById('searchDestination')?.value || '',
      date: document.getElementById('searchDate')?.value || '',
      seats: parseInt(document.getElementById('searchSeats')?.value || 1),
      maxPrice: document.getElementById('maxPrice')?.value,
      minRating: document.getElementById('minRating')?.value
    };
  },
  
  // Retry search
  retrySearch() {
    const searchData = this.getCurrentSearchData();
    this.searchRides(searchData);
  },
  
  // Initialize ride request form
  initRideRequestForm() {
    const form = document.getElementById('rideRequestForm');
    const budgetSlider = document.getElementById('requestBudget');
    const budgetValue = document.getElementById('budgetValue');
    const dateInput = document.getElementById('requestDate');
    
    if (!form) return;
    
    // Set minimum date to today
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
      if (!dateInput.value) {
        dateInput.value = today;
      }
    }
    
    // Budget slider update
    if (budgetSlider && budgetValue) {
      budgetSlider.addEventListener('input', (e) => {
        budgetValue.textContent = e.target.value;
      });
    }
    
    // Pre-fill pickup and destination from search
    const searchPickup = document.getElementById('searchPickup');
    const searchDestination = document.getElementById('searchDestination');
    
    // Form submission
    form.addEventListener('submit', this.handleRideRequest.bind(this));
  },
  
  // Handle ride request submission
  async handleRideRequest(e) {
    e.preventDefault();
    
    if (!App.state.isAuthenticated) {
      App.showAuthModal('login');
      return;
    }
    
    const formData = new FormData(e.target);
    const pickup = document.getElementById('searchPickup');
    const destination = document.getElementById('searchDestination');
    
    const requestData = {
      pickup: {
        address: pickup.value,
        coordinates: pickup.dataset.coordinates ? 
          pickup.dataset.coordinates.split(',').map(Number) : [0, 0]
      },
      destination: {
        address: destination.value,
        coordinates: destination.dataset.coordinates ? 
          destination.dataset.coordinates.split(',').map(Number) : [0, 0]
      },
      preferredDateTime: `${document.getElementById('requestDate').value}T${document.getElementById('requestTime').value}`,
      vehicleType: document.getElementById('requestVehicleType').value,
      seatsNeeded: parseInt(document.getElementById('requestSeats').value),
      budgetPerSeat: parseInt(document.getElementById('requestBudget').value),
      priority: 'medium',
      preferences: {
        acRequired: true,
        musicAllowed: true
      },
      notes: `Requested via Riders Luxury app. Preferred vehicle: ${document.getElementById('requestVehicleType').value}`
    };
    
    // Validate
    if (!requestData.pickup.address || !requestData.destination.address) {
      App.showToast('Please select pickup and destination locations', 'error');
      return;
    }
    
    if (!requestData.vehicleType) {
      App.showToast('Please select vehicle type', 'error');
      return;
    }
    
    try {
      const response = await Auth.apiRequest('/api/ride-requests', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        App.showToast('Ride request posted! You\'ll be notified when drivers respond.', 'success');
        
        // Show success message
        this.showRequestSuccessMessage(data.data.rideRequest);
        
        // Hide request form
        const requestSection = document.getElementById('rideRequestSection');
        if (requestSection) {
          requestSection.style.display = 'none';
        }
        
      } else {
        App.showToast(data.message || 'Failed to post ride request', 'error');
      }
      
    } catch (error) {
      console.error('Ride request error:', error);
      App.showToast('Failed to post ride request. Please try again.', 'error');
    }
  },
  
  // Show ride request success message
  showRequestSuccessMessage(rideRequest) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>🎉 Ride Request Posted!</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="request-success-content">
            <div class="success-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            
            <div class="request-summary">
              <p><strong>Route:</strong> ${rideRequest.pickup.address} → ${rideRequest.destination.address}</p>
              <p><strong>Date:</strong> ${new Date(rideRequest.preferredDateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(rideRequest.preferredDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Vehicle:</strong> ${rideRequest.vehicleType}</p>
              <p><strong>Passengers:</strong> ${rideRequest.seatsNeeded}</p>
              <p><strong>Budget:</strong> ₹${rideRequest.budgetPerSeat} per seat</p>
            </div>
            
            <div class="success-actions">
              <button class="btn btn-primary" onclick="App.showSection('bookings'); this.closest('.modal').remove();">
                <i class="fas fa-list"></i>
                <span>View My Requests</span>
              </button>
              <button class="btn btn-ghost" onclick="this.closest('.modal').remove();">
                <i class="fas fa-times"></i>
                <span>Close</span>
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
  }
};

// Initialize rides module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Rides.init();
});

// Export for global access
window.Rides = Rides;

console.log('🚗 Rides module loaded');
