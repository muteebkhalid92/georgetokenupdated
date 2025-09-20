/**
 * WalletConnect v2 Integration for George Token
 * Modern mobile-compatible wallet connection
 */

class WalletConnectManagerV2 {
  constructor() {
    this.provider = null;
    this.web3Modal = null;
    this.connected = false;
    this.address = null;
    this.chainId = null;
    this.contract = null;

    this.init();
  }

  async init() {
    try {
      // Initialize Web3Modal v2 with WalletConnect v2
      const { Web3Modal } = await import('https://esm.sh/@web3modal/standalone@2.4.3');
      const { EthereumClient } = await import('https://esm.sh/@web3modal/ethereum@2.4.3');

      // Configure chains
      const chains = [
        {
          chainId: 56,
          name: 'BNB Smart Chain',
          currency: 'BNB',
          explorerUrl: 'https://bscscan.com',
          rpcUrl: 'https://bsc-dataseed.binance.org/'
        }
      ];

      // Configure providers
      const projectId = 'bbea909fab957b86dd6e58c5dd5e67ab';

      const { providers } = await import('https://esm.sh/@web3modal/ethereum@2.4.3');

      const walletConnectProvider = providers.WalletConnectProvider({
        projectId,
        chains,
        showQrModal: true,
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_requestAccounts',
          'eth_accounts',
          'eth_chainId',
          'eth_getBalance',
          'eth_getCode',
          'eth_getTransactionCount',
          'eth_getBlockByNumber',
          'eth_call'
        ],
        events: ['chainChanged', 'accountsChanged', 'disconnect']
      });

      const ethereumClient = new EthereumClient({
        projectId,
        chains,
        providers: [walletConnectProvider]
      });

      this.web3Modal = new Web3Modal({
        projectId,
        ethereumClient,
        themeMode: 'dark',
        themeVariables: {
          '--w3m-font-family': 'Inter, sans-serif',
          '--w3m-accent-color': '#d9f71f',
          '--w3m-background-color': '#0a001f'
        }
      });

      this.setupEventListeners();
      this.updateUI();

    } catch (error) {
      console.error('Failed to initialize WalletConnect v2:', error);
      this.showError('Failed to initialize wallet connection');
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

      const connection = await this.web3Modal.openModal();
      this.provider = connection.provider;

      if (this.provider) {
        await this.provider.enable();
        const accounts = await this.provider.request({ method: 'eth_accounts' });
        const chainId = await this.provider.request({ method: 'eth_chainId' });

        this.handleAccountsChanged(accounts);
        this.handleChainChanged(chainId);

        this.connected = true;
        this.updateUI();
        this.showSuccess('Wallet connected successfully!');

        // Initialize contract
        await this.initializeContract();
      }

    } catch (error) {
      console.error('Connection failed:', error);
      this.showError('Failed to connect wallet');
    }
  }

  async disconnect() {
    try {
      if (this.web3Modal) {
        await this.web3Modal.closeModal();
      }

      if (this.provider && this.provider.disconnect) {
        await this.provider.disconnect();
      }

      this.connected = false;
      this.address = null;
      this.chainId = null;
      this.contract = null;

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
      if (!window.ethereum || !this.address) return;

      const { ethers } = await import('https://esm.sh/ethers@5.7.2');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      this.contract = new ethers.Contract(
        "0x1Fe716F572B6DD5a92379E76949c0F951821BB18",
        [
          // Standard ERC20 ABI
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

      return ethers.utils.formatUnits(balance, decimals);
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

// Initialize WalletConnect v2 when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.walletConnectManagerV2 = new WalletConnectManagerV2();
});

// Export for use in other scripts
window.WalletConnectManagerV2 = WalletConnectManagerV2;
