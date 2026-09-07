require('dotenv').config();
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'NOT_SET';
// Extract safe metadata only - no credentials
const url = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
console.log('ENV_VAR_NAME:', process.env.MONGODB_URI ? 'MONGODB_URI' : (process.env.MONGO_URI ? 'MONGO_URI' : 'NEITHER'));
console.log('HOST:', url.hostname);
console.log('DATABASE:', url.pathname.replace('/', ''));
console.log('PROTOCOL:', uri.startsWith('mongodb+srv') ? 'mongodb+srv' : (uri.startsWith('mongodb://') ? 'mongodb' : 'unknown'));
