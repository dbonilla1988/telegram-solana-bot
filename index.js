// Load environment variables
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const Web3 = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Regular expression to validate Solana addresses
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Regular expression to validate Solana transaction signatures (base58, 88 characters)
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{88}$/;

// Load environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;

// Check for Telegram Bot Token
if (!token) {
    console.error("🔴 ERROR: TELEGRAM_BOT_TOKEN is not defined in your .env file.");
    process.exit(1);
}

// Initialize Express App
const app = express();

// Basic route for health check
app.get('/', (req, res) => {
    res.send('👋 Hello! SolBooster Volume Bot is running.');
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Initialize Telegram Bot
const bot = new TelegramBot(token, { polling: true });
const userStates = {}; // Tracks user states and selections

// Path to admins.json
const ADMIN_FILE = path.join(__dirname, 'admins.json');

// Function to load admins from JSON file
function loadAdmins() {
    if (fs.existsSync(ADMIN_FILE)) {
        const data = fs.readFileSync(ADMIN_FILE, 'utf8');
        try {
            const json = JSON.parse(data);
            return json.admins.map(id => parseInt(id));
        } catch (err) {
            console.error("🔴 ERROR: Error parsing admins.json:", err);
            return [];
        }
    } else {
        // If admins.json doesn't exist, create it with the initial admins
        const initialAdmins = [6286614992, 1231105064]; // Replace with your Telegram User ID(s)
        fs.writeFileSync(ADMIN_FILE, JSON.stringify({ admins: initialAdmins }, null, 4));
        return initialAdmins;
    }
}

// Function to save admins to JSON file
function saveAdmins(admins) {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify({ admins: admins }, null, 4));
}

// Initialize ADMINS list
let ADMINS = loadAdmins();

// Function to check if a user is an admin
function isAdmin(userId) {
    return ADMINS.includes(userId);
}

// Define service options with updated pricing and durations
const serviceOptions = {
    "1": {
        name: "🔹 Basic Volume Boost",
        description: "Steady volume boosting with buys larger than sells. *Includes all transaction fees.*",
        basePrice: 1.25, // Price for 1 hour in SOL
        buyStrategy: "1-2 buys per minute",
        sellStrategy: "1 sell per minute",
        duration: 1, // in hours
        wallet: "FispAYkU2pkBQiV4yd9hHmLAhzWUL3NKLrG5N6EzzmYm", // Replace with your wallet address
        benefits: [
            "⚡ Increased liquidity",
            "📈 Enhanced trading volume",
            "👁️ Improved market visibility"
        ]
    },
    "2": {
        name: "🔸 Advanced Volume Boost",
        description: "Enhanced volume boosting with strategic buy/sell activities.",
        basePrice: 2.75, // Price for 3 hours in SOL
        buyStrategy: "2 buys per minute",
        sellStrategy: "1 sell per minute",
        durations: [3, 6, 12], // in hours
        wallet: "FispAYkU2pkBQiV4yd9hHmLAhzWUL3NKLrG5N6EzzmYm",
        benefits: [
            "⚡ Enhanced liquidity",
            "📈 Boosted trading volume",
            "👁️ Elevated market presence"
        ]
    },
    "3": {
        name: "🔺 Premium Volume Boost",
        description: "Maximized volume boosting with aggressive buy/sell strategies.",
        basePrice: 16.0, // Price for 24 hours in SOL
        buyStrategy: "4 buys / 2 sells per minute",
        sellStrategy: "2 sells per minute",
        durations: [24, 168], // in hours (168 hours = 7 days)
        wallet: "FispAYkU2pkBQiV4yd9hHmLAhzWUL3NKLrG5N6EzzmYm",
        benefits: [
            "⚡ Maximized liquidity",
            "📈 Significantly increased trading volume",
            "👁️ Dominant market visibility"
        ]
    },
    "4": {
        name: "✨ Customizable Volume Boost",
        description: "Tailored buy/sell ratios and randomized intervals to fit your project needs.",
        basePrice: null, // Price will be provided upon contact
        buyStrategy: "Custom",
        sellStrategy: "Custom",
        duration: "Custom", // Allow user to choose
        wallet: "FispAYkU2pkBQiV4yd9hHmLAhzWUL3NKLrG5N6EzzmYm",
        benefits: [
            "⚡ Customized liquidity",
            "📈 Flexible trading volume",
            "👁️ Adaptable market strategies"
        ]
    }
};

// Function to calculate total price based on service and duration
function calculatePrice(service, duration) {
    let price = 0;
    if (service.name.includes("🔹 Basic Volume Boost")) {
        price = service.basePrice * duration; // Fixed at 1.25 SOL for 1 hour
    } else if (service.name.includes("🔸 Advanced Volume Boost")) {
        switch (duration) {
            case 3:
                price = 2.75; // 3 hours at 2.75 SOL
                break;
            case 6:
                price = 5.5; // 6 hours at 5.5 SOL
                break;
            case 12:
                price = 10.5; // 12 hours at 10.5 SOL
                break;
            default:
                price = service.basePrice * duration; // Default calculation
        }
    } else if (service.name.includes("🔺 Premium Volume Boost")) {
        switch (duration) {
            case 24:
                price = 16.0; // 24 hours at 16 SOL
                break;
            case 168:
                price = 40.0; // 7 days at 40 SOL
                break;
            default:
                price = service.basePrice * duration; // Default calculation
        }
    }
    return price;
}

// Function to send the service selection menu with enhanced buttons
function sendServiceMenu(chatId) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                ...Object.keys(serviceOptions).map(key => [
                    { text: serviceOptions[key].name, callback_data: key }
                ]),
                [
                    { text: "📅 Subscription", callback_data: "monthly_sub" },
                    { text: "🤝 Partnership", callback_data: "partnership" }
                ],
                [{ text: "❓ Help", callback_data: "help" }] // Add Help button with emoji
            ]
        }
    };
    bot.sendMessage(chatId, `🔰 **Welcome to SolBooster Volume Bot!**
For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).

Please select a service:`, {
        parse_mode: 'Markdown',
        ...options
    }).then(sentMessage => {
        if (!userStates[chatId].messages) userStates[chatId].messages = [];
        userStates[chatId].messages.push(sentMessage.message_id);
    }).catch(error => {
        console.error("🔴 ERROR: Error sending service menu:", error);
    });
}

