
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
// Auto Boot Sequence
function removeSplash() {
    if (!splashScreen) return;

    // Prevent double removal
    if (splashScreen.classList.contains('removing')) return;
    splashScreen.classList.add('removing');

    // Fade out splash
    splashScreen.style.transition = 'opacity 0.8s ease';
    splashScreen.style.opacity = '0';

    // Show main container
    mainContainer.style.display = 'flex';
    setTimeout(() => {
        mainContainer.style.transition = 'opacity 1s ease';
        mainContainer.style.opacity = '1';
    }, 50);

    setTimeout(() => {
        splashScreen.remove();
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
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

        scrollToBottom();

    } catch (err) {
        console.error('Connection Error:', err);
        if (loadingState) {
            loadingState.innerHTML = `SYSTEM ERROR:<br>${err.message || 'UNKNOWN'}<br>RETRYING...`;
            loadingState.style.color = 'red';
            setTimeout(loadMessages, 3000); // Auto retry
        }
    }
}

// Subscribe to Realtime Updates
function subscribeToMessages() {
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            messagesContainer.appendChild(renderMessage(newMsg));

            // Auto scroll if user was near bottom
            // Simple logic: always scroll for now to ensure visibility of new chats
            scrollToBottom();
        })
        .subscribe();
}

// Handle Form Submission
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = contentInput.value.trim();
    const username = usernameInput.value.trim() || 'GHOST';

    if (!content) return;

    // Send to Supabase
    const { error } = await supabase
        .from('messages')
        .insert([{ username, content }]);

    if (error) {
        console.error('Error sending message:', error);
        alert('TRANSMISSON FAILED');
    } else {
        contentInput.value = ''; // Clear input
        contentInput.focus();
    }
});


