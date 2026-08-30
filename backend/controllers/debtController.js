const Debt = require('../models/Debt');
const DebtTransaction = require('../models/DebtTransaction');

exports.createDebt = async (req, res) => {
  try {
    const { personName, type, amount, account, date, notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const debt = new Debt({
      user: req.user.id,
      personName,
      type,
      initialAmount: amount,
      remainingAmount: amount
    });
    
    await debt.save();

    const transaction = new DebtTransaction({
      user: req.user.id,
      debtId: debt._id,
      amount,
      type: 'loan',
      account,
      date: date || new Date(),
      notes
    });
    
    await transaction.save();
    
    await transaction.populate([
      { path: 'account', select: 'name type icon color' },
      { path: 'debtId', select: 'type' }
    ]);

    res.status(201).json({ debt, transaction });
  } catch (err) {
    console.error('[ERROR] createDebt:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user.id }).sort({ createdAt: -1 });
    const debtIds = debts.map(d => d._id);
    const transactions = await DebtTransaction.find({ user: req.user.id, debtId: { $in: debtIds } }).populate('account', 'name type icon color').populate('debtId', 'type').sort({ date: -1, createdAt: -1 });
    
    res.json({ debts, transactions });
  } catch (err) {
    console.error('[ERROR] getDebts:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { amount, type, account, date, notes } = req.body;
    
    const debt = await Debt.findOne({ _id: debtId, user: req.user.id });
    if (!debt) return res.status(404).json({ message: 'Debt not found' });
    
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    
    const transaction = new DebtTransaction({
      user: req.user.id,
      debtId,
      amount,
      type,
      account,
      date: date || new Date(),
      notes
    });
    
    await transaction.save();
    
    if (type === 'loan') {
      debt.remainingAmount += amount;
      debt.status = 'active';
    } else if (type === 'repayment') {
      debt.remainingAmount -= amount;
      if (debt.remainingAmount <= 0) {
        debt.remainingAmount = 0;
        debt.status = 'settled';
      }
    }
    
    await debt.save();
    
    await transaction.populate([
      { path: 'account', select: 'name type icon color' },
      { path: 'debtId', select: 'type' }
    ]);
    
    res.status(201).json({ debt, transaction });
  } catch (err) {
    console.error('[ERROR] addTransaction:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDebt = async (req, res) => {
  try {
    const { debtId } = req.params;
    const debt = await Debt.findOneAndDelete({ _id: debtId, user: req.user.id });
    if (!debt) return res.status(404).json({ message: 'Debt not found' });
    
    await DebtTransaction.deleteMany({ debtId });
    
    res.json({ message: 'Debt deleted successfully' });
  } catch (err) {
    console.error('[ERROR] deleteDebt:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDebt = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { personName, type } = req.body;
    
    const debt = await Debt.findOneAndUpdate(
      { _id: debtId, user: req.user.id },
      { personName, type },
      { returnDocument: 'after' }
    );
    
    if (!debt) return res.status(404).json({ message: 'Debt not found' });
    res.json({ debt });
  } catch (err) {
    console.error('[ERROR] updateDebt:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
