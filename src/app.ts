import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
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
        "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    },
    "BNB": {
        "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    }
} as const;

// Chain IDs
const chainIds = { "Polygon": 137, "BNB": 56 } as const;

// Minimum Swap Amount (adjust as needed)
const MIN_SWAP_AMOUNT = new BigNumber(10 ** 6); // 1 USDT or 1 USDC equivalent in smallest unit

// Debounce function to limit API requests
function debounce(func: Function, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return function (...args: any[]) {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// Check if token is supported
function checkTokenSupport(srcTokenSymbol: keyof typeof tokenAddresses["Polygon"], fromNetwork: keyof typeof tokenAddresses): boolean {
    const supportedTokens = tokenAddresses[fromNetwork];
    return supportedTokens ? !!supportedTokens[srcTokenSymbol] : false;
}

// Main function to fetch cross-chain quotes
const getCrossChainQuote = debounce(async function() {
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value as keyof typeof tokenAddresses;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value as keyof typeof tokenAddresses;
    const srcTokenSymbol = (document.getElementById("from-token") as HTMLSelectElement).value as keyof typeof tokenAddresses["Polygon"];
    const dstTokenSymbol = (document.getElementById("to-token") as HTMLSelectElement).value as keyof typeof tokenAddresses["Polygon"];
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

    const decimals = 6; // For USDT and USDC
    const amountInWei = new BigNumber(amountInFloat).multipliedBy(new BigNumber(10).pow(decimals));

    console.log("API call parameters:", {
        srcChain: chainIds[fromNetwork],
        dstChain: chainIds[toNetwork],
        srcTokenAddress,
        dstTokenAddress,
        amount: amountInWei.toFixed(),
        walletAddress: fullWalletAddress,
        enableEstimate: true
    });

    if (!fullWalletAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    const apiUrl = `${apiBaseUrl}/quote?srcChain=${chainIds[fromNetwork]}&dstChain=${chainIds[toNetwork]}&srcTokenAddress=${srcTokenAddress}&dstTokenAddress=${dstTokenAddress}&amount=${amountInWei.toFixed()}&walletAddress=${fullWalletAddress}&enableEstimate=true`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok) {
            // Assuming dstTokenAmount is given in Wei (1e-18), we divide by 1e12 to convert to 6 decimals.
            const dstTokenAmountWei = new BigNumber(data.dstTokenAmount || "0");
            const dstTokenAmount = dstTokenAmountWei.dividedBy(new BigNumber(10).pow(18)).toFixed(2);
        
            // Format to display with commas and two decimal places
            const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(dstTokenAmount));
        
            console.log("Formatted dstTokenAmount:", formattedAmount);
            document.getElementById("quote-result")!.textContent = `Amount to Receive: ${formattedAmount} ${dstTokenSymbol}`;
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
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value as keyof typeof tokenAddresses;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value as keyof typeof tokenAddresses;

    if (fromNetwork === toNetwork) {
        (document.getElementById("toNetwork") as HTMLSelectElement).value = fromNetwork === "Polygon" ? "BNB" : "Polygon";
    }

    updateTokenOptions("from-token", fromNetwork);
    updateTokenOptions("to-token", toNetwork);
}

// Utility function to dynamically update the token options based on the selected chain
function updateTokenOptions(tokenElementId: string, chain: keyof typeof tokenAddresses) {
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

// Function to handle and display API errors
function handleAPIError(data: any) {
    const description = data.description || "An unknown error occurred.";
    console.error("Error Data:", JSON.stringify(data, null, 2));

    if (description.includes("token not supported")) {
        alert("The selected token is not supported on the selected network. Please check and try again.");
    } else if (description.includes("amount cannot be empty")) {
        alert("Amount cannot be empty. Please enter a valid amount and try again.");
    } else if (description.includes("limit of requests per second")) {
        alert("You have exceeded the API request rate limit. Please wait a moment and try again.");
    } else {
        alert(`API Error: ${description}`);
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
