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

// Endpoint for balance requests on Binance Smart Chain
app.use('/api/balance', async (req, res) => {
    const { walletAddress, chainId } = req.query;

    // Set the correct target URL and use BSC chain ID by default (56 for BSC)
    const networkChainId = chainId || '56';
    const targetUrl = `https://api.1inch.dev/balance/v1.2/${networkChainId}/balances/${walletAddress}`;

    // Specify BNB token address for Binance Smart Chain (0xEeee... for BNB)
    const body = { tokens: ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"] };

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
    const enableEstimate = req.query.enableEstimate === 'true'; // Convert to boolean

    // Constructing the API endpoint with parameters
    const targetUrl = 'https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive';
    const params = {
        srcChain,
        dstChain,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        walletAddress,
        enableEstimate
    };

    // Log the parameters to verify correctness
    console.log("Requesting quote with params:", params);

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
            },
            params,
            httpsAgent
        });

        if (response.headers['content-type']?.includes('application/json')) {
            res.status(response.status).json(response.data);
        } else {
            console.error("Unexpected response format from 1inch API:", response.data);
            res.status(500).json({ error: "Unexpected response format from 1inch API", details: response.data });
        }
    } catch (error) {
        console.error("Error fetching quote from 1inch API:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({
            error: "Failed to fetch quote from 1inch API",
            details: error.response ? error.response.data : error.message
        });
    }
});



// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
