const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Health check endpoint (REQUIRED by Render)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Mini Messenger is running',
        timestamp: new Date().toISOString()
    });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    // Check if it's an API route
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Otherwise serve the appropriate HTML file
    if (req.path === '/login' || req.path === '/login.html') {
        res.sendFile(path.join(__dirname, 'login.html'));
    } else {
        res.sendFile(path.join(__dirname, 'chat.html'));
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Mini Messenger server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
