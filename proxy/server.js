// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3000;

app.use(cors());
app.use(express.json());

const https = require('https');

app.use('/api', async (req, res) => {
    try {
        const targetUrl = `https://api.1inch.dev${req.originalUrl.replace('/api', '')}`;
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
            },
            data: req.body,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false, // Disable SSL certificate verification
            }),
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
