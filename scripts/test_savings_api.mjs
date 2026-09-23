async function testBackend() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gemini@gmail.com', password: '123456789' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.data?.token;
    console.log('Login successful! Token present:', !!token);

    const goalsRes = await fetch('http://localhost:5000/api/savings-goals', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const goalsData = await goalsRes.json();
    console.log('Goals status:', goalsRes.status, 'Data count:', goalsData?.data?.length);

    const shieldRes = await fetch('http://localhost:5000/api/emergency-fund', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const shieldData = await shieldRes.json();
    console.log('Shield status:', shieldRes.status, 'Current reserve:', shieldData?.data?.currentReserveAmount);
  } catch (err) {
    console.error('Backend test error:', err);
  }
}

testBackend();
