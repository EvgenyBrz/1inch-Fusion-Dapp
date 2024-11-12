const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5173',  // Update to match your client URL
}));
app.use(express.json());

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

app.use('/api/balance', async (req, res) => {
    const { walletAddress, chainId } = req.query;

    // Set the correct target URL and handle dynamic chainId
    const networkChainId = chainId || '56'; // Default to BSC (56)
    const targetUrl = `https://api.1inch.dev/balance/v1.2/${networkChainId}/balances/${walletAddress}`;

    // Token addresses for BSC and Polygon
    const tokenAddresses = {
        '56': [
            "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
            "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"  // USDC on BSC
        ],
        '137': [
            "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eD69", // USDC on Polygon
            "0x2f7f40baf21c6fcde60f89d430150285a02e5b22"  // USDT on Polygon
        ]
    };

    // Use the appropriate tokens based on the network
    const tokens = tokenAddresses[networkChainId] || [];
    const body = { tokens };

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

app.get('/api/quote', async (req, res) => {
    // Log the entire query object to see what was received
    console.log("Received query params:", req.query);

    // Destructure and convert query parameters as needed
    const srcChain = Number(req.query.srcChain);
    const dstChain = Number(req.query.dstChain);
    const srcTokenAddress = req.query.srcTokenAddress;
    const dstTokenAddress = req.query.dstTokenAddress;
    const amount = req.query.amount;
    const walletAddress = req.query.walletAddress;
    const enableEstimate = req.query.enableEstimate || 'True'; // Default to 'True'

    // Logging to debug if the values are parsed correctly
    console.log(`srcChain: ${srcChain}, dstChain: ${dstChain}, amount: ${amount}`);

    // Proceed with API call to get swap quote from 1inch API based on the provided parameters...
    // Follow the previous steps to retrieve and respond with the quote
});

// Listen on the specified port
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
