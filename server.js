const express = require('express');
const puppeteer = require('puppeteer');
const useProxy = require('puppeteer-page-proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Global browser instance
let browser = null;

async function getBrowser() {
    if (browser) {
        return browser;
    }

    // Launch Puppeteer WITHOUT global proxy
    browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        headless: 'new'
    });

    // Handle browser disconnect/crash
    browser.on('disconnected', () => {
        console.log('Browser disconnected. Clearing instance.');
        browser = null;
    });

    return browser;
}

app.get('/scrape', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const startTime = Date.now();

    try {
        const browserInstance = await getBrowser();
        const page = await browserInstance.newPage();

        // Apply SOCKS5 proxy to this page
        await useProxy(page, 'socks5://WIISSEE:WISE1230@geo.iproyal.com:12321');

        // Set a reasonable timeout and wait condition
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        const content = await page.content();

        // Extract text content safely
        const text = await page.evaluate(() => {
            return document.body ? document.body.innerText : '';
        });

        // Only close the page, NOT the browser
        await page.close();

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        res.json({
            url: url,
            content_length: content.length,
            execution_time_ms: executionTime,
            text: text,
            html: content
        });

    } catch (error) {
        console.error('Scraping error:', error);
        // If there's a critical error, we might want to reset the browser
        if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
            if (browser) {
                await browser.close().catch(() => { });
                browser = null;
            }
        }

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
