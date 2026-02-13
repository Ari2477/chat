const BOT_CONFIG = {
    WELCOME_BOT_ID: "welcome_bot",
    WELCOME_BOT_NAME: "🤖 Welcome Bot",
    WELCOME_BOT_PHOTO: "https://ui-avatars.com/api/?name=WB&background=4f46e5&color=fff&size=200",
    
    AI_BOT_ID: "ai_bot",
    AI_BOT_NAME: "🧠 AI Assistant",
    AI_BOT_PHOTO: "https://ui-avatars.com/api/?name=AI&background=6366f1&color=fff&size=200",
    
    GROUP_CHAT_ID: "general_chat",
    
    TYPING_DELAY: 1000, 
    
    WELCOME_MESSAGES: [
        "👋 Welcome {name} to World Chat! Enjoy your stay! 🎉",
        "Hey {name}! Welcome to the group! 🎊",
        "Glad to have you here, {name}! 🌟",
        "Welcome aboard {name}! 🚀",
        "Nice to see you, {name}! 👋",
        "Welcome {name}! Hope you enjoy chatting with everyone! 😊",
        "A wild {name} appeared! Welcome! 🎮",
        "Welcome to the family, {name}! 💙",
        "Everyone give a warm welcome to {name}! 👏",
        "Welcome {name}! You're now part of the squad! 🔥"
    ],
    
    COMMANDS: {
        "/help": "📖 Show all available commands",
        "/ai": "🤖 Talk to AI - example: /ai what is JavaScript?",
        "/time": "🕐 Show current time",
        "/date": "📅 Show current date",
        "/weather": "☀️ Weather in Manila",
        "/calc": "🧮 Calculate - example: /calc 2 + 2",
        "/joke": "😂 Tell a random joke",
        "/quote": "💡 Random inspirational quote",
        "/fact": "🔍 Random interesting fact",
        "/roll": "🎲 Roll a dice (1-6)",
        "/flip": "🪙 Flip a coin",
        "/ping": "🏓 Check bot response time",
        "/motivate": "💪 Get motivational message",
        "/advice": "✨ Get random advice",
        "/riddle": "🧩 Solve a riddle",
        "/compliment": "💝 Receive a compliment",
        "/echo": "📢 Echo your message",
        "/say": "🗣️ Make bot say something",
        "/botinfo": "ℹ️ About AI Assistant"
    }
};


