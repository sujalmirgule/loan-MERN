import QRCode from 'qrcode';
import { UpiProvider, UpiPaymentDetails, UpiPaymentData } from './upiProvider.interface';

export class ManualUpiProvider implements UpiProvider {
  readonly name = 'STANDARD_UPI_INTENT_AND_QR';

  async generatePaymentData(details: UpiPaymentDetails): Promise<UpiPaymentData> {
    const vpa = details.upiVpa.trim();
    const merchantName = details.merchantName.trim();
    const amountStr = Number(details.amount).toFixed(2);
    const note = details.note ? details.note.trim() : 'Fee Payment';

    // Standard NPCI UPI URI Specification
    // upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tr=<ref>&tn=<note>
    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(merchantName)}&am=${amountStr}&cu=INR&tr=${encodeURIComponent(details.transactionRef)}&tn=${encodeURIComponent(note)}`;

    // Generate high-resolution QR code data URL for desktop scanning
    const qrCodeDataUrl = await QRCode.toDataURL(upiIntentUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      upiIntentUrl,
      qrCodeDataUrl,
      upiVpa: vpa,
      merchantName,
      amount: details.amount,
      transactionRef: details.transactionRef,
    };
  }
}

export const manualUpiProvider = new ManualUpiProvider();
