export type RefundProgressStatus =
  | 'awaiting_admin_review'
  | 'awaiting_manual_processing'
  | 'declined'
  | 'processed'
  | 'not_eligible'
  | 'not_applicable';

export interface RefundProgress {
  id: string;
  booking_id: string;
  payment_id: string | null;
  source?: 'payment' | 'cancellation';
  status: RefundProgressStatus;
  amount_paid: number | string;
  estimated_refund_amount?: number | string | null;
  actual_refund_amount: number | string | null;
  created_at: string;
  updated_at?: string;
  processed_at: string | null;
}

export interface RefundListItem extends RefundProgress {
  booking_reference: string;
  listing_title: string | null;
}