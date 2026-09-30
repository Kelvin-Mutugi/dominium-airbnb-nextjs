declare module "@paystack/inline-js" {
  interface PaystackTransactionResult {
    id: number;
    reference: string;
    message: string;
  }

  interface PaystackCallbacks {
    onLoad?: () => void;
    onSuccess?: (transaction: PaystackTransactionResult) => void;
    onCancel?: () => void;
    onError?: (error: { message?: string }) => void;
  }

  interface PopupTransaction {
    id: string;
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): PopupTransaction;
    cancelTransaction(transaction: string | PopupTransaction): void;
  }
}