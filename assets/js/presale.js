// presale.js - implements the working presale dapp functionality for the given contract address

const contractAddress = "0x1Fe716F572B6DD5a92379E76949c0F951821BB18";
const contractABI = [
  {"inputs":[{"internalType":"uint256","name":"_rate","type":"uint256"},{"internalType":"contract IST20","name":"_token","type":"address"},{"internalType":"uint256","name":"_max","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"purchaser","type":"address"},{"indexed":true,"internalType":"address","name":"beneficiary","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"TokenPurchase","type":"event"},
  {"stateMutability":"payable","type":"fallback"},
  {"inputs":[{"internalType":"uint256","name":"_weiAmount","type":"uint256"}],"name":"_getTokenAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_beneficiary","type":"address"},{"internalType":"uint256","name":"_weiAmount","type":"uint256"}],"name":"_preValidatePurchase","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_beneficiary","type":"address"}],"name":"buyTokens","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_beneficiary","type":"address"}],"name":"maxBnb","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"purchasedBnb","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"rate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_rate","type":"uint256"}],"name":"setPresaleRate","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"token","outputs":[{"internalType":"contract IST20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferContractOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"weiMaxPurchaseBnb","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"weiRaised","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokens","type":"uint256"}],"name":"withdrawTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"}
];

let provider;
let signer;
let contract;
let web3Modal;
let selectedAccount;
let bnbBalance;
let minBuy = 0.01; // Defined globally
let maxBuy = 1;   // Defined globally

const Web3Modal = window.Web3Modal && window.Web3Modal.default ? window.Web3Modal.default : window.Web3Modal;
const WalletConnectProvider = window.WalletConnectProvider && window.WalletConnectProvider.default ? window.WalletConnectProvider.default : window.WalletConnectProvider;

const providerOptions = {
  injected: {
    package: null
  },
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      rpc: {
        56: "https://bsc-dataseed.binance.org/"
      },
      chainId: 56
    }
  },
  binancechainwallet: {
    package: true
  }
};

async function init() {
  // Correctly initialize Web3Modal
  web3Modal = new Web3Modal({
    cacheProvider: true,
    providerOptions: providerOptions,
    theme: {
      background: "#55aaffab",
      main: "#000000",
      secondary: "#ffffff",
      hover: "#4e49003f"
    }
  });

  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);
  document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);

  await updateContractData();
}

