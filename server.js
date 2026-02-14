const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =====================================================
// 🏆 ULTIMATE MODELS - OPENAI COMPATIBLE
// =====================================================
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

const client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: HF_TOKEN,
});

// 📝 BEST TEXT MODELS
const TEXT_MODELS = {
    // 🥇 SMARTEST (GPT-4 level) - 5-10 seconds
    SMARTEST: "Qwen/Qwen2-72B-Instruct",
    
    // 🥈 FASTEST - 1-2 seconds only!
    FASTEST: "Qwen/Qwen2-72B:fastest",
    
    // 🥉 BALANCED - 2-3 seconds
    BALANCED: "meta-llama/Meta-Llama-3-70B-Instruct",
    
    // Backup models
    MIXTRAL: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    COMMAND_R: "CohereForAI/c4ai-command-r-plus-08-2024",
    LLAMA_3_8B: "meta-llama/Meta-Llama-3-8B-Instruct",
    MISTRAL_7B: "mistralai/Mistral-7B-Instruct-v0.2",
};

// 🖼️ BEST IMAGE MODELS
const IMAGE_MODELS = {
    // 🥇 SMARTEST (with Q&A) - Best for detailed questions
    SMARTEST: "HuggingFaceM4/idefics2-8b",
    
    // 🥈 FASTEST (with Q&A) - 2-3 seconds
    FASTEST: "vikhyatk/moondream2",
    
    // 🥉 BALANCED (with Q&A)
    BALANCED: "Salesforce/blip2-opt-2.7b",
    
    // Caption models (no Q&A, just descriptions)
    CAPTION_FAST: "Salesforce/blip-image-captioning-base",
    CAPTION_GIT: "microsoft/git-base-coco",
    CAPTION_VIT: "nlpconnect/vit-gpt2-image-captioning",
};

// System prompt for consistent personality
const SYSTEM_PROMPT = `You are Mini Assistant, a super intelligent AI created by ARI. 
You are helpful, detailed, and precise in your responses.
Answer in a friendly but professional manner. Keep responses concise but informative.`;

// =====================================================
// 📝 TEXT CHAT ENDPOINT
// =====================================================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, model = TEXT_MODELS.FASTEST } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`🤖 Text model: ${model}`);
        console.log(`📝 Question: ${message.substring(0, 50)}...`);

        const chatCompletion = await client.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: message }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const response = chatCompletion.choices[0]?.message?.content || "I'm here to help!";

        console.log(`✅ Response received (${response.length} chars)`);

        res.json({
            success: true,
            response: response,
            model: model,
            type: 'text'
        });

    } catch (error) {
        console.error('Text AI Error:', error);
        
        // Try fallback model
        try {
            console.log('🔄 Trying fallback model...');
            const fallback = await client.chat.completions.create({
                model: TEXT_MODELS.MISTRAL_7B,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message }
                ],
            });
            
            return res.json({
                success: true,
                response: fallback.choices[0]?.message?.content,
                model: 'Mistral-7B (fallback)'
            });
        } catch (fallbackError) {
            res.status(500).json({ error: error.message });
        }
    }
});

