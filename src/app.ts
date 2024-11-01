import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import { connectWallet, initializeWallet, fetch1inchBalance, fullWalletAddress } from './wallet';

// API configuration
const apiKey = import.meta.env.VITE_API_KEY;
const apiBaseUrl = "http://localhost:3000/api"; // Update if using a live server

// Initialize Web3
const web3 = new Web3(window.ethereum);

// Initialize the SDK (if required for additional 1inch functionality)
const sdk = new SDK({
    url: apiBaseUrl,
    authKey: apiKey,
    blockchainProvider: {
        signTypedData: async (walletAddress: string, typedData: any) => {
            return await web3.eth.signTypedData(walletAddress, typedData);
        },
        ethCall: async (contractAddress: string, callData: string) => {
            return await web3.eth.call({ to: contractAddress, data: callData });
        }
    }
});

// Define token addresses for each chain
const tokenAddresses = {
    "Polygon": {
        "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"  // USDT on Polygon
    },
    "BNB": {
        "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on Binance Smart Chain
        "USDT": "0x55d398326f99059ff775485246999027b3197955"  // USDT on Binance Smart Chain
    }
};

// Chain IDs
const chainIds = { "Polygon": 137, "BNB": 56 };

// Utility function to generate random bytes (for hash lock or other purposes)
function generateRandomBytes32(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initialize wallet connection on DOM load
window.addEventListener('DOMContentLoaded', initializeWallet);

// Minimum Swap Amount (adjust as needed)
const MIN_SWAP_AMOUNT = BigInt(10 ** 9); // Example minimum amount, adjust as needed

// Error handling function
function handleAPIError(data: any) {
    const description = data.description || "Unknown error";
    console.error("Error Data:", JSON.stringify(data, null, 2));

    if (description.includes("token not supported")) {
        alert("The selected token is not supported on the selected network. Please try a different token.");
    } else if (description.includes("swap amount too small")) {
        alert("The swap amount is too small. Please increase the amount to meet the minimum requirements.");
    } else if (description.includes("limit of requests per second")) {
        alert("You have exceeded the API request rate limit. Please wait a moment and try again.");
    } else {
        alert(`API Error: ${description}`);
    }
}

// Debounce function to prevent too many API calls
function debounce(func: Function, delay: number) {
    let timer: number;
    return function (...args: any[]) {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// Function to check if token is supported
function checkTokenSupport(srcTokenSymbol: string, fromNetwork: string): boolean {
    const supportedTokens = tokenAddresses[fromNetwork];
    return supportedTokens ? !!supportedTokens[srcTokenSymbol] : false;
}

// Function to get a cross-chain quote
const getCrossChainQuote = debounce(async function() {
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value;
    const srcTokenSymbol = (document.getElementById("from-token") as HTMLSelectElement).value;
    const dstTokenSymbol = (document.getElementById("to-token") as HTMLSelectElement).value;
    const amount = (document.getElementById("swap-amount") as HTMLInputElement).value;

    const srcTokenAddress = tokenAddresses[fromNetwork]?.[srcTokenSymbol];
    const dstTokenAddress = tokenAddresses[toNetwork]?.[dstTokenSymbol];

    if (!srcTokenAddress || !dstTokenAddress || !checkTokenSupport(srcTokenSymbol, fromNetwork)) {
        alert("Selected tokens are not supported on the selected networks.");
        return;
    }

    const amountInFloat = parseFloat(amount);
    if (isNaN(amountInFloat) || amountInFloat <= 0) {
        alert("Please enter a valid amount greater than zero.");
        return;
    }

    // Enforce minimum swap amount to avoid "swap amount too small" error
    const decimals = 6; // Adjust decimals based on the token, if necessary
    const amountInWei = BigInt(amountInFloat * Math.pow(10, decimals)).toString();
    if (BigInt(amountInWei) < MIN_SWAP_AMOUNT) {
        alert("The swap amount is too small. Please increase the amount to meet the minimum requirements.");
        return;
    }

    const srcChain = chainIds[fromNetwork];
    const dstChain = chainIds[toNetwork];

    if (!fullWalletAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    const apiUrl = `${apiBaseUrl}/quote?srcChain=${srcChain}&dstChain=${dstChain}&srcTokenAddress=${srcTokenAddress}&dstTokenAddress=${dstTokenAddress}&amount=${amountInWei}&walletAddress=${fullWalletAddress}&enableEstimate=true`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok) {
            const dstTokenAmountWei = data.dstTokenAmount || "0";
            const dstTokenAmount = (parseFloat(dstTokenAmountWei) / Math.pow(10, decimals)).toFixed(6);
            (document.getElementById("quote-result") as HTMLElement).textContent = `Amount to Receive: ${dstTokenAmount} ${(document.getElementById("to-token") as HTMLSelectElement).options[(document.getElementById("to-token") as HTMLSelectElement).selectedIndex].text}`;
        } else {
            handleAPIError(data);
        }
    } catch (error) {
        console.error("Failed to fetch quote:", error);
        alert("Error fetching quote. Please check the console for details.");
    }
}, 1000);


// Function to handle network changes and update token addresses
function updateNetworks() {
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value;

    if (fromNetwork === toNetwork) {
        (document.getElementById("toNetwork") as HTMLSelectElement).value = fromNetwork === "Polygon" ? "BNB" : "Polygon";
    }

    updateTokenOptions("from-token", fromNetwork);
    updateTokenOptions("to-token", toNetwork);
}

// Utility function to dynamically update the token options based on the selected chain
function updateTokenOptions(tokenElementId: string, chain: string) {
    const tokenDropdown = document.getElementById(tokenElementId) as HTMLSelectElement;
    tokenDropdown.innerHTML = "";

    for (const [symbol, address] of Object.entries(tokenAddresses[chain])) {
        const option = document.createElement("option");
        option.value = symbol;
        option.textContent = symbol;
        tokenDropdown.appendChild(option);
    }

    if (tokenDropdown.options.length > 0) {
        tokenDropdown.selectedIndex = 0;
    }
}

// Event listeners for user actions
document.getElementById("connect-wallet-btn")!.addEventListener("click", connectWallet);
document.getElementById("check-balance-btn")!.addEventListener("click", fetch1inchBalance);
document.getElementById("get-quote-btn")!.addEventListener("click", getCrossChainQuote);
document.getElementById("fromNetwork")!.addEventListener("change", updateNetworks);
document.getElementById("toNetwork")!.addEventListener("change", updateNetworks);
document.getElementById("from-token")!.addEventListener("change", getCrossChainQuote);
document.getElementById("to-token")!.addEventListener("change", getCrossChainQuote);
