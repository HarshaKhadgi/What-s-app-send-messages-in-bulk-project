const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const mime = require('mime-types');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('Error: config.json not found.');
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');
    await sendMessages();
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.initialize();

async function sendMessages() {
    const numbers = config.numbers;
    const messageText = config.message;
    const attachmentPaths = config.attachments || []; // Expecting an array

    const mediaList = [];
    if (Array.isArray(attachmentPaths)) {
        for (const attachmentPath of attachmentPaths) {
            if (attachmentPath && fs.existsSync(attachmentPath)) {
                const mimeType = mime.lookup(attachmentPath);
                const data = fs.readFileSync(attachmentPath).toString('base64');
                const filename = path.basename(attachmentPath);
                mediaList.push(new MessageMedia(mimeType, data, filename));
            } else if (attachmentPath) {
                console.warn(`Warning: Attachment file not found at ${attachmentPath}`);
            }
        }
    } else if (typeof config.attachment === 'string' && config.attachment) {
        // Fallback for backward compatibility if user still uses "attachment"
        const attachmentPath = config.attachment;
        if (fs.existsSync(attachmentPath)) {
            const mimeType = mime.lookup(attachmentPath);
            const data = fs.readFileSync(attachmentPath).toString('base64');
            const filename = path.basename(attachmentPath);
            mediaList.push(new MessageMedia(mimeType, data, filename));
        }
    }

    for (const number of numbers) {
        const sanitizedNumber = number.replace(/\D/g, '');
        const chatId = `${sanitizedNumber}@c.us`;

        try {
            console.log(`Sending to ${chatId}...`);

            if (mediaList.length > 0) {
                // Send first attachment with caption
                await client.sendMessage(chatId, mediaList[0], { caption: messageText });

                // Send remaining attachments
                for (let i = 1; i < mediaList.length; i++) {
                    await client.sendMessage(chatId, mediaList[i]);
                }
            } else {
                await client.sendMessage(chatId, messageText);
            }

            console.log(`Message(s) sent to ${chatId}`);

            const delay = Math.floor(Math.random() * 3000) + 2000;
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (err) {
            console.error(`Failed to send to ${chatId}:`, err);
        }
    }

    console.log('All messages processed. Exiting...');
    setTimeout(() => {
        client.destroy();
        process.exit(0);
    }, 5000);
}
