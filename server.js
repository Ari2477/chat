const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =====================================================
// 🤖 HUGGING FACE CONFIG
// =====================================================
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

// ✅ BAGONG ENDPOINT (ito ang gagamitin!)
const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

// ==========================
// 🔥 BEST PRIORITY TEXT MODELS
// ==========================
const TEXT_MODELS = {
    // 🥇 Strongest reasoning (deep logic, math, analysis)
    QWEN_2_72B: 'Qwen/Qwen2-72B-Instruct',

    // 🥈 Very strong and stable structured answers
    LLAMA_3_70B: 'meta-llama/Meta-Llama-3-70B-Instruct',

    // 🥉 Creative + long-form strong model
    MIXTRAL_8x22B: 'mistralai/Mixtral-8x22B-Instruct-v0.1',

    // Other strong models
    DBRX: 'databricks/dbrx-instruct',
    COMMAND_R_PLUS: 'CohereForAI/c4ai-command-r-plus-08-2024',
    COMMAND_R: 'CohereForAI/c4ai-command-r-v01',

    // Mid-tier (reliable fallbacks)
    GEMMA_2_9B: 'google/gemma-2-9b-it',
    SOLAR_10_7B: 'upstage/SOLAR-10.7B-Instruct-v1.0',
    ZEPHYR_7B_BETA: 'HuggingFaceH4/zephyr-7b-beta',
};

// ==========================
// 🖼 IMAGE / VISION MODELS
// ==========================
const IMAGE_MODELS = {
    // 🥇 Best image reasoning + explanation
    IDEFICS2: 'HuggingFaceM4/idefics2-8b',

    // 🥈 Good caption + visual Q&A
    BLIP2: 'Salesforce/blip2-opt-2.7b',

    // 🥉 Lightweight vision-language
    MOONDREAM2: 'vikhyatk/moondream2',

    // Feature extractors (NOT conversational)
    DINOv2: 'facebook/dinov2-large',
    CLIP_VIT: 'openai/clip-vit-large-patch14',
    GIT_LARGE: 'microsoft/git-large-coco',
    BLIP_BASE: 'Salesforce/blip-image-captioning-base',
    VIT_LARGE: 'google/vit-large-patch16-224',
    SWIN_LARGE: 'microsoft/swin-large-patch4-window7-224-in22k',
};

// System prompt para consistent ang personality
const SYSTEM_PROMPT = `You are Mini Assistant, a super intelligent AI created by ARI. 
You are helpful, detailed, and precise in your responses.
Answer in a friendly but professional manner.`;