async function connectWallet() {
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  if (connectWalletBtn) {
    connectWalletBtn.disabled = true;
    connectWalletBtn.innerText = "Connecting...";
  }

  try {
    const instance = await web3Modal.connect();
    console.log("Wallet instance:", instance);
    provider = new window.ethers.providers.Web3Provider(instance);
    signer = provider.getSigner();
    selectedAccount = await signer.getAddress();
    console.log("Selected account:", selectedAccount);

    const network = await provider.getNetwork();
    console.log("Network:", network);
    if (network.chainId !== 56) {
      alert("Please switch to Binance Smart Chain (BSC) network.");
      return;
    }

    contract = new window.ethers.Contract(contractAddress, contractABI, signer);

    await fetchBnbBalance(selectedAccount, provider);
    await updateBnbBalance(); // Added to update UI immediately after fetching balance

    // Fix: Check if element exists before setting innerText
    const walletAddressDisplay = document.getElementById("walletAddressDisplay");
    if (walletAddressDisplay) {
      walletAddressDisplay.innerText = selectedAccount;
    } else {
      // Try alternative element id "walletAddress"
      const altWalletAddressDisplay = document.getElementById("walletAddress");
      if (altWalletAddressDisplay) {
        altWalletAddressDisplay.innerText = selectedAccount;
      } else {
        alert("Failed to connect wallet: Wallet address display element not found.");
        return;
      }
    }

    const connectWalletBtn = document.getElementById("connectWalletBtn");
    if (connectWalletBtn) {
      connectWalletBtn.style.display = "none";
    } else {
      alert("Failed to connect wallet: Connect Wallet button element not found.");
      return;
    }

    const disconnectWalletBtn = document.getElementById("disconnectWalletBtn");
    if (disconnectWalletBtn) {
      disconnectWalletBtn.style.display = "block";
    }

    const buyTokensBtn = document.getElementById("buyTokensBtn");
    if (buyTokensBtn) {
      buyTokensBtn.disabled = false;
    }

    const bnbBalanceDisplay = document.getElementById("bnbBalanceDisplay");
    if (bnbBalanceDisplay) {
      bnbBalanceDisplay.style.display = "block";
    }

    if (provider.on) {
      provider.on("accountsChanged", debounce(async (accounts) => {
        console.log("accountsChanged event triggered with accounts:", accounts);
        if (accounts.length === 0) {
          await disconnectWallet();
        } else {
          selectedAccount = accounts[0];
          const walletAddressDisplay = document.getElementById("walletAddressDisplay");
          if (walletAddressDisplay) {
            walletAddressDisplay.innerText = selectedAccount;
          }
          await fetchBnbBalance(selectedAccount, provider);
          console.log("bnbBalance after fetch in accountsChanged:", bnbBalance);
          await updateBnbBalance();
        }
      }, 500));

      provider.on("chainChanged", debounce(async (chainId) => {
        const network = await provider.getNetwork();
        if (network.chainId !== 56) {
          alert("Please switch to Binance Smart Chain (BSC) network.");
          // Instead of full reload, just disconnect and show message
          await disconnectWallet();
        } else {
          // If still on BSC, just update data without full reload
          await updateContractData();
          await updateBnbBalance();
        }
      }, 500));

      provider.on("disconnect", debounce(async () => {
        await disconnectWallet();
      }, 500));
    }


  } catch (error) {
    console.error("Wallet connection failed:", error);
    alert("Failed to connect wallet: " + error.message);
  } finally {
    // Restore button state
    if (connectWalletBtn) {
      connectWalletBtn.disabled = false;
      connectWalletBtn.innerText = "Connect Wallet";
    }
  }
}
async function fetchBnbBalance(account, provider) {
  if (!account || !provider) return;
  try {
    const balance = await provider.getBalance(account);
    console.log("Raw balance:", balance.toString());
    bnbBalance = window.ethers.utils.formatEther(balance);
    console.log("Fetched BNB balance:", bnbBalance);

    // Update UI immediately after fetching balance
    const bnbBalanceSpan = document.getElementById("bnbBalance");
    if (bnbBalanceSpan) {
      bnbBalanceSpan.innerText = parseFloat(bnbBalance).toFixed(4);
    } else {
      console.warn("Element with id 'bnbBalance' not found");
    }
  } catch (error) {
    console.error("Failed to fetch BNB balance:", error);
  }
}

