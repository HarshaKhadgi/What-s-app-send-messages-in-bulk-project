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
// const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const config = {
    numbers: [
        "+911234567890"
    ],
    message: "",
    attachments: [
        ""
    ]
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        timeout: 0, // Disable timeout for browser launch
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--js-flags="--max-old-space-size=8192"' // Increase memory limit
        ]
    }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');
    if (client.pupPage) {
        client.pupPage.setDefaultTimeout(0);
    }
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
                const stats = fs.statSync(attachmentPath);
                const fileSizeInBytes = stats.size;
                const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

                console.log(`Processing attachment: ${path.basename(attachmentPath)}`);
                console.log(`- MIME Type: ${mimeType}`);
                console.log(`- Size: ${fileSizeInMegabytes.toFixed(2)} MB`);

                if (fileSizeInMegabytes > 100) {
                    console.warn('WARNING: File size is larger than 100MB. This might cause issues with Puppeteer evaluation.');
                }

                try {
                    const media = MessageMedia.fromFilePath(attachmentPath);
                    media.fileSizeInMegabytes = fileSizeInMegabytes;
                    mediaList.push(media);
                } catch (error) {
                    console.error(`Failed to load media from ${attachmentPath}:`, error);
                }
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
                // Determine options for the first attachment
                const firstMedia = mediaList[0];
                const options = { caption: messageText };

                // If file is large (>10MB), send as document to avoid compression/processing issues
                if (firstMedia.fileSizeInMegabytes && firstMedia.fileSizeInMegabytes > 10) {
                    console.log('Large file detected. Sending as document.');
                    options.sendMediaAsDocument = true;
                }

                await client.sendMessage(chatId, firstMedia, options);

                // Send remaining attachments
                for (let i = 1; i < mediaList.length; i++) {
                    const nextMedia = mediaList[i];
                    const nextOptions = {};
                    if (nextMedia.fileSizeInMegabytes && nextMedia.fileSizeInMegabytes > 10) {
                        nextOptions.sendMediaAsDocument = true;
                    }
                    await client.sendMessage(chatId, nextMedia, nextOptions);
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
