const mongoose = require('mongoose');
const SimulationEngine = require('../services/simulation/simulationEngine');
const SimulationHistory = require('../models/SimulationHistory');
const Transaction = require('../models/Transaction');
const Installment = require('../models/Installment');
const Debt = require('../models/Debt');
const Bill = require('../models/Bill');
const Category = require('../models/Category');
const { calculateNextDueDate } = require('../services/installmentService');

exports.runSimulation = async (req, res, next) => {
  try {
    const { actions, horizonMonths } = req.body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing simulation actions array' });
    }

    const result = await SimulationEngine.runSimulation(req.user.id, actions, { horizonMonths });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.applySimulation = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { actions } = req.body;
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing simulation actions array' });
    }

    const createdRecords = {
      transactions: [],
      installments: [],
      debts: [],
      bills: []
    };

    await session.withTransaction(async () => {
      for (const action of actions) {
        const p = action.payload || {};

        if (action.type === 'purchase') {
          let catId = p.categoryId;
          if (!catId) {
            const defCat = await Category.findOne({ user: req.user.id, type: 'expense' }).session(session);
            catId = defCat?._id;
          }
          const [tx] = await Transaction.create([{
            user: req.user.id,
            type: 'expense',
            amount: Number(p.amount),
            account: p.accountId,
            category: catId,
            date: p.date ? new Date(p.date) : new Date(),
            notes: p.notes || 'شراء فعلي (مطبق من المحاكاة)'
          }], { session });
          createdRecords.transactions.push(tx._id);
        } else if (action.type === 'installment') {
          const totalAmount = Number(p.totalAmount) || 0;
          const downPayment = Number(p.downPayment) || 0;
          const totalMonths = Number(p.totalMonths) || 12;
          const monthlyAmount = Number(p.monthlyAmount) || Math.round((totalAmount - downPayment) / Math.max(1, totalMonths));
          const dueDayOfMonth = Number(p.dueDayOfMonth) || new Date().getDate();

          if (downPayment > 0) {
            let catId = p.categoryId;
            if (!catId) {
              const defCat = await Category.findOne({ user: req.user.id, type: 'expense' }).session(session);
              catId = defCat?._id;
            }
            const targetAccId = p.linkedAccountId || p.accountId;
            const [downTx] = await Transaction.create([{
              user: req.user.id,
              type: 'expense',
              amount: downPayment,
              account: targetAccId,
              category: catId,
              date: p.startDate ? new Date(p.startDate) : new Date(),
              notes: `[مقدم قسط] ${p.title || 'خطة تقسيط'}`
            }], { session });
            createdRecords.transactions.push(downTx._id);
          }

          const targetAccId = p.linkedAccountId || p.accountId;
          const [inst] = await Installment.create([{
            user: req.user.id,
            title: p.title || 'خطة تقسيط مجدولة',
            provider: p.provider || 'valU',
            totalAmount,
            downPayment,
            monthlyAmount,
            totalMonths,
            paidMonths: 0,
            dueDayOfMonth,
            linkedAccountId: targetAccId,
            nextDueDate: calculateNextDueDate(dueDayOfMonth),
            status: 'active',
            autoPay: p.autoPay || false,
            notes: p.notes || 'مطبقة من المحاكاة'
          }], { session });
          createdRecords.installments.push(inst._id);
        } else if (action.type === 'salary') {
          const [tx] = await Transaction.create([{
            user: req.user.id,
            type: 'income',
            amount: Number(p.amount),
            account: p.accountId,
            date: p.date ? new Date(p.date) : new Date(),
            notes: p.notes || 'راتب / دخل إضافي (مطبق من المحاكاة)'
          }], { session });
          createdRecords.transactions.push(tx._id);
        } else if (action.type === 'debt') {
          const [d] = await Debt.create([{
            user: req.user.id,
            person: p.person || 'شخص',
            type: p.debtType || 'i_owe',
            amount: Number(p.amount),
            dueDate: p.dueDate ? new Date(p.dueDate) : null,
            notes: p.notes || 'دين مطبق من المحاكاة'
          }], { session });
          createdRecords.debts.push(d._id);
        } else if (action.type === 'bill') {
          const [b] = await Bill.create([{
            user: req.user.id,
            title: p.title || 'فاتورة جديدة',
            amount: Number(p.amount),
            repeat: p.repeat || 'monthly',
            dueDay: Number(p.dueDay) || 1
          }], { session });
          createdRecords.bills.push(b._id);
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'تم تطبيق خطة المحاكاة بنجاح في الواقع',
      data: createdRecords
    });
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
};

exports.saveHistory = async (req, res, next) => {
  try {
    const { title, actions } = req.body;
    
    const history = await SimulationHistory.create({
      userId: req.user.id,
      title,
      actions
    });
    
    res.status(201).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await SimulationHistory.find({ userId: req.user.id })
      .sort('-createdAt')
      .lean();
      
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHistory = async (req, res, next) => {
  try {
    const history = await SimulationHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!history) {
      return res.status(404).json({ success: false, message: 'Simulation not found' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
