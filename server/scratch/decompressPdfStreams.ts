import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function extractAllBtText(pdfPath: string) {
  const buf = fs.readFileSync(pdfPath);
  const pdfStr = buf.toString('binary');
  
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;
  let textContent = '';

  while ((match = streamRegex.exec(pdfStr)) !== null) {
    let streamText = match[1];
    try {
      streamText = zlib.inflateSync(Buffer.from(match[1], 'binary')).toString('binary');
    } catch {}

    const btRegex = /BT[\s\S]*?ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(streamText)) !== null) {
      const block = btMatch[0];
      // extract content inside parens (text) or hex <...>
      const strRegex = /\((.*?)\)|<([0-9a-fA-F]+)>/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        if (strMatch[1] !== undefined) {
          textContent += strMatch[1] + ' ';
        } else if (strMatch[2] !== undefined) {
          const hex = strMatch[2];
          let decoded = '';
          for (let i = 0; i < hex.length; i += 2) {
            decoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
          }
          textContent += decoded + ' ';
        }
      }
    }
  }

  return textContent;
}

function verifyPdf(docName: string, filename: string) {
  const filePath = path.join(__dirname, filename);
  const text = extractAllBtText(filePath);

  const cleanText = text.replace(/\s+/g, '');

  console.log(`=== ${docName} (${filename}) ===`);
  console.log('Contains "TESTFINANCESERVICES":', cleanText.includes('TESTFINANCESERVICES'));
  console.log('Contains "test@finance-demo.com":', cleanText.includes('test@finance-demo.com'));
  console.log('Contains "9999999999":', cleanText.includes('9999999999'));
  console.log('Contains "TestBusinessAddress":', cleanText.includes('TestBusinessAddress'));
}

verifyPdf('APPROVAL LETTER PDF', 'Approval_Letter_TEST_BRAND.pdf');
verifyPdf('INVOICE PDF', 'Invoice_TEST_BRAND.pdf');