// Function to send duration options based on selected service with enhanced buttons
function sendDurationMenu(chatId, selectedService) {
    let options;
    if (selectedService.durations) {
        // Service has multiple predefined durations
        const durationButtons = selectedService.durations.map(duration => {
            const price = calculatePrice(selectedService, duration).toFixed(2);
            let durationText = "";
            if (duration === 168) {
                durationText = "7 Days 🗓️";
            } else if (duration === 24) {
                durationText = "24 Hours ⏰";
            } else {
                durationText = `${duration} Hour${duration > 1 ? 's' : ''} ⏰`;
            }
            return [{ text: `${durationText} - ${price} SOL 💸`, callback_data: `${duration}` }];
        });
        // Add a back button with emoji
        durationButtons.push([{ text: "🔙 Back", callback_data: "back" }]);
        options = {
            reply_markup: {
                inline_keyboard: durationButtons
            }
        };
        bot.sendMessage(chatId, `🛠️ **You selected:** ${selectedService.name}

Please select the duration:`, {
            parse_mode: 'Markdown',
            ...options
        }).then(sentMessage => {
            if (!userStates[chatId].messages) userStates[chatId].messages = [];
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending duration menu:", error);
        });
    } else {
        // Customizable service
        options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📧 Contact Us", url: "https://www.solboostervolumebot.com" }],
                    [{ text: "🔙 Back", callback_data: "back" }]
                ]
            }
        };
        bot.sendMessage(chatId, `🛠️ **You selected:** ${selectedService.name}

With the Customizable Volume Boost, you can fully tailor buy/sell ratios and intervals to align with your project's unique goals.
For pricing and further customization, please contact us at [solboostervolumebot@gmail.com](mailto:solboostervolumebot@gmail.com).
For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).`, {
            parse_mode: 'Markdown',
            ...options
        }).then(sentMessage => {
            if (!userStates[chatId].messages) userStates[chatId].messages = [];
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending customizable service message:", error);
        });
        // Update user state
        userStates[chatId].stage = "customizing_service";
    }
}

