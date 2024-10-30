import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import {connectWallet, showBalance, initializeWallet, fetch1inchBalance} from './wallet';
import {env} from "process";

const apiKey = import.meta.env.VITE_API_KEY;
const apiBaseUrl = "http://localhost:3000/api";

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

function getCrossChainQuote() {}
function placeOrder(){}


//console.log("Loaded API Key:", apiKey);
console.log("API Base URL:", apiBaseUrl);

// Event listeners for buttons
document.getElementById("connect-wallet-btn")!.addEventListener("click", connectWallet);
document.getElementById("check-balance-btn")!.addEventListener("click", fetch1inchBalance);
document.getElementById("get-quote-btn")!.addEventListener("click", getCrossChainQuote);
document.getElementById("place-order-btn")!.addEventListener("click", placeOrder);
