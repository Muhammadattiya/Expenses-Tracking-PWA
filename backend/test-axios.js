require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ _id: '6a60639cca1b30cf1ce4ff9e' }, process.env.JWT_SECRET);

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
});

async function test() {
  try {
    const res = await api.get('/budgets/recommendation', {
      params: { categoryId: '6a6598b8df8126e24d3acffb', period: 'monthly' }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
