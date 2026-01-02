
// SUPABASE CONFIGURATION
// REPLACE THESE WITH YOUR OWN PROJECT VALUES
const SUPABASE_URL = 'https://bvbbyfnlecxtugsfrchk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UMlnwzO10ZvXxPzZYrge_Q_UyM0yZAF';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const usernameInput = document.getElementById('username');
const contentInput = document.getElementById('content');

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

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true }) // Order by time ascending
        .limit(50); // Get last 50 messages

    if (error) {
        console.error('Error loading messages:', error);
        if (loadingState) loadingState.textContent = 'SYSTEM ERROR: CONNECT FAILED';
        return;
    }

    if (loadingState) loadingState.remove();

    messages.forEach(msg => {
        messagesContainer.appendChild(renderMessage(msg));
    });

    scrollToBottom();
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

// Initialize
async function init() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        const loadingState = document.querySelector('.loading-state');
        if (loadingState) {
            loadingState.innerHTML = 'SETUP REQUIRED:<br>EDIT script.js WITH SUPABASE KEYS';
            loadingState.style.color = 'var(--accent-color)';
        }
        return;
    }

    await loadMessages();
    subscribeToMessages();
}

init();