// =====================================================
// 📝 TEXT CHAT - with priority models
// =====================================================
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // ✅ PRIORITY ORDER ng models (from strongest to fallback)
        const modelPriority = [
            TEXT_MODELS.QWEN_2_72B,      // 1st - strongest reasoning
            TEXT_MODELS.LLAMA_3_70B,      // 2nd - stable structured
            TEXT_MODELS.MIXTRAL_8x22B,    // 3rd - creative long-form
            TEXT_MODELS.DBRX,              // 4th - strong alternative
            TEXT_MODELS.COMMAND_R_PLUS,    // 5th - reliable
            TEXT_MODELS.ZEPHYR_7B_BETA,    // 6th - fast fallback
            'mistralai/Mistral-7B-Instruct-v0.2' // Last resort - sureball
        ];
        
        let aiResponse = null;
        let lastError = null;

        for (const model of modelPriority) {
            try {
                console.log(`🔄 Trying model: ${model.split('/').pop()}`);
                
                const response = await fetch(
                    `${HF_API_BASE}/${model}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(HF_TOKEN && { 'Authorization': `Bearer ${HF_TOKEN}` })
                        },
                        body: JSON.stringify({
                            inputs: message,
                            parameters: {
                                max_new_tokens: 500,
                                temperature: 0.7,
                                top_p: 0.95,
                                do_sample: true,
                            }
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    aiResponse = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
                    console.log(`✅ Model ${model.split('/').pop()} works!`);
                    break;
                } else {
                    const errorText = await response.text();
                    console.log(`❌ Model ${model.split('/').pop()} failed: ${response.status}`);
                    lastError = errorText;
                }
                
            } catch (e) {
                console.log(`❌ Model error: ${e.message}`);
                lastError = e;
            }
            
            // Wait 1 second before trying next model
            await new Promise(r => setTimeout(r, 1000));
        }

        if (aiResponse) {
            res.json({
                success: true,
                response: aiResponse,
                model: 'Hugging Face AI (FREE!)'
            });
        } else {
            res.status(500).json({ 
                error: 'All models failed',
                details: lastError?.message || 'Unknown error'
            });
        }
        
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// 🖼️ IMAGE ANALYSIS - with priority models
// =====================================================
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { prompt, imageUrl } = req.body;
        
        if (!prompt || !imageUrl) {
            return res.status(400).json({ error: 'Prompt and image URL required' });
        }

        console.log(`🖼️ Analyzing image...`);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // ✅ PRIORITY ORDER for image models
        const imagePriority = [
            IMAGE_MODELS.IDEFICS2,    // 1st - best reasoning
            IMAGE_MODELS.BLIP2,        // 2nd - good caption
            IMAGE_MODELS.MOONDREAM2,   // 3rd - lightweight
            IMAGE_MODELS.BLIP_BASE     // last - simple caption
        ];
        
        let answer = null;
        let lastError = null;

        for (const model of imagePriority) {
            try {
                console.log(`🔄 Trying image model: ${model.split('/').pop()}`);
                
                const response = await fetch(
                    `${HF_API_BASE}/${model}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(HF_TOKEN && { 'Authorization': `Bearer ${HF_TOKEN}` })
                        },
                        body: JSON.stringify(
                            model.includes('blip') 
                                ? { inputs: base64Image }  // BLIP models
                                : {                        // Idefics2/Moondream2
                                    inputs: {
                                        image: base64Image,
                                        question: prompt
                                    }
                                }
                        )
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (model.includes('blip')) {
                        answer = data[0]?.generated_text;
                    } else {
                        answer = data.answer || data[0]?.answer || data.generated_text;
                    }
                    console.log(`✅ Image model ${model.split('/').pop()} works!`);
                    break;
                }
                
            } catch (e) {
                console.log(`❌ Image model error: ${e.message}`);
                lastError = e;
            }
            
            await new Promise(r => setTimeout(r, 1000));
        }

        res.json({
            success: true,
            response: answer || "I've analyzed the image but couldn't generate a detailed description.",
            model: 'Hugging Face Vision (FREE!)'
        });
        
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// 🎯 SMART CHAT - auto-select
// =====================================================
app.post('/api/smart-chat', async (req, res) => {
    try {
        const { message, imageUrl } = req.body;
        
        if (imageUrl) {
            const response = await fetch(`http://localhost:${PORT}/api/analyze-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: message, imageUrl })
            });
            const data = await response.json();
            res.json(data);
        } else {
            const response = await fetch(`http://localhost:${PORT}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
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
// 📋 MODEL LIST
// =====================================================
app.get('/api/models', (req, res) => {
    res.json({
        success: true,
        text_models: {
            priority_1: 'Qwen2-72B (Strongest reasoning)',
            priority_2: 'Llama-3-70B (Stable structured)',
            priority_3: 'Mixtral-8x22B (Creative long-form)',
            all: Object.keys(TEXT_MODELS)
        },
        image_models: {
            priority_1: 'Idefics2 (Best reasoning)',
            priority_2: 'BLIP2 (Good caption)',
            priority_3: 'Moondream2 (Lightweight)',
            all: Object.keys(IMAGE_MODELS)
        },
        note: '🚀 LAHAT LIBRE! May priority fallback system!'
    });
});

// =====================================================
// 📊 STATUS
// =====================================================
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        api_endpoint: '✅ router.huggingface.co',
        token: HF_TOKEN ? '✅ Configured' : '⚠️ No token',
        text_models_available: Object.keys(TEXT_MODELS).length,
        image_models_available: Object.keys(IMAGE_MODELS).length,
        priority_system: '✅ Active (auto-fallback)',
        pricing: '💰 100% FREE!'
    });
});

// =====================================================
// 🏥 HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Mini Messenger AI is running',
        timestamp: new Date().toISOString()
    });
});

// Serve HTML files
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
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MINI MESSENGER AI - ULTIMATE EDITION');
    console.log('='.repeat(60));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 HF Endpoint: ✅ router.huggingface.co`);
    console.log(`🔑 Token: ${HF_TOKEN ? '✅ Configured' : '⚠️ No token'}`);
    console.log('\n📝 TEXT MODELS (Priority Order):');
    console.log('   1️⃣ Qwen2-72B (Strongest reasoning)');
    console.log('   2️⃣ Llama-3-70B (Stable structured)');
    console.log('   3️⃣ Mixtral-8x22B (Creative long-form)');
    console.log('   4️⃣ DBRX / Command R+ (Strong alternatives)');
    console.log('\n🖼️ IMAGE MODELS (Priority Order):');
    console.log('   1️⃣ Idefics2 (Best reasoning)');
    console.log('   2️⃣ BLIP2 (Good caption)');
    console.log('   3️⃣ Moondream2 (Lightweight)');
    console.log('\n💰 100% FREE!');
    console.log('='.repeat(60) + '\n');
});