// Function to notify all admins about a new service purchase
function notifyAdminsServicePurchase(userId, username, selectedService, duration, caAddress) {
    const message = `📦 *New Service Purchase:*
• *User:* @${username} (ID: ${userId})
• *Service:* ${selectedService.name}
• *Duration:* ${duration} Hour${duration > 1 ? 's' : ''}
• *Contract Address (CA):* \`${caAddress}\``;
    
    ADMINS.forEach(adminId => {
        bot.sendMessage(adminId, message, { parse_mode: 'Markdown' }).catch(error => {
            console.error(`🔴 ERROR: Error notifying admin (ID: ${adminId}):`, error);
        });
    });
}

// Function to notify admins of a new user privately
function notifyAdminsNewUser(userId) {
    const message = `📢 *New User Started the Bot:*
• *User ID:* \`${userId}\``;
    
    ADMINS.forEach(adminId => {
        bot.sendMessage(adminId, message, { parse_mode: 'Markdown' }).catch(error => {
            console.error(`🔴 ERROR: Error notifying admin (ID: ${adminId}):`, error);
        });
    });
}

// ================== Admin Functionality ================== //

// Handle '/admin' command (Admin-only)
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(userId)) {
        const adminCommands = `👑 *Admin Commands:*
• /addadmin <UserID> - Add a new admin
• /removeadmin <UserID> - Remove an admin
• /listadmins - List all admins`;
        
        bot.sendMessage(chatId, adminCommands, { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error sending admin commands:", error);
        });
    } else {
        bot.sendMessage(chatId, "❌ *You are not authorized to use this command.*", { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error sending unauthorized admin message:", error);
        });
    }
});

// Handle '/addadmin <UserID>' command (Admin-only)
bot.onText(/\/addadmin (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const newAdminId = parseInt(match[1]);

    if (isAdmin(userId)) {
        if (!ADMINS.includes(newAdminId)) {
            ADMINS.push(newAdminId);
            saveAdmins(ADMINS);
            bot.sendMessage(chatId, `✅ *User ID ${newAdminId} has been added as an admin.*`, { parse_mode: 'Markdown' }).catch(error => {
                console.error("🔴 ERROR: Error adding new admin:", error);
            });
        } else {
            bot.sendMessage(chatId, "❌ *This user is already an admin.*", { parse_mode: 'Markdown' }).catch(error => {
                console.error("🔴 ERROR: Error sending already admin message:", error);
            });
        }
    } else {
        bot.sendMessage(chatId, "❌ *You are not authorized to use this command.*", { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error sending unauthorized addadmin message:", error);
        });
    }
});

// Handle '/removeadmin <UserID>' command (Admin-only)
bot.onText(/\/removeadmin (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const removeAdminId = parseInt(match[1]);

    if (isAdmin(userId)) {
        const index = ADMINS.indexOf(removeAdminId);
        if (index !== -1) {
            ADMINS.splice(index, 1);
            saveAdmins(ADMINS);
            bot.sendMessage(chatId, `✅ *User ID ${removeAdminId} has been removed from admins.*`, { parse_mode: 'Markdown' }).catch(error => {
                console.error("🔴 ERROR: Error removing admin:", error);
            });
        } else {
            bot.sendMessage(chatId, "❌ *User ID not found in admin list.*", { parse_mode: 'Markdown' }).catch(error => {
                console.error("🔴 ERROR: Error sending user not found message:", error);
            });
        }
    } else {
        bot.sendMessage(chatId, "❌ *You are not authorized to use this command.*", { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error sending unauthorized removeadmin message:", error);
        });
    }
});

