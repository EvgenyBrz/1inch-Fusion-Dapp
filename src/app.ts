import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import { connectWallet, showBalance, initializeWallet } from './wallet';
import {env} from "process";

const apiKey = import.meta.env.VITE_API_KEY;
const apiBaseUrl = "http://localhost:3000/api";

async function testProxyConnection() {
    try {
        const response = await fetch(`${apiBaseUrl}/test-connection`);
        const data = await response.json();
        console.log("Proxy Connection Test:", data);
        if (data.success) {
            console.log("Proxy and API connection successful!");
        } else {
            console.error("Proxy connection failed:", data.error);
        }
    } catch (error) {
        console.error("Test Proxy Connection Error:", error);
    }
}

// Run this once to test proxy connectivity
testProxyConnection();


// Initialize Web3 and SDK (replace VITE_API_KEY manually if needed)
const web3 = new Web3(window.ethereum);

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

// Utility function to generate random bytes as hash lock and secret hashes
function generateRandomBytes32(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

window.addEventListener('load', initializeWallet);

// Attach event listener to connect wallet and enable button if connected
document.getElementById("connect-wallet-btn")?.addEventListener("click", async () => {
    await connectWallet();
});

// Attach event listener to the Check Balance button
document.getElementById("fetch-orders-btn")?.addEventListener("click", async () => {
    await showBalance();
});


// Fetch active orders and display them
async function fetchActiveOrders(page: number = 1, limit: number = 5) {
    try {
        const response = await sdk.getActiveOrders({ page, limit });
        console.log("Active Orders Response:", response); // Debug the response structure
        if (response && Array.isArray((response as any).orders)) {
            displayOrders((response as any).orders, "active-orders");
        } else {
            console.warn("Unexpected response structure:", response);
        }
    } catch (error) {
        console.error("Error fetching active orders:", error);
    }
}


// Display orders in HTML
function displayOrders(orders: any[], elementId: string) {
    const container = document.getElementById(elementId);
    if (container) {
        container.innerHTML = "";
        orders.forEach(order => {
            const orderElement = document.createElement("div");
            orderElement.classList.add("order");
            orderElement.innerHTML = `Order ID: ${order.id ?? 'N/A'} - Maker: ${order.makerAddress ?? 'Unknown'}`;
            container.appendChild(orderElement);
        });
    }
}

// Get a cross-chain quote
async function getCrossChainQuote() {
    const amount = (document.getElementById("swap-amount") as HTMLInputElement).value;
    const fromToken = (document.getElementById("from-token") as HTMLSelectElement).value;
    const toToken = (document.getElementById("to-token") as HTMLSelectElement).value;
    const fromNetwork = (document.getElementById("fromNetwork") as HTMLSelectElement).value;
    const toNetwork = (document.getElementById("toNetwork") as HTMLSelectElement).value;

    const chainIds = {
        Polygon: NetworkEnum.POLYGON,
        BNB: NetworkEnum.BINANCE
    };

    const tokenAddresses = {
        Polygon: { USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
        BNB: { USDC: "0x8965349fb649A33a30cbFDa057D8eC2C48AbE2A2", USDT: "0x524bC91Dc82d6b90EF29F76A3ECAaBAffFD490Bc" }
    };

    const params: QuoteParams = {
        srcChainId: chainIds[fromNetwork],
        dstChainId: chainIds[toNetwork],
        srcTokenAddress: tokenAddresses[fromNetwork][fromToken],
        dstTokenAddress: tokenAddresses[toNetwork][toToken],
        amount: web3.utils.toWei(amount, "ether")
    };

    try {
        const quote = await sdk.getQuote(params);
        document.getElementById("quote-result")!.textContent = JSON.stringify(quote);
    } catch (error) {
        console.error("Error fetching quote:", error);
    }
}


// Place an order based on a quote
async function placeOrder() {
    const userAddress = await connectWallet();
    if (!userAddress) return;

    const secretHashes = Array.from({ length: 1 }, generateRandomBytes32); // Adjust length if needed

    const params: OrderParams = {
        walletAddress: userAddress,
        fee: { takingFeeBps: 100, takingFeeReceiver: "FEE_RECEIVER_ADDRESS" },
        hashLock: HashLock.forSingleFill(generateRandomBytes32()),
        secretHashes
    };

    try {
        const quote = await sdk.getQuote(<QuoteParams>{
            srcChainId: NetworkEnum.POLYGON,
            dstChainId: NetworkEnum.BINANCE,
            srcTokenAddress: "TOKEN_ADDRESS_ETH",
            dstTokenAddress: "TOKEN_ADDRESS_POLYGON",
            amount: "1000000000000000000"
        });
        const order = await sdk.placeOrder(quote, params);
        console.log("Order response:", order); // Log response to inspect structure
        document.getElementById("order-result")!.textContent = `Order placed successfully`;
    } catch (error) {
        console.error("Error placing order:", error);
    }
}

//console.log("Loaded API Key:", apiKey);
console.log("API Base URL:", apiBaseUrl);

fetch(`${apiBaseUrl}/quote?fromTokenAddress=0x...&toTokenAddress=0x...&amount=1000000000000000000`)
  .then(response => response.json())
  .then(data => console.log("Proxy Test Response:", data))
  .catch(error => console.error("Proxy Test Error:", error));


// Event listeners for buttons
document.getElementById("connect-wallet-btn")!.addEventListener("click", connectWallet);
document.getElementById("fetch-orders-btn")!.addEventListener("click", () => fetchActiveOrders(1, 5));
document.getElementById("get-quote-btn")!.addEventListener("click", getCrossChainQuote);
document.getElementById("place-order-btn")!.addEventListener("click", placeOrder);
