# Riders Luxury - Premium Ride Sharing App

A sophisticated ride-sharing web application with luxury deep black + white theme, featuring glassmorphism effects, PWA capabilities, and WhatsApp integration.

## ✨ Features

### 🎨 Design & UI
- **Luxury Theme**: Deep black background with white text and elegant glassmorphism effects
- **Responsive Design**: Mobile-first approach that works perfectly on all devices
- **PWA Ready**: Add to Home Screen functionality for mobile, tablet, and desktop
- **Smooth Animations**: Water ripple effects for buttons and glassmorphism cards
- **Modern Typography**: Inter + Playfair Display fonts for premium feel

### 🔐 Authentication System
- **Multi-method Login**: Email or mobile number authentication
- **Secure Registration**: User and driver role selection
- **Password Reset**: Token-based password recovery
- **JWT Security**: Secure token-based authentication
- **Profile Management**: Update profile and change password

### 🚗 Ride Management
- **Driver Features**: 
  - Add vehicle details and photos
  - Create ride offers with pricing
  - Manage passenger bookings
  - Set preferences (music, pets, etc.)
- **Passenger Features**:
  - Search rides by location and filters
  - Book seats with instant confirmation
  - Rate drivers and rides
  - Cancel bookings with fee calculation

### 📱 Communication & Safety
- **WhatsApp Integration**: Share live location with emergency contacts
- **Real-time Updates**: Push notifications for ride status
- **Driver Verification**: License and vehicle document verification
- **Rating System**: Mutual rating system for safety

### 🌐 Technical Features
- **PWA Capabilities**: Offline functionality and app-like experience
- **Service Worker**: Background sync and caching
- **Responsive Grid**: CSS Grid and Flexbox for perfect layouts
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized loading and smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Riders
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/riders-luxury

# JWT Secret (generate a strong random key)
JWT_SECRET=your-super-secret-jwt-key-here

# Server configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000

# WhatsApp API (optional)
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_KEY=your-whatsapp-api-key
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud service
```

5. **Run the application**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. **Access the app**
Open your browser and navigate to:
```
http://localhost:5000
```

## 📁 Project Structure

```
Riders/
├── server/                 # Backend API
│   ├── models/            # MongoDB models
│   │   ├── User.js        # User & driver model
│   │   ├── Vehicle.js     # Vehicle model
│   │   ├── Ride.js        # Ride offers model
│   │   └── Booking.js     # Booking model
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication routes
│   │   ├── users.js       # User management
│   │   ├── rides.js       # Ride management
│   │   └── bookings.js    # Booking management
│   ├── middleware/        # Custom middleware
│   │   └── auth.js        # JWT authentication
│   └── server.js          # Express server setup
├── public/                # Frontend files
│   ├── css/
│   │   └── style.css      # Main stylesheet
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── auth.js        # Authentication module
│   │   ├── rides.js       # Ride management
│   │   ├── bookings.js    # Booking management
│   │   ├── ui.js          # UI interactions
│   │   └── pwa.js         # PWA functionality
│   ├── icons/             # PWA icons (add actual files)
│   ├── manifest.json      # PWA manifest
│   ├── sw.js             # Service worker
│   └── index.html        # Main HTML file
├── package.json          # Dependencies
└── README.md            # This file
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Rides
- `GET /api/rides/search` - Search available rides
- `POST /api/rides` - Create ride offer (drivers)
- `GET /api/rides/:id` - Get ride details
- `PUT /api/rides/:id` - Update ride (owner only)
- `DELETE /api/rides/:id` - Cancel ride (owner only)
- `GET /api/rides/driver/my-rides` - Get driver's rides

### Bookings
- `POST /api/bookings` - Book a ride
- `GET /api/bookings/my-bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/share-location` - Generate WhatsApp share
- `POST /api/bookings/:id/rate` - Rate completed ride

### Users
- `GET /api/users/profile/:id` - Get public profile
- `POST /api/users/become-driver` - Upgrade to driver
- `GET /api/users/drivers` - Get verified drivers
- `POST /api/users/rate/:id` - Rate user

## 🎨 Design System

### Colors
- **Primary Black**: `#000000`
- **Secondary Black**: `#0a0a0a`
- **Tertiary Black**: `#1a1a1a`
- **Accent Black**: `#2a2a2a`
- **Primary White**: `#ffffff`
- **Glass Background**: `rgba(255, 255, 255, 0.1)`
- **Glass Border**: `rgba(255, 255, 255, 0.2)`

### Typography
- **Primary Font**: Inter (weights: 300, 400, 500, 600, 700)
- **Display Font**: Playfair Display (weights: 400, 600, 700)

### Components
- **Glass Cards**: Backdrop blur with transparent backgrounds
- **Ripple Buttons**: Water ripple effect on click
- **Smooth Transitions**: 0.3s ease transitions
- **Responsive Grid**: CSS Grid with auto-fit columns

## 📱 PWA Features

### Installation
- **Add to Home Screen**: Available on mobile and desktop
- **Offline Support**: Core functionality works offline
- **Background Sync**: Sync data when connection returns
- **Push Notifications**: Ride updates and reminders

### Service Worker
- **Caching Strategy**: Cache-first for assets, network-first for API
- **Update Handling**: Automatic updates with user notification
- **Offline Fallback**: Graceful degradation when offline

## 🔒 Security Features

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent brute force attacks
- **CORS Protection**: Configured for frontend domain

### Data Validation
- **Input Sanitization**: Server-side validation
- **Schema Validation**: Mongoose schema validation
- **XSS Protection**: Helmet.js security headers

## 🌍 Deployment

### Environment Variables
Create appropriate `.env` files for different environments:

**Production (.env.production)**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/riders-luxury
JWT_SECRET=your-production-jwt-secret
PORT=5000
FRONTEND_URL=https://your-domain.com
```

### Build Commands
```bash
# Install dependencies
npm install --production

# Start production server
npm start
```

### Hosting Options
- **Heroku**: Easy deployment with MongoDB Atlas
- **AWS**: EC2 with RDS or DocumentDB
- **Digital Ocean**: Droplets with managed databases
- **Vercel/Netlify**: For frontend (with separate API)

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Driver role upgrade
- [ ] Vehicle registration
- [ ] Ride creation and search
- [ ] Booking flow
- [ ] WhatsApp integration
- [ ] PWA installation
- [ ] Offline functionality
- [ ] Responsive design on all devices

### Browser Testing
- [ ] Chrome (Desktop & Mobile)
- [ ] Firefox (Desktop & Mobile)  
- [ ] Safari (Desktop & Mobile)
- [ ] Edge (Desktop)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@riders-luxury.com or create an issue in the repository.

## 🚧 Roadmap

### Upcoming Features
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Real-time chat between riders
- [ ] Advanced route optimization
- [ ] Driver earnings dashboard
- [ ] Admin panel
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Social login (Google, Facebook)

### Performance Improvements
- [ ] Database indexing optimization
- [ ] CDN integration for assets
- [ ] Image optimization and lazy loading
- [ ] API response caching
- [ ] WebSocket for real-time updates

---

**Built with ❤️ for premium ride-sharing experience**