// Handle '/listadmins' command (Admin-only)
bot.onText(/\/listadmins/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isAdmin(userId)) {
        const adminList = ADMINS.join(', ');
        bot.sendMessage(chatId, `👑 *Current Admins:* \n\`${adminList}\``, { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error listing admins:", error);
        });
    } else {
        bot.sendMessage(chatId, "❌ *You are not authorized to use this command.*", { parse_mode: 'Markdown' }).catch(error => {
            console.error("🔴 ERROR: Error sending unauthorized listadmins message:", error);
        });
    }
});

// ================== Admin Functionality Ends Here ================== //

// Function to delete previous messages
function deletePreviousMessages(chatId) {
    if (userStates[chatId] && userStates[chatId].messages) {
        userStates[chatId].messages.forEach(messageId => {
            bot.deleteMessage(chatId, messageId).catch(() => { /* Ignore errors */ });
        });
        // Reset the messages array
        userStates[chatId].messages = [];
    }
}

// Handle '/start' command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Notify admins of a new user
    notifyAdminsNewUser(userId);

    // Delete previous messages and reset state
    deletePreviousMessages(chatId);
    userStates[chatId] = { stage: "selecting_service", messages: [] };

    // Send the service selection menu with enhanced buttons
    sendServiceMenu(chatId);
});

// Handle '/help' command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `❓ **SolBoost Volume Bot Help**
- **/start**: Start the bot and select a service package.
- **/help**: Display this help message.
- **Provide CA**: After selecting a service, enter your Contract Address when prompted.
- **Click 'Paid'**: Confirm your payment after sending SOL by clicking the 'Paid' button.
For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).
📧 For further assistance, contact our support team at [solboostervolumebot@gmail.com](mailto:solboostervolumebot@gmail.com).`;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' }).catch(error => {
        console.error("🔴 ERROR: Error sending help message:", error);
    });
});

// Handle callback queries for service and duration selection
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;

    // Initialize messages array if not present
    if (!userStates[chatId]) {
        userStates[chatId] = { messages: [] };
    }

    // Delete the message that had the inline keyboard to keep interface clean
    bot.deleteMessage(chatId, message.message_id).catch(() => { /* Ignore errors */ });

    if (data === "back") {
        userStates[chatId].stage = "selecting_service";
        deletePreviousMessages(chatId);
        sendServiceMenu(chatId);
        return;
    }

    if (data === "help") {
        bot.emit('text', { chat: { id: chatId }, text: '/help' });
        return;
    }

    if (data === "monthly_sub") {
        bot.sendMessage(chatId, `📅 **Subscription Plans**

We offer **Monthly Subscription Plans** for projects seeking continuous volume boosting. Enjoy significant discounts and exclusive benefits.

**What's Included:**
- Continuous volume boosting for your project.
- Priority support and maintenance.
- Exclusive access to premium features.

For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).
📧 **Contact Us:** [solboostervolumebot@gmail.com](mailto:solboostervolumebot@gmail.com)`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📧 Contact Us", url: "https://www.solboostervolumebot.com" }],
                    [{ text: "🔙 Back to Menu", callback_data: "back" }]
                ]
            }
        }).then(sentMessage => {
            if (!userStates[chatId].messages) userStates[chatId].messages = [];
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending subscription plans:", error);
        });
        return;
    }

    if (data === "partnership") {
        bot.sendMessage(chatId, `🤝 **Partnership Program**

Collaborate with **SolBoost Volume Bot** and elevate your project's success.

**Partnership Packages:**
1. **Silver Partner**
   - Enhanced visibility
   - Shared resources
2. **Gold Partner**
   - Priority support
   - Custom solutions
3. **Platinum Partner**
   - Exclusive offers
   - Dedicated account manager

