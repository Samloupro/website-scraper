const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
        // Launch Puppeteer
        // 'no-sandbox' is required for Docker environments
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage' // Helps with memory issues in Docker
            ]
        });

        const page = await browser.newPage();

        // Set a reasonable timeout and wait condition
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const content = await page.content();

        await browser.close();

        res.json({
            url: url,
            content_length: content.length,
            html: content
        });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            error: 'Failed to scrape URL',
            details: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
