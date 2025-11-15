import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { ethers } from 'ethers';
import { useState, useEffect, useRef, useCallback } from 'react';

// --- WalletConnect v2 Configuration ---
const projectId = 'bbea909fab957b86dd6e58c5dd5e67ab'; // <-- Replace with your WalletConnect Cloud Project ID

const metadata = {
  name: 'George Token',
  description: 'George Presale Dapp',
  url: 'https://georgetoken.org',
  icons: ['https://georgetoken.org/assets/img/favicon.png']
};

const bsc = {
  chainId: 56,
  name: 'BNB Smart Chain',
  currency: 'BNB',
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  explorerUrl: 'https://bscscan.com',
  rpcUrls: ['https://bsc-dataseed.binance.org/'],   // for add/switch helpers
  blockExplorerUrls: ['https://bscscan.com'],
  iconUrls: ['https://cryptologos.cc/logos/binance-coin-bnb-logo.png']
}

const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [bsc],  // use the SAME object
  projectId,
  enableAnalytics: false, // reduce overhead
  themeMode: 'dark'
})

// --- Contract Configuration ---
const contractAddress = "0x77A85095060d75a7B3A34617b32b57b661890B0a";
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

const minBuy = 0.005;
const maxBuy = 5;

function App() {
  // --- React state ---
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null); // ethers provider (Web3Provider)
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [bnbBalance, setBnbBalance] = useState("0");
  const [presaleData, setPresaleData] = useState({
    rate: "0",
    usdtRaisedText: "Loading...",
    percentage: 0,
    tokenPriceUSD: 0.001
  });
  const [isBuying, setIsBuying] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  // --- DOM refs (existing HTML) ---
  const payInInputRef = useRef(null);
  const connectWalletBtnRef = useRef(null);
  const disconnectWalletBtnRef = useRef(null);
  const buyTokensBtnRef = useRef(null);
  const bnbBalanceDisplayRef = useRef(null);
  const receivedInInputRef = useRef(null);
  const statusElemRef = useRef(null);

  // --- small helpers ---
  const setStatus = useCallback((message, level = 'info') => {
    const el = statusElemRef.current || document.getElementById('walletStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('text-success', 'text-warning', 'text-danger', 'd-none');
    const map = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', info: 'text-light' };
    el.classList.add(map[level] || 'text-light');
  }, []);
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
  };

  const isMetaMaskMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
           window.ethereum && window.ethereum.isMetaMask;
  };

  const normalizeChainId = (chainId) => {
    if (typeof chainId === 'string') {
      // hex like '0x38' or decimal string like '56'
      if (chainId.startsWith('0x')) return parseInt(chainId, 16);
      const n = Number(chainId);
      return isNaN(n) ? null : n;
    }
    const n = Number(chainId);
    return isNaN(n) ? null : n;
  };

  // Test read-only connection (used for RPC failover checks)
  const testNetworkConnection = useCallback(async (ethersProvider) => {
    try {
      await ethersProvider.getBlockNumber();
      return true;
    } catch (error) {
      console.error("Network connection test failed:", error);
      return false;
    }
  }, []);

  // CoinGecko BNB price with short timeout (fallback to fixed price on failure)
  const fetchBnbPrice = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd',
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data?.binancecoin?.usd) return data.binancecoin.usd;
      throw new Error("Invalid response");
    } catch (error) {
      console.warn("Failed to fetch BNB price, using fallback:", error);
      return 900; // fallback
    }
  }, []);

  // Try multiple public RPCs concurrently and return the first responsive URL (read-only use)
  const tryMultipleRpcEndpoints = useCallback(async () => {
    const rpcEndpoints = [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/',
      'https://bsc-dataseed2.defibit.io/',
      'https://bsc-dataseed3.defibit.io/',
      'https://bsc-dataseed4.defibit.io/',
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/',
      'https://bsc-dataseed3.binance.org/',
      'https://bsc-dataseed4.binance.org/'
    ];

    const timeoutMs = 1500;
    const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
    });

    const probes = rpcEndpoints.map((rpcUrl) => new Promise(async (resolve, reject) => {
      try {
        const testProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        await withTimeout(testProvider.getBlockNumber(), timeoutMs);
        resolve(rpcUrl);
      } catch (e) {
        reject(e);
      }
    }));

    try {
      const firstOk = await Promise.any(probes);
      console.log(`RPC working: ${firstOk}`);
      return firstOk;
    } catch (e) {
      console.warn('All RPC probes failed, using default');
      return rpcEndpoints[0];
    }
  }, []);

  // Add BSC network helper (for UI button)
  const addBscNetwork = useCallback(async () => {
    const raw = window.ethereum;
    if (!raw) {
      setStatus('Please install MetaMask or another Web3 wallet to continue.', 'warning');
      return;
    }

    try {
      await raw.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ethers.utils.hexValue(bsc.chainId),
          chainName: bsc.name,
          nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          rpcUrls: bsc.rpcUrls,
          blockExplorerUrls: bsc.blockExplorerUrls,
          iconUrls: bsc.iconUrls
        }],
      });
      setStatus('BSC network added (or already exists). Please switch to it in your wallet.', 'success');
    } catch (error) {
      console.error('Error adding BSC network:', error);
      if (error.code === 4001) {
        setStatus('Network addition was cancelled by the user.', 'warning');
      } else {
        setStatus('Failed to add BSC network automatically. Please add it manually in your wallet settings.', 'danger');
      }
    }
  }, [setStatus]);

  // Read-only contract data update (uses public RPCs, NOT the wallet provider)
  const updateContractData = useCallback(async () => {
    try {
      const rpcUrl = await tryMultipleRpcEndpoints();
      const readProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const readContract = new ethers.Contract(contractAddress, contractABI, readProvider);

      const [rate, weiRaised, bnbPrice] = await Promise.all([
        readContract.rate(),
        readContract.weiRaised(),
        fetchBnbPrice()
      ]);

      // format values
      const ratePerBnb = parseFloat(ethers.utils.formatUnits(rate, 18)).toFixed(0);
      const bnbRaised = parseFloat(ethers.utils.formatEther(weiRaised));
      const fixedBnbGoal = 250;
      const totalGoal = fixedBnbGoal * bnbPrice;
      const usdtRaised = bnbRaised * bnbPrice;
      const percentage = Math.min((usdtRaised / totalGoal) * 100, 100);

      const usdtText = `$${usdtRaised.toFixed(2)} / $${totalGoal.toFixed(2)}`;

      const usdtElem = document.getElementById('usdtRaisedDisplay');
      const progressBar = document.getElementById('progressBar');
      const progressPercent = document.getElementById('progressPercent');
      const rateDisplay = document.getElementById('rateDisplay');

      if (usdtElem) usdtElem.textContent = usdtText;
      if (progressBar) progressBar.style.width = `${percentage.toFixed(1)}%`;
      if (progressPercent) progressPercent.textContent = `${percentage.toFixed(1)}%`;
      if (rateDisplay) rateDisplay.textContent = `${ratePerBnb} GEORGE/BNB`;

      setPresaleData({
        rate: ratePerBnb,
        usdtRaisedText: usdtText,
        percentage: percentage.toFixed(1),
        tokenPriceUSD: 0.001
      });
    } catch (error) {
      console.error("Failed to fetch contract data:", error);
      const usdtElem = document.getElementById('usdtRaisedDisplay');
      if (usdtElem) usdtElem.textContent = "Error loading data";
    }
  }, [fetchBnbPrice, tryMultipleRpcEndpoints]);

  const fetchBnbBalance = useCallback(async (currentSigner) => {
    if (!currentSigner) return;
    try {
      const address = await currentSigner.getAddress();
      const balance = await currentSigner.provider.getBalance(address);
      const formatted = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
      setBnbBalance(formatted);
    } catch (error) {
      console.error("Failed to fetch BNB balance:", error);
    }
  }, []);

  // Switch-first-then-add helper (expects raw provider: e.g. window.ethereum or WalletConnect provider)
  const switchToBsc = useCallback(async (rawProvider) => {
    if (!rawProvider) {
      setStatus('No wallet provider available to switch network.', 'warning');
      return false;
    }

    const bscChainId = bsc.chainId;
    try {
      // Try switching first
      await rawProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.utils.hexValue(bscChainId) }],
      });
      // switched successfully
      return true;
    } catch (switchError) {
      // If chain not added (4902), then add and try switching again.
      if (switchError && (switchError.code === 4902 || (switchError.data && switchError.data.originalError && switchError.data.originalError.code === 4902))) {
        try {
          await rawProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ethers.utils.hexValue(bscChainId),
              chainName: bsc.name,
              nativeCurrency: {
                name: bsc.currency,
                symbol: bsc.currency,
                decimals: 18,
              },
              rpcUrls: bsc.rpcUrls,
              blockExplorerUrls: bsc.blockExplorerUrls,
              iconUrls: bsc.iconUrls
            }],
          });
          // After adding, attempt to switch again
          await rawProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.utils.hexValue(bscChainId) }],
          });
          return true;
        } catch (addErr) {
          console.error('Error adding then switching to BSC:', addErr);
          if (addErr.code === 4001) {
            setStatus('Network addition was cancelled by the user.', 'warning');
          } else {
            setStatus('Failed to add the BSC network automatically. Please add it manually in your wallet settings.', 'danger');
          }
          return false;
        }
      }

      // If user rejected the switch
      if (switchError.code === 4001) {
        const help = isMobile() ? 'Open MetaMask → tap network at top → choose "BNB Smart Chain".' : 'Please switch to BSC in your wallet.';
        setStatus(help, 'warning');
        return false;
      }

      // Request already pending
      if (switchError.code === -32002) {
        setStatus('Network switch request pending. Please approve in your wallet…', 'info');
        return false;
      }

      // Generic fallback
      console.error('Failed to switch network:', switchError);
      setStatus('Unable to switch to BSC automatically. Please switch manually in your wallet.', 'danger');
      return false;
    }
  }, [setStatus]);

  // Update presale data at mount
  useEffect(() => {
    updateContractData();

    // Attach refs to existing DOM elements
    payInInputRef.current = document.getElementById('payInInput');
    receivedInInputRef.current = document.getElementById('receivedInInput');
    connectWalletBtnRef.current = document.getElementById('connectWalletBtn');
    disconnectWalletBtnRef.current = document.getElementById('disconnectWalletBtn');
    buyTokensBtnRef.current = document.getElementById('buyTokensBtn');
    bnbBalanceDisplayRef.current = document.getElementById('bnbBalanceDisplay');
    statusElemRef.current = document.getElementById('walletStatus');

    // Subscribe to modal provider updates (lightweight, no auto-switch; switch happens on buy)
    const unsubscribe = modal.subscribeProvider(async ({ provider: extProvider, isConnected: connected, address }) => {
      if (!connected || !extProvider || !address) {
        setIsConnected(false);
        setIsDataReady(false);
        setSelectedAccount(null);
        setBnbBalance("0");
        setSigner(null);
        setProvider(null);
        setContract(null);
        setStatus('', 'info');
        try { if (window.__createSmoother) window.__createSmoother(); } catch (_) {}
        return;
      }

      try {
        setIsConnected(true);
        const ethersProvider = new ethers.providers.Web3Provider(extProvider);
        const newSigner = ethersProvider.getSigner();
        setProvider(ethersProvider);
        setSigner(newSigner);
        setSelectedAccount(address);
        setContract(new ethers.Contract(contractAddress, contractABI, newSigner));
        await fetchBnbBalance(newSigner);
        setIsDataReady(true);
        setStatus('Wallet connected', 'success');
        try { if (window.__createSmoother) window.__createSmoother(); } catch (_) {}
      } catch (err) {
        console.error('Error setting up provider/signer:', err);
        setStatus('Error connecting wallet. Try reconnecting.', 'danger');
      }
    });

    // Pause/resume scroll smoother when Web3Modal opens/closes (if API available)
    let unsubscribeModal;
    try {
      if (typeof modal.subscribeModal === 'function') {
        unsubscribeModal = modal.subscribeModal(({ open }) => {
          try { if (open) { if (window.__killSmoother) window.__killSmoother(); } else { if (window.__createSmoother) window.__createSmoother(); } } catch (_) {}
        });
      }
    } catch (_) {}

    return () => {
      unsubscribe();
      if (typeof unsubscribeModal === 'function') unsubscribeModal();
    };
  }, [fetchBnbBalance, updateContractData]); // keep deps necessary

  // Handle pay-in input -> update received tokens display
  const handlePayInChange = useCallback(() => {
    const payInValue = parseFloat(payInInputRef.current?.value);
    if (!isNaN(payInValue) && receivedInInputRef.current && presaleData.rate) {
      const tokens = payInValue * parseFloat(presaleData.rate);
      receivedInInputRef.current.value = tokens.toFixed(0);
    } else if (receivedInInputRef.current) {
      receivedInInputRef.current.value = "0";
    }
  }, [presaleData.rate]);

  // Buy tokens (checks chain before sending)
  const buyTokens = useCallback(async () => {
    if (!isDataReady || !contract || !signer || !selectedAccount) {
      setStatus('Please connect your wallet first.', 'warning');
      return;
    }

    const payInValue = parseFloat(payInInputRef.current?.value);
    if (isNaN(payInValue) || payInValue <= 0) {
      setStatus('Please enter a valid amount to pay.', 'warning');
      return;
    }

    if (payInValue < minBuy || payInValue > maxBuy) {
      setStatus(`Purchase amount must be between ${minBuy} and ${maxBuy} BNB.`, 'warning');
      return;
    }

    if (parseFloat(bnbBalance) < payInValue) {
      setStatus('Insufficient BNB balance to complete this transaction.', 'danger');
      return;
    }

    setIsBuying(true);

    try {
      // Ensure current wallet is on BSC before sending
      const currentProvider = provider;
      let networkOk = false;
      if (currentProvider && currentProvider.getNetwork) {
        const net = await currentProvider.getNetwork();
        networkOk = (net.chainId === bsc.chainId);
      }

      if (!networkOk) {
        // Attempt to switch; use the raw provider if available
        const rawProvider = (currentProvider && currentProvider.provider) || window.ethereum;
        setStatus('Switching to BSC… approve in your wallet.', 'info');
        const switched = await switchToBsc(rawProvider);
        if (!switched) {
          setIsBuying(false);
          return;
        }

        // Recreate ethers provider & signer from rawProvider in case wallet changed chain
        const ethersProvider = new ethers.providers.Web3Provider(rawProvider);
        const newSigner = ethersProvider.getSigner();
        // prefer the updated signer/contract for this transaction
        const txContract = new ethers.Contract(contractAddress, contractABI, newSigner);

        const tx = await txContract.buyTokens(selectedAccount, { value: ethers.utils.parseEther(payInValue.toString()) });
        setStatus('Transaction sent. Waiting for confirmation…', 'info');
        await tx.wait();
        setStatus('Purchase successful!', 'success');
        // update UI/state
        setProvider(ethersProvider);
        setSigner(newSigner);
        setContract(txContract);
        await updateContractData();
        await fetchBnbBalance(newSigner);
        if (payInInputRef.current) payInInputRef.current.value = "";
        if (receivedInInputRef.current) receivedInInputRef.current.value = "0";
        setIsBuying(false);
        return;
      }

      // Already on correct network: use existing contract instance (with signer)
      const tx = await contract.buyTokens(selectedAccount, { value: ethers.utils.parseEther(payInValue.toString()) });
      setStatus('Transaction sent. Waiting for confirmation…', 'info');
      await tx.wait();
      setStatus('Purchase successful!', 'success');
      await updateContractData();
      await fetchBnbBalance(signer);
      if (payInInputRef.current) payInInputRef.current.value = "";
      if (receivedInInputRef.current) receivedInInputRef.current.value = "0";
    } catch (error) {
      console.error("Purchase failed:", error);
      let errorMessage = "Purchase failed: ";
      if (error.code === 4001) {
        errorMessage += "Transaction was rejected by user.";
      } else if (error.code === -32000 || error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += "Insufficient funds for gas.";
      } else {
        errorMessage += (error.data?.message || error.reason || error.message || String(error));
      }
      setStatus(errorMessage, 'danger');
    } finally {
      setIsBuying(false);
    }
  }, [isDataReady, contract, signer, selectedAccount, bnbBalance, fetchBnbBalance, updateContractData, provider, switchToBsc, setStatus]);

  // UI updates based on connection state
  useEffect(() => {
    const connectBtn = connectWalletBtnRef.current;
    const addBscBtn = document.getElementById('addBscNetworkBtn');
    const disconnectBtn = disconnectWalletBtnRef.current;
    const buyBtn = buyTokensBtnRef.current;
    const balanceDisplay = bnbBalanceDisplayRef.current;
    const networkHelp = document.getElementById('networkHelp');
    const mobileHelp = document.getElementById('mobileHelp');

    if (connectBtn) connectBtn.style.display = isConnected ? 'none' : 'flex';
    if (addBscBtn) addBscBtn.style.display = isConnected ? 'none' : 'flex';
    if (disconnectBtn) disconnectBtn.style.display = isConnected ? 'flex' : 'none';
    if (buyBtn) buyBtn.style.display = isConnected ? 'flex' : 'none';
    if (balanceDisplay) balanceDisplay.style.display = isConnected ? 'block' : 'none';
    if (networkHelp) networkHelp.style.display = isConnected ? 'none' : 'block';
    if (mobileHelp) mobileHelp.style.display = (isConnected || !isMobile()) ? 'none' : 'block';

    if (isConnected && balanceDisplay) {
      const bnbSpan = balanceDisplay.querySelector('#bnbBalance');
      if (bnbSpan) bnbSpan.textContent = bnbBalance;
    }

    if (buyBtn) {
      buyBtn.disabled = isBuying || !isDataReady;
      const buyBtnText = buyBtn.querySelector('span');
      if (buyBtnText) buyBtnText.textContent = isBuying ? 'Processing...' : (isDataReady ? 'Buy Now' : 'Initializing...');
    }
  }, [isConnected, isDataReady, isBuying, bnbBalance]);

  // Attach event listeners for inputs/buttons
  useEffect(() => {
    const payIn = payInInputRef.current;
    const connectBtn = connectWalletBtnRef.current;
    const addBscBtn = document.getElementById('addBscNetworkBtn');
    const disconnectBtn = disconnectWalletBtnRef.current;
    const buyBtn = buyTokensBtnRef.current;

    let modalCloseCleanup = null;
    const killSmoother = () => { try { if (window.__killSmoother) window.__killSmoother(); } catch (_) {} };
    const recreateSmoother = () => { try { if (window.__createSmoother) window.__createSmoother(); } catch (_) {} };

    const watchWeb3ModalClose = (onClose) => {
      let active = true;
      const cleanup = () => {
        active = false;
        try { observer.disconnect(); } catch (_) {}
        if (interval) clearInterval(interval);
      };
      const observer = new MutationObserver(() => {
        if (!active) return;
        const el = document.querySelector('w3m-modal');
        if (!el) { cleanup(); onClose?.(); }
      });
      try { observer.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
      const interval = setInterval(() => {
        if (!active) return;
        const el = document.querySelector('w3m-modal');
        if (!el) { cleanup(); onClose?.(); }
      }, 1500);
      return cleanup;
    };

    const openModal = () => {
      killSmoother();
      try { if (modalCloseCleanup) { modalCloseCleanup(); modalCloseCleanup = null; } } catch (_) {}
      modal.open();
      // Ensure resume even if user cancels/escapes without connecting
      modalCloseCleanup = watchWeb3ModalClose(() => recreateSmoother());
    };
    const disconnectModal = () => { modal.disconnect(); recreateSmoother(); if (modalCloseCleanup) { modalCloseCleanup(); modalCloseCleanup = null; } };

    if (payIn) payIn.addEventListener('input', handlePayInChange);
    if (connectBtn) connectBtn.addEventListener('click', openModal);
    if (addBscBtn) addBscBtn.addEventListener('click', addBscNetwork);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectModal);
    if (buyBtn) buyBtn.addEventListener('click', buyTokens);

    return () => {
      if (payIn) payIn.removeEventListener('input', handlePayInChange);
      if (connectBtn) connectBtn.removeEventListener('click', openModal);
      if (addBscBtn) addBscBtn.removeEventListener('click', addBscNetwork);
      if (disconnectBtn) disconnectBtn.removeEventListener('click', disconnectModal);
      if (buyBtn) buyBtn.removeEventListener('click', buyTokens);
      if (modalCloseCleanup) { try { modalCloseCleanup(); } catch (_) {} }
    };
  }, [handlePayInChange, buyTokens, addBscNetwork]);

  // Render nothing — your page uses DOM IDs already present in HTML
  return null;
}

export default App;
