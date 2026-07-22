const mongoose = require("mongoose");
const Account = require('../models/Account');
const Category = require('../models/Category');

const removeLegacyIndexes = async () => {
  const removeIfPresent = async (model, indexName) => {
    try { await model.collection.dropIndex(indexName); } catch (error) { if (error.code !== 27 && error.codeName !== 'IndexNotFound') throw error; }
  };
  await Promise.all([
    removeIfPresent(Account, 'name_1'),
    removeIfPresent(Category, 'name_1_type_1'),
  ]);
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await removeLegacyIndexes();

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);

    process.exit(1);
  }
};

module.exports = connectDB;