async function initWelcomeBot() {
    console.log('🤖 Initializing Welcome Bot...');
    
    try {
        const botRef = db.collection('users').doc(BOT_CONFIG.WELCOME_BOT_ID);
        const botDoc = await botRef.get();
        
        if (!botDoc.exists) {
            await botRef.set({
                uid: BOT_CONFIG.WELCOME_BOT_ID,
                name: BOT_CONFIG.WELCOME_BOT_NAME,
                photoURL: BOT_CONFIG.WELCOME_BOT_PHOTO,
                email: 'welcome@bot.local',
                online: true,
                isBot: true,
                botType: 'welcome',
                showInUserList: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Welcome Bot created');
        }
    } catch (error) {
        console.error('❌ Error creating Welcome Bot:', error);
    }
}

function listenToNewMembers() {
    db.collection('groupChats').doc(BOT_CONFIG.GROUP_CHAT_ID)
        .onSnapshot(async (doc) => {
            if (!doc.exists) return;
            
            const data = doc.data();
            const members = data.members || [];
            
            if (!window.previousMembers) {
                window.previousMembers = members;
                return;
            }
            
            const newMembers = members.filter(id => 
                !window.previousMembers.includes(id) && 
                id !== BOT_CONFIG.WELCOME_BOT_ID && 
                id !== BOT_CONFIG.AI_BOT_ID && 
                id !== currentUser?.uid
            );
            
            for (const memberId of newMembers) {
                await welcomeNewMember(memberId);
                await new Promise(resolve => setTimeout(resolve, 500)); 
            }
            
            window.previousMembers = members;
        });
}

async function welcomeNewMember(memberId) {
    try {
        const userDoc = await db.collection('users').doc(memberId).get();
        if (!userDoc.exists) return;
        
        const user = userDoc.data();
        const name = user.name?.split(' ')[0] || 'User';
        
        const messages = BOT_CONFIG.WELCOME_MESSAGES;
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        const welcomeText = randomMsg.replace('{name}', name);
        
        await db.collection('groupChats').doc(BOT_CONFIG.GROUP_CHAT_ID)
            .collection('messages').add({
                text: welcomeText,
                senderId: BOT_CONFIG.WELCOME_BOT_ID,
                senderName: BOT_CONFIG.WELCOME_BOT_NAME,
                senderPhoto: BOT_CONFIG.WELCOME_BOT_PHOTO,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isBotMessage: true,
                botType: 'welcome'
            });
        
        console.log(`🎉 Welcome message sent to ${name}`);
        
    } catch (error) {
        console.error('❌ Error sending welcome message:', error);
    }
}


async function initAIBot() {
    console.log('🧠 Initializing AI Bot...');
    
    try {
        const botRef = db.collection('users').doc(BOT_CONFIG.AI_BOT_ID);
        const botDoc = await botRef.get();
        
        if (!botDoc.exists) {
            await botRef.set({
                uid: BOT_CONFIG.AI_BOT_ID,
                name: BOT_CONFIG.AI_BOT_NAME,
                photoURL: BOT_CONFIG.AI_BOT_PHOTO,
                email: 'ai@bot.local',
                online: true,
                isBot: true,
                botType: 'ai',
                showInUserList: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ AI Bot created');
        }
    } catch (error) {
        console.error('❌ Error creating AI Bot:', error);
    }
}

function listenToAIBotMessages() {
    if (!currentUser) {
        console.log('⏳ Waiting for currentUser...');
        return;
    }
    
    const chatId = [currentUser.uid, BOT_CONFIG.AI_BOT_ID].sort().join('_');
    
    db.collection('privateChats').doc(chatId)
        .collection('messages')
        .where('senderId', '==', currentUser.uid)
        .where('isBotProcessed', '==', false)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    processAICommand(message, change.doc.id);
                }
            });
        });
}

async function processAICommand(message, messageId) {
    const text = message.text || '';
    
    const chatId = [currentUser.uid, BOT_CONFIG.AI_BOT_ID].sort().join('_');
    
    await db.collection('privateChats').doc(chatId)
        .collection('messages').doc(messageId)
        .update({ isBotProcessed: true });
    
    await showTypingIndicator();
    
    if (text.startsWith('/')) {
        await handleCommand(text);
    } else {
        await handleAIConversation(text);
    }
}

async function showTypingIndicator() {
    if (!currentPMUser || currentPMUser.id !== BOT_CONFIG.AI_BOT_ID) return;
    
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) {
        typingEl.classList.remove('hidden');
        typingEl.textContent = 'AI Assistant is typing...';
    }
    
    const delay = Math.floor(Math.random() * 1000) + 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (typingEl) {
        typingEl.classList.add('hidden');
    }
}


