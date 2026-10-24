const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Available models
const MODELS = {
    "qwen2.5-coder": "qwen2.5-coder-7b-3x-instruct-ties-v1.1",
    "local-model": "local-model-name",
    "llama3.2": "llama3.2-3b-instruct",
    "mistral": "mistral-7b-instruct"
};

// Store conversation history (in production, use a database)
const conversations = new Map();

// Store active requests for cancellation
const activeRequests = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/models', (req, res) => {
    res.json(Object.keys(MODELS));
});

// Check if model server is available
app.get('/api/check-server', async (req, res) => {
    try {
        await axios.get(`${LM_STUDIO_URL}/v1/health-check`);
        res.json({ status: 'connected' });
    } catch (error) {
        res.status(503).json({ 
            status: 'disconnected',
            error: 'Model server is not available'
        });
    }
});

// Fetch available models from LM Studio server only when requested
app.post('/api/check-models', async (req, res) => {
    try {
        const response = await axios.get(`${LM_STUDIO_URL}/v1/models`);
        const modelList = response.data.data.map(model => ({
            id: model.id,
            created: model.created ? new Date(model.created * 1000).toLocaleString() : null,
            owner: model.owner || 'Unknown'
        }));
        res.json({ 
            status: 'success',
            models: modelList
        });
    } catch (error) {
        console.error('Error fetching models:', error.message);
        res.status(500).json({ 
            status: 'error',
            error: 'Failed to fetch models from LM Studio server',
            details: error.message 
        });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, model = 'qwen2.5-coder' } = req.body;
        
        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message and sessionId are required' });
        }

        // Get or create conversation history
        if (!conversations.has(sessionId)) {
            conversations.set(sessionId, [
                { role: "system", content: "You are a helpful AI assistant. Be concise and friendly in your responses." }
            ]);
        }
        
        const conversation = conversations.get(sessionId);
        
        // Add user message
        conversation.push({ role: "user", content: message });

        // Create AbortController for cancellation
        const abortController = new AbortController();
        activeRequests.set(sessionId, abortController);

        // Call AI API with abort signal and timeout
        const response = await axios.post(`${LM_STUDIO_URL}/v1/chat/completions`, {
            model: MODELS[model],
            messages: conversation,
            max_tokens: 200,
            temperature: 0.7,
            stream: true
        }, {
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            timeout: 30000 // 30 second timeout
        });

        const aiResponse = response.data.choices[0].message.content;
        
        // Add AI response to conversation
        conversation.push({ role: "assistant", content: aiResponse });

        // Remove from active requests
        activeRequests.delete(sessionId);

        res.json({ 
            response: aiResponse,
            conversation: conversation.slice(1) // Exclude system message
        });

    } catch (error) {
        // Remove from active requests
        activeRequests.delete(req.body.sessionId);
        
        if (error.name === 'AbortError') {
            return res.status(499).json({ error: 'Request cancelled by user' });
        }
        
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            response: error.response?.data
        });

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Cannot connect to LM Studio server. Please make sure LM Studio is running.',
                details: error.message 
            });
        }

        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ 
                error: 'Request timed out. The model is taking too long to respond.',
                details: error.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to get response from AI',
            details: error.message,
            serverResponse: error.response?.data
        });
    }
});

app.post('/api/clear', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && conversations.has(sessionId)) {
        conversations.delete(sessionId);
    }
    res.json({ message: 'Conversation cleared' });
});

app.post('/api/stop', (req, res) => {
    const { sessionId } = req.body;
    
    if (sessionId && activeRequests.has(sessionId)) {
        const abortController = activeRequests.get(sessionId);
        abortController.abort();
        activeRequests.delete(sessionId);
        res.json({ message: 'Generation stopped' });
    } else {
        res.status(404).json({ error: 'No active request found' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and go to http://localhost:${PORT}`);
}); 