import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import { connectWallet, initializeWallet, fetch1inchBalance, fullWalletAddress } from './wallet';

// API configuration
const apiKey = import.meta.env.VITE_API_KEY;
const apiBaseUrl = "http://localhost:3000/api";

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

// Utility function to generate random bytes (can be used for hash lock or other purposes)
function generateRandomBytes32(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initialize wallet connection on DOM load
window.addEventListener('DOMContentLoaded', initializeWallet);

// Function to get a cross-chain quote
//function toWei(amount: string): string {
 //   return Web3.utils.toWei(amount, 'ether');
//}

// Function to get cross-chain quote
async function getCrossChainQuote() {
    // Define mappings for chain IDs and token addresses
    const chainIds = { "Polygon": 137, "BNB": 56 };
    const tokenAddresses = {
        "Polygon": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Example USDT on Polygon
        "BNB": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"   // Example USDC on BNB Chain
    };

    // Retrieve user-selected values
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value;
    const srcTokenAddress = (document.getElementById("from-token") as HTMLSelectElement).value;
    const amount = (document.getElementById("swap-amount") as HTMLInputElement).value;

    // Validate the amount input
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount greater than zero.");
        return;
    }

    // Convert human-readable amount to Wei (assuming 18 decimals)
    const amountInWei = BigInt(parseFloat(amount) * 10 ** 18).toString();

    // Set srcChain and dstChain based on the network selections
    const srcChain = chainIds[fromNetwork];
    const dstChain = chainIds[toNetwork];

    // Dynamically set dstTokenAddress based on toNetwork selection
    const dstTokenAddress = tokenAddresses[toNetwork];

    // Ensure wallet address is connected
    if (!fullWalletAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    // Construct the API request URL
    const apiUrl = `${apiBaseUrl}/quote?srcChain=${srcChain}&dstChain=${dstChain}&srcTokenAddress=${srcTokenAddress}&dstTokenAddress=${dstTokenAddress}&amount=${amountInWei}&walletAddress=${fullWalletAddress}&enableEstimate=true`;

    console.log("Sending quote request with URL:", apiUrl);

    try {
        // Fetch with dynamic values
        const response = await fetch(apiUrl);

        const data = await response.json();

        if (response.ok) {
            // Extract the amount to be paid in the destination token
            // Assuming 'dstTokenAmount' is the field in the response that holds this information
            const dstTokenAmountWei = data.dstTokenAmount || "0"; // Use appropriate field name
            const dstTokenAmount = parseFloat(Web3.utils.fromWei(dstTokenAmountWei, 'ether')).toFixed(6);

            // Display the formatted amount
            (document.getElementById("quote-result") as HTMLElement).textContent = `Amount to Pay in Destination Token: ${dstTokenAmount} Tokens`;
        } else {
            console.error("Error fetching quote:", data.error);
            (document.getElementById("quote-result") as HTMLElement).textContent = `Error: ${data.error}`;
        }
    } catch (error) {
        console.error("Failed to fetch quote:", error);
        (document.getElementById("quote-result") as HTMLElement).textContent = "Error fetching quote. Please check the console for details.";
    }
}


// Placeholder function for placing an order
function placeOrder() {
    alert("Order placement functionality is not implemented yet.");
}

// Log API base URL for debugging purposes
console.log("API Base URL:", apiBaseUrl);

// Event listeners for user actions
document.getElementById("connect-wallet-btn")!.addEventListener("click", connectWallet);
document.getElementById("check-balance-btn")!.addEventListener("click", fetch1inchBalance);
document.getElementById("get-quote-btn")!.addEventListener("click", getCrossChainQuote);
document.getElementById("place-order-btn")!.addEventListener("click", placeOrder);