async function handleCommand(text) {
    const cmd = text.split(' ')[0].toLowerCase();
    const args = text.substring(cmd.length).trim();
    
    let response = '';
    
    try {
        switch(cmd) {
            case '/help':
                response = getHelpMessage();
                break;
            
            case '/ai':
                if (!args) {
                    response = "❌ Please ask me something!\n\nExample: `/ai what is JavaScript?`";
                } else {
                    response = await getAIResponse(args);
                }
                break;
            
            case '/time':
                const now = new Date();
                response = `🕐 **Current Time**\n\n${now.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true 
                })}`;
                break;
            
            case '/date':
                const today = new Date();
                response = `📅 **Today's Date**\n\n${today.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}`;
                break;
            
            case '/weather':
                response = getWeatherResponse();
                break;
            
            case '/calc':
                response = calculateExpression(args);
                break;
            
            case '/joke':
                response = getRandomJoke();
                break;
            
            case '/quote':
                response = getRandomQuote();
                break;
            
            case '/fact':
                response = getRandomFact();
                break;
            
            case '/roll':
                const roll = Math.floor(Math.random() * 6) + 1;
                const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][roll - 1];
                response = `🎲 **You rolled a ${roll}!** ${diceEmoji}`;
                break;
            
            case '/flip':
                const flip = Math.random() < 0.5 ? 'Heads' : 'Tails';
                const coinEmoji = '🪙';
                response = `${coinEmoji} **Coin Flip:** ${flip}`;
                break;
            
            case '/ping':
                const ping = Math.floor(Math.random() * 30) + 10;
                response = `🏓 **Pong!** Response time: ${ping}ms`;
                break;
            
            case '/motivate':
                response = getMotivationalMessage();
                break;
            
            case '/advice':
                response = getRandomAdvice();
                break;
            
            case '/riddle':
                const riddleData = getRandomRiddle();
                response = `🧩 **Riddle Time!**\n\n${riddleData.riddle}\n\n💡 *Type \`/answer\` to see the answer*`;
                window.lastRiddleAnswer = riddleData.answer;
                window.riddleTimeout = setTimeout(() => {
                    window.lastRiddleAnswer = null;
                }, 300000); 
                break;
            
            case '/answer':
                if (window.lastRiddleAnswer) {
                    response = `✅ **Answer:** ${window.lastRiddleAnswer}`;
                    window.lastRiddleAnswer = null;
                    clearTimeout(window.riddleTimeout);
                } else {
                    response = "❌ No active riddle. Type `/riddle` first!";
                }
                break;
            
            case '/compliment':
                response = getRandomCompliment();
                break;
            
            case '/echo':
                if (!args) {
                    response = "❌ Please type something to echo!\n\nExample: `/echo Hello World`";
                } else {
                    response = `📢 **Echo:**\n"${args}"`;
                }
                break;
            
            case '/say':
                if (!args) {
                    response = "❌ Please tell me what to say!\n\nExample: `/say I love coding`";
                } else {
                    response = `🗣️ **${BOT_CONFIG.AI_BOT_NAME} says:**\n"${args}"`;
                }
                break;
            
            case '/botinfo':
                response = getBotInfo();
                break;
            
            default:
                response = `❌ **Unknown command:** \`${cmd}\`\n\nType \`/help\` to see all available commands.`;
        }
    } catch (error) {
        console.error('Command error:', error);
        response = "❌ Sorry, something went wrong. Please try again.";
    }
    
    await sendBotResponse(response);
}

function getWeatherResponse() {
    const cities = ['Manila', 'Cebu', 'Davao', 'Quezon City', 'Makati'];
    const conditions = ['☀️ Sunny', '⛅ Partly Cloudy', '☁️ Cloudy', '🌧️ Rainy', '⛈️ Thunderstorm', '🌈 Clear'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 15) + 25;
    const humidity = Math.floor(Math.random() * 30) + 60;
    const wind = Math.floor(Math.random() * 20) + 5;
    
    return `🌤️ **Weather in ${randomCity}**\n\n` +
           `🌡️ Temperature: ${temp}°C\n` +
           `☁️ Condition: ${randomCondition}\n` +
           `💧 Humidity: ${humidity}%\n` +
           `💨 Wind: ${wind} km/h`;
}

function getBotInfo() {
    return `🤖 **${BOT_CONFIG.AI_BOT_NAME}**\n\n` +
           `📌 **Version:** 2.0.0\n` +
           `📅 **Created:** February 2026\n` +
           `⚙️ **Commands:** ${Object.keys(BOT_CONFIG.COMMANDS).length}\n` +
           `💬 **Language:** JavaScript/Firebase\n` +
           `🧠 **AI Engine:** BrainShop API + Smart Fallback\n\n` +
           `✨ **Features:**\n` +
           `• 🎉 Auto-welcome in Group Chat\n` +
           `• 💬 Natural conversations\n` +
           `• 🎮 Games & Fun commands\n` +
           `• 💡 Inspirational quotes\n` +
           `• 🔍 Random facts\n\n` +
           `Type \`/help\` to see all commands!`;
}

