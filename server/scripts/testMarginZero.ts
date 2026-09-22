import PDFDocument from 'pdfkit';

const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
const buffers: Buffer[] = [];
doc.on('data', (c) => buffers.push(c));
doc.on('end', () => {
  const buf = Buffer.concat(buffers);
  const str = buf.toString('latin1');
  const countMatch = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  console.log(`With margin 0: Pages /Count: ${countMatch ? countMatch[1] : 'unknown'}`);
});

// Page 1
doc.font('Helvetica-Bold').fontSize(14).text('Page 1 Title', 35, 35);
doc.text('Page 1 Footer', 35, 808);

// Page 2
doc.addPage({ margin: 0, size: 'A4' });
doc.font('Helvetica-Bold').fontSize(14).text('Page 2 Title', 35, 35);
doc.text('Page 2 Footer', 35, 808);

doc.end();