async function fetchBnbBalanceWithRetry(account, provider, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetchBnbBalance(account, provider);
      return;
    } catch (error) {
      console.warn(`fetchBnbBalance attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error("Failed to fetch BNB balance after retries");
}

async function buyTokens() {
  if (!contract || !signer) {
    alert("Please connect your wallet first.");
    return;
  }

  const buyTokensBtn = document.getElementById("buyTokensBtn");
  const payInInput = document.getElementById("payInInput");
  const payInValue = parseFloat(payInInput.value);

  // Added client-side validation
  if (isNaN(payInValue) || payInValue <= 0) {
    alert("Please enter a valid amount to pay.");
    return;
  }

  if (payInValue < minBuy || payInValue > maxBuy) {
    alert(`Purchase amount must be between ${minBuy} and ${maxBuy} BNB.`);
    return;
  }

  if (bnbBalance && payInValue > parseFloat(bnbBalance)) {
    alert("Insufficient BNB balance to complete this transaction.");
    return;
  }

  // Disable button and show loading state
  if (buyTokensBtn) {
    buyTokensBtn.disabled = true;
    buyTokensBtn.innerText = "Processing...";
  }

  try {
    // Use signer to send transaction, not contract directly
    const tx = await contract.connect(signer).buyTokens(selectedAccount, { value: window.ethers.utils.parseEther(payInValue.toString()) });
    alert("Transaction sent. Waiting for confirmation...");
    await tx.wait();
    alert("Purchase successful!");
    await updateContractData();
    // Clear input after successful purchase
    payInInput.value = "";
    document.getElementById("receivedInInput").value = "0";
  } catch (error) {
    console.error("Purchase failed:", error);
    let errorMessage = "Purchase failed: ";
    if (error.code === 4001) {
      errorMessage += "Transaction was rejected by user.";
    } else if (error.code === -32000) {
      errorMessage += "Insufficient funds for gas.";
    } else {
      errorMessage += (error.data?.message || error.message);
    }
    alert(errorMessage);
  } finally {
    // Re-enable button and restore text
    if (buyTokensBtn) {
      buyTokensBtn.disabled = false;
      buyTokensBtn.innerText = "Buy Tokens";
    }
  }
}

async function updateBnbBalance() {
  if (!signer) {
    console.warn("No signer available for updateBnbBalance");
    return;
  }
  try {
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const bnbBalance = window.ethers.utils.formatEther(balance);
    console.log("Updating BNB balance in UI:", bnbBalance);
    const bnbBalanceSpan = document.getElementById("bnbBalance");
    const bnbBalanceDisplay = document.getElementById("bnbBalanceDisplay");
    if (bnbBalanceSpan) {
      bnbBalanceSpan.innerText = parseFloat(bnbBalance).toFixed(4);
    } else {
      console.warn("Element with id 'bnbBalance' not found");
    }
    if (bnbBalanceDisplay) {
      bnbBalanceDisplay.style.display = "block";
    } else {
      console.warn("Element with id 'bnbBalanceDisplay' not found");
    }
  } catch (error) {
    console.error("Failed to fetch BNB balance:", error);
  }
}

async function fetchBnbBalanceWithRetry(account, provider, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetchBnbBalance(account, provider);
      return;
    } catch (error) {
      console.warn(`fetchBnbBalance attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error("Failed to fetch BNB balance after retries");
}



let cachedBnbPrice = null;
let lastPriceFetchTime = 0;
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

async function fetchBnbPrice() {
  const now = Date.now();
  if (cachedBnbPrice && (now - lastPriceFetchTime) < PRICE_CACHE_DURATION) {
    return cachedBnbPrice;
  }
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
    const data = await response.json();
    cachedBnbPrice = data.binancecoin.usd;
    lastPriceFetchTime = now;
    return cachedBnbPrice;
  } catch (error) {
    console.warn("Failed to fetch BNB price, using fallback:", error);
    return 750; // fallback price
  }
}

let updateContractDataTimeout = null;
async function updateContractData() {
  if (updateContractDataTimeout) {
    clearTimeout(updateContractDataTimeout);
  }
  updateContractDataTimeout = setTimeout(async () => {
    if (!contract) {
      const readProvider = new window.ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
      contract = new window.ethers.Contract(contractAddress, contractABI, readProvider);
    }
    try {
      let rate = await contract.rate();
      // Adjust rate for decimals (assuming 18 decimals)
      rate = rate / 1e18;

      const weiRaised = await contract.weiRaised();
      const bnbRaised = window.ethers.utils.formatEther(weiRaised);

      const bnbPrice = await fetchBnbPrice();

      // Calculate USDT raised and goal based on token supply and rate
      const tokenSupply = 50000000; // 50 million tokens
      const tokensPerBnb = 50000;
      // Set fixed USDT goal as 1000 BNB * current BNB price
      const fixedBnbGoal = 1000;
      const totalGoal = fixedBnbGoal * bnbPrice; // USDT goal based on fixed BNB goal and BNB price
      const usdtRaised = (parseFloat(bnbRaised) * bnbPrice);
      const percentage = Math.min((usdtRaised / totalGoal) * 100, 100);

      // Dynamic Min/Max buy values
      const minBuy = 0.01;
      const maxBuy = 1;
      const tokenPriceUSD = 0.015;

      // Fix: Check if elements exist before setting innerText or style
      const rateDisplay = document.getElementById("rateDisplay");
      if (rateDisplay) {
        rateDisplay.innerText = rate.toFixed(0);
      }

      const maxBuyDisplay = document.getElementById("maxBuyDisplay");
      if (maxBuyDisplay) {
        maxBuyDisplay.innerText = maxBuy.toString();
      }

      const minBuyDisplay = document.getElementById("minBuyDisplay");
      if (minBuyDisplay) {
        minBuyDisplay.innerText = minBuy.toString();
      }

      const tokenPriceUSDDisplay = document.getElementById("tokenPriceUSDDisplay");
      if (tokenPriceUSDDisplay) {
        tokenPriceUSDDisplay.innerText = tokenPriceUSD.toFixed(3);
      }

      const usdtRaisedDisplay = document.getElementById("usdtRaisedDisplay");
      if (usdtRaisedDisplay) {
        usdtRaisedDisplay.innerText = "$" + usdtRaised.toFixed(2) + " / $" + totalGoal.toFixed(2);
      }

      const progressPercent = document.getElementById("progressPercent");
      if (progressPercent) {
        progressPercent.innerText = percentage.toFixed(1) + '%';
      }

      const progressBar = document.getElementById("progressBar");
      if (progressBar) {
        progressBar.style.width = percentage.toFixed(1) + '%';
      }
    } catch (error) {
      console.error("Failed to fetch contract data:", error);
    }
  }, 200);
}