function getHelpMessage() {
    let help = "🤖 **AI ASSISTANT COMMANDS** 🤖\n\n";
    help += "━━━━━━━━━━━━━━━━━━━━━\n\n";
    
    const categories = {
        "📖 **BASIC**": ["/help", "/ai", "/ping", "/botinfo"],
        "🕐 **TIME & DATE**": ["/time", "/date", "/weather"],
        "🧮 **UTILITIES**": ["/calc", "/echo", "/say"],
        "🎮 **FUN & GAMES**": ["/joke", "/roll", "/flip", "/riddle", "/answer"],
        "💡 **INSPIRATION**": ["/quote", "/motivate", "/advice", "/compliment"],
        "🔍 **KNOWLEDGE**": ["/fact"]
    };
    
    Object.entries(categories).forEach(([category, cmds]) => {
        help += `${category}\n`;
        cmds.forEach(cmd => {
            const desc = BOT_CONFIG.COMMANDS[cmd] || "No description";
            help += `  \`${cmd}\` - ${desc}\n`;
        });
        help += "\n";
    });
    
    help += "━━━━━━━━━━━━━━━━━━━━━\n";
    help += "💡 **Tips:**\n";
    help += "• You can also just chat with me normally!\n";
    help += "• I respond to greetings and questions\n";
    help += "• Try asking \"How are you?\" or \"What's your name?\"\n";
    help += "• Commands are case-insensitive\n";
    
    return help;
}

const responseCache = new Map();

async function getAIResponse(message) {

    const cacheKey = `${currentUser.uid}:${message}`;
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
    }
    
    try {
        const response = await fetch(`https://api.brainshop.ai/get?bid=176117&key=sX5A5sTheH8Tz8BR&uid=${currentUser.uid}&msg=${encodeURIComponent(message)}`);
        const data = await response.json();
        
        let botResponse = data.cnt || getSmartResponse(message);
        
        responseCache.set(cacheKey, botResponse);
        setTimeout(() => responseCache.delete(cacheKey), 3600000);
        
        return botResponse;
    } catch (error) {
        console.error('AI API error:', error);
        return getSmartResponse(message);
    }
}

