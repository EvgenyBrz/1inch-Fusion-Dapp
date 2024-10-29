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

// HTTPS agent to bypass SSL verification
const agent = new https.Agent({
    rejectUnauthorized: false // Disable SSL certificate verification
});

// Health check route to verify the proxy and API key
app.get('/api/test-connection', async (req, res) => {
    try {
        const response = await axios.get('https://api.1inch.dev/fusion-plus', {
            headers: { 'Authorization': `Bearer ${process.env.VITE_API_KEY}` },
            httpsAgent: agent // Use the agent for SSL bypass
        });
        res.status(response.status).json({ success: true, data: response.data });
    } catch (error) {
        console.error("API Test Error:", error.message);
        res.status(error.response?.status || 500).json({ success: false, error: error.message });
    }
});

// Proxy endpoint to handle API requests and forward them to the 1inch API
app.use('/api', async (req, res) => {
    try {
        // Format URL to match 1inch API endpoint
        const url = `https://api.1inch.dev/fusion-plus${req.originalUrl.replace('/api', '')}`;
        console.log("Forwarding request to:", url);
        console.log("Authorization header being sent:", `Bearer ${process.env.VITE_API_KEY}`);

        const response = await axios({
            method: req.method,
            url,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`
            },
            data: req.body,
            httpsAgent: agent // Use the agent for SSL bypass
        });

        // Respond with the data from 1inch API
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error in proxy:", error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
