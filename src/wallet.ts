import Web3 from 'web3';

declare let window: any;

let web3: Web3;

if (window.ethereum) {
    // MetaMask is available, create a new Web3 instance with MetaMask's provider
    web3 = new Web3(window.ethereum);
} else {
    alert("MetaMask not detected. Please install MetaMask to use this feature.");
    throw new Error("MetaMask not detected");
}

let isConnecting = false;

// Connect wallet and enable Check Balance button if connected
export async function connectWallet(): Promise<string | null> {
    const walletAddressElement = document.getElementById("wallet-address");
    const checkBalanceButton = document.getElementById("fetch-orders-btn") as HTMLButtonElement;

    if (isConnecting || window.ethereum.selectedAddress) {
        const savedAddress = window.ethereum.selectedAddress || localStorage.getItem('walletAddress');
        if (savedAddress) {
            walletAddressElement!.textContent = `Connected: ${parseUserAddress(savedAddress)}`;
            return savedAddress;
        }
    }

    if (window.ethereum) {
        isConnecting = true;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
            const userAddress = accounts[0];

            localStorage.setItem('walletAddress', userAddress);
            checkBalanceButton.disabled = false;
            walletAddressElement!.textContent = `Connected: ${parseUserAddress(userAddress)}`;
            return userAddress;
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

// Function to parse the address
function parseUserAddress(userAddress: string): string {
    return `${userAddress.slice(0, 3)}...${userAddress.slice(-4)}`;
}

// Fetch and display wallet balance using the 1inch API
export async function fetch1inchBalance(): Promise<void> {
    const apiUrl = `http://localhost:3000/api/balance`; // Use your proxy server's endpoint
    const chainId = 1; // Mainnet ID for Ethereum; update if using a different chain
    const userAddress = await connectWallet();
    if (!userAddress) {
        alert("Wallet not connected");
        return;
    }
    try {
        const response = await fetch(`${apiUrl}?walletAddress=${userAddress}&chainId=${chainId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch balance: ${response.statusText}`);
        }

        const balances = await response.json();
        console.log("Raw response from 1inch API:", balances); // Debug log

        // Process balances
        const balanceText = Object.entries(balances)
            .map(([token, amount]) => {
                // Ensure amount is a valid number before converting
                return `${token}: ${parseFloat(web3.utils.fromWei(amount as string, 'ether')).toFixed(4)}`;
            })
            .join('\n');
        alert(`Token Balances:\n${balanceText}`);
    } catch (error) {
        console.error("Error fetching balances from proxy server:", error);
        alert("Failed to fetch token balances. Check console for details.");
    }
}

// Initialize wallet connection state on page load
export function initializeWallet(): void {
    const checkBalanceButton = document.getElementById("fetch-orders-btn") as HTMLButtonElement;
    const savedAddress = localStorage.getItem('walletAddress');

    if (savedAddress) {
        checkBalanceButton.disabled = false;
        document.getElementById("wallet-address")!.textContent = `Connected: ${parseUserAddress(savedAddress)}`;
    }
}
