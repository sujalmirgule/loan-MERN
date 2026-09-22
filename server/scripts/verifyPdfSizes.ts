import fs from 'fs';
import path from 'path';

const fileA = path.join(__dirname, '../scratch/Approval_Letter_Customer_A.pdf');
const fileB = path.join(__dirname, '../scratch/Approval_Letter_Customer_B.pdf');

console.log('Customer A PDF size:', fs.statSync(fileA).size);
console.log('Customer B PDF size:', fs.statSync(fileB).size);
