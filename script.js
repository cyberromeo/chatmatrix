
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

    if (clockInterval) clearInterval(clockInterval);

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

// 1. Splash Input Logic
const splashInput = document.getElementById('splash-username');
const splashClock = document.getElementById('splash-clock');
const splashDate = document.getElementById('splash-date');
let clockInterval;

// Clock Logic
function updateClock() {
    if (splashClock) {
        const now = new Date();
        splashClock.innerText = now.toLocaleTimeString('en-US', { hour12: false });
    }
    if (splashDate) {
        const now = new Date();
        // Format: DD.MM.YY
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        splashDate.innerText = `${day}.${month}.${year}`;
    }
}

if (splashClock) {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

// Glyph Loader Logic
const glyphBar = document.getElementById('glyph-bar');
const readyText = document.getElementById('ready-text');

if (glyphBar && readyText) {
    setTimeout(() => {
        glyphBar.style.display = 'none';
        readyText.style.display = 'block';
    }, 3000); // 3 seconds matching the animation time roughly
}

if (splashInput) {
    // Auto focus
    setTimeout(() => splashInput.focus(), 500);

    splashInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const name = splashInput.value.trim().toUpperCase();
            if (name) {
                // Set username
                if (usernameInput) usernameInput.value = name;

                // Remove splash
                removeSplash();
            } else {
                // Shake effect or just focus
                splashInput.classList.add('error');
                setTimeout(() => splashInput.classList.remove('error'), 300);
            }
        }
    });
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
    // Unique ID for this session to identify self
    const mySessionId = Math.random().toString(36).substr(2, 9);

    // Typing state
    let isTyping = false;
    let typingTimeout;

    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            messagesContainer.appendChild(renderMessage(newMsg));
            if (window.playSfx) window.playSfx('receive');
            scrollToBottom();
        })
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();

            // 1. Update Online Count
            const onlineCount = Object.keys(state).length;
            const countEl = document.getElementById('online-count');
            if (countEl) {
                countEl.innerText = `ONLINE: ${onlineCount}`;
            }

            // 2. Update Typing Indicator
            const typingUsers = [];
            for (const id in state) {
                // Filter out self and non-typing users
                const userState = state[id][0]; // Supabase sends array of states per user
                if (userState.user_id !== mySessionId && userState.typing) {
                    typingUsers.push(userState.username);
                }
            }

            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                if (typingUsers.length > 0) {
                    const text = typingUsers.length > 3
                        ? `${typingUsers.length} SIGNALS TRANSMITTING...`
                        : `${typingUsers.join(', ')} IS TYPING...`;
                    indicator.innerText = text;
                    indicator.style.opacity = '1';
                } else {
                    indicator.innerText = '';
                    indicator.style.opacity = '0';
                }
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const trackStatus = async (typing) => {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: mySessionId,
                        username: usernameInput.value.trim() || 'GHOST',
                        typing: typing
                    });
                };

                // Initial Track
                await trackStatus(false);

                // Typing Listeners
                contentInput.addEventListener('input', () => {
                    if (!isTyping) {
                        isTyping = true;
                        trackStatus(true);
                    }

                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        isTyping = false;
                        trackStatus(false);
                    }, 2000); // Stop typing after 2s of silence
                });
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
