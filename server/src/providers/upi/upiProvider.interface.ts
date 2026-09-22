export interface UpiPaymentDetails {
  amount: number;
  upiVpa: string;
  merchantName: string;
  transactionRef: string;
  note?: string;
}

export interface UpiPaymentData {
  upiIntentUrl: string;
  qrCodeDataUrl: string;
  upiVpa: string;
  merchantName: string;
  amount: number;
  transactionRef: string;
}

export interface UpiProvider {
  readonly name: string;
  generatePaymentData(details: UpiPaymentDetails): Promise<UpiPaymentData>;
}
