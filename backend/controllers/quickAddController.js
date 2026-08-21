const nlpParser = require('../services/quickAdd/nlpParser');
const intentResolver = require('../services/quickAdd/intentResolver');
const transactionService = require('../services/transactionService');
const { migrateCategoryIntents } = require('../services/quickAdd/categoryMigration');

const parseTransactions = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ message: "Text is required" });
    
    if (text.length > 500) {
      return res.status(400).json({ message: "Text input is too long." });
    }
    
    // 1. Fetch user accounts and parse text into candidate transactions
    const Account = require('../models/Account');
    const userAccounts = await Account.find({ user: req.user.id }).lean();
    const candidates = nlpParser.parseText(text, userAccounts);
    
    // 2. Resolve categories for each candidate
    const resolvedCandidates = [];
    for (const cand of candidates) {
      let resolvedCategory = null;
      if (cand.intent) {
         resolvedCategory = await intentResolver.resolveCategory(req.user.id, cand.intent, cand.type);
      }
      resolvedCandidates.push({
         ...cand,
         categoryId: resolvedCategory ? resolvedCategory._id : null,
         categoryName: resolvedCategory ? resolvedCategory.name : null,
         categoryIcon: resolvedCategory ? resolvedCategory.icon : null,
      });
    }
    
    res.status(200).json(resolvedCandidates);
  } catch (error) {
    console.error("QuickAdd Parse Error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء معالجة النص." });
  }
};

const confirmTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) return res.status(400).json({ message: "Transactions array is required" });
    
    if (transactions.length > 10) {
       return res.status(400).json({ message: "Too many transactions to process at once." });
    }
    
    const mongoose = require('mongoose');
    const Category = require('../models/Category');
    const Account = require('../models/Account');
    
    const results = [];
    for (const t of transactions) {
      let title = (t.description || 'معاملة سريعة').toString().trim();
      if (title.length > 100) title = title.substring(0, 100);
      
      let date = new Date();
      if (t.date) {
         const parsedDate = new Date(t.date);
         if (!isNaN(parsedDate.getTime())) date = parsedDate;
      }

      if (t.type === 'transfer') {
         if (!t.amount || t.amount <= 0 || !t.sourceAccountId || !t.destinationAccountId) {
             throw new Error("Invalid transfer data provided.");
         }
         if (!mongoose.Types.ObjectId.isValid(t.sourceAccountId) || !mongoose.Types.ObjectId.isValid(t.destinationAccountId)) {
             throw new Error("Invalid Object IDs.");
         }
         const [fromAccount, toAccount] = await Promise.all([
            Account.findOne({ _id: t.sourceAccountId, user: req.user.id }).lean(),
            Account.findOne({ _id: t.destinationAccountId, user: req.user.id }).lean()
         ]);
         if (!fromAccount || !toAccount) throw new Error("Account not found or unauthorized.");
         
         const created = await transactionService.createTransaction(req.user.id, {
            title,
            amount: Number(t.amount),
            type: 'transfer',
            date: date.toISOString(),
            from_account: t.sourceAccountId,
            to_account: t.destinationAccountId
         });
         results.push(created);
      } else {
         if (!t.amount || t.amount <= 0 || !t.type || !t.categoryId || !t.accountId) {
             throw new Error("Invalid transaction data provided.");
         }
         if (!mongoose.Types.ObjectId.isValid(t.categoryId) || !mongoose.Types.ObjectId.isValid(t.accountId)) {
             throw new Error("Invalid Object IDs.");
         }
         const [account, category] = await Promise.all([
            Account.findOne({ _id: t.accountId, user: req.user.id }).lean(),
            Category.findOne({ _id: t.categoryId, user: req.user.id }).lean()
         ]);
         if (!account) throw new Error("Account not found or unauthorized.");
         if (!category) throw new Error("Category not found or unauthorized.");
         
         const created = await transactionService.createTransaction(req.user.id, {
            title,
            amount: Number(t.amount),
            type: t.type,
            date: date.toISOString(),
            category: t.categoryId,
            account: t.accountId
         });
         results.push(created);
      }
    }
    
    res.status(201).json({ success: true, count: results.length, transactions: results });
  } catch (error) {
    console.error("QuickAdd Confirm Error:", error);
    res.status(400).json({ message: error.message });
  }
};

const triggerMigration = async (req, res) => {
   try {
     const migratedCount = await migrateCategoryIntents(req.user.id);
     res.status(200).json({ success: true, migratedCount });
   } catch (error) {
     res.status(500).json({ message: error.message });
   }
};

module.exports = { parseTransactions, confirmTransactions, triggerMigration };
