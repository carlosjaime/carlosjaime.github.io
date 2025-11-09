// Matrix Rain Animation
(function() {
    'use strict';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Matrix characters - Katakana, Latin, numbers
    const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const chars = matrixChars.split('');
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Array to store drop position for each column
    const drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
    }
    
    // Draw the matrix rain
    function draw() {
        // Semi-transparent black to create fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set text style
        ctx.font = fontSize + 'px monospace';
        
        // Loop through drops
        for (let i = 0; i < drops.length; i++) {
            // Random character
            const char = chars[Math.floor(Math.random() * chars.length)];
            
            // Set color - bright green for leading character
            const y = drops[i] * fontSize;
            
            // Gradient effect - brighter at the front
            if (Math.random() > 0.975) {
                ctx.fillStyle = '#ffffff'; // Occasional white flash
            } else if (Math.random() > 0.95) {
                ctx.fillStyle = '#00ff00'; // Bright green
            } else {
                ctx.fillStyle = '#008f00'; // Darker green
            }
            
            // Draw the character
            ctx.fillText(char, i * fontSize, y);
            
            // Reset drop to top randomly after it crosses the screen
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            // Move drop down
            drops[i]++;
        }
    }
    
    // Adjust drops array when window is resized
    window.addEventListener('resize', function() {
        const newColumns = Math.floor(canvas.width / fontSize);
        if (newColumns > drops.length) {
            for (let i = drops.length; i < newColumns; i++) {
                drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
            }
        } else if (newColumns < drops.length) {
            drops.length = newColumns;
        }
    });
    
    // Animation loop
    setInterval(draw, 35);
})();