// =====================================================
// 🖼️ IMAGE ANALYSIS ENDPOINT - ULTIMATE VERSION
// =====================================================
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { prompt, imageUrl, model = IMAGE_MODELS.SMARTEST } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL required' });
        }

        console.log(`🖼️ Image model: ${model}`);
        console.log(`📝 Prompt: ${prompt || 'No prompt, generating description...'}`);

        // Download and convert image to base64
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to download image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Prepare the message content
        const content = [
            {
                type: "image_url",
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                }
            }
        ];

        // Add text prompt if provided
        if (prompt) {
            content.push({
                type: "text",
                text: prompt
            });
        } else {
            content.push({
                type: "text",
                text: "Describe this image in detail. What do you see?"
            });
        }

        const chatCompletion = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "user",
                    content: content
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const response = chatCompletion.choices[0]?.message?.content || "I've analyzed the image!";

        console.log(`✅ Image analysis complete (${response.length} chars)`);

        res.json({
            success: true,
            response: response,
            model: model,
            type: 'image'
        });

    } catch (error) {
        console.error('Image analysis error:', error);
        
        // Try fallback to caption model
        try {
            console.log('🔄 Trying caption fallback...');
            
            // Download image again
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');

            const captionResponse = await fetch(
                `https://router.huggingface.co/hf-inference/models/${IMAGE_MODELS.CAPTION_FAST}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${HF_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: base64Image
                    })
                }
            );

            const data = await captionResponse.json();
            const caption = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

            let finalResponse = caption || "No caption generated";
            if (prompt) {
                finalResponse = `Based on the image: ${caption}\n\nYour question: ${prompt}`;
            }

            return res.json({
                success: true,
                response: finalResponse,
                model: 'BLIP (caption fallback)'
            });

        } catch (captionError) {
            res.status(500).json({ error: error.message });
        }
    }
});

// =====================================================
// 🎯 SMART CHAT - Auto-select best model
// =====================================================
app.post('/api/smart-chat', async (req, res) => {
    try {
        const { message, imageUrl } = req.body;
        
        if (imageUrl) {
            // Use image analysis
            const response = await fetch(`http://localhost:${PORT}/api/analyze-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: message, 
                    imageUrl,
                    model: IMAGE_MODELS.SMARTEST 
                })
            });
            const data = await response.json();
            res.json(data);
        } else {
            // Use text chat
            const response = await fetch(`http://localhost:${PORT}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message,
                    model: TEXT_MODELS.FASTEST 
                })
            });
            const data = await response.json();
            res.json(data);
        }
        
    } catch (error) {
        console.error('Smart chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// 📋 MODEL LIST ENDPOINT
// =====================================================
app.get('/api/models', (req, res) => {
    res.json({
        success: true,
        text_models: {
            smartest: {
                name: "Qwen2-72B-Instruct",
                description: "🧠 SMARTEST - GPT-4 level (5-10 seconds)",
                model: TEXT_MODELS.SMARTEST
            },
            fastest: {
                name: "Qwen2-72B:fastest",
                description: "⚡ FASTEST - 1-2 seconds only!",
                model: TEXT_MODELS.FASTEST
            },
            balanced: {
                name: "Llama-3-70B",
                description: "⚖️ BALANCED - 2-3 seconds",
                model: TEXT_MODELS.BALANCED
            },
            all: TEXT_MODELS
        },
        image_models: {
            smartest: {
                name: "Idefics2",
                description: "🖼️ SMARTEST - Best for detailed Q&A about images",
                model: IMAGE_MODELS.SMARTEST
            },
            fastest: {
                name: "Moondream2",
                description: "⚡ FASTEST - 2-3 seconds, with Q&A",
                model: IMAGE_MODELS.FASTEST
            },
            balanced: {
                name: "BLIP2",
                description: "⚖️ BALANCED - Good for captions + Q&A",
                model: IMAGE_MODELS.BALANCED
            },
            caption: {
                name: "BLIP Fast",
                description: "📝 FASTEST CAPTION - 1-2 seconds, descriptions only",
                model: IMAGE_MODELS.CAPTION_FAST
            },
            all: IMAGE_MODELS
        },
        note: "🚀 ALL MODELS ARE 100% FREE! Choose: SPEED or INTELLIGENCE?"
    });
});

// =====================================================
// 📊 STATUS ENDPOINT
// =====================================================
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        api: '✅ OpenAI-compatible Hugging Face',
        token: HF_TOKEN ? '✅ Connected' : '❌ No token',
        text_models_available: Object.keys(TEXT_MODELS).length,
        image_models_available: Object.keys(IMAGE_MODELS).length,
        best_text: "Qwen2-72B-Instruct (🧠 Smartest) / Qwen2-72B:fastest (⚡ Fastest)",
        best_image: "Idefics2 (🖼️ Best Q&A) / Moondream2 (⚡ Fast Q&A)",
        price: '💰 100% FREE!'
    });
});

// =====================================================
// 🏥 HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Ultimate Mini Messenger AI is running',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// 📄 SERVE HTML FILES
// =====================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// =====================================================
// 🚀 START SERVER
// =====================================================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 ULTIMATE MINI MESSENGER AI - BEST MODELS');
    console.log('='.repeat(70));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔗 API: router.huggingface.co/v1`);
    console.log(`🔑 Token: ${HF_TOKEN ? '✅ Connected' : '❌ Missing'}`);
    console.log('\n' + '📝 TEXT MODELS (CHOOSE YOUR PICK):');
    console.log(`   🧠 SMARTEST: Qwen2-72B-Instruct (GPT-4 level, 5-10s)`);
    console.log(`   ⚡ FASTEST:   Qwen2-72B:fastest (1-2s only!)`);
    console.log(`   ⚖️ BALANCED:  Llama-3-70B (2-3s)`);
    console.log('\n' + '🖼️ IMAGE MODELS (CHOOSE YOUR PICK):');
    console.log(`   🥇 BEST Q&A:  Idefics2 (Detailed analysis + questions)`);
    console.log(`   ⚡ FAST Q&A:  Moondream2 (2-3s, with questions)`);
    console.log(`   📝 CAPTION:   BLIP Fast (1-2s, descriptions only)`);
    console.log('\n' + '💰 ALL MODELS ARE 100% FREE!');
    console.log('='.repeat(70) + '\n');
});
