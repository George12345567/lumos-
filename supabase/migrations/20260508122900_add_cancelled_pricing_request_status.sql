-- Add cancelled as a first-class pricing request status before later
-- migrations reference it in functions.
alter type public.request_status_enum add value if not exists 'cancelled';
