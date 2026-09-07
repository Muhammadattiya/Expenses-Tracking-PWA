const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new"
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 }); // iPhone 12/13 size
  
  try {
    await page.goto('http://localhost:5173/add', { waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
    console.log("Navigated, but some network requests might still be pending.");
  }
  
  await page.screenshot({ path: 'add_tx_test.png' });
  await browser.close();
  console.log("Screenshot saved to add_tx_test.png");
})();
