# AI Chat Web Interface

A modern web interface for interacting with AI models through a chat interface. Built with Node.js, Express, and vanilla JavaScript.

## Features

- 🤖 **Multi-model support** - Switch between different AI models
- 💬 **Conversation history** - AI remembers previous messages
- 🎨 **Modern UI** - Clean, responsive design
- 📱 **Mobile-friendly** - Works on all devices
- ⚡ **Real-time chat** - Instant messaging experience
- 🗑️ **Clear chat** - Reset conversation anytime

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to an AI model API (currently configured for LM Studio)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **For development (with auto-restart):**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Configuration

### AI Model Setup

The application is configured to work with LM Studio. Make sure your AI model server is running on `http://10.20.65.205:1234`.

To change the API endpoint, edit `server.js`:

```javascript
// Change this line in server.js
const response = await axios.post('http://10.20.65.205:1234/v1/chat/completions', {
```

### Available Models

You can modify the available models in `server.js`:

```javascript
const MODELS = {
    "qwen2.5-coder": "qwen2.5-coder-7b-3x-instruct-ties-v1.1",
    "local-model": "local-model-name",
    "llama3.2": "llama3.2-3b-instruct",
    "mistral": "mistral-7b-instruct"
};
```

## Usage

1. **Select a model** from the dropdown in the header
2. **Type your message** in the input field
3. **Press Enter** or click the send button
4. **Clear chat** anytime using the clear button
5. **Switch models** during conversation

## API Endpoints

- `GET /` - Serve the web interface
- `GET /api/models` - Get available models
- `POST /api/chat` - Send a message and get AI response
- `POST /api/clear` - Clear conversation history

## Project Structure

```
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── public/            # Static files
│   ├── index.html     # Main HTML page
│   ├── style.css      # Styles
│   └── script.js      # Frontend JavaScript
└── README.md          # This file
```

## Customization

### Styling
Edit `public/style.css` to customize the appearance.

### Functionality
Modify `public/script.js` to add new features.

### Server Logic
Update `server.js` to change API behavior.

## Troubleshooting

### Common Issues

1. **"Failed to get response from AI"**
   - Check if your AI model server is running
   - Verify the API endpoint in `server.js`
   - Ensure the model name is correct

2. **Port already in use**
   - Change the port in `server.js`: `const PORT = process.env.PORT || 3001;`

3. **CORS errors**
   - The server includes CORS middleware, but you may need to configure it for your setup

## Deployment

### Local Network
To make it accessible on your local network:

```javascript
// In server.js, change the listen call
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
```

### Production
For production deployment:

1. Set environment variables
2. Use a process manager like PM2
3. Set up a reverse proxy (nginx)
4. Use HTTPS

## License

MIT License - feel free to use and modify as needed! 