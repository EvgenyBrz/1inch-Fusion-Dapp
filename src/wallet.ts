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
    const chainId = 1; // Mainnet ID for Ethereum; update if using a different chain

    if (!fullWalletAddress) {
        fullWalletAddress = await connectWallet();
        if (!fullWalletAddress) {
            alert("Wallet not connected");
            return;
        }
    }

    console.log("Fetching balance with walletAddress:", fullWalletAddress, "and chainId:", chainId); // Log to verify parameters

    try {
        const response = await fetch(`${apiUrl}?walletAddress=${fullWalletAddress}&chainId=${chainId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch balance: ${response.statusText}`);
        }

        const balances = await response.json();
        console.log("Raw response from 1inch API:", balances); // Debug log

        // Process USDT and USDC balances
        const usdtBalance = balances['USDT'] ? parseFloat(web3.utils.fromWei(balances['USDT'], 'mwei')).toFixed(4) : "0.0000";
        const usdcBalance = balances['USDC'] ? parseFloat(web3.utils.fromWei(balances['USDC'], 'mwei')).toFixed(4) : "0.0000";

        // Display balances in an alert or popup
        alert(`Token Balances:\nUSDT: ${usdtBalance}\nUSDC: ${usdcBalance}`);
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
