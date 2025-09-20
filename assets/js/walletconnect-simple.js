/**
 * Simple WalletConnect Implementation for George Token
 * Mobile-friendly wallet connection without complex dependencies
 */

class SimpleWalletManager {
  constructor() {
    this.provider = null;
    this.connected = false;
    this.address = null;
    this.chainId = null;
    this.contract = null;

    this.init();
  }

  async init() {
    try {
      console.log("Initializing Simple Wallet Manager...");

      // Use the existing Web3Modal v1 setup but with better mobile handling
      this.setupEventListeners();
      this.updateUI();

    } catch (error) {
      console.error('Failed to initialize Simple Wallet Manager:', error);
    }
  }

  setupEventListeners() {
    // Listen for account changes
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

      console.log("Attempting to connect wallet...");

      // Try MetaMask/injected wallet first
      if (window.ethereum) {
        try {
          console.log("Trying MetaMask/injected wallet...");
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });

          this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
          this.address = accounts[0];
          this.chainId = parseInt(chainId, 16);

          console.log("Connected to:", this.address);
          console.log("Chain ID:", this.chainId);

          if (this.chainId !== 56) {
            alert("Please switch to Binance Smart Chain (BSC) network.");
            return;
          }

          this.connected = true;
          await this.initializeContract();
          this.updateUI();
          this.showSuccess('Wallet connected successfully!');
          return;

        } catch (error) {
          console.warn("MetaMask connection failed:", error);
        }
      }

      // Fallback to WalletConnect
      if (window.web3Modal) {
        try {
          console.log("Trying WalletConnect...");
          const instance = await window.web3Modal.connect();

          if (instance) {
            if (typeof instance.request === "function") {
              this.provider = new window.ethers.providers.Web3Provider(instance);
            } else if (instance.provider) {
              this.provider = new window.ethers.providers.Web3Provider(instance.provider);
            } else {
              this.provider = new window.ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
            }

            const signer = this.provider.getSigner();
            this.address = await signer.getAddress();
            const network = await this.provider.getNetwork();
            this.chainId = network.chainId;

            if (this.chainId !== 56) {
              alert("Please switch to Binance Smart Chain (BSC) network.");
              return;
            }

            this.connected = true;
            await this.initializeContract();
            this.updateUI();
            this.showSuccess('Wallet connected successfully via WalletConnect!');
            return;
          }
        } catch (error) {
          console.warn("WalletConnect failed:", error);
        }
      }

      // Last resort - try direct connection
      throw new Error("No wallet connection method worked. Please install MetaMask or use WalletConnect.");

    } catch (error) {
      console.error('Connection failed:', error);
      this.showError('Connection failed: ' + error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (window.web3Modal) {
        await window.web3Modal.clearCachedProvider();
      }

      if (this.provider && this.provider.removeAllListeners) {
        this.provider.removeAllListeners();
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    });
  }
}

// Initialize Simple Wallet Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.simpleWalletManager = new SimpleWalletManager();
});

// Export for use in other scripts
window.SimpleWalletManager = SimpleWalletManager;
