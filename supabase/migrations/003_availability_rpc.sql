-- ─── 003_availability_rpc.sql ─────────────────────────────────────────────
-- Real-time availability checks for signup form.
-- Each function returns TRUE if the value is AVAILABLE (not taken).
-- Uses SECURITY DEFINER so anonymous users can call them
-- without needing direct SELECT on the clients table.
-- ──────────────────────────────────────────────────────────────────────────

-- Drop existing if re-running
DROP FUNCTION IF EXISTS check_username_available(TEXT);
DROP FUNCTION IF EXISTS check_email_available(TEXT);
DROP FUNCTION IF EXISTS check_phone_available(TEXT);

-- ─── check_username_available ────────────────────────────────────────────
-- Returns TRUE if no client row has this username (case-insensitive).
CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM clients
    WHERE LOWER(username) = LOWER(p_username)
  );
$$;

-- ─── check_email_available ────────────────────────────────────────────────
-- Returns TRUE if neither clients nor auth.users has this email (case-insensitive).
-- SECURITY DEFINER allows querying auth.users which is otherwise inaccessible.
CREATE OR REPLACE FUNCTION check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM clients WHERE LOWER(email) = LOWER(p_email)
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)
  );
$$;

-- ─── check_phone_available ────────────────────────────────────────────────
-- Returns TRUE if no client row has this phone_number.
CREATE OR REPLACE FUNCTION check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM clients WHERE phone_number = p_phone
  );
$$;

-- ─── Grant access to anon and authenticated roles ─────────────────────────
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_phone_available(TEXT) TO anon, authenticated;