const webpush = require('web-push');
const Subscription = require('../models/Subscription');

const EXPIRED_SUBSCRIPTION_STATUS_CODES = new Set([404, 410]);
const DEFAULT_CONCURRENCY = 10;

let configured = false;

const configureWebPush = () => {
  if (configured) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
};

const buildPayload = ({ title, body, url }) => JSON.stringify({ title, body, url });

const sendToSubscription = async (subscription, payload) => {
  configureWebPush();

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      payload
    );
    return { delivered: true, expired: false };
  } catch (error) {
    const expired = EXPIRED_SUBSCRIPTION_STATUS_CODES.has(error.statusCode);
    if (expired) {
      await Subscription.findByIdAndDelete(subscription._id);
    }

    console.error('[PUSH] Delivery failed', {
      subscriptionId: subscription._id?.toString(),
      statusCode: error.statusCode,
      message: error.message,
    });

    return { delivered: false, expired };
  }
};

const sendToSubscriptions = async (subscriptions, payload, { concurrency = DEFAULT_CONCURRENCY } = {}) => {
  const results = [];
  const workerCount = Math.min(Math.max(concurrency, 1), subscriptions.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < subscriptions.length) {
      const index = nextIndex++;
      results[index] = await sendToSubscription(subscriptions[index], payload);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));

  return results.reduce(
    (summary, result) => ({
      attempted: summary.attempted + 1,
      delivered: summary.delivered + Number(result.delivered),
      failed: summary.failed + Number(!result.delivered),
      expired: summary.expired + Number(result.expired),
    }),
    { attempted: 0, delivered: 0, failed: 0, expired: 0 }
  );
};

const sendToUser = async (userId, payload, options) => {
  const subscriptions = await Subscription.find({ user: userId });
  return sendToSubscriptions(subscriptions, payload, options);
};

const sendToAll = async (payload, options) => {
  const subscriptions = await Subscription.find({});
  return sendToSubscriptions(subscriptions, payload, options);
};

module.exports = {
  buildPayload,
  configureWebPush,
  sendToSubscription,
  sendToSubscriptions,
  sendToUser,
  sendToAll,
};
