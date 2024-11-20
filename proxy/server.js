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
            "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
            "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"  // USDT on Polygon
        ]
    };

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

    // Logging the parameters to verify correctness
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

app.get('/api/check-allowance', async (req, res) => {
    const { walletAddress, tokenAddress, spender, chainId } = req.query;

    const networkRpcUrls = {
        '56': 'https://bsc-dataseed.binance.org/', // BSC RPC
        '137': 'https://polygon-rpc.com/' // Polygon RPC
    };

    const rpcUrl = networkRpcUrls[chainId];
    if (!rpcUrl) {
        return res.status(400).json({ error: "Unsupported chain ID" });
    }

    try {
        const Web3 = require('web3');
        const web3 = new Web3(rpcUrl);

        // ABI for ERC20 allowance
        const erc20Abi = [
            { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" }
        ];

        const contract = new web3.eth.Contract(erc20Abi, tokenAddress);
        const allowance = await contract.methods.allowance(walletAddress, spender).call();

        res.status(200).json({ allowance });
    } catch (error) {
        console.error("Error checking allowance:", error.message);
        res.status(500).json({ error: "Failed to check allowance", details: error.message });
    }
});

app.post('/api/approve', async (req, res) => {
    const { walletAddress, privateKey, tokenAddress, spender, amount, chainId } = req.body;

    const networkRpcUrls = {
        '56': 'https://bsc-dataseed.binance.org/', // BSC RPC
        '137': 'https://polygon-rpc.com/' // Polygon RPC
    };

    const rpcUrl = networkRpcUrls[chainId];
    if (!rpcUrl) {
        return res.status(400).json({ error: "Unsupported chain ID" });
    }

    try {
        const Web3 = require('web3');
        const web3 = new Web3(rpcUrl);

        // ABI for ERC20 approve
        const erc20Abi = [
            { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" }
        ];

        const contract = new web3.eth.Contract(erc20Abi, tokenAddress);
        const tx = contract.methods.approve(spender, amount);
        const gas = await tx.estimateGas({ from: walletAddress });
        const data = tx.encodeABI();

        const txObj = {
            from: walletAddress,
            to: tokenAddress,
            data,
            gas
        };

        const signedTx = await web3.eth.accounts.signTransaction(txObj, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.status(200).json({ receipt });
    } catch (error) {
        console.error("Error approving contract:", error.message);
        res.status(500).json({ error: "Failed to approve contract", details: error.message });
    }
});

app.post('/api/swap', async (req, res) => {
    const { srcChain, dstChain, srcTokenAddress, dstTokenAddress, amount, walletAddress, privateKey, hashLock, secretHashes } = req.body;

    const targetUrl = 'https://api.1inch.dev/fusion-plus/order/v1.0/create';

    try {
        const order = {
            srcChain,
            dstChain,
            srcTokenAddress,
            dstTokenAddress,
            amount,
            walletAddress,
            hashLock,
            secretHashes
        };

        const response = await axios.post(targetUrl, order, {
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
            },
            httpsAgent
        });

        // Submit the order
        const submitUrl = 'https://api.1inch.dev/fusion-plus/order/v1.0/submit';
        const { data: submitResponse } = await axios.post(submitUrl, { hashLock }, {
            headers: {
                'Authorization': `Bearer ${process.env.VITE_API_KEY || ''}`
            },
            httpsAgent
        });

        res.status(200).json({ createResponse: response.data, submitResponse });
    } catch (error) {
        console.error("Error executing swap:", error.response ? error.response.data : error.message);
        res.status(500).json({
            error: "Failed to execute swap",
            details: error.response ? error.response.data : error.message
        });
    }
});

//second quoter for sdk.getQuote
app.get("/api/quoter/*", async (req, res) => {
    try {
        const url = `${API_BASE_URL}${req.originalUrl.replace("/api", "")}`;
        const response = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${process.env.VITE_API_KEY}`,
            },
        });
        res.json(response.data);
    } catch (error) {
        console.error("Error proxying request:", error);
        res.status(error.response?.status || 500).send(error.response?.data || "Unknown error");
    }
});



// Listen on the specified port
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});