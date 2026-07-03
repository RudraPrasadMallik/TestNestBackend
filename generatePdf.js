const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const htmlPath = path.resolve(__dirname, 'resume.html');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: path.resolve(__dirname, 'Rudra_Prasad_Mallik_Resume.pdf'),
    format: 'A4',
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    printBackground: true,
  });
  
  await browser.close();
  console.log('PDF generated: RudraPrasadMallik_Resume.pdf');
})();
