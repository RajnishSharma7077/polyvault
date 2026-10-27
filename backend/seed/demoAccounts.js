const Customer = require('../models/customer.model');

const demoAccounts = [
  {
    fullName: 'PolyVault Demo Buyer',
    email: 'buyer.demo@example.com',
    password: 'VaultDemo#2026',
    phone: '9876501001',
    isCreator: false,
  },
  {
    fullName: 'PolyVault Demo Creator',
    email: 'creator.demo@example.com',
    password: 'VaultDemo#2026',
    phone: '9876501002',
    isCreator: true,
  },
];

async function seedDemoAccounts() {
  if (process.env.ENABLE_DEMO_ACCOUNTS !== 'true') return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo accounts cannot be enabled in production');
  }

  for (const account of demoAccounts) {
    const existing = await Customer.findOne({ email: account.email });
    if (!existing) {
      await Customer.create(account);
      continue;
    }

    if (account.isCreator && !existing.isCreator) {
      existing.isCreator = true;
      await existing.save();
    }
  }

  console.log('Development demo accounts are ready');
}

module.exports = { demoAccounts, seedDemoAccounts };
