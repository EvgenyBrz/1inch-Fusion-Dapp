const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3000; // Use port from .env or default to 3000

app.use(cors()); // Enable CORS for all routes

// Proxy endpoint to 1inch API
app.use('/api', async (req, res) => {
    try {
        const url = `https://api.1inch.dev${req.originalUrl.replace('/api', '')}`;
        const response = await axios({
            method: req.method,
            url,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`
            },
            data: req.body
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