For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).
📧 **Contact Us:** [solboostervolumebot@gmail.com](mailto:solboostervolumebot@gmail.com)`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📧 Contact Us", url: "https://www.solboostervolumebot.com" }],
                    [{ text: "🔙 Back to Menu", callback_data: "back" }]
                ]
            }
        }).then(sentMessage => {
            if (!userStates[chatId].messages) userStates[chatId].messages = [];
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending partnership program:", error);
        });
        return;
    }

    if (data === 'paid') {
        const userState = userStates[chatId];
        if (userState && userState.stage === "awaiting_payment_confirmation") {
            bot.sendMessage(chatId, "🔄 *We are now verifying your transaction. Please hold on...*", { parse_mode: 'Markdown' }).then(sentMessage => {
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending verification in progress message:", error);
            });
            // Prompt the user to enter the transaction signature for verification
            bot.sendMessage(chatId, "🔍 *Please enter only the transaction signature (txSignature) for verification:*", {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true
                }
            }).then(sentMessage => {
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error prompting for transaction signature:", error);
            });
            // Update the user state to await the transaction signature
            userStates[chatId].stage = "awaiting_tx_signature";
        } else {
            bot.sendMessage(chatId, "❗ *Please select a service first by typing* `/start`.", {
                parse_mode: 'Markdown'
            }).then(sentMessage => {
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending prompt to start:", error);
            });
        }
        return;
    }

    if (userStates[chatId] && userStates[chatId].stage === "selecting_service") {
        const selectedService = serviceOptions[data];
        if (selectedService) {
            userStates[chatId].selectedService = selectedService;
            if (selectedService.name.includes("✨ Customizable Volume Boost")) {
                // Handle custom package
                userStates[chatId].stage = "customizing_service";
                bot.sendMessage(chatId, `🛠️ **Customizable Volume Boost**

