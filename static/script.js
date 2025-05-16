// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const appHeader = document.getElementById('app-header');
    const appSidebar = document.getElementById('app-sidebar');
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const saveChatBtn = document.getElementById('save-chat-btn');
    const copyLastBtn = document.getElementById('copy-last-btn');
    const apiKeyInput = document.getElementById('api-key-input'); // Added for completeness
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const inputArea = document.getElementById('input-area');


    // --- State Variables ---
    let currentTheme = localStorage.getItem('nova-chat-theme') || 'dark';
    let lastBotResponseRaw = ""; // For copy functionality
    let isBotTyping = false;
    let typingIndicatorElement = null;

    // --- Theme Colors (from Tailwind config, simplified for JS) ---
    const themes = {
        dark: {
            bg_main: 'bg-dark-bg_main', text_light: 'text-dark-text_light',
            bg_sidebar: 'bg-dark-bg_sidebar', bg_input: 'bg-dark-bg_input',
            bg_chat_history: 'bg-dark-bg_chat_history', accent: 'text-dark-accent',
            button: 'bg-dark-button', button_hover: 'hover:bg-dark-button_hover', button_text: 'text-dark-button_text',
            user_msg_bg: '#89b4fa', user_msg_text: '#11111b',
            bot_msg_bg: '#a6e3a1', bot_msg_text: '#11111b',
            error_bg: '#f38ba8', error_text: '#11111b',
            timestamp: '#888899', system_text: '#b0b8d1',
            status_connected_fg: 'bg-green-500', status_disconnected_fg: 'bg-red-500'
        },
        light: {
            bg_main: 'bg-light-bg_main', text_light: 'text-light-text_light',
            bg_sidebar: 'bg-light-bg_sidebar', bg_input: 'bg-light-bg_input',
            bg_chat_history: 'bg-light-bg_chat_history', accent: 'text-light-accent',
            button: 'bg-light-button', button_hover: 'hover:bg-light-button_hover', button_text: 'text-light-button_text',
            user_msg_bg: '#2980b9', user_msg_text: '#ffffff',
            bot_msg_bg: '#27ae60', bot_msg_text: '#ffffff',
            error_bg: '#e74c3c', error_text: '#ffffff',
            timestamp: '#7f8c8d', system_text: '#5c6a79',
            status_connected_fg: 'bg-green-500', status_disconnected_fg: 'bg-red-500'
        }
    };

    // --- Helper Functions ---
    function applyTheme(themeName) {
        currentTheme = themeName;
        localStorage.setItem('nova-chat-theme', themeName);
        const theme = themes[themeName];

        // Toggle body class for Tailwind dark mode
        if (themeName === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Update CSS variables for message bubbles and other dynamic styles
        document.documentElement.style.setProperty('--user-msg-bg-color', theme.user_msg_bg);
        document.documentElement.style.setProperty('--user-msg-text-color', theme.user_msg_text);
        document.documentElement.style.setProperty('--bot-msg-bg-color', theme.bot_msg_bg);
        document.documentElement.style.setProperty('--bot-msg-text-color', theme.bot_msg_text);
        document.documentElement.style.setProperty('--error-bg-color', theme.error_bg);
        document.documentElement.style.setProperty('--error-text-color', theme.error_text);
        document.documentElement.style.setProperty('--timestamp-color', theme.timestamp);
        document.documentElement.style.setProperty('--system-text-color', theme.system_text);


        // Update Tailwind classes on major components
        // Header
        appHeader.className = `p-4 shadow-md flex justify-between items-center transition-colors duration-300 ${theme.bg_sidebar} ${theme.text_light}`;
        appHeader.querySelector('h1').className = `text-2xl font-bold ${theme.accent}`;
        
        // Sidebar
        appSidebar.className = `w-64 p-5 space-y-4 shadow-lg transition-colors duration-300 overflow-y-auto ${theme.bg_sidebar} ${theme.text_light}`;
        appSidebar.querySelector('h2').className = `text-lg font-semibold ${theme.text_light} mb-3`;
        appSidebar.querySelectorAll('button').forEach(btn => {
            btn.className = `w-full text-left p-3 rounded-lg ${theme.button} ${theme.button_text} ${theme.button_hover} font-medium transition-colors duration-150`;
        });
        apiKeyInput.className = `w-full p-2 rounded-md ${theme.bg_input} ${theme.text_light} border border-gray-600 focus:ring-dark-accent focus:border-dark-accent dark:focus:ring-dark-accent dark:focus:border-dark-accent`;


        // Main Area
        appContainer.querySelector('main').className = `flex-1 flex flex-col p-6 transition-colors duration-300 ${theme.bg_main}`;
        chatHistory.className = `flex-1 overflow-y-auto mb-4 p-4 rounded-lg shadow space-y-4 scroll-smooth ${theme.bg_chat_history}`;
        
        // Input Area
        inputArea.className = `p-1 rounded-lg shadow-md transition-colors duration-300 ${theme.bg_main}`;
        inputArea.querySelector('div').className = `flex items-center rounded-lg p-1 ${theme.bg_input}`;
        userInput.className = `flex-1 p-3 bg-transparent ${theme.text_light} placeholder-gray-500 focus:outline-none resize-none`;
        sendBtn.className = `p-3 rounded-md ${theme.button} ${theme.button_text} ${theme.button_hover} font-semibold transition-colors duration-150 ml-2`;
        
        // Update status indicator text color based on theme
        statusText.className = `text-sm ${theme.text_light}`;
        // Status indicator color is set by checkAPIStatus based on actual status

        themeToggleBtn.textContent = themeName === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    function addMessageToChat(text, sender, timestamp, rawTextForCopy = null, isError = false, isSystem = false) {
        removeTypingIndicator(); // Remove typing indicator before adding new message

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-bubble', 'mb-2', 'flex', 'flex-col');

        const textContentDiv = document.createElement('div');

        if (isError) {
            messageDiv.classList.add('error-message');
            textContentDiv.innerHTML = text; // text is already HTML formatted for errors
        } else if (isSystem) {
            messageDiv.classList.add('system-message');
            textContentDiv.innerHTML = text;
        } else {
            messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
            textContentDiv.innerHTML = text; // text is HTML (includes <br>, <strong>, etc.)
            if (sender === 'bot' && rawTextForCopy) {
                lastBotResponseRaw = rawTextForCopy;
            }
        }
        
        messageDiv.appendChild(textContentDiv);

        if (timestamp && !isSystem && !isError) {
            const timeSpan = document.createElement('span');
            timeSpan.classList.add('timestamp', 'self-end' ); // Aligns timestamp correctly for user/bot
            if (sender === 'user') timeSpan.classList.add('text-right'); else timeSpan.classList.add('text-left');
            timeSpan.textContent = timestamp;
            messageDiv.appendChild(timeSpan);
        }
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll to bottom
    }

    function showTypingIndicator() {
        if (isBotTyping) return;
        isBotTyping = true;

        typingIndicatorElement = document.createElement('div');
        typingIndicatorElement.classList.add('message-bubble', 'bot-message', 'mb-2', 'flex', 'items-center');
        typingIndicatorElement.style.backgroundColor = themes[currentTheme].bot_msg_bg; // Match bot bubble color
        typingIndicatorElement.style.color = themes[currentTheme].bot_msg_text;

        const typingText = document.createElement('span');
        typingText.textContent = "Bot is typing";
        
        const loader = document.createElement('div');
        loader.classList.add('loader'); // Defined in style.css

        typingIndicatorElement.appendChild(typingText);
        typingIndicatorElement.appendChild(loader);
        
        chatHistory.appendChild(typingIndicatorElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function removeTypingIndicator() {
        if (typingIndicatorElement && typingIndicatorElement.parentNode === chatHistory) {
            chatHistory.removeChild(typingIndicatorElement);
        }
        typingIndicatorElement = null;
        isBotTyping = false;
    }


    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;

        addMessageToChat(messageText.replace(/\n/g, '<br>'), 'user', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset height
        userInput.focus();
        sendBtn.disabled = true;
        showTypingIndicator();

        try {
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, apiKey: apiKeyInput.value }) // apiKey can be used by backend if provided
            });

            removeTypingIndicator();
            sendBtn.disabled = false;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error occurred. Status: " + response.status }));
                addMessageToChat(`Error: ${errorData.error || "Failed to get response from server."}`, 'system', null, null, true);
                checkAPIStatus(); // Re-check status on error
                return;
            }

            const data = await response.json();
            if (data.bot_response) {
                addMessageToChat(data.bot_response, 'bot', data.timestamp, data.raw_bot_response);
            } else if (data.error) {
                addMessageToChat(`Error: ${data.error}`, 'system', null, null, true);
            }
        } catch (error) {
            removeTypingIndicator();
            sendBtn.disabled = false;
            console.error('Send message error:', error);
            addMessageToChat(`Network error or server unavailable. Please try again. (${error.message})`, 'system', null, null, true);
            checkAPIStatus(); // Re-check status on error
        }
    }

    async function checkAPIStatus() {
        try {
            const response = await fetch('/check_api_status');
            const data = await response.json();
            statusText.textContent = data.status_text;
            statusIndicator.className = `w-3 h-3 rounded-full ${data.status_indicator_color}`;
            statusIndicator.title = data.status_text;
        } catch (error) {
            console.error("Error checking API status:", error);
            statusText.textContent = "Status Check Failed";
            statusIndicator.className = `w-3 h-3 rounded-full ${themes[currentTheme].status_disconnected_fg}`;
            statusIndicator.title = "Status Check Failed - Server Unreachable";
        }
    }


    // --- Event Listeners ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });


    themeToggleBtn.addEventListener('click', () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        addMessageToChat(`Switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`, 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    });

    clearChatBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear the chat history? This will also reset the bot's memory.")) {
            chatHistory.innerHTML = ''; // Clear visually immediately
             addMessageToChat("Chat history cleared. Bot session reset.", 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            lastBotResponseRaw = "";
            try {
                const response = await fetch('/clear_chat_session', { method: 'POST' });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({error: "Failed to clear session on server."}));
                    addMessageToChat(`Server clear failed: ${errorData.error}`, 'system', null, null, true);
                }
            } catch (error) {
                 addMessageToChat(`Error contacting server to clear session: ${error.message}`, 'system', null, null, true);
            }
        }
    });

    saveChatBtn.addEventListener('click', () => {
        const messages = [];
        chatHistory.querySelectorAll('.message-bubble').forEach(bubble => {
            const isUser = bubble.classList.contains('user-message');
            const isBot = bubble.classList.contains('bot-message');
            const isSystem = bubble.classList.contains('system-message');
            const isError = bubble.classList.contains('error-message');
            
            let prefix = "";
            if (isUser) prefix = "User";
            else if (isBot) prefix = "Bot";
            else if (isSystem) prefix = "System";
            else if (isError) prefix = "Error";

            const textContent = bubble.querySelector('div:first-child').innerText || bubble.querySelector('div:first-child').textContent;
            const timestampEl = bubble.querySelector('.timestamp');
            const timestamp = timestampEl ? timestampEl.textContent : "";
            
            if (prefix) { // Only include actual messages
                 messages.push(`${timestamp ? `[${timestamp}] ` : ''}${prefix}: ${textContent}`);
            }
        });

        if (messages.length === 0) {
            addMessageToChat("Chat is empty. Nothing to save.", 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            return;
        }

        const chatContent = messages.join('\n\n');
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        a.download = `nova_chat_history_${formattedDate}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addMessageToChat("Chat history saved to your downloads folder.", 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    });

    copyLastBtn.addEventListener('click', () => {
        if (!lastBotResponseRaw) {
            addMessageToChat("No bot message to copy yet.", 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            return;
        }
        navigator.clipboard.writeText(lastBotResponseRaw)
            .then(() => {
                addMessageToChat("Last bot message copied to clipboard!", 'system', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                addMessageToChat("Failed to copy message. Your browser might not support this feature or requires permission.", 'system', null, null, true);
            });
    });
    
    // --- Initial Setup ---
    applyTheme(currentTheme); // Apply saved or default theme
    checkAPIStatus(); // Check API status on load
    userInput.focus();
    userInput.style.height = 'auto'; // Initial height adjustment
    userInput.style.height = (userInput.scrollHeight) + 'px';

    // Periodically check API status (e.g., every 30 seconds)
    setInterval(checkAPIStatus, 30000); 
});
