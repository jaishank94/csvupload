const WalletConnectProvider = require("@walletconnect/web3-provider");
const Web3 = require("web3");
const User = require("../models/User");

const connectWallet = async (address) => {
  const provider = new WalletConnectProvider({
    infuraId: "YOUR_INFURA_PROJECT_ID",
  });

  await provider.enable();
  return new Web3(provider);
};

const walletController = {
  addBalance: async (req, res) => {
    const { address, amount } = req.body;

    try {
      const web3 = await connectWallet(address);

      // Perform necessary contract interactions to add balance

      const user = await User.findOne({ address });
      user.balance += amount;
      user.transactions.push({
        type: "deposit",
        amount,
        timestamp: new Date(),
      });
      await user.save();

      res.json({ message: "Balance added successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  },

  requestWithdrawal: async (req, res) => {
    const { address, amount } = req.body;

    try {
      const web3 = await connectWallet(address);

      // Perform necessary contract interactions to request withdrawal

      const user = await User.findOne({ address });
      user.balance -= amount;
      user.transactions.push({
        type: "withdrawal",
        amount,
        timestamp: new Date(),
      });
      await user.save();

      res.json({ message: "Withdrawal requested successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  },

  getEarnings: async (req, res) => {
    const { address } = req.query;

    try {
      const user = await User.findOne({ address });
      res.json({ earnings: user.earnings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  },

  getTransactionLogs: async (req, res) => {
    const { address } = req.query;

    try {
      const user = await User.findOne({ address });
      res.json({ transactions: user.transactions });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred" });
    }
  },
};

module.exports = walletController;
