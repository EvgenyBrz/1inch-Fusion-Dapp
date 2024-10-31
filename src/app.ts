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
// Function to get cross-chain quote
async function getCrossChainQuote() {
    // Hardcoded values for testing
    const srcChain = 56; // BNB Chain ID
    const dstChain = 137; // Polygon Chain ID
    const srcTokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // Example USDC on BNB
    const dstTokenAddress = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Example USDT on Polygon
    const amount = 1000000000000000000; // Hardcoded 1 USDC in Wei as a string

    // Ensure wallet address is connected
    if (!fullWalletAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    console.log("Sending quote request with parameters:", {
        srcChain,
        dstChain,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        walletAddress: fullWalletAddress
    });

    try {
        // Fetch with hardcoded values
        const response = await fetch(
            `${apiBaseUrl}/quote?srcChain=${srcChain}&dstChain=${dstChain}&srcTokenAddress=${srcTokenAddress}&dstTokenAddress=${dstTokenAddress}&amount=${amount}&walletAddress=${fullWalletAddress}&enableEstimate=true`
        );

        const data = await response.json();

        if (response.ok) {
            (document.getElementById("quote-result") as HTMLElement).textContent = `Quote: ${JSON.stringify(data)}`;
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