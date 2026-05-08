# Admin Temporary Password Setup

## How The Feature Works

Admins can set a temporary password for an existing client from `/lumos-admin`.

Flow:

1. Admin opens a client in the Admin Dashboard.
2. Admin opens the client Security tab.
3. Admin clicks `Set Temporary Password`.
4. Admin enters or generates a strong temporary password.
5. Frontend calls the Supabase Edge Function `admin-set-client-password`.
6. The Edge Function verifies the caller is authenticated and `public.is_admin()` returns true.
7. The Edge Function uses the server-only service role key to update the Supabase Auth user password.
8. The Edge Function updates `public.clients` flags:
   - `auth_password_pending = false`
   - `password_must_change = true`
   - `password_updated_by_admin_at = now()`
   - `password_updated_by_admin_by = caller auth user id`
9. The frontend shows the temporary password once so the admin can copy it.
10. The client logs in and is forced to `/change-password`.
11. After a successful password change, `password_must_change` becomes false and the client is redirected to `/profile`.

No plaintext password is stored in the database.

## Files Added

- `supabase/migrations/20260507150200_admin_temp_password_flags.sql`
- `supabase/functions/admin-set-client-password/index.ts`
- `src/services/adminPasswordService.ts`
- `src/pages/ChangePasswordPage.tsx`

## Required Supabase Secrets

The Edge Function must have these Supabase-provided environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Important:

- `SUPABASE_SERVICE_ROLE_KEY` must exist only in Supabase Edge Function secrets.
- Do not add the service role key to `.env`.
- Do not create `VITE_SUPABASE_SERVICE_KEY`.
- Do not create any `VITE_*_SERVICE_*` variable.
- Vite frontend variables are bundled into browser JavaScript.

## Deploy Steps

1. Apply migrations:

```bash
supabase db push
```

2. Deploy the Edge Function:

```bash
supabase functions deploy admin-set-client-password
```

3. Confirm Edge Function secrets are available:

```bash
supabase secrets list
```

4. If needed, set the service role secret in Supabase:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Do not commit or paste the actual key into source files, reports, screenshots, or frontend `.env` files.

## How To Test

Admin happy path:

1. Sign in as a real admin whose `public.clients.role = 'admin'`.
2. Open `/lumos-admin`.
3. Open a client.
4. Go to `Security`.
5. Click `Set Temporary Password`.
6. Generate or enter a strong password.
7. Confirm.
8. Verify the modal shows success and displays the temporary password once.
9. Copy the password and close the modal.
10. Confirm `public.clients.password_must_change = true` for that client.
11. Sign in as that client with the temporary password.
12. Confirm the client is redirected to `/change-password`.
13. Change the password.
14. Confirm the client lands on `/profile`.
15. Confirm `public.clients.password_must_change = false`.

Security negative tests:

1. Sign in as a normal client.
2. Attempt to call `admin-set-client-password`.
3. Confirm the function returns `not_admin`.
4. Attempt a weak password.
5. Confirm the function returns `weak_password`.
6. Confirm no plaintext password appears in `public.clients`.
7. Confirm no service-role key appears in frontend `dist`.

## Recovering Stuck Invited Users Safely

If a client is stuck because their initial invite password is unknown or invalid:

1. Open the client in `/lumos-admin`.
2. Use `Set Temporary Password`.
3. Copy the password from the one-time success screen.
4. Send it through a secure out-of-band channel.
5. Tell the client they will be forced to set a new password on first login.

Do not:

- Store the temporary password in `admin_notes`.
- Send it through analytics.
- Paste it into logs.
- Add it to database fields.
- Ask the client for their current password.

## Notes

- Admins cannot see a client's current password.
- The feature only sets a new temporary password.
- Real authorization is enforced by the Edge Function and `public.is_admin()`.
- The frontend admin route remains a UX gate only.
