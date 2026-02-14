const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `You are Mini Assistant, a helpful and friendly AI created by ARI. 
You are knowledgeable, warm, and always ready to assist with anything from casual conversation to complex problems.
Keep your responses informative but concise. Be approachable and don't use emojis.
You can analyze and perfect answer the images when provided with image URLs.`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, imageUrl } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        let content = message;
        if (imageUrl) {
            content = `[Image URL: ${imageUrl}]\n\nUser's question about the image: ${message}`;
        }
        
        console.log(`🤖 Processing request with GPT-4O-MINI`);
        console.log(`📝 Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
        if (imageUrl) console.log(`🖼️ Image: ${imageUrl.substring(0, 50)}...`);

        if (!OPENROUTER_API_KEY) {
            console.error('❌ OPENROUTER_API_KEY not found in environment variables');
            return res.status(500).json({ 
                error: 'AI service configuration error. Please contact administrator.' 
            });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': `http://localhost:${PORT}`,
                'X-Title': 'Mini Assistant'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.3,
                presence_penalty: 0.3
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('OpenRouter API error:', data.error);
            return res.status(500).json({ 
                error: data.error.message || 'AI service error' 
            });
        }
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content;
            
            console.log(`✅ AI response received (${aiResponse.length} chars)`);
            
            res.json({ 
                success: true,
                response: aiResponse,
                model: 'gpt-4o-mini'
            });
        } else {
            console.error('Unexpected API response format:', data);
            res.status(500).json({ 
                error: 'Invalid response from AI service' 
            });
        }
        
    } catch (error) {
        console.error('Server error in /api/chat:', error);
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message 
        });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        ai: {
            model: 'gpt-4o-mini',
            status: OPENROUTER_API_KEY ? 'connected' : 'disconnected',
            message: OPENROUTER_API_KEY ? 'AI is ready!' : 'API key not configured'
        },
        server: {
            version: '1.0.0',
            port: PORT,
            timestamp: new Date().toISOString()
        }
    });
});

app.post('/api/test', async (req, res) => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            }
        });
        
        const data = await response.json();
        
        res.json({
            success: true,
            key_valid: response.ok,
            data: data
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Mini Messenger is running',
        ai: OPENROUTER_API_KEY ? '✅ Connected' : '❌ No API key',
        model: 'gpt-4o-mini',
        timestamp: new Date().toISOString()
    });
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    if (req.path === '/login' || req.path === '/login.html') {
        res.sendFile(path.join(__dirname, 'login.html'));
    } else {
        res.sendFile(path.join(__dirname, 'chat.html'));
    }
});

app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Mini Messenger server is running`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🤖 AI Model: gpt-4o-mini`);
    console.log(`🔑 API Key: ${OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🤖 AI Test: http://localhost:${PORT}/api/status`);
    console.log('=================================');
    
    if (!OPENROUTER_API_KEY) {
        console.log('\n⚠️  WARNING: OPENROUTER_API_KEY is not set!');
        console.log('   Create a .env file with: OPENROUTER_API_KEY=your_key_here');
        console.log('   Get your key from: https://openrouter.ai/keys\n');
    }
});