With the Customizable Volume Boost, you can fully tailor buy/sell ratios and intervals to align with your project's unique goals.
For pricing and further customization, please contact us at [solboostervolumebot@gmail.com](mailto:solboostervolumebot@gmail.com).
For more information, visit our website at [www.solboostervolumebot.com](https://www.solboostervolumebot.com) and our documentation at [GitBook](https://solboostvolumeboost.gitbook.io/solboostevolumebot).`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📧 Contact Us", url: "https://www.solboostervolumebot.com" }],
                            [{ text: "🔙 Back to Menu", callback_data: "back" }]
                        ]
                    }
                }).then(sentMessage => {
                    if (!userStates[chatId].messages) userStates[chatId].messages = [];
                    userStates[chatId].messages.push(sentMessage.message_id);
                }).catch(error => {
                    console.error("🔴 ERROR: Error sending customizable service message:", error);
                });
            } else if (selectedService.name.includes("🔹 Basic Volume Boost")) {
                // Fixed duration for Basic package
                const duration = selectedService.duration; // 1 hour
                const totalPrice = calculatePrice(selectedService, duration).toFixed(2);
                const totalBuys = selectedService.buyStrategy; // "1-2 buys per minute"
                const totalSells = selectedService.sellStrategy; // "1 sell per minute"
                const benefits = selectedService.benefits.map(benefit => `• ${benefit}`).join('\n');
                userStates[chatId] = {
                    ...userStates[chatId],
                    stage: "waiting_for_ca",
                    selectedService,
                    duration,
                    totalPrice,
                    totalBuys,
                    totalSells
                };
                // Emphasize that buys are larger than sells
                const buySellDescription = "🔺 *Buys are larger than sells to enhance volume.*";
                bot.sendMessage(chatId, `✅ *You've selected:* ${selectedService.name}
*Duration:* 1 Hour
*Price:* ${totalPrice} SOL
*Buy/Sell Strategy:* ${totalBuys} and ${totalSells}
*Frequency:* Every 1-2 minutes depending on market conditions (Moderate Mode)
*Benefits:*
${benefits}
${buySellDescription}
🔗 Please provide the *Contract Address (CA)* for your token.`, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔙 Back", callback_data: "back" }]
                        ]
                    }
                }).then(sentMessage => {
                    if (!userStates[chatId].messages) userStates[chatId].messages = [];
                    userStates[chatId].messages.push(sentMessage.message_id);
                }).catch(error => {
                    console.error("🔴 ERROR: Error sending Basic Volume Boost details:", error);
                });
            } else {
                // For Advanced and Premium packages, send duration menu
                userStates[chatId].stage = "selecting_duration";
                sendDurationMenu(chatId, selectedService);
            }
        } else {
            bot.sendMessage(chatId, "❌ *Invalid service selection. Please try again.*", { parse_mode: 'Markdown' }).then(sentMessage => {
                if (!userStates[chatId].messages) userStates[chatId].messages = [];
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending invalid service selection message:", error);
            });
        }
    } else if (userStates[chatId] && userStates[chatId].stage === "selecting_duration") {
        const selectedService = userStates[chatId].selectedService;
        const duration = parseInt(data);
        if (selectedService.durations.includes(duration)) {
            // Handle predefined durations
            const totalPrice = calculatePrice(selectedService, duration).toFixed(2);
            const totalBuys = selectedService.buyStrategy;
            const totalSells = selectedService.sellStrategy;
            const benefits = selectedService.benefits.map(benefit => `• ${benefit}`).join('\n');
            userStates[chatId] = {
                ...userStates[chatId],
                stage: "waiting_for_ca",
                selectedService,
                duration,
                totalPrice,
                totalBuys,
                totalSells
            };
            let durationText = duration;
            let mode = "";
            if ([3, 6, 12].includes(duration)) {
                durationText = `${duration} Hours ⏰`;
                mode = "Aggressive Mode";
            } else if (duration === 24) {
                durationText = "24 Hours ⏰";
                mode = "Turbo Mode";
            } else if (duration === 168) {
                durationText = "7 Days 🗓️";
                mode = "High Frequency Mode";
            }
            // Emphasize that buys are larger than sells
            const buySellDescription = "🔺 *Buys are larger than sells to enhance volume.*";
            bot.sendMessage(chatId, `✅ *You've selected:* ${selectedService.name}
*Duration:* ${durationText}
*Price:* ${totalPrice} SOL
*Buy/Sell Strategy:* ${totalBuys}
*Frequency:* Every 1-2 minutes depending on market conditions (${mode})
*Benefits:*
${benefits}
${buySellDescription}
🔗 Please provide the *Contract Address (CA)* for your token.`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "back" }]
                    ]
                }
            }).then(sentMessage => {
                if (!userStates[chatId].messages) userStates[chatId].messages = [];
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending Advanced/Premium Volume Boost details:", error);
            });
        } else {
            bot.sendMessage(chatId, "❌ *Invalid duration selection. Please try again.*", { parse_mode: 'Markdown' }).then(sentMessage => {
                if (!userStates[chatId].messages) userStates[chatId].messages = [];
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending invalid duration selection message:", error);
            });
        }
    }
});

// ================== Admin Functionality Ends Here ================== //