async function buyTokens() {
  if (!contract || !signer) {
    alert("Please connect your wallet first.");
    return;
  }

  const buyTokensBtn = document.getElementById("buyTokensBtn");
  const payInInput = document.getElementById("payInInput");
  const payInValue = parseFloat(payInInput.value);

  // Added client-side validation
  if (isNaN(payInValue) || payInValue <= 0) {
    alert("Please enter a valid amount to pay.");
    return;
  }

  if (payInValue < minBuy || payInValue > maxBuy) {
    alert(`Purchase amount must be between ${minBuy} and ${maxBuy} BNB.`);
    return;
  }

  if (bnbBalance && payInValue > parseFloat(bnbBalance)) {
    alert("Insufficient BNB balance to complete this transaction.");
    return;
  }

  // Disable button and show loading state
  if (buyTokensBtn) {
    buyTokensBtn.disabled = true;
    buyTokensBtn.innerText = "Processing...";
  }

  try {
    // Use signer to send transaction, not contract directly
    const tx = await contract.connect(signer).buyTokens(selectedAccount, { value: window.ethers.utils.parseEther(payInValue.toString()) });
    alert("Transaction sent. Waiting for confirmation...");
    await tx.wait();
    alert("Purchase successful!");
    await updateContractData();
    // Clear input after successful purchase
    payInInput.value = "";
    document.getElementById("receivedInInput").value = "0";
  } catch (error) {
    console.error("Purchase failed:", error);
    let errorMessage = "Purchase failed: ";
    if (error.code === 4001) {
      errorMessage += "Transaction was rejected by user.";
    } else if (error.code === -32000) {
      errorMessage += "Insufficient funds for gas.";
    } else {
      errorMessage += (error.data?.message || error.message);
    }
    alert(errorMessage);
  } finally {
    // Re-enable button and restore text
    if (buyTokensBtn) {
      buyTokensBtn.disabled = false;
      buyTokensBtn.innerText = "Buy Tokens";
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.addEventListener("load", () => {
  init();

  // Add debounced event listener to update received tokens on payIn input change
  const payInInput = document.getElementById("payInInput");
  const receivedInInput = document.getElementById("receivedInInput");
  if (payInInput && receivedInInput) {
    payInInput.addEventListener("input", debounce(() => {
      const value = parseFloat(payInInput.value);
      if (!isNaN(value)) {
        const tokens = value * 50000; // Use exact rate or fetch dynamically if needed
        receivedInInput.value = tokens.toFixed(0);
      } else {
        receivedInInput.value = "0";
      }
    }, 200));
  }

  const presaleSection = document.getElementById("presale-section");
  if (presaleSection) {
    presaleSection.scrollIntoView({ behavior: "smooth" });
  }

  // Add disconnect wallet button event listener
  const disconnectWalletBtn = document.getElementById("disconnectWalletBtn");
  if (disconnectWalletBtn) {
    disconnectWalletBtn.addEventListener("click", async () => {
      await disconnectWallet();
    });
  }
});
