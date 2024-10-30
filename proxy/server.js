const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5173',
}));
app.use(express.json());

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Endpoint for quote requests
app.use('/api/quote', async (req, res) => {
    try {
        const targetUrl = `https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive`;
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
            },
            params: req.query,
            data: req.body,
            httpsAgent
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error fetching quote:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

// New endpoint for balance fetching
app.use('/api/balance', async (req, res) => {
    try {
        const { walletAddress, chainId } = req.query;
        if (!walletAddress || !chainId) {
            return res.status(400).json({ error: "walletAddress and chainId are required" });
        }

        const targetUrl = `https://api.1inch.io/v1.2/${chainId}/balances/${walletAddress}`;
        const response = await axios.get(targetUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
            },
            httpsAgent
        });

        // Check if response is JSON
        if (response.headers['content-type']?.includes('application/json')) {
            res.status(response.status).json(response.data);
        } else {
            res.status(500).json({ error: "Unexpected response format from 1inch API" });
        }
    } catch (error) {
        console.error("Error fetching balance from 1inch API:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});


// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
