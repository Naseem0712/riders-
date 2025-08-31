// Simple script to create icons
// Run this in browser console on any page

function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    // White car emoji or text
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚗', size/2, size/2);
    
    // Convert to blob and download
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon-${size}x${size}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Create all required sizes
[16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512].forEach(size => {
    setTimeout(() => createIcon(size), size * 10);
});
