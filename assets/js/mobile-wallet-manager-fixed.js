/**
 * Mobile Wallet Manager for George Token - FIXED VERSION
 * Specifically designed for mobile wallet connections with improved error handling
 */

class MobileWalletManager {
  constructor() {
    this.provider = null;
    this.connected = false;
    this.address = null;
    this.chainId = null;
    this.contract = null;
    this.isMobile = this.detectMobile();

    this.init();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async init() {
    try {
      console.log("Initializing Mobile Wallet Manager (Fixed)...");
      console.log("Mobile device detected:", this.isMobile);

      if (this.isMobile) {
        this.setupMobileOptimizations();
      }

      this.setupEventListeners();
      this.updateUI();

    } catch (error) {
      console.error('Failed to initialize Mobile Wallet Manager:', error);
    }
  }

  setupMobileOptimizations() {
    console.log("Setting up mobile optimizations...");

    // Add mobile-specific CSS
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .wallet-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 9999 !important;
          background: rgba(0, 0, 0, 0.9) !important;
        }
        .wallet-option {
          padding: 20px !important;
          margin: 10px !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 2px solid rgba(217, 247, 31, 0.3) !important;
        }
        .wallet-option:hover {
          background: rgba(217, 247, 31, 0.1) !important;
          border-color: #d9f71f !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        this.handleAccountsChanged(accounts);
      });

      window.ethereum.on('chainChanged', (chainId) => {
        this.handleChainChanged(chainId);
      });

