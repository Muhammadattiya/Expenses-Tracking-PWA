const text = "تم خصم 4050 EGP  من بطاقة المدفوعة مقدما رقم 2513  باستخدام Mobile Payment عند PAYMOBCAFE       C  يوم 20/07/26  الساعه 10:42  المتاح 1593.2EGP  للمزيد إتصل ب ١٩٦٢٣";

fetch("http://localhost:5555/api/sms/webhook/YOUR_TEST_TOKEN", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({text: text})
})
.then(res => res.text().then(data => {
  console.log("Status:", res.status);
  console.log("Response:", data);
}))
.catch(err => console.error(err));
