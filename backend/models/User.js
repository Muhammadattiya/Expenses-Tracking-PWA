const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  picture: String,
  smsWebhookToken: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true,
    default: () => require('crypto').randomBytes(16).toString('hex')
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
