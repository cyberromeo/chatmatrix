/**
 * Matrix Rain Animation
 * Renders a classic localized Matrix digital rain effect on an HTML5 Canvas.
 */

const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let columns;
const fontSize = 14;
const drops = []; // Array of drop positions (y-coordinate)

// Katakana characters + Latin
const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const charArray = chars.split('');

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Reset columns on resize
    columns = Math.floor(width / fontSize);

    // Fill drops array
    // If expanding, we need more drops. If shrinking, we ignore the extras.
    // For simplicity, we just reset or fill up to current
    for (let i = 0; i < columns; i++) {
        if (!drops[i]) drops[i] = Math.random() * -100; // Start above screen randomly
    }
}

function draw() {
    // Semi-transparent black background to create trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    // Set text style
    ctx.fillStyle = '#d71921'; // Nothing Red (or Green: #0F0) - keeping Red per user theme
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < columns; i++) {
        // Pick a random character
        const text = charArray[Math.floor(Math.random() * charArray.length)];

        // Draw the character
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Randomly make some characters brighter/white
        if (Math.random() > 0.98) {
            ctx.fillStyle = '#fff';
        } else {
            // Theme Red
            ctx.fillStyle = '#d71921';
            // To match the CSS variable opacity, we could use rgba(215, 25, 33, 0.8)
        }

        ctx.fillText(text, x, y);

        // Reset drop to top randomly
        if (y > height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
    }

    requestAnimationFrame(draw);
}

// Initial Setup
window.addEventListener('resize', resizeCanvas);

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (canvas) {
        resizeCanvas();
        draw();
    }
});
