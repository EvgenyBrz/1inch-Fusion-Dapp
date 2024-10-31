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

// Endpoint for balance requests
app.use('/api/balance', async (req, res) => {
    const { walletAddress, chainId } = req.query;

    // Set the correct target URL and tokens based on chainId and required tokens
    const targetUrl = `https://api.1inch.dev/balance/v1.2/${chainId}/balances/${walletAddress}`;

    // Specify token addresses for Ethereum, if required
    const body = { tokens: ["0xdac17f958d2ee523a2206206994597c13d831ec7"] };

    try {
        const response = await axios.post(targetUrl, body, {
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`,
            },
            httpsAgent
        });

        if (response.headers['content-type']?.includes('application/json')) {
            res.status(response.status).json(response.data);
        } else {
            console.error("Unexpected response format from 1inch API:", response.data);
            res.status(500).json({ error: "Unexpected response format from 1inch API", details: response.data });
        }
    } catch (error) {
        console.error("Error fetching balance from 1inch API:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ 
            error: "Failed to fetch balance from 1inch API", 
            details: error.response ? error.response.data : error.message 
        });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
