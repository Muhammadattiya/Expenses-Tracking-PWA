/**
 * End-to-End Dry Run Unit Test for SMS Webhook Controller
 * 
 * STRICT CONSTRAINT: ZERO DATABASE DELETIONS / MUTATIONS.
 * Tests handleSmsWebhook end-to-end with mock models and verified zero deletions.
 */

const assert = require('assert');
const crypto = require('crypto');
const User = require('./models/User');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const analyticsEngine = require('./services/analyticsEngine');
const notificationService = require('./services/notificationService');

// Mock external services
analyticsEngine.applyTransactionDelta = async () => {};
notificationService.sendToUser = async () => {};

const { handleSmsWebhook } = require('./controllers/smsWebhookController');
const { _clearQueueForUser } = require('./services/transferReconciliationService');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const Category = require('./models/Category');

UserMerchantKnowledge.findOne = function() {
  return { lean: async () => null };
};
GlobalMerchantKnowledge.findOne = function() {
  return { lean: async () => null };
};
Category.find = function() {
  return {
    sort: function() {
      return { lean: async () => [] };
    },
    lean: async () => []
  };
};

async function runWebhookTests() {
  console.log('Running SMS Webhook Controller E2E Dry-Run Tests (Zero DB Deletions)...\n');

  const rawToken = 'test_webhook_secret_token_123';
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const mockUser = {
    _id: '66000000000000000000000a',
    name: 'Mohamed Attiya',
    smsWebhookToken: hashedToken
  };

  const dbState = {
    transactions: [],
    deletedCount: 0
  };

  // Mock User.findOne
  const origUserFindOne = User.findOne;
  User.findOne = async function(query) {
    if (query.smsWebhookToken === hashedToken) return mockUser;
    return null;
  };

  // Mock Account.find
  const origAccountFind = Account.find;
  Account.find = function(query) {
    return {
      session: function() { return this; },
      lean: async function() {
        if (query.cardLast4 === '0694') {
          return [{ _id: 'acc_0694', user: mockUser._id, name: 'ADIB 0694', cardLast4: '0694', isArchived: false }];
        }
        if (query.cardLast4 === '4113') {
          return [{ _id: 'acc_4113', user: mockUser._id, name: 'QNB 4113', cardLast4: '4113', isArchived: false }];
        }
        if (query.cardLast4 === '1984') {
          return [{ _id: 'acc_1984', user: mockUser._id, name: 'Banque Misr 1984', cardLast4: '1984', isArchived: false }];
        }
        if (query._id && query._id.$in) {
          return [
            { _id: 'acc_0694', user: mockUser._id, isArchived: false },
            { _id: 'acc_4113', user: mockUser._id, isArchived: false }
          ];
        }
        return [];
      }
    };
  };

  // Mock Transaction methods
  const origTxFindOne = Transaction.findOne;
  const origTxCreate = Transaction.create;
  const origTxDeleteOne = Transaction.deleteOne;
  const origTxDeleteMany = Transaction.deleteMany;

  Transaction.findOne = async function(query) {
    if (query.smsHash) {
      return dbState.transactions.find(t => t.smsHash === query.smsHash) || null;
    }
    if (query.$or) {
      const match = dbState.transactions.find(t => {
        return query.$or.some(cond => {
          if (cond.smsHash && t.smsHash === cond.smsHash) return true;
          if (cond['smsProvenance.smsHash'] && t.smsProvenance && t.smsProvenance.some(p => p.smsHash === cond['smsProvenance.smsHash'])) return true;
          return false;
        });
      });
      return match || null;
    }
    if (query.idempotencyKey) {
      return dbState.transactions.find(t => t.idempotencyKey === query.idempotencyKey) || null;
    }
    return null;
  };

  Transaction.create = async function(doc) {
    const created = { ...doc, _id: 'tx_' + (dbState.transactions.length + 1) };
    dbState.transactions.push(created);
    return created;
  };

  Transaction.deleteOne = async function() {
    dbState.deletedCount++;
    throw new Error('VIOLATION: deleteOne must NEVER be called!');
  };
  Transaction.deleteMany = async function() {
    dbState.deletedCount++;
    throw new Error('VIOLATION: deleteMany must NEVER be called!');
  };

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  try {
    _clearQueueForUser(mockUser._id);

    // Test 1: Invalid Token -> 404
    const reqInvalid = { params: { userToken: 'wrong_token' }, body: 'some sms text' };
    const resInvalid = createMockRes();
    await handleSmsWebhook(reqInvalid, resInvalid, () => {});
    assert.strictEqual(resInvalid.statusCode, 404);
    assert.strictEqual(resInvalid.body.message, 'Invalid webhook token');
    console.log('✅ Test 1 Passed: Invalid webhook token returns 404');

    // Test 2: Regular Non-Transfer Transaction (POS swipe) -> Immediate 200
    const reqRegular = {
      params: { userToken: rawToken },
      body: { text: 'Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56 for lost/stolen card call 19700' }
    };
    const resRegular = createMockRes();
    await handleSmsWebhook(reqRegular, resRegular, () => {});
    assert.strictEqual(resRegular.statusCode, 200);
    assert.strictEqual(resRegular.body.message, 'Transaction saved');
    assert.strictEqual(resRegular.body.isReconciled, false);
    assert.strictEqual(dbState.transactions.length, 1);
    assert.strictEqual(dbState.transactions[0].type, 'expense');
    assert.strictEqual(dbState.transactions[0].amount, 257.14);
    console.log('✅ Test 2 Passed: Regular POS purchase created immediately without delay');

    // Test 3: Deduplication -> Returns existing transaction
    const resDup = createMockRes();
    await handleSmsWebhook(reqRegular, resDup, () => {});
    assert.strictEqual(resDup.statusCode, 200);
    assert.strictEqual(resDup.body.message, 'Transaction already exists (deduplicated)');
    assert.strictEqual(dbState.transactions.length, 1, 'No duplicate record created');
    console.log('✅ Test 3 Passed: Duplicate delivery returns deduplicated 200');

    // Test 4: IPN Transfer Outgoing SMS -> Held in Queue (Status Pending)
    const reqIpnOut = {
      params: { userToken: rawToken },
      body: { text: 'IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a. For more details call 19700' }
    };
    const resIpnOut = createMockRes();
    await handleSmsWebhook(reqIpnOut, resIpnOut, () => {});
    assert.strictEqual(resIpnOut.statusCode, 200);
    assert.strictEqual(resIpnOut.body.status, 'pending');
    assert.strictEqual(resIpnOut.body.isReconciled, false);
    assert.strictEqual(dbState.transactions.length, 1, 'No transaction created in DB yet');
    console.log('✅ Test 4 Passed: Transfer candidate held in queue without DB mutation');

    // Test 5: IPN Transfer Incoming SMS -> Reconciles Pair into 1 Transfer Transaction
    const reqIpnIn = {
      params: { userToken: rawToken },
      body: { text: 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 350.00 جم من MOHAMED AHMED ATIYA ABDELSALAM في 07:32 يوم 9/18/26 رقم المعاملة 43f3ef2a للمزيد أتصل ب 16990' }
    };
    const resIpnIn = createMockRes();
    await handleSmsWebhook(reqIpnIn, resIpnIn, () => {});
    assert.strictEqual(resIpnIn.statusCode, 200);
    assert.strictEqual(resIpnIn.body.isReconciled, true);
    assert.strictEqual(resIpnIn.body.message, 'Transfer reconciled successfully');
    assert.strictEqual(dbState.transactions.length, 2, 'Total transactions is now 2 (1 expense + 1 transfer)');

    const transferTx = dbState.transactions[1];
    assert.strictEqual(transferTx.type, 'transfer');
    assert.strictEqual(transferTx.amount, 350);
    assert.strictEqual(String(transferTx.from_account), 'acc_0694');
    assert.strictEqual(String(transferTx.to_account), 'acc_4113');
    assert.strictEqual(transferTx.smsProvenance.length, 2);
    assert.strictEqual(dbState.deletedCount, 0, 'EXACTLY ZERO database deletions');
    console.log('✅ Test 5 Passed: Transfer pair reconciled into exactly 1 Transfer transaction with zero deletions');

    console.log('\n🎉 ALL SMS WEBHOOK CONTROLLER E2E DRY-RUN TESTS PASSED!');
  } finally {
    User.findOne = origUserFindOne;
    Account.find = origAccountFind;
    Transaction.findOne = origTxFindOne;
    Transaction.create = origTxCreate;
    Transaction.deleteOne = origTxDeleteOne;
    Transaction.deleteMany = origTxDeleteMany;
    _clearQueueForUser(mockUser._id);
  }
}

runWebhookTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
