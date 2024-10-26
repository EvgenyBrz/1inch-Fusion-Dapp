import { SDK, NetworkEnum } from '@1inch/cross-chain-sdk';
import Web3 from 'web3';

const web3 = new Web3(window.ethereum);

// Initialize the Fusion SDK with the 1inch API
const sdk = new SDK({
  url: "https://api.1inch.dev/fusion-plus",
  authKey: "6wfStvXlt0IsyiuntJNzDZmjSbvH5DkM",  // Dev API
  blockchainProvider: {
    signTypedData: async (walletAddress, typedData) => {
      return web3.eth.signTypedData(walletAddress, typedData);
    },
    ethCall: async (contractAddress, callData) => {
      return web3.eth.call({ to: contractAddress, data: callData });
    }
  }
});

const userAddress = "0x7F10e39fD2e96a904773564f8d7c7af28232F8F8";
const usdcAddressEth = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // USDC on Ethereum
const maticAddressPolygon = "0x0000000000000000000000000000000000001010"; // MATIC on Polygon

// Function to get a quote for cross-chain swap 
window.getCrossChainQuote = async function() {
  const amount = document.getElementById("swap-amount").value;
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount in USDC.");
    return;
  }

  try {
    const quoteParams = {
      srcChainId: NetworkEnum.ETHEREUM,
      dstChainId: NetworkEnum.POLYGON,
      srcTokenAddress: usdcAddressEth,
      dstTokenAddress: maticAddressPolygon,
      amount: web3.utils.toWei(amount, "mwei"), // Convert USDC amount to smallest unit
    };

    const quote = await sdk.getQuote(quoteParams);
    document.getElementById("quote-result").innerText = JSON.stringify(quote, null, 2);
  } catch (error) {
    console.error("Error fetching cross-chain quote:", error);
    document.getElementById("quote-result").innerText = "Error fetching cross-chain quote";
  }
}

// Function to place an order using the obtained cross-chain quote
window.placeOrder = async function() {
  const amount = document.getElementById("swap-amount").value;
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount in USDC.");
    return;
  }

  try {
    // First, get the quote for cross-chain swap
    const quoteParams = {
      srcChainId: NetworkEnum.ETHEREUM,
      dstChainId: NetworkEnum.POLYGON,
      srcTokenAddress: usdcAddressEth,
      dstTokenAddress: maticAddressPolygon,
      amount: web3.utils.toWei(amount, "mwei"), // Convert USDC amount to smallest unit
    };
    const quote = await sdk.getQuote(quoteParams);

    // Generate secrets 
    const secretsCount = quote.getPreset().secretsCount;
    const secrets = Array.from({ length: secretsCount }).map(() => web3.utils.randomHex(32));
    const secretHashes = secrets.map((secret) => sdk.hashSecret(secret));

    // Prepare hash lock
    const hashLock = sdk.HashLock.forMultipleFills(
      secretHashes.map((hash, i) => sdk.solidityPackedKeccak256(["uint64", "bytes32"], [i, hash]))
    );

    // Place the order using the hash lock and secrets
    const orderParams = {
      walletAddress: userAddress,
      hashLock,
      secretHashes,
      fee: {
        takingFeeBps: 100, // 1% fee
        takingFeeReceiver: "0x0000000000000000000000000000000000000000"
      }
    };
    const order = await sdk.placeOrder(quote, orderParams);
    document.getElementById("order-result").innerText = `Order placed: ${JSON.stringify(order, null, 2)}`;
  } catch (error) {
    console.error("Error placing order:", error);
    document.getElementById("order-result").innerText = "Error placing order";
  }
}

// Connection to MetaMask
async function connectMetaMask() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Connected to MetaMask');
    } catch (error) {
      console.error('MetaMask connection failed', error);
    }
  } else {
    alert('MetaMask is not installed!');
  }
}

connectMetaMask();
