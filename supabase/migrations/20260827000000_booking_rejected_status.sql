-- Introduce a distinct "rejected" booking status so coordinator denials are no
-- longer stored as generic cancellations. Kept in its own migration because a
-- newly added enum value cannot be referenced in the same transaction.

alter type public.booking_status add value if not exists 'rejected';

alter table public.printer_bookings
  add column if not exists rejected_reason text,
  add column if not exists rejected_at timestamptz;
