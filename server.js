const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

const TEXT_MODELS = {
    COMMAND_R_PLUS: 'CohereForAI/c4ai-command-r-plus-08-2024',
    MIXTRAL_8x22B: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    DBRX: 'databricks/dbrx-instruct',
    LLAMA_3_70B: 'meta-llama/Meta-Llama-3-70B-Instruct',
    QWEN_2_72B: 'Qwen/Qwen2-72B-Instruct',
    COMMAND_R: 'CohereForAI/c4ai-command-r-v01',
    SOLAR_10_7B: 'upstage/SOLAR-10.7B-Instruct-v1.0',
    ZEPHYR_7B_BETA: 'HuggingFaceH4/zephyr-7b-beta',
    GEMMA_2_9B: 'google/gemma-2-9b-it',
};

const IMAGE_MODELS = {
    MOONDREAM2: 'vikhyatk/moondream2',
    Idefics2: 'HuggingFaceM4/idefics2-8b',
    DINOv2: 'facebook/dinov2-large',
    BLIP2: 'Salesforce/blip2-opt-2.7b',
    GIT_LARGE: 'microsoft/git-large-coco',
    CLIP_VIT: 'openai/clip-vit-large-patch14',
    BLIP_BASE: 'Salesforce/blip-image-captioning-base',
    VIT_LARGE: 'google/vit-large-patch16-224',
    SWIN_LARGE: 'microsoft/swin-large-patch4-window7-224-in22k',
};

const SYSTEM_PROMPT = `You are Mini Assistant, a super intelligent AI created by ARI. 
You have access to the most advanced open-source AI models.
You are helpful, detailed, and precise in your responses.
Answer in a friendly but professional manner.`;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, model = TEXT_MODELS.COMMAND_R_PLUS } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`🤖 Using: ${model.split('/').pop()}`);
        console.log(`📝 Question: ${message.substring(0, 100)}...`);

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(HF_TOKEN && { 'Authorization': `Bearer ${HF_TOKEN}` })
                },
                body: JSON.stringify({
                    inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.7,
                        top_p: 0.95,
                        do_sample: true,
                        repetition_penalty: 1.1,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        
        let aiResponse;
        if (Array.isArray(data)) {
            aiResponse = data[0]?.generated_text || data[0]?.text;
        } else {
            aiResponse = data.generated_text || data.text;
        }

        aiResponse = aiResponse?.replace(/.*assistant<\|end_header_id\|>\n\n/, '')
                                 .replace(/<\|eot_id\|>.*$/, '')
                                 .trim() || "I'm here to help!";

        console.log(`✅ Response received (${aiResponse.length} chars)`);
        
        res.json({
            success: true,
            response: aiResponse,
            model: model.split('/').pop() + ' (FREE!)',
            intelligence: '🧠 GPT-4 Level'
        });
        
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ 
            error: 'AI service error: ' + error.message
        });
    }
});

app.post('/api/analyze-image', async (req, res) => {
    try {
        const { prompt, imageUrl } = req.body;
        
        if (!prompt || !imageUrl) {
            return res.status(400).json({ error: 'Prompt and image URL required' });
        }

        console.log(`🖼️ Analyzing with Moondream2`);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${IMAGE_MODELS.MOONDREAM2}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(HF_TOKEN && { 'Authorization': `Bearer ${HF_TOKEN}` })
                },
                body: JSON.stringify({
                    inputs: {
                        image: base64Image,
                        question: prompt
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Moondream2 error: ${response.status}`);
        }

        const data = await response.json();
        
        let answer = data.answer || data[0]?.answer || data.generated_text;

        if (!answer) {

            const blipRes = await fetch(
                `https://api-inference.huggingface.co/models/${IMAGE_MODELS.BLIP_BASE}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(HF_TOKEN && { 'Authorization': `Bearer ${HF_TOKEN}` })
                    },
                    body: JSON.stringify({ inputs: base64Image })
                }
            );
            const blipData = await blipRes.json();
            answer = `I can see: ${blipData[0]?.generated_text || 'something in the image'}`;
        }

        res.json({
            success: true,
            response: answer,
            model: 'Moondream2 (FREE!)'
        });
        
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message
        });
    }
});

app.post('/api/smart-chat', async (req, res) => {
    try {
        const { message, imageUrl } = req.body;
        
        let endpoint = imageUrl ? '/api/analyze-image' : '/api/chat';
        const response = await fetch(`http://localhost:${PORT}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                prompt: message,
                imageUrl 
            })
        });
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Smart chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models', (req, res) => {
    res.json({
        success: true,
        text_models: Object.keys(TEXT_MODELS),
        image_models: Object.keys(IMAGE_MODELS),
        best_text: 'Cohere Command R+ (104B - GPT-4 level)',
        best_image: 'Moondream2 (Best visual Q&A)',
        note: '🚀 LAHAT LIBRE!'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        token: HF_TOKEN ? '✅ Configured' : '⚠️ No token (may queue)',
        text_model: 'Command R+ (104B)',
        image_model: 'Moondream2',
        pricing: '💰 100% FREE'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Mini Messenger AI is running',
        timestamp: new Date().toISOString()
    });
});

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

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 MINI MESSENGER AI READY!');
    console.log('='.repeat(50));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🤖 Text AI: Command R+ (104B params)`);
    console.log(`🖼️ Image AI: Moondream2`);
    console.log(`💰 Price: ABSOLUTELY FREE!`);
    console.log(`🔑 Token: ${HF_TOKEN ? '✅ OK' : '⚠️ No token'}`);
    console.log('='.repeat(50) + '\n');
});
