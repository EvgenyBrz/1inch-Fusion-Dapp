import { SDK, NetworkEnum, QuoteParams, OrderParams, TakingFeeInfo, ActiveOrdersResponse, HashLock } from "@1inch/cross-chain-sdk";
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { connectWallet, initializeWallet, fetch1inchBalance, fullWalletAddress } from './wallet';
import { keccak256, hexlify, concat, randomBytes } from "ethers";


const apiKey = import.meta.env.VITE_API_KEY;
const apiBaseUrl = "http://localhost:3000/api";


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

// Minimum Swap Amount
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

    // Conversion factor based on fromNetwork
    const srcDecimals = fromNetwork === "Polygon" ? 6 : 18;
    const dstDecimals = toNetwork === "Polygon" ? 6 : 18;

    // Convert the input amount to the correct wei format
    const amountInWei = new BigNumber(amountInFloat).multipliedBy(new BigNumber(10).pow(srcDecimals));

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
            const dstTokenAmountWei = new BigNumber(data.dstTokenAmount || "0");

            // Adjust display conversion based on toNetwork
            const dstTokenAmount = dstTokenAmountWei.dividedBy(new BigNumber(10).pow(dstDecimals)).toFixed(2);

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


async function handleSwapButtonClick() {
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

    if (!fullWalletAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    // Conversion factor based on fromNetwork
    const srcDecimals = fromNetwork === "Polygon" ? 6 : 18;
    const amountInWei = new BigNumber(amountInFloat).multipliedBy(new BigNumber(10).pow(srcDecimals));

    try {
        console.log("Calling SDK getQuote with:", {
            srcChainId: chainIds[fromNetwork],
            dstChainId: chainIds[toNetwork],
            srcTokenAddress,
            dstTokenAddress,
            amount: amountInWei.toFixed(),
            walletAddress: fullWalletAddress,
            enableEstimate: true,
        });

        const quoteParams: QuoteParams = {
            srcChainId: chainIds[fromNetwork],
            dstChainId: chainIds[toNetwork],
            srcTokenAddress,
            dstTokenAddress,
            amount: amountInWei.toFixed(),
            walletAddress: fullWalletAddress,
            enableEstimate: true,
        };

        const quoteResponse = await sdk.getQuote(quoteParams);

        console.log("SDK Quote Response:", quoteResponse);

        // Prepare secrets and hash locks
        const secretsCount = quoteResponse.getPreset().secretsCount || 1;
        const secrets = Array.from({ length: secretsCount }).map(() => 
            utils.hexlify(randomBytes(32)) // Converts Uint8Array to a hexadecimal string
        );
        const secretHashes = secrets.map(secret => HashLock.hashSecret(secret));

        const hashLock = secretsCount === 1
            ? HashLock.forSingleFill(secrets[0])
            : HashLock.forMultipleFills(
                secretHashes.map((secretHash, i) =>
                    solidityKeccak256(["uint64", "bytes32"], [i, secretHash.toString()])
                )
            );

        console.log("Secrets and Hash Locks prepared:", { secrets, hashLock });

        // Place the order
        const orderResponse = await sdk.placeOrder(quoteResponse, {
            walletAddress: fullWalletAddress,
            hashLock,
            secretHashes,
        });

        console.log("Order placed successfully:", orderResponse);

        // Poll for status updates
        const orderHash = orderResponse.orderHash;
        const intervalId = setInterval(async () => {
            try {
                console.log("Polling for order status...");
                const orderStatus = await sdk.getOrderStatus(orderHash);

                if (orderStatus.status === "executed") {
                    console.log("Order executed successfully.");
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error("Error polling order status:", error);
            }
        }, 5000);

    } catch (error) {
        console.error("Error during swap process:", error);
        alert("An error occurred during the swap process. Check console for details.");
    }
}


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
document.getElementById("place-order-btn")!.addEventListener("click", handleSwapButtonClick);