// Handle messages for CA input and payment confirmation
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userState = userStates[chatId];

    // Initialize messages array if not present
    if (!userStates[chatId]) {
        userStates[chatId] = { messages: [] };
    }

    // Ignore messages that are commands; they are handled by onText listeners
    if (text.startsWith('/')) {
        return;
    }

    if (userState && userState.stage === "waiting_for_ca") {
        const caAddress = text.trim();
        // Validate CA format
        if (!SOLANA_ADDRESS_REGEX.test(caAddress)) {
            bot.sendMessage(chatId, "❌ *Invalid Contract Address (CA). Please enter a valid Solana address.*", {
                parse_mode: 'Markdown'
            }).then(sentMessage => {
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(error => {
                console.error("🔴 ERROR: Error sending invalid CA message:", error);
            });
            return;
        }
        userStates[chatId].contractAddress = caAddress;
        userStates[chatId].stage = "awaiting_payment_confirmation";
        const selectedService = userState.selectedService;
        const totalPrice = userState.totalPrice;
        bot.sendMessage(chatId, `✅ *You've entered CA:* \`${caAddress}\`.
Please send 💰 *${totalPrice} SOL* to the wallet: \`${selectedService.wallet}\` and click 'Paid' once done.`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💸 Paid ✅", callback_data: "paid" }],
                    [{ text: "🔙 Back", callback_data: "back" }]
                ]
            }
        }).then(sentMessage => {
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending payment instructions:", error);
        });
    } else if (userState && userState.stage === "awaiting_tx_signature" && text) {
        let txSignature = text.trim();

        // Extract signature if a URL is provided
        if (txSignature.startsWith('http')) {
            try {
                const url = new URL(txSignature);
                const pathSegments = url.pathname.split('/');
                txSignature = pathSegments[pathSegments.length - 1];
                console.log(`🔍 Extracted transaction signature: ${txSignature}`);
            } catch (error) {
                bot.sendMessage(chatId, "❌ *Invalid URL format. Please provide a valid transaction signature.*", { parse_mode: 'Markdown' }).catch(error => {
                    console.error("🔴 ERROR: Error sending invalid URL format message:", error);
                });
                return;
            }
        }

        // Validate the transaction signature format
        if (!TX_SIGNATURE_REGEX.test(txSignature)) {
            bot.sendMessage(chatId, "❌ *Invalid transaction signature format. Please enter a valid signature.*", { parse_mode: 'Markdown' }).catch(error => {
                console.error("🔴 ERROR: Error sending invalid transaction signature message:", error);
            });
            return;
        }

        // Log the signature being processed
        console.log(`🔍 Verifying transaction: ${txSignature}`);

        bot.sendMessage(chatId, "🔍 *Verifying your transaction. Please wait...*", { parse_mode: 'Markdown' }).then(sentMessage => {
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending verification in progress message:", error);
        });

        try {
            const connection = new Web3.Connection(Web3.clusterApiUrl('mainnet-beta'), 'confirmed');
            const transaction = await connection.getTransaction(txSignature);

            if (!transaction) {
                bot.sendMessage(chatId, "❌ *Transaction not found. Please ensure the signature is correct and try again.*", { parse_mode: 'Markdown' }).then(sentMessage => {
                    userStates[chatId].messages.push(sentMessage.message_id);
                }).catch(error => {
                    console.error("🔴 ERROR: Error sending transaction not found message:", error);
                });
                return;
            }

            // Log transaction details for debugging
            console.log(`📝 Transaction Details:`, transaction);

            const recipientAddress = userState.selectedService.wallet;
            const solAmount = userState.totalPrice;
            // Convert SOL to lamports
            const solToLamports = Web3.LAMPORTS_PER_SOL;
            const expectedLamports = BigInt(solAmount * solToLamports);
            // Initialize flag
            let isPaymentSuccessful = false;

            // Iterate through transaction instructions to find transfer to the wallet
            for (let [index, instruction] of transaction.transaction.message.instructions.entries()) {
                // Extract programId using programIdIndex
                const programIdIndex = instruction.programIdIndex;
                const programId = transaction.transaction.message.accountKeys[programIdIndex].toBase58();

                console.log(`🔄 Processing Instruction ${index + 1}:`);
                console.log(`Program ID: ${programId}`);
                console.log(`Number of Accounts: ${instruction.accounts.length}`);
                instruction.accounts.forEach((accountIndex, accIdx) => {
                    const accountPubkey = transaction.transaction.message.accountKeys[accountIndex].toBase58();
                    console.log(`Account ${accIdx + 1}: ${accountPubkey}`);
                });
                console.log(`Data (Base64): ${instruction.data}`);

                // Decode instruction data
                const decodedData = Buffer.from(instruction.data, 'base64'); // Solana uses base64 encoding

                // Initialize variables
                let amount = BigInt(0);
                let destination = "";

                if (programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") { // SPL Token Program ID
                    if (instruction.accounts.length >= 2) {
                        destination = transaction.transaction.message.accountKeys[instruction.accounts[1]].toBase58();
                    }
                    // For SPL tokens, the amount is part of the instruction data and needs to be decoded according to the SPL Token program
                    // This requires more complex parsing and possibly using @solana/spl-token
                    // For simplicity, we'll skip SPL token transfers in this verification
                    console.log(`⚠️ Skipping SPL Token transfer to ${destination}`);
                    continue;
                } else if (programId === "11111111111111111111111111111111") { // System Program ID
                    if (instruction.accounts.length < 2) {
                        console.log("⚠️ System Program instruction does not have enough accounts.");
                        continue;
                    }

                    // Decode amount from instruction data
                    // System Program Transfer Instruction Structure:
                    // [0-3]: Instruction ID (4 bytes, typically 2 for Transfer)
                    // [4-11]: Amount (8 bytes, Little-Endian)
                    if (decodedData.length >= 12) { // Ensure there's enough data
                        amount = decodedData.readBigUInt64LE(4);
                    } else {
                        console.log("⚠️ Instruction data is too short to decode amount.");
                        continue;
                    }

                    // Extract destination from the second account
                    destination = transaction.transaction.message.accountKeys[instruction.accounts[1]].toBase58();

                    console.log(`📄 Destination: ${destination}`);
                    console.log(`📄 Amount: ${amount.toString()} lamports`);

                    if (destination === recipientAddress) {
                        // Check amount
                        if (amount >= expectedLamports) {
                            isPaymentSuccessful = true;
                            console.log("✅ Payment is sufficient.");
                            break;
                        } else {
                            console.log(`❌ Payment amount is insufficient. Expected: ${expectedLamports}, Received: ${amount}`);
                        }
                    }
                } else {
                    // Unsupported program, skip
                    console.log(`⚠️ Skipping unsupported program: ${programId}`);
                    continue;
                }
            }

            if (isPaymentSuccessful) {
                bot.sendMessage(chatId, "✅ *Payment confirmed!* Your service will start shortly.", {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔙 Back to Main Menu", callback_data: "back" }]
                        ]
                    }
                }).then(sentMessage => {
                    userStates[chatId].messages.push(sentMessage.message_id);
                }).catch(error => {
                    console.error("🔴 ERROR: Error sending payment confirmation:", error);
                });
                deletePreviousMessages(chatId);
                userStates[chatId].stage = "completed";

                // Extract user information
                const userInfo = msg.from; // 'msg' is accessible here
                const username = userInfo.username ? userInfo.username : `${userInfo.first_name} ${userInfo.last_name || ''}`;

                // Notify admins privately
                notifyAdminsServicePurchase(
                    userInfo.id,
                    username,
                    userState.selectedService,
                    userState.duration,
                    userState.contractAddress
                );

                // TODO: Initiate the volume boost service
            } else {
                bot.sendMessage(chatId, "❌ *Payment verification failed.* Please ensure you've sent the correct amount to the specified wallet and try again.", { parse_mode: 'Markdown' }).then(sentMessage => {
                    userStates[chatId].messages.push(sentMessage.message_id);
                }).catch(error => {
                    console.error("🔴 ERROR: Error sending payment verification failed message:", error);
                });
            }
        } catch (error) {
            console.error("🔴 ERROR: Error verifying payment:", error);
            bot.sendMessage(chatId, "⚠️ *An error occurred while verifying your transaction. Please try again later.*", { parse_mode: 'Markdown' }).then(sentMessage => {
                userStates[chatId].messages.push(sentMessage.message_id);
            }).catch(err => {
                console.error("🔴 ERROR: Error sending error message during verification:", err);
            });
        }
    } else {
        // Handle unexpected messages based on current stage
        bot.sendMessage(chatId, "❗ *Please select a service first by typing* `/start`.", {
            parse_mode: 'Markdown'
        }).then(sentMessage => {
            userStates[chatId].messages.push(sentMessage.message_id);
        }).catch(error => {
            console.error("🔴 ERROR: Error sending prompt to select service:", error);
        });
    }
});