      window.ethereum.on('disconnect', () => {
        this.handleDisconnect();
      });
    }
  }

  async connect() {
    try {
      if (this.connected) {
        await this.disconnect();
        return;
      }

      console.log("Attempting mobile wallet connection...");

      // Mobile Strategy: Show wallet selection modal
      if (this.isMobile) {
        await this.showMobileWalletModal();
        return;
      }

      // Desktop Strategy: Try standard methods
      await this.connectDesktop();

    } catch (error) {
      console.error('Mobile connection failed:', error);
      this.showError('Connection failed: ' + error.message);
    }
  }

  async showMobileWalletModal() {
    return new Promise((resolve, reject) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'wallet-modal';
      overlay.innerHTML = `
        <div style="background: linear-gradient(135deg, #0a001f 0%, #1a0033 100%); padding: 30px; border-radius: 20px; margin: 20px; max-width: 400px; width: 90%;">
          <h3 style="color: #d9f71f; text-align: center; margin-bottom: 30px;">Choose Your Wallet</h3>

          <div class="wallet-option" onclick="window.mobileWalletManager.selectWallet('metamask')">
            <div style="text-align: center;">
              <div style="width: 60px; height: 60px; background: #f6851b; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🦊</div>
              <h4>MetaMask</h4>
              <p>Browser & Mobile App</p>
            </div>
          </div>

          <div class="wallet-option" onclick="window.mobileWalletManager.selectWallet('trust')">
            <div style="text-align: center;">
              <div style="width: 60px; height: 60px; background: #3375bb; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📱</div>
              <h4>Trust Wallet</h4>
              <p>Mobile App</p>
            </div>
          </div>

          <div class="wallet-option" onclick="window.mobileWalletManager.selectWallet('walletconnect')">
            <div style="text-align: center;">
              <div style="width: 60px; height: 60px; background: #3b99fc; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🔗</div>
              <h4>WalletConnect</h4>
              <p>QR Code</p>
            </div>
          </div>

          <div class="wallet-option" onclick="window.mobileWalletManager.selectWallet('coinbase')">
            <div style="text-align: center;">
              <div style="width: 60px; height: 60px; background: #0052ff; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 24px;">💙</div>
              <h4>Coinbase Wallet</h4>
              <p>Mobile App</p>
            </div>
          </div>

          <button onclick="window.mobileWalletManager.closeModal()" style="background: #666; color: white; border: none; padding: 15px; border-radius: 25px; width: 100%; margin-top: 20px; cursor: pointer;">Cancel</button>
        </div>
      `;

      document.body.appendChild(overlay);

      // Store modal reference
      this.currentModal = overlay;

      // Handle wallet selection
      window.mobileWalletManager = this;
    });
  }

  async selectWallet(walletType) {
    try {
      console.log("Selected wallet:", walletType);

      this.closeModal();

      switch (walletType) {
        case 'metamask':
          await this.connectMetaMask();
          break;
        case 'trust':
          await this.connectTrustWallet();
          break;
        case 'walletconnect':
          await this.connectWalletConnect();
          break;
        case 'coinbase':
          await this.connectCoinbase();
          break;
        default:
          throw new Error("Unsupported wallet type");
      }

    } catch (error) {
      console.error('Wallet selection failed:', error);
      this.showError('Failed to connect: ' + error.message);
    }
  }

  async connectMetaMask() {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.address = accounts[0];
        this.chainId = parseInt(chainId, 16);

        if (this.chainId !== 56) {
          alert("Please switch to Binance Smart Chain (BSC) network in MetaMask.");
          return;
        }

        this.connected = true;
        await this.initializeContract();
        this.updateUI();
        this.showSuccess('MetaMask connected successfully!');

      } catch (error) {
        throw new Error("MetaMask connection failed: " + error.message);
      }
    } else {
      // Try to open MetaMask app
      if (this.isMobile) {
        window.location.href = 'https://metamask.app.link/dapp/' + window.location.hostname;
      } else {
        throw new Error("MetaMask not detected. Please install MetaMask.");
      }
    }
  }

  async connectTrustWallet() {
    if (this.isMobile) {
      // Try to open Trust Wallet
      window.location.href = 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href);
    } else {
      // Fallback to WalletConnect
      await this.connectWalletConnect();
    }
  }

  async connectWalletConnect() {
    try {
      console.log("Attempting WalletConnect connection...");

      // Check if required libraries are loaded
      if (typeof window.Web3Modal === 'undefined') {
        console.error("Web3Modal not loaded");
        throw new Error("Web3Modal not loaded. Please refresh the page and try again.");
      }

      if (typeof window.WalletConnectProvider === 'undefined') {
        console.error("WalletConnectProvider not loaded");
        throw new Error("WalletConnect provider not loaded. Please refresh the page and try again.");
      }

      console.log("Creating Web3Modal instance...");
      const web3Modal = new window.Web3Modal.default({
        cacheProvider: true,
        providerOptions: {
          walletconnect: {
            package: window.WalletConnectProvider.default,
            options: {
              rpc: {
                56: "https://bsc-dataseed.binance.org/",
                97: "https://data-seed-prebsc-1-s1.binance.org:8545/"
              },
              chainId: 56,
              qrcodeModalOptions: {
                mobileLinks: [
                  "metamask",
                  "trust",
                  "rainbow",
                  "argent",
                  "imtoken",
                  "pillar",
                  "coinbase",
                  "binance"
                ]
              }
            }
          }
        },
        disableInjectedProvider: false,
        theme: {
          background: "rgba(85, 170, 255, 0.9)",
          main: "#000000",
          secondary: "#ffffff",
          border: "rgba(255, 255, 255, 0.2)",
          hover: "rgba(78, 73, 0, 0.25)"
        }
      });

      console.log("Web3Modal configured, attempting to connect...");
      const instance = await web3Modal.connect();
      console.log("WalletConnect instance obtained:", instance);

      if (instance) {
        // Handle different provider types
        let provider;
        if (typeof instance.request === "function") {
          provider = new window.ethers.providers.Web3Provider(instance);
        } else if (instance.provider) {
          provider = new window.ethers.providers.Web3Provider(instance.provider);
        } else {
          provider = new window.ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
        }

        const signer = provider.getSigner();
        this.address = await signer.getAddress();
        const network = await provider.getNetwork();
        this.chainId = network.chainId;

        console.log("Connected to:", this.address);
        console.log("Network:", network);

        if (this.chainId !== 56) {
          alert("Please switch to Binance Smart Chain (BSC) network in your wallet.");
          return;
        }

        this.provider = provider;
        this.connected = true;
        await this.initializeContract();
        this.updateUI();
        this.showSuccess('WalletConnect connected successfully!');
        return;
      }

      throw new Error("Failed to get provider instance");

    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      throw new Error("WalletConnect failed: " + error.message);
    }
  }

  async connectCoinbase() {
    if (this.isMobile) {
      window.location.href = 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href);
    } else {
      throw new Error("Coinbase Wallet is primarily a mobile app");
    }
  }

  async connectDesktop() {
    // Desktop connection logic
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.address = accounts[0];
        this.connected = true;
        await this.initializeContract();
        this.updateUI();
        this.showSuccess('Wallet connected successfully!');
      } catch (error) {
        throw new Error("Desktop connection failed: " + error.message);
      }
    } else {
      throw new Error("No wallet detected. Please install MetaMask or use WalletConnect.");
    }
  }

  closeModal() {
    if (this.currentModal) {
      document.body.removeChild(this.currentModal);
      this.currentModal = null;
    }
  }

  async disconnect() {
    try {
      if (window.web3Modal) {
        await window.web3Modal.clearCachedProvider();
      }

      this.connected = false;
      this.address = null;
      this.chainId = null;
      this.contract = null;
      this.provider = null;

      this.updateUI();
      this.showSuccess('Wallet disconnected');

    } catch (error) {
      console.error('Disconnect failed:', error);
      this.showError('Failed to disconnect wallet');
    }
  }

  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.connected = false;
      this.address = null;
    } else {
      this.address = accounts[0];
      this.connected = true;
    }
    this.updateUI();
  }

  handleChainChanged(chainId) {
    this.chainId = parseInt(chainId, 16);
    this.updateUI();
  }

  handleDisconnect() {
    this.connected = false;
    this.address = null;
    this.chainId = null;
    this.updateUI();
  }

  async initializeContract() {
    try {
      if (!this.provider || !this.address) return;

      const signer = this.provider.getSigner();

      this.contract = new window.ethers.Contract(
        "0x1Fe716F572B6DD5a92379E76949c0F951821BB18",
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)',
          'function transfer(address,uint256) returns (bool)',
          'function allowance(address,address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)',
          'function transferFrom(address,address,uint256) returns (bool)'
        ],
        signer
      );

    } catch (error) {
      console.error('Failed to initialize contract:', error);
    }
  }

  async getBalance() {
    try {
      if (!this.contract || !this.address) return '0';

      const balance = await this.contract.balanceOf(this.address);
      const decimals = await this.contract.decimals();

      return window.ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  updateUI() {
    const connectBtn = document.getElementById("connectWalletBtn");
    const walletStatus = document.getElementById("walletStatus");
    const walletAddress = document.getElementById("walletAddress");
    const walletBalance = document.getElementById("walletBalance");

    if (connectBtn) {
      if (this.connected) {
        connectBtn.innerHTML = 'Disconnect Wallet';
        connectBtn.classList.remove('btn-outline-primary');
        connectBtn.classList.add('btn-outline-danger');
      } else {
        connectBtn.innerHTML = 'Connect Wallet';
        connectBtn.classList.remove('btn-outline-danger');
        connectBtn.classList.add('btn-outline-primary');
      }
    }

    if (walletStatus) {
      walletStatus.textContent = this.connected ? 'Connected' : 'Disconnected';
      walletStatus.className = this.connected ? 'text-success' : 'text-muted';
    }

    if (walletAddress) {
      walletAddress.textContent = this.address ? `${this.address.slice(0, 6)}...${this.address.slice(-4)}` : '';
    }

    if (walletBalance) {
      if (this.connected) {
        this.getBalance().then(balance => {
          walletBalance.textContent = `${parseFloat(balance).toFixed(2)} GEORGE`;
        });
      } else {
        walletBalance.textContent = '';
      }
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    });
  }
}

// Initialize Mobile Wallet Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mobileWalletManager = new MobileWalletManager();
});

// Export for use in other scripts
window.MobileWalletManager = MobileWalletManager;
