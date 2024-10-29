const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3000; // Use port from .env or default to 3000

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Proxy endpoint to 1inch API
app.use('/api', async (req, res) => {
    try {
        const url = `https://api.1inch.dev${req.originalUrl.replace('/api', '')}`;
        
        // Debugging logs
        console.log("Forwarding request to:", url);
        console.log("Headers being sent:", {
            'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
            ...req.headers,
        });

        const response = await axios({
            method: req.method,
            url,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
                ...req.headers, // Forward other headers
            },
            params: req.query,
            data: req.body,
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Error in proxy:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
