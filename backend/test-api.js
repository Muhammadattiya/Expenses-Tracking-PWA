require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ _id: '6a6136c1ca1b30cf1ce55cb2' }, process.env.JWT_SECRET);

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/budgets/recommendation?categoryId=6a651b3b16df8facbfc17fa9&period=monthly', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Success:', data);
  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