function getSmartResponse(message) {
    const msg = message.toLowerCase().trim();
    const name = currentUser?.displayName?.split(' ')[0] || 'there';
    
    if (msg.match(/^(hi|hello|hey|hola|kamusta|musta|good morning|good afternoon|good evening)/)) {
        const greetings = [
            `Hello ${name}! 👋 How can I help you today?`,
            `Hey ${name}! What's up? 😊`,
            `Hi there ${name}! Nice to see you! 🌟`,
            `Hello! How's your day going? 💫`,
            `Hey ${name}! I'm here to help! 🤖`,
            `Hi ${name}! What can I do for you? ✨`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    if (msg.includes('how are you') || msg.includes('kamusta ka') || msg.includes('musta ka')) {
        return `I'm doing great, ${name}! Thanks for asking! 😊 How about you?`;
    }
    
    if (msg.includes('your name') || msg.includes('who are you') || msg.includes('sino ka')) {
        return `I'm **${BOT_CONFIG.AI_BOT_NAME}**, your personal AI assistant! 🤖 Created to help you with commands, answer questions, and have fun conversations!`;
    }
    
    if (msg.includes('thank') || msg.includes('salamat') || msg.includes('thanks')) {
        const thanks = [
            `You're welcome, ${name}! 😊`,
            `Anytime! Happy to help! 🌟`,
            `No problem at all! ✨`,
            `Glad I could help! 💫`,
            `You got it! 👍`
        ];
        return thanks[Math.floor(Math.random() * thanks.length)];
    }
    
    if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('paalam') || msg.includes('sige')) {
        return `Goodbye, ${name}! 👋 Come back anytime!`;
    }
    
    if (msg.includes('love') || msg.includes('mahal') || msg.includes('❤️') || msg.includes('heart')) {
        return `Aww, that's so sweet! ❤️ I love chatting with you too, ${name}!`;
    }
    
    if (msg.includes('how old') || msg.includes('your age') || msg.includes('edad')) {
        return `I was born just recently! 🎂 But I'm learning new things every day!`;
    }
    
    if (msg.includes('where are you from') || msg.includes('taga saan') || msg.includes('origin')) {
        return `I live in the cloud! ☁️ I'm everywhere and nowhere at the same time. Pretty cool, right? 😎`;
    }
    
    if (msg.includes('can you help') || msg.includes('tulong') || msg.includes('help me')) {
        return `Of course I can help! 🤝 Just tell me what you need.\n\nYou can also type \`/help\` to see all my commands!`;
    }
    
    if (msg.includes('what can you do') || msg.includes('anong kaya mo') || msg.includes('capabilities')) {
        return `I can do lots of things! 🚀\n\n` +
               `• 🤖 Answer questions with \`/ai\`\n` +
               `• 😂 Tell jokes with \`/joke\`\n` +
               `• 🔍 Share facts with \`/fact\`\n` +
               `• 🧮 Calculate with \`/calc\`\n` +
               `• 🕐 Check time/date with \`/time\` and \`/date\`\n` +
               `• 🎲 Play games with \`/roll\` and \`/flip\`\n` +
               `• 💡 Give motivation with \`/motivate\` and \`/quote\`\n` +
               `• 🧩 Solve riddles with \`/riddle\`\n\n` +
               `Type \`/help\` to see all commands! 📖`;
    }
    
    if (msg.includes('how to use') || msg.includes('paano') || msg.includes('how do i')) {
        return `Using me is easy! 🎯\n\n` +
               `• Type \`/help\` to see all commands\n` +
               `• Type \`/ai [question]\` to ask me anything\n` +
               `• Just chat with me normally!\n\n` +
               `Try saying "Hello" or "Tell me a joke"! 😊`;
    }
    
    if (msg.includes('who created you') || msg.includes('sino gumawa') || msg.includes('your creator')) {
        return `I was created by **ARI**! 👨‍💻 He's a awesome developer who built me to help and entertain people in Mini Messenger! 🚀`;
    }
    
    const defaultResponses = [
        `That's interesting, ${name}! Tell me more! 😊`,
        `I see! What else would you like to know? 🤔`,
        `Thanks for sharing that with me! 💭`,
        `Hmm, let me think about that... 🤖`,
        `Great question! I'm still learning, but I'll do my best to help! ✨`,
        `I understand! Is there anything specific you'd like to ask? 📝`,
        `Cool! 😎 Want to try some commands? Type \`/help\` to see what I can do!`,
        `Interesting perspective! Tell me more about that! 🌟`,
        `Got it! What's next? 🚀`,
        `I'm here to help! Just let me know what you need! 🤝`,
        `That's a good point! 👍`,
        `I never thought of it that way! 💭`,
        `Thanks for teaching me something new! 📚`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}


function calculateExpression(expr) {
    if (!expr) return "❌ Please enter an expression!\n\nExample: `/calc 2 + 2`";
    
    try {
        expr = expr.replace(/\s+/g, '');
        if (!/^[0-9+\-*/().]+$/.test(expr)) {
            return "❌ Invalid expression. Use only numbers and `+`, `-`, `*`, `/`, `(`, `)`";
        }
        const result = eval(expr);
        return `🧮 **${expr}** = **${result}**`;
    } catch (error) {
        return "❌ Invalid calculation. Example: `/calc 2 + 2`";
    }
}

function getRandomJoke() {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything! 😂",
        "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
        "What do you call a fake noodle? An impasta! 🍝",
        "Why don't eggs tell jokes? They'd crack each other up! 🥚",
        "What do you call a bear with no teeth? A gummy bear! 🧸",
        "Why did the math book look so sad? Because it had too many problems! 📚",
        "What do you call a sleeping bull? A bulldozer! 🐂",
        "Why don't skeletons fight each other? They don't have the guts! 💀",
        "What's the best thing about Switzerland? I don't know, but the flag is a big plus! 🇨🇭",
        "Why did the coffee file a police report? It got mugged! ☕",
        "What do you call a fish wearing a bowtie? Sofishticated! 🐠",
        "Why can't you give Elsa a balloon? Because she will let it go! 🎈",
        "What do you call a funny mountain? Hill-arious! ⛰️",
        "Why did the bicycle fall over? Because it was two tired! 🚲",
        "What do you call a pig that does karate? A pork chop! 🐷",
        "Why did the golfer bring two pairs of pants? In case he got a hole in one! ⛳",
        "What do you call a lazy kangaroo? A pouch potato! 🦘",
        "Why did the cookie go to the doctor? Because it felt crumbly! 🍪"
    ];
    return `😂 **Joke Time!**\n\n${jokes[Math.floor(Math.random() * jokes.length)]}`;
}

function getRandomQuote() {
    const quotes = [
        "💪 \"The only way to do great work is to love what you do.\" - Steve Jobs",
        "🌟 \"Believe you can and you're halfway there.\" - Theodore Roosevelt",
        "🚀 \"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt",
        "💫 \"It does not matter how slowly you go as long as you do not stop.\" - Confucius",
        "🎯 \"Success is not final, failure is not fatal: it is the courage to continue that counts.\" - Winston Churchill",
        "✨ \"Everything you've ever wanted is on the other side of fear.\"",
        "🌈 \"Happiness is not something ready-made. It comes from your own actions.\" - Dalai Lama",
        "⭐ \"The best time to plant a tree was 20 years ago. The second best time is now.\"",
        "💖 \"You are never too old to set another goal or to dream a new dream.\" - C.S. Lewis",
        "🔥 \"Don't watch the clock; do what it does. Keep going.\" - Sam Levenson",
        "🌅 \"The only limit to our realization of tomorrow will be our doubts of today.\" - Franklin D. Roosevelt",
        "🎨 \"Creativity is intelligence having fun.\" - Albert Einstein"
    ];
    return `💡 **Inspirational Quote**\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`;
}

function getRandomFact() {
    const facts = [
        "🧠 Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs, still edible!",
        "🐘 Elephants are the only animals that can't jump.",
        "🌍 A day on Venus is longer than a year on Venus.",
        "💧 Hot water can freeze faster than cold water (Mpemba effect).",
        "🦒 Giraffes have the same number of neck vertebrae as humans - just 7!",
        "🍌 Bananas are technically berries, but strawberries aren't.",
        "🐙 Octopuses have three hearts and blue blood.",
        "🎵 The longest recorded flight of a chicken is 13 seconds.",
        "🌊 90% of all volcanic activity occurs in the oceans.",
        "🕷️ There's a species of spider that can't spin webs - the huntsman spider.",
        "🐬 Dolphins give each other names and respond to them!",
        "🌿 Bamboo is the fastest growing plant - it can grow 35 inches in a single day!",
        "📚 The shortest war in history lasted only 38 minutes between Britain and Zanzibar.",
        "🍫 Chocolate was once used as currency by the Aztecs.",
        "🎮 The first video game was created in 1958 - it was called 'Tennis for Two'.",
        "🧀 The most expensive cheese in the world is made from donkey milk.",
        "🐌 Snails can sleep for 3 years straight.",
        "🍅 Tomatoes are actually fruits, not vegetables."
    ];
    return `🔍 **Did You Know?**\n\n${facts[Math.floor(Math.random() * facts.length)]}`;
}

function getMotivationalMessage() {
    const messages = [
        "💪 **You got this!** Every expert was once a beginner.",
        "✨ **Believe in yourself!** You are capable of amazing things.",
        "🚀 **Keep going!** Your future self will thank you for not giving up.",
        "🌟 **You matter!** Don't ever forget that.",
        "🔥 **Stay focused!** Your dreams don't have an expiration date.",
        "💫 **Be proud of yourself!** You've come a long way.",
        "🌈 **Every day is a second chance.** Make it count!",
        "⭐ **You are stronger than you think.** Keep pushing forward!",
        "💖 **Be your own biggest fan.** The world needs what you have to offer!",
        "🎯 **Small steps every day** lead to big results!",
        "🌱 **Growth takes time.** Be patient with yourself.",
        "💎 **You are unique and valuable.** Never doubt that."
    ];
    return `💪 **Motivation Boost!**\n\n${messages[Math.floor(Math.random() * messages.length)]}`;
}

function getRandomAdvice() {
    const advices = [
        "✨ **Drink more water!** Your brain works better when hydrated 💧",
        "📱 **Take breaks from social media.** Your mental health will thank you!",
        "😴 **Sleep is not a luxury, it's a necessity.** Aim for 7-8 hours!",
        "📖 **Read something every day.** Knowledge compounds like interest!",
        "💪 **Exercise doesn't have to be intense.** A 15-minute walk counts!",
        "🎯 **Set small, achievable goals.** They add up to big wins!",
        "💭 **Don't compare your Chapter 1 to someone else's Chapter 20.**",
        "🌱 **Learn something new every day.** Growth is a lifelong journey!",
        "💝 **Be kind to yourself.** You're doing the best you can.",
        "🌟 **Celebrate small victories.** They're still victories!",
        "💰 **Save a little money each month.** Future you will be grateful.",
        "📝 **Write down your thoughts.** It helps clear your mind.",
        "🎵 **Listen to music.** It's good for your soul.",
        "🌿 **Spend time in nature.** It reduces stress and anxiety."
    ];
    return `✨ **Daily Advice**\n\n${advices[Math.floor(Math.random() * advices.length)]}`;
}

function getRandomRiddle() {
    const riddles = [
        { riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "An echo" },
        { riddle: "The more of me you take, the more you leave behind. What am I?", answer: "Footsteps" },
        { riddle: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", answer: "A map" },
        { riddle: "What can you catch but not throw?", answer: "A cold" },
        { riddle: "I'm tall when I'm young, and I'm short when I'm old. What am I?", answer: "A candle" },
        { riddle: "What has keys but can't open locks?", answer: "A piano" },
        { riddle: "What has a face and two hands but no arms or legs?", answer: "A clock" },
        { riddle: "What gets wetter as it dries?", answer: "A towel" },
        { riddle: "What has words but never speaks?", answer: "A book" },
        { riddle: "What is always in front of you but can't be seen?", answer: "The future" },
        { riddle: "What has a head and a tail but no body?", answer: "A coin" },
        { riddle: "What can you break without touching it?", answer: "A promise" }
    ];
    return riddles[Math.floor(Math.random() * riddles.length)];
}

function getRandomCompliment() {
    const compliments = [
        "💝 **You have a great sense of humor!**",
        "💖 **You're smarter than you think!**",
        "✨ **You light up the room when you enter!**",
        "🌟 **You're one of a kind!**",
        "💫 **Your smile is contagious!**",
        "⭐ **You're doing an amazing job!**",
        "🌈 **You bring out the best in others!**",
        "🔥 **You have so much potential!**",
        "🎯 **You're capable of amazing things!**",
        "💪 **You're stronger than you know!**",
        "🎨 **You have great taste!**",
        "💎 **You're a gem!**",
        "🌺 **You make the world better just by being in it!**"
    ];
    return `💝 **Compliment for You!**\n\n${compliments[Math.floor(Math.random() * compliments.length)]}`;
}


async function sendBotResponse(response) {
    if (!currentUser) return;
    
    try {
        const chatId = [currentUser.uid, BOT_CONFIG.AI_BOT_ID].sort().join('_');
        
        await db.collection('privateChats').doc(chatId)
            .collection('messages').add({
                text: response,
                senderId: BOT_CONFIG.AI_BOT_ID,
                senderName: BOT_CONFIG.AI_BOT_NAME,
                senderPhoto: BOT_CONFIG.AI_BOT_PHOTO,
                receiverId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                isBotMessage: true,
                botType: 'ai'
            });
    } catch (error) {
        console.error('❌ Error sending bot response:', error);
    }
}

async function handleAIConversation(message) {
    const response = await getAIResponse(message);
    await sendBotResponse(response);
}

async function initBots() {
    console.log('🤖 Initializing bot system...');
    
    try {
        await initWelcomeBot();
        await initAIBot();
        
        setTimeout(() => {
            listenToNewMembers();
            listenToAIBotMessages();
            console.log('🤖✅ All bots initialized and ready!');
            console.log('🎉 Welcome Bot - GC ONLY (Auto welcome)');
            console.log('🧠 AI Bot - PM ONLY (Full commands)');
        }, 500);
        
    } catch (error) {
        console.error('❌ Error initializing bots:', error);
    }
}


console.log('🤖 Bot.js loaded and waiting for app.js...');

window.initBots = initBots;
window.BOT_CONFIG = BOT_CONFIG;
