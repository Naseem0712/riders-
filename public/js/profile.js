// Profile Management Module
// Handles profile editing, photo upload, and user data management

const Profile = {
  // Initialize profile module
  init() {
    this.initEventListeners();
    console.log('👤 Profile module initialized');
  },

  // Initialize event listeners
  initEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
    }

    // Photo upload
    const photoUpload = document.getElementById('profilePhotoInput');
    if (photoUpload) {
      photoUpload.addEventListener('change', this.handlePhotoUpload.bind(this));
    }

    // Profile edit button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', this.showEditProfile.bind(this));
    }
  },

  // Show edit profile modal
  showEditProfile() {
    const user = App.state.user;
    if (!user) {
      App.showToast('Please login first', 'error');
      return;
    }

    // Populate form with current data
    this.populateProfileForm(user);
    
    // Show modal
    const modal = document.getElementById('editProfileModal');
    if (modal) {
      modal.style.display = 'block';
    }
  },

  // Hide edit profile modal
  hideEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // Populate profile form with user data
  populateProfileForm(user) {
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editMobile').value = user.mobile || '';
    document.getElementById('editAge').value = user.age || '';
    document.getElementById('editGender').value = user.gender || '';
    document.getElementById('editCity').value = user.city || '';
    
    // Show current profile photo
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview && user.profilePicture) {
      photoPreview.src = user.profilePicture;
      photoPreview.style.display = 'block';
    }
  },

  // Handle profile update
  async handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
      name: formData.get('name'),
      email: formData.get('email'),
      mobile: formData.get('mobile'),
      age: formData.get('age'),
      gender: formData.get('gender'),
      city: formData.get('city')
    };

    try {
      App.setLoading(true);
      
      const response = await Auth.apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        // Update stored user data
        localStorage.setItem('riders_user', JSON.stringify(data.data.user));
        App.setAuthState(true, data.data.user);
        
        this.hideEditProfile();
        App.showToast('Profile updated successfully!', 'success');
        
        // Refresh profile display
        this.displayProfile(data.data.user);
      } else {
        App.showToast(data.message || 'Profile update failed', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      App.showToast('Profile update failed. Please try again.', 'error');
    } finally {
      App.setLoading(false);
    }
  },

  // Handle photo upload
  async handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!this.validatePhoto(file)) return;

    try {
      App.setLoading(true);
      
      // Show preview
      this.showPhotoPreview(file);
      
      // Upload photo
      const photoUrl = await this.uploadPhoto(file);
      
      // Update profile with new photo
      await this.updateProfilePhoto(photoUrl);
      
      App.showToast('Profile photo updated successfully!', 'success');
    } catch (error) {
      console.error('Photo upload error:', error);
      App.showToast('Photo upload failed. Please try again.', 'error');
    } finally {
      App.setLoading(false);
    }
  },

  // Validate photo file
  validatePhoto(file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      App.showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      App.showToast('Image size should be less than 5MB', 'error');
      return false;
    }

    return true;
  },

  // Show photo preview
  showPhotoPreview(file) {
    const preview = document.getElementById('photoPreview');
    if (preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  },

  // Upload photo (Base64 for now, can be enhanced with cloud storage)
  async uploadPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // For now, store as base64
        // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Update profile photo
  async updateProfilePhoto(photoUrl) {
    const response = await Auth.apiRequest('/auth/profile-photo', {
      method: 'PUT',
      body: JSON.stringify({ profilePicture: photoUrl })
    });

    const data = await response.json();

    if (data.success) {
      // Update stored user data
      const user = data.data.user;
      localStorage.setItem('riders_user', JSON.stringify(user));
      App.setAuthState(true, user);
      
      // Update UI
      this.updateProfilePhotoDisplay(photoUrl);
      return photoUrl;
    } else {
      throw new Error(data.message || 'Photo update failed');
    }
  },

  // Update profile photo display
  updateProfilePhotoDisplay(photoUrl) {
    const profilePhotos = document.querySelectorAll('.profile-photo');
    profilePhotos.forEach(photo => {
      photo.src = photoUrl;
    });
  },

  // Display profile information
  displayProfile(user) {
    const profileContainer = document.getElementById('profileContainer');
    if (!profileContainer) return;

    profileContainer.innerHTML = `
      <div class="profile-card glass-card">
        <div class="profile-header">
          <div class="profile-photo-container">
            <img src="${user.profilePicture || '/icons/default-avatar.png'}" 
                 alt="Profile" class="profile-photo" id="currentProfilePhoto">
            <button class="edit-photo-btn" onclick="document.getElementById('profilePhotoInput').click()">
              <i class="fas fa-camera"></i>
            </button>
          </div>
          <div class="profile-info">
            <h2>${user.name}</h2>
            <p class="user-role">${user.role === 'driver' ? '🚗 Driver' : '👤 Rider'}</p>
            <div class="rating">
              <span class="stars">⭐⭐⭐⭐⭐</span>
              <span class="rating-text">${user.rating || '4.8'}</span>
            </div>
          </div>
          <button class="btn-primary edit-profile-btn" onclick="Profile.showEditProfile()">
            <i class="fas fa-edit"></i> Edit Profile
          </button>
        </div>
        
        <div class="profile-details">
          <div class="detail-row">
            <span class="label">📧 Email:</span>
            <span class="value">${user.email || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">📱 Mobile:</span>
            <span class="value">${user.mobile || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">🎂 Age:</span>
            <span class="value">${user.age || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">👤 Gender:</span>
            <span class="value">${user.gender || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">🏙️ City:</span>
            <span class="value">${user.city || 'Not provided'}</span>
          </div>
          <div class="detail-row">
            <span class="label">📅 Member since:</span>
            <span class="value">${new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `;
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});

// Export for global access
window.Profile = Profile;
