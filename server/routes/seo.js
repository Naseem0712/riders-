// SEO Routes for Dynamic Content
// Generates SEO-friendly pages for ride listings

const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');

// Dynamic sitemap generation
router.get('/sitemap.xml', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/xml');
    
    // Get recent active rides
    const rides = await Ride.find({ 
      isActive: true,
      departureTime: { $gte: new Date() }
    })
    .limit(1000)
    .select('_id from to departureTime updatedAt')
    .lean();

    // Generate dynamic sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  <url>
    <loc>${process.env.FRONTEND_URL || 'https://riderspool.com'}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${process.env.FRONTEND_URL || 'https://riderspool.com'}/search</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${process.env.FRONTEND_URL || 'https://riderspool.com'}/publish</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Dynamic ride listings -->`;

    rides.forEach(ride => {
      const slug = generateRideSlug(ride);
      const lastmod = ride.updatedAt ? ride.updatedAt.toISOString() : new Date().toISOString();
      
      sitemap += `
  <url>
    <loc>${process.env.FRONTEND_URL || 'https://riderspool.com'}/rides/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Sitemap generation failed');
  }
});

// SEO-friendly ride page
router.get('/rides/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Extract ride ID from slug (format: from-to-date-id)
    const parts = slug.split('-');
    const rideId = parts[parts.length - 1];
    
    const ride = await Ride.findById(rideId)
      .populate('driver', 'name profilePicture rating')
      .populate('vehicle', 'make model vehicleType')
      .lean();
    
    if (!ride || !ride.isActive) {
      return res.status(404).send('Ride not found');
    }

    // Generate SEO-optimized HTML
    const seoHtml = generateRideSEOPage(ride);
    res.send(seoHtml);
    
  } catch (error) {
    console.error('SEO ride page error:', error);
    res.status(404).send('Ride not found');
  }
});

// Robots.txt with dynamic content
router.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  
  const robotsTxt = `User-agent: *
Allow: /
Allow: /search
Allow: /rides/*
Allow: /js/*.js
Allow: /css/*.css
Allow: /icons/*

Disallow: /api/
Disallow: /admin/
Disallow: /test.html

# Sitemap location
Sitemap: ${process.env.FRONTEND_URL || 'https://riderspool.com'}/sitemap.xml

# Crawl delay
Crawl-delay: 1`;

  res.send(robotsTxt);
});

// Helper function to generate ride slug
function generateRideSlug(ride) {
  const from = ride.from.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const to = ride.to.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const date = new Date(ride.departureTime).toISOString().split('T')[0];
  return `${from}-to-${to}-${date}-${ride._id}`;
}

// Generate SEO-optimized HTML for ride page
function generateRideSEOPage(ride) {
  const title = `Ride from ${ride.from} to ${ride.to} - ₹${ride.price} | Riders Pool`;
  const description = `Book a ${ride.vehicle?.vehicleType || 'vehicle'} ride from ${ride.from} to ${ride.to} on ${new Date(ride.departureTime).toLocaleDateString()}. Driver: ${ride.driver?.name}. Price: ₹${ride.price}. Safe and affordable travel.`;
  const canonicalUrl = `${process.env.FRONTEND_URL || 'https://riderspool.com'}/rides/${generateRideSlug(ride)}`;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `Ride: ${ride.from} to ${ride.to}`,
    "description": description,
    "offers": {
      "@type": "Offer",
      "price": ride.price,
      "priceCurrency": "INR",
      "availability": ride.availableSeats > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": new Date().toISOString(),
      "validThrough": new Date(ride.departureTime).toISOString()
    },
    "provider": {
      "@type": "Person",
      "name": ride.driver?.name || "Verified Driver",
      "aggregateRating": ride.driver?.rating ? {
        "@type": "AggregateRating",
        "ratingValue": ride.driver.rating,
        "ratingCount": "10"
      } : undefined
    },
    "location": {
      "@type": "Place",
      "name": `${ride.from} to ${ride.to}`
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="ride ${ride.from}, ${ride.to} ride, carpool ${ride.from} ${ride.to}, bike share, car share, travel ${ride.from}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${process.env.FRONTEND_URL || 'https://riderspool.com'}/icons/ride-share-og.png">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    
    <!-- Canonical -->
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
    
    <!-- Auto-redirect to main app -->
    <script>
      // Redirect to main app after SEO crawling
      setTimeout(function() {
        window.location.href = '${process.env.FRONTEND_URL || 'https://riderspool.com'}/?rideId=${ride._id}';
      }, 3000);
    </script>
    
    <style>
      body { 
        font-family: Arial, sans-serif; 
        background: #000; 
        color: #fff; 
        padding: 20px; 
        text-align: center; 
      }
      .ride-card { 
        background: rgba(255,255,255,0.1); 
        padding: 30px; 
        border-radius: 15px; 
        max-width: 600px; 
        margin: 0 auto; 
      }
      .price { color: #60a5fa; font-size: 24px; font-weight: bold; }
      .btn { 
        background: rgba(255,255,255,0.1); 
        color: #fff; 
        padding: 15px 30px; 
        border: 2px solid #fff; 
        border-radius: 10px; 
        text-decoration: none; 
        display: inline-block; 
        margin-top: 20px; 
      }
    </style>
</head>
<body>
    <div class="ride-card">
        <h1>🏍️🚗 Riders Pool</h1>
        <h2>Ride Available: ${ride.from} to ${ride.to}</h2>
        <p><strong>Date:</strong> ${new Date(ride.departureTime).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date(ride.departureTime).toLocaleTimeString()}</p>
        <p><strong>Vehicle:</strong> ${ride.vehicle?.make} ${ride.vehicle?.model} (${ride.vehicle?.vehicleType})</p>
        <p><strong>Available Seats:</strong> ${ride.availableSeats}</p>
        <p class="price">₹${ride.price}</p>
        <p><strong>Driver:</strong> ${ride.driver?.name} ${ride.driver?.rating ? `(⭐ ${ride.driver.rating})` : ''}</p>
        
        <a href="${process.env.FRONTEND_URL || 'https://riderspool.com'}/?rideId=${ride._id}" class="btn">
            📱 Open in App & Book Now
        </a>
        
        <p style="margin-top: 30px; font-size: 14px; color: #ccc;">
            Redirecting to Riders Pool app in 3 seconds...
        </p>
    </div>
</body>
</html>`;
}

module.exports = router;
