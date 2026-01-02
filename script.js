
// SUPABASE CONFIGURATION
// REPLACE THESE WITH YOUR OWN PROJECT VALUES
const SUPABASE_URL = 'https://bvbbyfnlecxtugsfrchk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UMlnwzO10ZvXxPzZYrge_Q_UyM0yZAF';

// WAIT FOR SUPABASE LIBRARY
let supabase;

function initApp() {
    if (typeof window.supabase === 'undefined') {
        setTimeout(initApp, 100);
        return;
    }

    // Initialize
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Start App
    loadMessages();
    subscribeToMessages();
}

// Start checking
initApp();

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const usernameInput = document.getElementById('username');
const contentInput = document.getElementById('content');

// Splash Screen Logic
const splashScreen = document.getElementById('splash-screen');
const mainContainer = document.querySelector('.container');

// Auto Boot Sequence
function removeSplash() {
    if (!splashScreen) return;

    // Prevent double removal
    if (splashScreen.classList.contains('removing')) return;
    splashScreen.classList.add('removing');

    // Play Boot Sound (Protected)
    try {
        if (window.playSfx) window.playSfx('boot');
    } catch (e) {
        console.warn('SFX Fail', e);
    }

    // Fade out splash
    splashScreen.style.transition = 'opacity 0.8s ease';
    splashScreen.style.opacity = '0';

    // Show main container
    if (mainContainer) {
        mainContainer.style.display = 'flex';
        // Force reflow
        void mainContainer.offsetWidth;

        // Fade in
        mainContainer.style.transition = 'opacity 1s ease';
        mainContainer.style.opacity = '1';
    }

    // Garbage collection
    setTimeout(() => {
        if (splashScreen) splashScreen.remove();
    }, 800);
}

// 1. Auto remove after delay
setTimeout(removeSplash, 2500);

// 2. Click to skip (Backup)
if (splashScreen) {
    splashScreen.addEventListener('click', removeSplash);
}

// State
let isAtBottom = true;

// Utility: Format Timestamp (HH:MM)
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// Render a single message
function renderMessage(msg) {
    const time = formatTime(msg.created_at);
    const safeContent = escapeHtml(msg.content);
    const safeUsername = escapeHtml(msg.username || 'ANONYMOUS');

    const messageEl = document.createElement('div');
    messageEl.className = 'message-item';
    messageEl.innerHTML = `
        <div class="message-meta">
            <span class="username">${safeUsername}</span>
            <span class="timestamp">${time}</span>
        </div>
        <div class="message-content">${safeContent}</div>
    `;

    return messageEl;
}

// Scroll handling
function scrollToBottom() {
    const lastMsg = messagesContainer.lastElementChild;
    if (lastMsg) {
        lastMsg.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Load Initial Messages
async function loadMessages() {
    // Clear loading state if it exists
    const loadingState = document.querySelector('.loading-state');

    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false }) // Order by Newest First
            .limit(50); // Get latest 50 messages

        if (error) throw error;

        if (loadingState) loadingState.remove();

        // Reverse to show Oldest -> Newest (Top -> Bottom)
        messages.reverse().forEach(msg => {
            messagesContainer.appendChild(renderMessage(msg));
        });

        // Force instant scroll
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);

    } catch (err) {
        console.error('Connection Error:', err);
        if (loadingState) {
            loadingState.innerHTML = `SYSTEM ERROR:<br>${err.message || 'UNKNOWN'}<br>RETRYING...`;
            loadingState.style.color = 'red';
            setTimeout(loadMessages, 3000); // Auto retry
        }
    }
}

// Subscribe to Realtime Updates & Presence
function subscribeToMessages() {
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            messagesContainer.appendChild(renderMessage(newMsg));

            // Sound
            if (window.playSfx) window.playSfx('receive');

            // Auto scroll if user was near bottom
            scrollToBottom();
        })
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const onlineCount = Object.keys(newState).length;

            const countEl = document.getElementById('online-count');
            if (countEl) {
                countEl.innerText = `NODES: ${onlineCount}`;
                // Optional: visual pulse when count changes
                countEl.style.textShadow = '0 0 10px var(--accent-color)';
                setTimeout(() => countEl.style.textShadow = 'none', 500);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track this user
                // We generate a random ID for this session or use the username
                // For accurate counts, we just need a unique tracking event per tab
                const userStatus = {
                    online_at: new Date().toISOString(),
                    user_id: Math.random().toString(36).substr(2, 9)
                };

                await channel.track(userStatus);
            }
        });
}

// Handle Form Submission
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = contentInput.value.trim();
    const username = usernameInput.value.trim() || 'GHOST';

    if (!content) return;

    // Sound
    if (window.playSfx) window.playSfx('send');

    // Send to Supabase
    const { error } = await supabase
        .from('messages')
        .insert([{ username, content }]);

    if (error) {
        console.error('Error sending message:', error);
        alert('TRANSMISSON FAILED');
        if (window.playSfx) window.playSfx('error');
    } else {
        contentInput.value = ''; // Clear input
        contentInput.focus();
    }
});
