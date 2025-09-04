class ChatInterface {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.isTyping = false;
        this.voiceOutputEnabled = false;
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.checkModelsBtn = document.getElementById('checkModelsBtn');
        this.modelsInfoModal = document.getElementById('modelsInfoModal');
        this.closeModelsInfoBtn = document.getElementById('closeModelsInfoBtn');
        this.serverStatus = {
            indicator: document.querySelector('.status-indicator'),
            text: document.querySelector('.status-text')
        };
        
        // AI Settings
        this.aiSettings = {
            temperature: 0.7,
            maxTokens: 2000,
            model: 'qwen2.5-coder'
        };
        
        // DOM elements
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.modelSelect = document.getElementById('modelSelect');
        this.clearBtn = document.getElementById('clearBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.chatList = document.getElementById('chatList');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        this.searchInput = document.getElementById('searchInput');
        this.exportBtn = document.getElementById('exportBtn');
        this.themeBtn = document.getElementById('themeBtn');
        this.fileUploadBtn = document.getElementById('fileUploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.templatesBtn = document.getElementById('templatesBtn');
        this.templatesModal = document.getElementById('templatesModal');
        this.closeTemplatesBtn = document.getElementById('closeTemplatesBtn');
        this.aiSettingsBtn = document.getElementById('aiSettingsBtn');
        this.aiSettingsModal = document.getElementById('aiSettingsModal');
        this.closeAiSettingsBtn = document.getElementById('closeAiSettingsBtn');
        this.shortcutsHelp = document.getElementById('shortcutsHelp');
        this.overlay = document.getElementById('overlay');
        
        // Event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.checkModelsBtn.addEventListener('click', () => this.showModelsInfo());
        this.closeModelsInfoBtn.addEventListener('click', () => this.hideModelsInfo());
        this.modelSelect.addEventListener('change', () => {
            this.aiSettings.model = this.modelSelect.value;
            const aiSettingsModelSelect = document.getElementById('aiSettingsModelSelect');
            if (aiSettingsModelSelect) {
                aiSettingsModelSelect.value = this.modelSelect.value;
            }
            this.showNotification(`Model changed to ${this.modelSelect.value}`, 'info');
        });
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.stopBtn.addEventListener('click', () => this.stopGeneration());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.searchInput.addEventListener('input', () => this.searchChats());
        this.exportBtn.addEventListener('click', () => this.exportChat());
        this.themeBtn.addEventListener('click', () => this.toggleTheme());
        this.fileUploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.voiceBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showVoiceInputHelp();
        });
        this.templatesBtn.addEventListener('click', () => this.showTemplatesModal());
        this.closeTemplatesBtn.addEventListener('click', () => this.hideTemplatesModal());
        this.aiSettingsBtn.addEventListener('click', () => this.showAiSettingsModal());
        this.closeAiSettingsBtn.addEventListener('click', () => this.hideAiSettingsModal());
        
        // Add AI Settings model selection event listener
        const aiSettingsModelSelect = document.getElementById('aiSettingsModelSelect');
        if (aiSettingsModelSelect) {
            aiSettingsModelSelect.addEventListener('change', () => {
                this.aiSettings.model = aiSettingsModelSelect.value;
                this.modelSelect.value = aiSettingsModelSelect.value;
                this.showNotification(`Model changed to ${aiSettingsModelSelect.value}`, 'info');
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Help modal
        this.overlay.addEventListener('click', () => {
            this.hideShortcutsHelp();
            this.hideTemplatesModal();
            this.hideAiSettingsModal();
            this.hideModelsInfo();
        });
        
        // Initialize
        this.chats = new Map();
        this.currentChatId = null;
        this.loadAllChats();
        
        // Update chat list immediately after loading chats
        this.updateChatList();
        
        // Load the most recent chat or create a new one if none exist
        if (this.chats.size > 0) {
            // Find the most recent chat
            let mostRecentChatId = null;
            let mostRecentTime = 0;
            
            this.chats.forEach((chatData, chatId) => {
                if (chatData.lastUpdated > mostRecentTime) {
                    mostRecentTime = chatData.lastUpdated;
                    mostRecentChatId = chatId;
                }
            });
            
            if (mostRecentChatId) {
                this.loadChatHistory(mostRecentChatId);
            } else {
                this.createNewChat();
            }
        } else {
            this.createNewChat();
        }
        
        this.focusInput();
        
        // Load theme preference
        this.loadThemePreference();
        
        // Load voice output preference
        this.loadVoiceOutputPreference();
        
        // Add network status listener
        window.addEventListener('online', () => {
            this.showNotification('Internet connection restored!', 'success');
            this.updateVoiceButtonStatus();
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Internet connection lost. Voice input will not work.', 'error');
            this.updateVoiceButtonStatus();
        });
        
        // Initial status check
        this.updateVoiceButtonStatus();

        // Check available models on startup
        this.checkAvailableModels();
    }

    async checkAvailableModels() {
        try {
            const response = await fetch('/api/check-models', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.status === 'success' && data.models && data.models.length > 0) {
                // Generate options HTML
                const optionsHtml = data.models.map(model => `
                    <option value="${model.id}">${model.id}</option>
                `).join('');

                // Update both model selection dropdowns
                this.modelSelect.innerHTML = optionsHtml;
                const aiSettingsModelSelect = document.getElementById('aiSettingsModelSelect');
                if (aiSettingsModelSelect) {
                    aiSettingsModelSelect.innerHTML = optionsHtml;
                }

                // Set the current model if it exists in the list, otherwise use the first available model
                if (!data.models.find(m => m.id === this.aiSettings.model) && data.models.length > 0) {
                    this.aiSettings.model = data.models[0].id;
                    this.modelSelect.value = this.aiSettings.model;
                    if (aiSettingsModelSelect) {
                        aiSettingsModelSelect.value = this.aiSettings.model;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking available models:', error);
            this.showNotification('Failed to load available models', 'error');
        }
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatTimestamp(date) {
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
    
    focusInput() {
        this.messageInput.focus();
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        
        // Save to localStorage
        this.saveChatHistory();
        
        // Show typing indicator
        this.setTyping(true);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId,
                    model: this.aiSettings.model,
                    temperature: this.aiSettings.temperature,
                    maxTokens: this.aiSettings.maxTokens
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.addMessage(data.response, 'ai');
                // Save to localStorage after AI response
                this.saveChatHistory();
            } else {
                this.addErrorMessage(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage('Network error. Please try again.');
        } finally {
            this.setTyping(false);
        }
    }
    
    async stopGeneration() {
        try {
            const response = await fetch('/api/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId
                })
            });
            
            if (response.ok) {
                this.showNotification('Generation stopped', 'info');
                this.setTyping(false);
            } else {
                this.showNotification('Failed to stop generation', 'error');
            }
        } catch (error) {
            console.error('Error stopping generation:', error);
            this.showNotification('Failed to stop generation', 'error');
        }
    }
    
    addMessage(content, sender) {
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Process markdown and code blocks
        const processedContent = this.processMarkdown(content);
        messageContent.innerHTML = processedContent;
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTimestamp(new Date());
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        
        // Add reactions for AI messages
        if (sender === 'ai') {
            this.addMessageReactions(messageDiv, content);
            // Auto-speak AI messages if voice output is enabled
            if (this.voiceOutputEnabled) {
                this.speakText(content);
            }
        }
        
        this.chatMessages.appendChild(messageDiv);
        
        // Apply syntax highlighting to code blocks
        this.highlightCodeBlocks(messageContent);
        
        this.scrollToBottom();
    }
    
    addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }
    
    setTyping(typing) {
        this.isTyping = typing;
        this.sendBtn.disabled = typing;
        this.messageInput.disabled = typing;
        
        if (typing) {
            this.typingIndicator.style.display = 'flex';
            this.stopBtn.style.display = 'inline-block';
        } else {
            this.typingIndicator.style.display = 'none';
            this.stopBtn.style.display = 'none';
        }
    }
    
    async clearChat() {
        try {
            await fetch('/api/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId
                })
            });
            
            // Clear chat messages
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <h3>Welcome to Keysight Assistant!</h3>
                    <p>Start a conversation by typing a message below.</p>
                </div>
            `;
            
            // Generate new session ID
            this.sessionId = this.generateSessionId();
            
            // Clear localStorage
            this.clearChatHistory();
            
            // Show success message
            this.showNotification('Chat cleared successfully!', 'success');
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showNotification('Failed to clear chat', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Check if light theme is active
        const isLightTheme = document.body.classList.contains('light-theme');
        
        // Define colors based on theme
        let backgroundColor, textColor;
        if (type === 'success') {
            backgroundColor = isLightTheme ? '#d4edda' : '#28a745';
            textColor = isLightTheme ? '#155724' : 'white';
        } else if (type === 'error') {
            backgroundColor = isLightTheme ? '#f8d7da' : '#dc3545';
            textColor = isLightTheme ? '#721c24' : 'white';
        } else {
            backgroundColor = isLightTheme ? '#d1ecf1' : '#17a2b8';
            textColor = isLightTheme ? '#0c5460' : 'white';
        }
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: ${textColor};
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            background: ${backgroundColor};
            border: 1px solid ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'transparent'};
            box-shadow: 0 4px 12px ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // Chat History Methods
    saveChatHistory() {
        if (!this.currentChatId) return;
        
        try {
            const messages = [];
            const messageElements = this.chatMessages.querySelectorAll('.message');
            
            messageElements.forEach(element => {
                const isUser = element.classList.contains('user');
                const content = element.querySelector('.message-content').textContent;
                messages.push({
                    role: isUser ? 'user' : 'ai',
                    content: content,
                    timestamp: Date.now()
                });
            });
            
            const chatData = {
                id: this.currentChatId,
                sessionId: this.sessionId,
                messages: messages,
                model: this.modelSelect.value,
                title: this.generateChatTitle(messages),
                lastUpdated: Date.now()
            };
            
            this.chats.set(this.currentChatId, chatData);
            this.saveAllChats();
            this.updateChatList();
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }
    
    loadChatHistory(chatId) {
        try {
            const chatData = this.chats.get(chatId);
            if (chatData) {
                // Set the model
                if (chatData.model) {
                    this.modelSelect.value = chatData.model;
                }
                
                // Clear current messages
                this.chatMessages.innerHTML = '';
                
                // Load messages
                if (chatData.messages && chatData.messages.length > 0) {
                    chatData.messages.forEach(msg => {
                        this.addMessage(msg.content, msg.role);
                    });
                } else {
                    // Show welcome message if no messages
                    this.chatMessages.innerHTML = `
                        <div class="welcome-message">
                            <i class="fas fa-comments"></i>
                            <h3>Welcome to Keysight Assistant!</h3>
                            <p>Start a conversation by typing a message below.</p>
                        </div>
                    `;
                }
                
                this.currentChatId = chatId;
                this.sessionId = chatData.sessionId;
                this.updateActiveChat();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
    
    createNewChat() {
        const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.currentChatId = chatId;
        this.sessionId = this.generateSessionId();
        
        // Clear chat messages
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>Welcome to Keysight Assistant!</h3>
                <p>Start a conversation by typing a message below.</p>
            </div>
        `;
        
        // Create new chat data
        const chatData = {
            id: chatId,
            sessionId: this.sessionId,
            messages: [],
            model: this.modelSelect.value,
            title: 'New Chat',
            lastUpdated: Date.now()
        };
        
        this.chats.set(chatId, chatData);
        this.saveAllChats();
        this.updateChatList();
        this.updateActiveChat();
    }
    
    deleteChat(chatId) {
        if (this.chats.has(chatId)) {
            this.chats.delete(chatId);
            this.saveAllChats();
            this.updateChatList();
            
            // If we deleted the current chat, create a new one
            if (chatId === this.currentChatId) {
                this.createNewChat();
            }
        }
    }
    
    generateChatTitle(messages) {
        if (messages.length === 0) return 'New Chat';
        
        // Use the first user message as title
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            const title = firstUserMessage.content.substring(0, 30);
            return title.length === 30 ? title + '...' : title;
        }
        
        return 'New Chat';
    }

    editChatTitle(chatId) {
        const chatData = this.chats.get(chatId);
        if (!chatData) return;

        const newTitle = prompt('Enter new chat title:', chatData.title);
        if (newTitle === null) return; // User cancelled

        // Update the title
        chatData.title = newTitle.trim() || 'New Chat';
        this.chats.set(chatId, chatData);
        this.saveAllChats();
        this.updateChatList();
        this.showNotification('Chat title updated!', 'success');
    }
    
    updateChatList() {
        this.chatList.innerHTML = '';
        
        this.chats.forEach((chatData, chatId) => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chatId === this.currentChatId ? 'active' : ''}`;
            chatItem.onclick = () => this.loadChatHistory(chatId);
            
            const title = document.createElement('div');
            title.className = 'chat-item-title';
            title.textContent = chatData.title;
            
            const preview = document.createElement('div');
            preview.className = 'chat-item-preview';
            preview.textContent = chatData.messages.length > 0 
                ? chatData.messages[chatData.messages.length - 1].content.substring(0, 50)
                : 'No messages yet';
            
            const actions = document.createElement('div');
            actions.className = 'chat-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'chat-item-edit';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.editChatTitle(chatId);
            };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'chat-item-delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteChat(chatId);
            };
            
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            chatItem.appendChild(title);
            chatItem.appendChild(preview);
            chatItem.appendChild(actions);
            this.chatList.appendChild(chatItem);
        });
    }
    
    updateActiveChat() {
        // Update active state in chat list
        const chatItems = this.chatList.querySelectorAll('.chat-item');
        chatItems.forEach(item => item.classList.remove('active'));
        
        const activeItem = this.chatList.querySelector(`[onclick*="${this.currentChatId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
    
    loadAllChats() {
        try {
            const saved = localStorage.getItem('aiChatHistory_v2');
            if (saved) {
                const data = JSON.parse(saved);
                this.chats = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('Error loading all chats:', error);
        }
    }
    
    saveAllChats() {
        try {
            const data = Object.fromEntries(this.chats);
            localStorage.setItem('aiChatHistory_v2', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving all chats:', error);
        }
    }
    
    clearChatHistory() {
        try {
            localStorage.removeItem('aiChatHistory_v2');
            this.chats.clear();
            this.updateChatList();
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }
    
    toggleSidebar() {
        this.sidebar.classList.toggle('open');
        this.sidebarOverlay.classList.toggle('show');
        
        // Add click event listener to overlay to close sidebar
        if (this.sidebar.classList.contains('open')) {
            this.sidebarOverlay.onclick = () => {
                this.sidebar.classList.remove('open');
                this.sidebarOverlay.classList.remove('show');
            };
        } else {
            this.sidebarOverlay.onclick = null;
        }
    }
    
    // Search functionality
    searchChats() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const chatItems = this.chatList.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const title = item.querySelector('.chat-item-title').textContent.toLowerCase();
            const preview = item.querySelector('.chat-item-preview').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || preview.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Export functionality
    exportChat() {
        if (!this.currentChatId) return;
        
        const chatData = this.chats.get(this.currentChatId);
        if (!chatData) return;
        
        let exportText = `Keysight Assistant - Chat Export\n`;
        exportText += `Date: ${new Date().toLocaleString()}\n`;
        exportText += `Model: ${chatData.model}\n`;
        exportText += `Title: ${chatData.title}\n\n`;
        exportText += `Conversation:\n`;
        exportText += `================================\n\n`;
        
        chatData.messages.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : 'Assistant';
            exportText += `${role}: ${msg.content}\n\n`;
        });
        
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keysight-chat-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Chat exported successfully!', 'success');
    }
    
    // Theme functionality
    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        this.themeBtn.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            this.themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.createNewChat();
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportChat();
                    break;
                case 't':
                    e.preventDefault();
                    this.toggleTheme();
                    break;
                case 'f':
                    e.preventDefault();
                    this.searchInput.focus();
                    break;
                case 'u':
                    e.preventDefault();
                    this.fileInput.click();
                    break;
                case 'v':
                    e.preventDefault();
                    this.toggleVoiceInput();
                    break;
                case 'm':
                    e.preventDefault();
                    this.showTemplatesModal();
                    break;
                case 's':
                    e.preventDefault();
                    this.showAiSettingsModal();
                    break;
                case '?':
                    e.preventDefault();
                    this.showShortcutsHelp();
                    break;
                case 'V':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.toggleVoiceOutput();
                    }
                    break;
            }
        }
    }
    
    showShortcutsHelp() {
        this.shortcutsHelp.classList.add('show');
        this.overlay.classList.add('show');
    }

    async showModelsInfo() {
        this.modelsInfoModal.classList.add('show');
        this.overlay.classList.add('show');
        
        // Check server status first
        try {
            const statusResponse = await fetch('/api/check-server');
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'connected') {
                this.serverStatus.indicator.classList.add('connected');
                this.serverStatus.indicator.classList.remove('disconnected');
                this.serverStatus.text.textContent = 'Server Connected';
                
                // Now check available models
                const modelsList = document.querySelector('.models-list');
                modelsList.innerHTML = '<div class="loading">Loading models...</div>';
                
                const response = await fetch('/api/check-models', {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Update models list in the modal
                    modelsList.innerHTML = data.models.map(model => `
                        <div class="model-item">
                            <div class="model-name">${model.id}</div>
                            <div class="model-info">
                                <div>Owner: ${model.owner}</div>
                                ${model.created ? `<div>Created: ${model.created}</div>` : ''}
                            </div>
                        </div>
                    `).join('');

                    // Update model selection dropdown
                    this.modelSelect.innerHTML = data.models.map(model => `
                        <option value="${model.id}">${model.id}</option>
                    `).join('');

                    // Set the current model if it exists in the list, otherwise use the first available model
                    if (!data.models.find(m => m.id === this.aiSettings.model) && data.models.length > 0) {
                        this.aiSettings.model = data.models[0].id;
                        this.modelSelect.value = this.aiSettings.model;
                    }
                } else {
                    throw new Error(data.error || 'Failed to fetch models');
                }
            } else {
                throw new Error('Server is not available');
            }
        } catch (error) {
            this.serverStatus.indicator.classList.add('disconnected');
            this.serverStatus.indicator.classList.remove('connected');
            this.serverStatus.text.textContent = 'Server Disconnected';
            
            const modelsList = document.querySelector('.models-list');
            modelsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
    
    hideModelsInfo() {
        this.modelsInfoModal.classList.remove('show');
        this.overlay.classList.remove('show');
    }
    
    hideShortcutsHelp() {
        this.shortcutsHelp.classList.remove('show');
        this.overlay.classList.remove('show');
    }
    
    // Message reactions
    addMessageReactions(messageDiv, content) {
        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'message-reactions';
        
        const likeBtn = document.createElement('button');
        likeBtn.className = 'reaction-btn';
        likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
        likeBtn.onclick = () => this.toggleReaction(likeBtn);
        
        const dislikeBtn = document.createElement('button');
        dislikeBtn.className = 'reaction-btn';
        dislikeBtn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
        dislikeBtn.onclick = () => this.toggleReaction(dislikeBtn);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'reaction-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.onclick = () => this.copyMessage(content);
        
        reactionsDiv.appendChild(likeBtn);
        reactionsDiv.appendChild(dislikeBtn);
        reactionsDiv.appendChild(copyBtn);
        messageDiv.appendChild(reactionsDiv);
    }
    
    toggleReaction(btn) {
        btn.classList.toggle('active');
        const icon = btn.querySelector('i');
        if (btn.classList.contains('active')) {
            this.showNotification('Reaction added!', 'success');
        }
    }
    
    copyMessage(content) {
        navigator.clipboard.writeText(content).then(() => {
            this.showNotification('Message copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy message', 'error');
        });
    }
    
    // File upload handling
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File too large. Maximum size is 10MB.', 'error');
            return;
        }
        
        // Check file type
        const allowedTypes = [
            'text/plain', 'text/csv', 'application/json', 
            'text/markdown', 'text/x-python', 'text/javascript',
            'text/html', 'text/css'
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|csv|json|md|py|js|html|css)$/)) {
            this.showNotification('Unsupported file type. Please upload text files only.', 'error');
            return;
        }
        
        try {
            this.showNotification('Reading file...', 'info');
            
            const content = await this.readFileContent(file);
            
            // Add file content as a user message
            const fileMessage = `📎 **File Uploaded: ${file.name}**\n\n\`\`\`\n${content}\n\`\`\``;
            this.addMessage(fileMessage, 'user');
            
            // Save to localStorage
            this.saveChatHistory();
            
            // Clear the file input
            this.fileInput.value = '';
            
            // Send the file content to the bot for processing
            this.setTyping(true);
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Please analyze this file:\n${content}`,
                        sessionId: this.sessionId,
                        model: this.aiSettings.model,
                        temperature: this.aiSettings.temperature,
                        maxTokens: this.aiSettings.maxTokens
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.addMessage(data.response, 'ai');
                    this.saveChatHistory();
                } else {
                    this.addErrorMessage(data.error || 'Failed to process file');
                }
            } catch (error) {
                console.error('Error processing file:', error);
                this.addErrorMessage('Failed to process file. Please try again.');
            } finally {
                this.setTyping(false);
            }
            
            this.showNotification('File uploaded and processed!', 'success');
            
        } catch (error) {
            console.error('Error reading file:', error);
            this.showNotification('Error reading file. Please try again.', 'error');
        }
    }
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    // Markdown processing
    processMarkdown(text) {
        // Escape HTML to prevent XSS
        text = this.escapeHtml(text);
        
        // Process code blocks with language specification
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Process inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Process bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Process italic text
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Process line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Apply syntax highlighting to code blocks
    highlightCodeBlocks(container) {
        if (typeof Prism !== 'undefined') {
            const codeBlocks = container.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                Prism.highlightElement(block);
            });
        }
    }
    
    // Voice input functionality
    async toggleVoiceInput() {
        if (!this.recognition) {
            this.initSpeechRecognition();
        }
        
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            // Check network connectivity first
            if (!navigator.onLine) {
                this.showNotification('No internet connection. Voice input requires internet for speech processing.', 'error');
                return;
            }
            
            // Test network connectivity to speech recognition service
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
                
                await fetch('https://www.google.com', { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
            } catch (error) {
                if (error.name === 'AbortError') {
                    this.showNotification('Network timeout. Voice input requires stable internet connection.', 'error');
                } else {
                    this.showNotification('Network connectivity issue. Voice input requires stable internet connection.', 'error');
                }
                return;
            }
            
            // Check microphone permissions first
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
                this.startVoiceRecording();
            } catch (error) {
                console.error('Microphone permission error:', error);
                if (error.name === 'NotAllowedError') {
                    this.showNotification('Microphone access denied. Please allow microphone permissions in your browser settings.', 'error');
                } else if (error.name === 'NotFoundError') {
                    this.showNotification('No microphone found. Please connect a microphone and try again.', 'error');
                } else {
                    this.showNotification('Microphone error: ' + error.message, 'error');
                }
            }
        }
    }
    
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.showNotification('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari. You can still type your messages normally.', 'error');
            // Disable the voice button
            this.voiceBtn.style.opacity = '0.5';
            this.voiceBtn.style.cursor = 'not-allowed';
            this.voiceBtn.title = 'Voice input not supported in this browser';
            return;
        }
        
        // Check if we're on HTTPS (required for speech recognition)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            this.showNotification('Voice input requires HTTPS. Please use a secure connection or localhost.', 'error');
            // Disable the voice button
            this.voiceBtn.style.opacity = '0.5';
            this.voiceBtn.style.cursor = 'not-allowed';
            this.voiceBtn.title = 'Voice input requires HTTPS';
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
            this.voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            this.showNotification('Listening... Speak now!', 'info');
        };
        
        this.recognition.onresult = (event) => {
            if (event.results.length > 0) {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.showNotification('Voice input received!', 'success');
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Voice input error. Please try again.';
            
            switch (event.error) {
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone permissions.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try speaking again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Audio capture error. Please check your microphone.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Voice input requires internet connection for speech processing. Please check your connection and try again.';
                    break;
                case 'service-not-allowed':
                    errorMessage = 'Speech recognition service not allowed.';
                    break;
                case 'bad-grammar':
                    errorMessage = 'Speech recognition grammar error.';
                    break;
                case 'language-not-supported':
                    errorMessage = 'Language not supported.';
                    break;
            }
            
            this.showNotification(errorMessage, 'error');
            this.stopVoiceRecording();
        };
        
        this.recognition.onend = () => {
            this.stopVoiceRecording();
        };
        
        this.recognition.onnomatch = () => {
            this.showNotification('No speech recognized. Please try again.', 'error');
            this.stopVoiceRecording();
        };
    }
    
    // Update voice button status based on network connectivity
    updateVoiceButtonStatus() {
        if (!navigator.onLine) {
            this.voiceBtn.style.opacity = '0.5';
            this.voiceBtn.style.cursor = 'not-allowed';
            this.voiceBtn.title = 'Voice input requires internet connection';
        } else {
            this.voiceBtn.style.opacity = '1';
            this.voiceBtn.style.cursor = 'pointer';
            this.voiceBtn.title = 'Voice Input (Ctrl+V) - Right-click for help';
        }
    }
    
    // Helper method to provide voice input troubleshooting
    showVoiceInputHelp() {
        const helpMessage = `
Voice Input Troubleshooting:

1. **Internet Connection**: Voice input requires internet connection for speech processing
2. **Browser Support**: Use Chrome, Edge, or Safari
3. **HTTPS Required**: Must be on HTTPS or localhost
4. **Microphone Permissions**: Allow microphone access when prompted
5. **Microphone Hardware**: Ensure microphone is connected and working
6. **Browser Settings**: Check browser settings for microphone permissions
7. **Network Issues**: If you see "network error", check your internet connection

If issues persist, you can still type your messages normally.

Common Network Issues:
• Corporate firewalls may block speech recognition services
• VPN connections might interfere with voice processing
• Slow or unstable internet connections
• DNS resolution problems
        `;
        
        // Check if light theme is active
        const isLightTheme = document.body.classList.contains('light-theme');
        
        // Create a temporary help modal
        const helpModal = document.createElement('div');
        helpModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${isLightTheme ? '#ffffff' : '#1a1a2e'};
            border: 1px solid ${isLightTheme ? '#e9ecef' : '#2d2d44'};
            border-radius: 16px;
            padding: 24px;
            z-index: 2000;
            max-width: 500px;
            width: 90%;
            color: ${isLightTheme ? '#2c3e50' : '#e6e6e6'};
            font-family: inherit;
            box-shadow: 0 4px 12px ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)'};
        `;
        
        helpModal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #4a9eff;">Voice Input Help</h3>
            <div style="white-space: pre-line; line-height: 1.6; margin-bottom: 20px;">${helpMessage}</div>
            <button onclick="this.parentElement.remove()" style="
                background: #4a9eff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#3a8eff'" onmouseout="this.style.background='#4a9eff'">Close</button>
        `;
        
        document.body.appendChild(helpModal);
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1999;
        `;
        overlay.onclick = () => {
            helpModal.remove();
            overlay.remove();
        };
        document.body.appendChild(overlay);
    }
    
    startVoiceRecording() {
        if (!this.recognition) {
            this.showNotification('Speech recognition not initialized. Please try again.', 'error');
            return;
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            
            // Check if it's already started
            if (error.name === 'InvalidStateError') {
                this.showNotification('Voice recording already in progress.', 'info');
                return;
            }
            
            this.showNotification('Failed to start voice recording. Please check microphone permissions.', 'error');
            this.stopVoiceRecording();
        }
    }
    
    stopVoiceRecording() {
        if (this.recognition && this.isRecording) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
        this.isRecording = false;
        this.voiceBtn.classList.remove('recording');
        this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
    
    // Chat Templates functionality
    showTemplatesModal() {
        this.templatesModal.classList.add('show');
        this.overlay.classList.add('show');
        this.setupTemplateListeners();
    }
    
    hideTemplatesModal() {
        this.templatesModal.classList.remove('show');
        this.overlay.classList.remove('show');
    }
    
    setupTemplateListeners() {
        const templateItems = this.templatesModal.querySelectorAll('.template-item');
        templateItems.forEach(item => {
            item.onclick = () => this.applyTemplate(item.dataset.template);
        });
    }
    
    applyTemplate(templateId) {
        const templates = {
            'code-review': 'Please review this code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n\nHere\'s my code:\n```\n\n```',
            'debug-help': 'I\'m having trouble debugging this issue. Here are the details:\n\n**Error Message:**\n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Code:**\n```\n\n```\n\nPlease help me identify and fix the problem.',
            'explain-code': 'Please explain how this code works, including:\n1. What each part does\n2. The overall logic flow\n3. Any important concepts or patterns used\n\n```\n\n```',
            'explain-concept': 'Please explain this concept in simple terms:\n\n**Concept:** [Insert concept here]\n\nI\'d like to understand:\n1. What it is\n2. Why it\'s important\n3. How it works\n4. Real-world examples',
            'create-example': 'Please create a practical example demonstrating this concept:\n\n**Concept:** [Insert concept here]\n\nI\'d like to see:\n1. A simple example\n2. A more complex example\n3. Best practices for implementation',
            'compare': 'Please compare these two approaches:\n\n**Approach A:**\n\n**Approach B:**\n\nI\'d like to understand:\n1. Key differences\n2. Pros and cons of each\n3. When to use each approach\n4. Performance implications',
            'analyze-data': 'Please analyze this dataset:\n\n**Data Description:**\n\n**Questions I have:**\n1. [Question 1]\n2. [Question 2]\n3. [Question 3]\n\nPlease provide insights and recommendations.',
            'optimize': 'Please help me optimize this solution:\n\n**Current Implementation:**\n```\n\n```\n\n**Requirements:**\n\n**Performance Goals:**\n\nPlease suggest improvements for:\n1. Performance\n2. Readability\n3. Maintainability',
            'best-practices': 'What are the best practices for this topic?\n\n**Topic:** [Insert topic here]\n\nI\'d like to learn about:\n1. Industry standards\n2. Common pitfalls to avoid\n3. Recommended approaches\n4. Tools and resources'
        };
        
        const template = templates[templateId];
        if (template) {
            this.messageInput.value = template;
            this.messageInput.focus();
            this.hideTemplatesModal();
            this.showNotification('Template applied!', 'success');
        }
    }
    
    // Voice Output Methods
    toggleVoiceOutput() {
        this.voiceOutputEnabled = !this.voiceOutputEnabled;
        
        if (this.voiceOutputEnabled) {
            this.showNotification('Voice output enabled', 'success');
            // Update voice button to show it's for output
            this.voiceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.voiceBtn.title = 'Voice Output (Ctrl+Shift+V) - Right-click for help';
        } else {
            this.showNotification('Voice output disabled', 'info');
            // Reset voice button to input mode
            this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.voiceBtn.title = 'Voice Input (Ctrl+V) - Right-click for help';
            this.stopSpeaking();
        }
        
        // Save preference
        localStorage.setItem('voiceOutputEnabled', this.voiceOutputEnabled);
    }
    
    speakText(text) {
        if (!this.voiceOutputEnabled || !this.speechSynthesis) return;
        
        // Stop any current speech
        this.stopSpeaking();
        
        // Clean text for speech (remove markdown, code blocks, etc.)
        const cleanText = this.cleanTextForSpeech(text);
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.9; // Slightly slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Try to use a good voice
        const voices = this.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        this.currentUtterance = utterance;
        this.speechSynthesis.speak(utterance);
    }
    
    stopSpeaking() {
        if (this.speechSynthesis && this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }
    
    cleanTextForSpeech(text) {
        // Remove markdown formatting, code blocks, etc.
        return text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]*`/g, '') // Remove inline code
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Convert links to text
            .replace(/#{1,6}\s+/g, '') // Remove headers
            .replace(/\n+/g, ' ') // Replace multiple newlines with space
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    
    loadVoiceOutputPreference() {
        const saved = localStorage.getItem('voiceOutputEnabled');
        if (saved === 'true') {
            this.voiceOutputEnabled = true;
            this.voiceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.voiceBtn.title = 'Voice Output (Ctrl+Shift+V) - Right-click for help';
        }
    }
    
    // AI Settings Methods
    showAiSettingsModal() {
        if (!this.aiSettingsModal || !this.overlay) {
            console.error('AI Settings Modal elements not found!');
            return;
        }
        this.aiSettingsModal.style.display = 'block';  // Make sure it's visible
        this.overlay.style.display = 'block';  // Show overlay first
        
        // Force a reflow before adding the show class
        void this.aiSettingsModal.offsetWidth;
        
        this.aiSettingsModal.classList.add('show');
        this.overlay.classList.add('show');
        
        // Load settings and set up listeners
        this.loadAiSettings();
        this.updateContextIndicator();
        this.setupAiSettingsListeners();
    }
    
    hideAiSettingsModal() {
        if (!this.aiSettingsModal || !this.overlay) return;
        
        this.aiSettingsModal.classList.remove('show');
        this.overlay.classList.remove('show');
        
        // Wait for transition to finish before hiding
        setTimeout(() => {
            this.aiSettingsModal.style.display = 'none';
            this.overlay.style.display = 'none';
        }, 300); // Match the transition duration from CSS
    }
    
    setupAiSettingsListeners() {
        // Model selection
        const aiModelSelect = document.getElementById('aiModelSelect');
        aiModelSelect.value = this.aiSettings.model;
        aiModelSelect.addEventListener('change', (e) => {
            this.aiSettings.model = e.target.value;
            this.modelSelect.value = e.target.value; // Sync with main model select
        });
        
        // Temperature slider
        const temperatureSlider = document.getElementById('temperatureSlider');
        const temperatureValue = document.getElementById('temperatureValue');
        temperatureSlider.value = this.aiSettings.temperature;
        temperatureValue.textContent = this.aiSettings.temperature;
        
        temperatureSlider.addEventListener('input', (e) => {
            this.aiSettings.temperature = parseFloat(e.target.value);
            temperatureValue.textContent = this.aiSettings.temperature;
        });
        
        // Max tokens slider
        const maxTokensSlider = document.getElementById('maxTokensSlider');
        const maxTokensValue = document.getElementById('maxTokensValue');
        maxTokensSlider.value = this.aiSettings.maxTokens;
        maxTokensValue.textContent = this.aiSettings.maxTokens;
        
        maxTokensSlider.addEventListener('input', (e) => {
            this.aiSettings.maxTokens = parseInt(e.target.value);
            maxTokensValue.textContent = this.aiSettings.maxTokens;
            this.updateContextIndicator();
        });
        
        // Buttons
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveAiSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetAiSettings());
        document.getElementById('generateSummaryBtn').addEventListener('click', () => this.generateConversationSummary());
    }
    
    loadAiSettings() {
        const saved = localStorage.getItem('aiSettings');
        if (saved) {
            this.aiSettings = { ...this.aiSettings, ...JSON.parse(saved) };
        }
    }
    
    saveAiSettings() {
        localStorage.setItem('aiSettings', JSON.stringify(this.aiSettings));
        this.showNotification('AI settings saved!', 'success');
    }
    
    resetAiSettings() {
        this.aiSettings = {
            temperature: 0.7,
            maxTokens: 2000,
            model: 'qwen2.5-coder'
        };
        this.setupAiSettingsListeners();
        this.updateContextIndicator();
        this.showNotification('AI settings reset to default!', 'info');
    }
    
    updateContextIndicator() {
        const messages = this.chatMessages.querySelectorAll('.message');
        let totalTokens = 0;
        
        messages.forEach(message => {
            const content = message.querySelector('.message-content');
            if (content) {
                // Rough token estimation (1 token ≈ 4 characters)
                totalTokens += Math.ceil(content.textContent.length / 4);
            }
        });
        
        const maxTokens = this.aiSettings.maxTokens;
        const percentage = Math.min((totalTokens / maxTokens) * 100, 100);
        
        const contextUsed = document.getElementById('contextUsed');
        const contextText = document.getElementById('contextText');
        
        if (contextUsed && contextText) {
            contextUsed.style.width = `${percentage}%`;
            contextText.textContent = `${totalTokens} / ${maxTokens} tokens`;
            
            // Change color based on usage
            if (percentage > 80) {
                contextUsed.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (percentage > 60) {
                contextUsed.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            } else {
                contextUsed.style.background = 'linear-gradient(90deg, #4a9eff, #7c3aed)';
            }
        }
    }
    
    async generateConversationSummary() {
        const messages = this.chatMessages.querySelectorAll('.message');
        if (messages.length === 0) {
            this.showNotification('No conversation to summarize!', 'error');
            return;
        }
        
        const conversationText = Array.from(messages)
            .map(msg => {
                const sender = msg.classList.contains('user') ? 'User' : 'AI';
                const content = msg.querySelector('.message-content')?.textContent || '';
                return `${sender}: ${content}`;
            })
            .join('\n\n');
        
        const summaryPrompt = `Please provide a concise summary of this conversation, highlighting the main topics discussed and key points:\n\n${conversationText}`;
        
        try {
            this.showNotification('Generating summary...', 'info');
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: summaryPrompt,
                    sessionId: this.sessionId,
                    model: this.aiSettings.model,
                    temperature: this.aiSettings.temperature,
                    maxTokens: Math.min(500, this.aiSettings.maxTokens) // Limit summary length
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Add summary as a special message
                this.addSummaryMessage(data.response);
                this.showNotification('Summary generated!', 'success');
            } else {
                this.showNotification(data.error || 'Failed to generate summary', 'error');
            }
        } catch (error) {
            console.error('Error generating summary:', error);
            this.showNotification('Failed to generate summary', 'error');
        }
    }
    
    addSummaryMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai summary-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-file-alt"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<strong>📋 Conversation Summary:</strong><br><br>${this.processMarkdown(content)}`;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTimestamp(new Date());
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        
        this.chatMessages.appendChild(messageDiv);
        this.highlightCodeBlocks(messageContent);
        this.scrollToBottom();
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize chat interface when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatInterface();
}); 