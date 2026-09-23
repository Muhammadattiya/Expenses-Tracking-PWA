async function testGoalEdit() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gemini@gmail.com', password: '123456789' })
  });

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login set-cookie:', cookie ? 'Present' : 'None');

  const goalsRes = await fetch('http://localhost:5000/api/savings-goals', {
    headers: { Cookie: cookie }
  });
  const goalsJson = await goalsRes.json();
  console.log('Goals fetched:', goalsJson.data?.length);

  if (goalsJson.data?.length > 0) {
    const goal = goalsJson.data[0];
    console.log('First goal before edit:', {
      _id: goal._id,
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      allocationType: goal.allocationType
    });

    const editRes = await fetch(`http://localhost:5000/api/savings-goals/${goal._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify({
        title: goal.title + ' (Updated)',
        targetAmount: goal.targetAmount + 500,
        currentAmount: 12345,
        targetDate: goal.targetDate,
        linkedAccountId: goal.linkedAccountId?._id || goal.linkedAccountId,
        allocationType: goal.allocationType || 'dedicated'
      })
    });

    const editJson = await editRes.json();
    console.log('Edit response status:', editRes.status, 'Data:', {
      title: editJson.data?.title,
      targetAmount: editJson.data?.targetAmount,
      currentAmount: editJson.data?.currentAmount
    });
  }
}

testGoalEdit().catch(console.error);
