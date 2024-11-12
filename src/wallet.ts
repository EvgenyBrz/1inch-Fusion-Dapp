import Web3 from 'web3';

declare let window: any;

let web3: typeof Web3;
let fullWalletAddress: string | null = null; // Stores the full wallet address for API requests
let isConnecting = false;

if (window.ethereum) {
    web3 = new Web3(window.ethereum);
} else {
    alert("MetaMask not detected. Please install MetaMask to use this feature.");
    throw new Error("MetaMask not detected");
}

// Connect wallet and enable Check Balance button if connected
export async function connectWallet(): Promise<string | null> {
    const walletAddressElement = document.getElementById("wallet-address");
    const checkBalanceButton = document.getElementById("check-balance-btn") as HTMLButtonElement;

    if (isConnecting || (await window.ethereum.request({ method: 'eth_accounts' }))[0]) {
        fullWalletAddress = (await window.ethereum.request({ method: 'eth_accounts' }))[0] || localStorage.getItem('walletAddress');
        if (fullWalletAddress) {
            walletAddressElement!.textContent = `Connected: ${parseUserAddress(fullWalletAddress)}`;
            checkBalanceButton.disabled = false;
            return fullWalletAddress;
        }
    }

    if (window.ethereum) {
        isConnecting = true;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
            fullWalletAddress = accounts[0];

            localStorage.setItem('walletAddress', fullWalletAddress);
            checkBalanceButton.disabled = false;
            walletAddressElement!.textContent = `Connected: ${parseUserAddress(fullWalletAddress)}`;
            return fullWalletAddress;
        } catch (error: any) {
            if (error.code === -32002) {
                console.warn("MetaMask is already processing a connection request.");
                alert("MetaMask is already connecting. Please open MetaMask to complete the request or try again shortly.");
            } else {
                console.error("Wallet connection error:", error);
            }
        } finally {
            isConnecting = false;
        }
    } else {
        alert("Please install MetaMask to use this feature.");
    }
    return null;
}

// Function to parse the address for display (truncated)
function parseUserAddress(userAddress: string): string {
    return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
}

// Fetch and display wallet balance using the 1inch API
export async function fetch1inchBalance(): Promise<void> {
    const apiUrl = `http://localhost:3000/api/balance`; // Use your proxy server's endpoint

    if (!fullWalletAddress) {
        fullWalletAddress = await connectWallet();
        if (!fullWalletAddress) {
            alert("Wallet not connected");
            return;
        }
    }

    // Get the connected chainId from MetaMask
    let chainId = await web3.eth.getChainId();
    chainId = Number(chainId);  // Ensure chainId is a number

    console.log("Chain ID:", chainId); // Debugging log

    // Ensure only BSC (56) and Polygon (137) are supported
    if (![56, 137].includes(chainId)) {
        alert("Unsupported network. Please connect to BSC or Polygon.");
        return;
    }

    // Log the wallet address and chainId before making the request
    console.log("Sending request to server with walletAddress:", fullWalletAddress, "chainId:", chainId);

    try {
        const response = await fetch(`${apiUrl}?walletAddress=${fullWalletAddress}&chainId=${chainId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch balance: ${response.statusText}`);
        }

        const balances = await response.json();
        console.log("Balances received from server:", balances); // Log the full response to inspect

        // Prepare and format the balances for display
        let formattedBalances = "";

        // Check if USDC balance exists and is greater than 0
        if (balances['0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'] && parseFloat(web3.utils.fromWei(balances['0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'], 'ether')) > 0) {
            const formattedUSDC = parseFloat(web3.utils.fromWei(balances['0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'], 'ether')).toFixed(2);
            formattedBalances += `USDC: ${formattedUSDC}\n`;
        }

        // Check if USDT balance exists and is greater than 0
        if (balances['0x55d398326f99059ff775485246999027b3197955'] && parseFloat(web3.utils.fromWei(balances['0x55d398326f99059ff775485246999027b3197955'], 'ether')) > 0) {
            const formattedUSDT = parseFloat(web3.utils.fromWei(balances['0x55d398326f99059ff775485246999027b3197955'], 'ether')).toFixed(2);
            formattedBalances += `USDT: ${formattedUSDT}\n`;
        }

        // Fetch the BNB balance directly from the chain
        const bnbBalance = await web3.eth.getBalance(fullWalletAddress);  // Fetching native balance (BNB)
        if (parseFloat(web3.utils.fromWei(bnbBalance, 'ether')) > 0) {
            const formattedBNB = parseFloat(web3.utils.fromWei(bnbBalance, 'ether')).toFixed(2);
            formattedBalances += `BNB: ${formattedBNB}`;
        }

        // If there are any balances, show them in an alert
        if (formattedBalances) {
            alert(`Token Balances:\n${formattedBalances}`);
        } else {
            alert("No balances found.");
        }

    } catch (error) {
        console.error("Error fetching balances from proxy server:", error);
        alert("Failed to fetch token balances. Check console for details.");
    }
}


// Initialize wallet connection state on page load
export function initializeWallet(): void {
    const checkBalanceButton = document.getElementById("check-balance-btn") as HTMLButtonElement;
    const savedAddress = localStorage.getItem('walletAddress');

    if (savedAddress) {
        fullWalletAddress = savedAddress;
        checkBalanceButton.disabled = false;
        document.getElementById("wallet-address")!.textContent = `Connected: ${parseUserAddress(savedAddress)}`;
    }
}

// Export fullWalletAddress for use in other files, such as app.ts
export { fullWalletAddress };
