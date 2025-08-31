const express = require('express');
const Vehicle = require('../models/Vehicle');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/vehicles/my-vehicles
// @desc    Get user's vehicles
// @access  Private
router.get('/my-vehicles', authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        vehicles,
        count: vehicles.length
      }
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicles'
    });
  }
});

// @route   POST /api/vehicles
// @desc    Add new vehicle
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      vehicleType,
      category,
      make,
      model,
      year,
      color,
      licensePlate,
      vehicleName,
      seatingCapacity,
      fuelType,
      description,
      bikeDetails,
      documents
    } = req.body;

    // Validation
    if (!vehicleType || !make || !model || !year || !color || !licensePlate) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
        required: ['vehicleType', 'make', 'model', 'year', 'color', 'licensePlate']
      });
    }

    // Check if license plate already exists
    const existingVehicle = await Vehicle.findOne({
      licensePlate: licensePlate.toUpperCase(),
      isActive: true
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'A vehicle with this license plate already exists'
      });
    }

    // Create new vehicle
    const vehicle = new Vehicle({
      owner: req.user._id,
      vehicleType,
      category,
      make,
      model,
      year: parseInt(year),
      color,
      licensePlate: licensePlate.toUpperCase(),
      vehicleName: vehicleName || `${make} ${model}`,
      seatingCapacity: parseInt(seatingCapacity) || this.getDefaultSeatingCapacity(vehicleType),
      fuelType,
      description,
      bikeDetails: vehicleType === 'bike' ? bikeDetails : undefined,
      documents: documents || {},
      isVerified: false, // Admin verification required
      isActive: true
    });

    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'License plate already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while adding vehicle'
    });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update fields
    const allowedUpdates = [
      'vehicleName', 'color', 'seatingCapacity', 'fuelType', 
      'description', 'bikeDetails', 'documents'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    // Reset verification if critical details changed
    if (req.body.licensePlate && req.body.licensePlate !== vehicle.licensePlate) {
      vehicle.licensePlate = req.body.licensePlate.toUpperCase();
      vehicle.isVerified = false;
    }

    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating vehicle'
    });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle (soft delete)
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting vehicle'
    });
  }
});

// @route   GET /api/vehicles/:id
// @desc    Get single vehicle
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { isPublic: true }
      ],
      isActive: true
    }).populate('owner', 'name profilePicture rating');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle'
    });
  }
});

// Helper function to get default seating capacity
function getDefaultSeatingCapacity(vehicleType) {
  const defaults = {
    bike: 1,
    car: 4,
    auto: 3,
    bus: 20
  };
  return defaults[vehicleType] || 4;
}

module.exports = router;
