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
            checkBalanceButton.disabled = false;
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

// Fetch and display wallet balance in a popup
export async function showBalance(): Promise<void> {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
    const userAddress = accounts[0];
    const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [userAddress, 'latest']
    }) as string;

    // Convert balance from Wei to Ether using web3.utils.fromWei
    const etherBalance = web3.utils.fromWei(balance, 'ether');
    alert(`Balance: ${parseFloat(etherBalance).toFixed(4)} ETH`);
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
