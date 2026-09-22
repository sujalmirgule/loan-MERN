import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testPdfRender() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PDF Test</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      </head>
      <body>
        <div id="status">Loading...</div>
        <canvas id="pdf-canvas"></canvas>
        <script>
          window.pdfReady = false;
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            document.getElementById('status').innerText = 'PDF.js loaded successfully';
            window.pdfReady = true;
          } else {
            document.getElementById('status').innerText = 'PDF.js failed to load';
          }
        </script>
      </body>
    </html>
  `);

  await page.waitForTimeout(2000);
  const status = await page.innerText('#status');
  console.log('PDF.js status:', status);
  await browser.close();
}

testPdfRender().catch(console.error);
