import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function hasValidCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Cron authorization is not configured.' }, { status: 503 });
  }
  if (!hasValidCronAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('auto_decide_due_date_change_requests');
  if (error) {
    console.error('Automatic date-change decisions failed:', error);
    return NextResponse.json({ error: 'Automatic date-change decisions failed.' }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    autoApproved: Number(result?.auto_approved ?? 0),
    autoDeclined: Number(result?.auto_declined ?? 0),
  });
}