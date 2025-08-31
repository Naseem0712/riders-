// Vehicle Management Module
// Handles adding, editing, and managing user vehicles

const Vehicle = {
  // Vehicle types and their options
  vehicleTypes: {
    bike: {
      name: 'Bike/Motorcycle',
      icon: '🏍️',
      categories: ['sports', 'cruiser', 'commuter', 'scooter', 'electric']
    },
    car: {
      name: 'Car',
      icon: '🚗',
      categories: ['sedan', 'hatchback', 'suv', 'luxury']
    },
    auto: {
      name: 'Auto Rickshaw',
      icon: '🛺',
      categories: ['cng', 'electric']
    },
    bus: {
      name: 'Bus/Van',
      icon: '🚌',
      categories: ['mini-bus', 'van', 'tempo']
    }
  },

  // Initialize vehicle module
  init() {
    this.initEventListeners();
    console.log('🚗 Vehicle module initialized');
  },

  // Initialize event listeners
  initEventListeners() {
    // Add vehicle form
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) {
      vehicleForm.addEventListener('submit', this.handleAddVehicle.bind(this));
    }

    // Vehicle type change
    const vehicleTypeSelect = document.getElementById('vehicleType');
    if (vehicleTypeSelect) {
      vehicleTypeSelect.addEventListener('change', this.handleVehicleTypeChange.bind(this));
    }

    // Vehicle photo upload
    const vehiclePhotoInput = document.getElementById('vehiclePhotoInput');
    if (vehiclePhotoInput) {
      vehiclePhotoInput.addEventListener('change', this.handleVehiclePhotoUpload.bind(this));
    }

    // Add vehicle button
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    if (addVehicleBtn) {
      addVehicleBtn.addEventListener('click', this.showAddVehicleModal.bind(this));
    }
  },

  // Show add vehicle modal
  showAddVehicleModal() {
    if (!Auth.isAuthenticated()) {
      App.showToast('Please login first', 'error');
      return;
    }

    const modal = document.getElementById('addVehicleModal');
    if (modal) {
      modal.style.display = 'block';
      this.populateVehicleTypes();
    }
  },

  // Hide add vehicle modal
  hideAddVehicleModal() {
    const modal = document.getElementById('addVehicleModal');
    if (modal) {
      modal.style.display = 'none';
      document.getElementById('vehicleForm').reset();
    }
  },

  // Populate vehicle types dropdown
  populateVehicleTypes() {
    const select = document.getElementById('vehicleType');
    if (!select) return;

    select.innerHTML = '<option value="">Select Vehicle Type</option>';
    
    Object.keys(this.vehicleTypes).forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = `${this.vehicleTypes[type].icon} ${this.vehicleTypes[type].name}`;
      select.appendChild(option);
    });
  },

  // Handle vehicle type change
  handleVehicleTypeChange(e) {
    const selectedType = e.target.value;
    const categoryContainer = document.getElementById('vehicleCategoryContainer');
    const bikeOptionsContainer = document.getElementById('bikeOptionsContainer');
    
    // Hide all type-specific containers
    if (categoryContainer) categoryContainer.style.display = 'none';
    if (bikeOptionsContainer) bikeOptionsContainer.style.display = 'none';

    if (selectedType && this.vehicleTypes[selectedType]) {
      // Show category dropdown
      this.populateVehicleCategories(selectedType);
      if (categoryContainer) categoryContainer.style.display = 'block';

      // Show bike-specific options
      if (selectedType === 'bike' && bikeOptionsContainer) {
        bikeOptionsContainer.style.display = 'block';
      }
    }
  },

  // Populate vehicle categories
  populateVehicleCategories(vehicleType) {
    const select = document.getElementById('vehicleCategory');
    if (!select || !this.vehicleTypes[vehicleType]) return;

    select.innerHTML = '<option value="">Select Category</option>';
    
    this.vehicleTypes[vehicleType].categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      select.appendChild(option);
    });
  },

  // Handle vehicle addition
  async handleAddVehicle(e) {
    e.preventDefault();
    
    if (!Auth.isAuthenticated()) {
      App.showToast('Please login first', 'error');
      return;
    }

    const formData = new FormData(e.target);
    const vehicleData = {
      vehicleType: formData.get('vehicleType'),
      category: formData.get('vehicleCategory'),
      make: formData.get('make'),
      model: formData.get('model'),
      year: parseInt(formData.get('year')),
      color: formData.get('color'),
      licensePlate: formData.get('licensePlate'),
      vehicleName: formData.get('vehicleName'), // Custom name for vehicle
      seatingCapacity: parseInt(formData.get('seatingCapacity')),
      fuelType: formData.get('fuelType'),
      description: formData.get('description'),
      isVerified: false, // Will be verified by admin
      documents: {
        registration: formData.get('registrationDoc'),
        insurance: formData.get('insuranceDoc'),
        pollution: formData.get('pollutionDoc')
      }
    };

    // Add bike-specific details if applicable
    if (vehicleData.vehicleType === 'bike') {
      vehicleData.bikeDetails = {
        hasExtraHelmet: formData.get('hasExtraHelmet') === 'on',
        helmetCondition: formData.get('helmetCondition') || 'good',
        engineCapacity: parseInt(formData.get('engineCapacity')) || 0,
        bikeType: vehicleData.category
      };
    }

    try {
      App.setLoading(true);
      
      const response = await Auth.apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData)
      });

      const data = await response.json();

      if (data.success) {
        this.hideAddVehicleModal();
        App.showToast('Vehicle added successfully!', 'success');
        
        // Refresh vehicle list
        this.loadUserVehicles();
        
        // Update user role to driver if not already
        if (App.state.user && App.state.user.role !== 'driver') {
          this.promoteToDriver();
        }
      } else {
        App.showToast(data.message || 'Failed to add vehicle', 'error');
      }
    } catch (error) {
      console.error('Add vehicle error:', error);
      App.showToast('Failed to add vehicle. Please try again.', 'error');
    } finally {
      App.setLoading(false);
    }
  },

  // Handle vehicle photo upload
  async handleVehiclePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file (same as profile photo)
    if (!this.validatePhoto(file)) return;

    try {
      // Show preview
      const preview = document.getElementById('vehiclePhotoPreview');
      if (preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Vehicle photo preview error:', error);
    }
  },

  // Validate photo file
  validatePhoto(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      App.showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      App.showToast('Image size should be less than 5MB', 'error');
      return false;
    }

    return true;
  },

  // Promote user to driver
  async promoteToDriver() {
    try {
      const response = await Auth.apiRequest('/auth/promote-driver', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // Update stored user data
        const updatedUser = { ...App.state.user, role: 'driver' };
        localStorage.setItem('riders_user', JSON.stringify(updatedUser));
        App.setAuthState(true, updatedUser);
        
        App.showToast('🎉 You are now a driver! You can publish rides.', 'success');
      }
    } catch (error) {
      console.error('Promote to driver error:', error);
    }
  },

  // Load user vehicles
  async loadUserVehicles() {
    if (!Auth.isAuthenticated()) return;

    try {
      // Simulate API call with demo data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user has demo vehicles in localStorage
      const savedVehicles = localStorage.getItem('userVehicles');
      if (savedVehicles) {
        this.userVehicles = JSON.parse(savedVehicles);
      } else {
        // Add demo vehicle for testing
        this.userVehicles = [
          {
            _id: 'vehicle_demo_1',
            make: 'Honda',
            model: 'City',
            year: 2022,
            licensePlate: 'DL-01-AB-1234',
            color: 'White',
            vehicleType: 'car',
            category: 'sedan', 
            seatingCapacity: 4,
            isVerified: true,
            documents: {
              registration: 'verified',
              insurance: 'verified'
            }
          }
        ];
        localStorage.setItem('userVehicles', JSON.stringify(this.userVehicles));
      }

      this.displayVehicles(this.userVehicles);
      
    } catch (error) {
      console.error('Error loading vehicles:', error);
      this.userVehicles = [];
    }
  },

  // Display vehicles
  displayVehicles(vehicles) {
    const container = document.getElementById('vehiclesContainer');
    if (!container) return;

    if (vehicles.length === 0) {
      container.innerHTML = `
        <div class="no-vehicles">
          <div class="empty-state">
            <i class="fas fa-car fa-3x"></i>
            <h3>No Vehicles Added</h3>
            <p>Add your first vehicle to start offering rides</p>
            <button class="btn-primary" onclick="Vehicle.showAddVehicleModal()">
              <i class="fas fa-plus"></i> Add Vehicle
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = vehicles.map(vehicle => `
      <div class="vehicle-card glass-card" data-vehicle-id="${vehicle._id}">
        <div class="vehicle-header">
          <div class="vehicle-info">
            <h3>${this.vehicleTypes[vehicle.vehicleType]?.icon || '🚗'} ${vehicle.vehicleName || (vehicle.make + ' ' + vehicle.model)}</h3>
            <p class="vehicle-details">${vehicle.make} ${vehicle.model} • ${vehicle.year} • ${vehicle.color} • ${vehicle.fuelType}</p>
            <p class="license-plate">🔢 ${vehicle.licensePlate}</p>
            ${vehicle.isVerified ? '<span class="verified-badge">✅ Verified</span>' : '<span class="pending-badge">⏳ Pending Verification</span>'}
          </div>
          <div class="vehicle-actions">
            <button class="btn-secondary edit-vehicle-btn" onclick="Vehicle.editVehicle('${vehicle._id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-danger delete-vehicle-btn" onclick="Vehicle.deleteVehicle('${vehicle._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="vehicle-specs">
          <div class="spec-item">
            <span class="spec-label">Type:</span>
            <span class="spec-value">${vehicle.category || vehicle.vehicleType}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Capacity:</span>
            <span class="spec-value">${vehicle.seatingCapacity} seats</span>
          </div>
          ${vehicle.bikeDetails?.hasExtraHelmet ? `
          <div class="spec-item">
            <span class="spec-label">Extra Helmet:</span>
            <span class="spec-value">✅ Available (${vehicle.bikeDetails.helmetCondition})</span>
          </div>
          ` : ''}
          ${vehicle.description ? `
          <div class="spec-item description">
            <span class="spec-label">Description:</span>
            <span class="spec-value">${vehicle.description}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  // Edit vehicle
  editVehicle(vehicleId) {
    App.showToast('Edit vehicle functionality coming soon!', 'info');
  },

  // Delete vehicle
  async deleteVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      App.setLoading(true);
      
      const response = await Auth.apiRequest(`/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        App.showToast('Vehicle deleted successfully', 'success');
        this.loadUserVehicles();
      } else {
        App.showToast(data.message || 'Failed to delete vehicle', 'error');
      }
    } catch (error) {
      console.error('Delete vehicle error:', error);
      App.showToast('Failed to delete vehicle. Please try again.', 'error');
    } finally {
      App.setLoading(false);
    }
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Vehicle.init();
});

// Export for global access
window.Vehicle = Vehicle;
