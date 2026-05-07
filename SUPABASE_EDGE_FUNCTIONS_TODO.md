# Supabase Edge Functions — TODO

The frontend is intentionally limited because two operations cannot be done
safely in the browser:

1. Creating a Supabase Auth user (requires the service-role key).
2. Verifying a security-question answer against a stored hash without
   sending the hash to the browser.

Both must run server-side. Below are the function specs. Until they are
implemented and deployed, the frontend already falls back to safe defaults
(admin must invite users from the Supabase dashboard; security-question
reset is disabled in favour of Supabase email reset).

---

## 1. `admin-create-client`

### Purpose
An authenticated admin posts a payload describing a new client. The
function (a) creates the auth user via Supabase Admin API, (b) sends an
invite email so the user can set their own password, and (c) inserts the
matching `public.clients` row linked by `id`.

### Required env (set via `supabase secrets set`, NOT in `VITE_*`)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL
```

### Auth checks
- Reject if the request has no `Authorization: Bearer <jwt>` header.
- Decode the JWT using the anon client and call `auth.getUser()` against
  the user-bound client. Confirm the user exists.
- Look up `public.clients.role` for that user id; reject unless `'admin'`.
- Apply rate limiting (Supabase default IP throttling is enough for now).

### Request payload (JSON)
```json
{
  "email": "newclient@company.com",
  "username": "newclient",
  "company_name": "Acme",
  "phone": "+201234567890",
  "package_name": "starter",
  "redirect_url": "https://lumos.example.com/client-login"
}
```

### Behaviour
1. Validate email/username/phone server-side (re-use `src/lib/validation.ts`
   rules).
2. Call `auth.admin.inviteUserByEmail(email, { redirectTo: redirect_url })`
   using the service-role client.
3. On success, upsert into `public.clients` with `id = invitedUser.id` and
   the rest of the payload. Set `role = 'client'` and
   `auth_password_pending = true`.
4. Insert an `audit_logs` row using `changed_by = caller.id`.
5. Return `{ ok: true, client_id: invitedUser.id }`.

### Response
- 200: `{ ok: true, client_id: "<uuid>" }`
- 400: `{ ok: false, error: "validation.<field>" }`
- 401: `{ ok: false, error: "auth.required" }`
- 403: `{ ok: false, error: "auth.not_admin" }`
- 409: `{ ok: false, error: "signup.email_exists" }`
- 500: `{ ok: false, error: "internal" }`

### Security notes
- Never echo the service-role key in responses or logs.
- Do not accept a password from the request — let Supabase generate the
  invite token. Letting an admin set a password directly creates a way for
  a compromised admin to log into a victim's account.
- Use `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: 'Bearer <jwt>' } } })`
  for the admin-check lookup, and a separate
  `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` for the privileged
  insert. Do not mix them.
- Wrap the function in a `try` and ensure no service-role-bearing client
  reference can leak into the response on error.

### Deployment
```
supabase functions new admin-create-client
# implement function as above
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-from-supabase-dashboard>
supabase functions deploy admin-create-client --no-verify-jwt false
```
The frontend can then POST to `/functions/v1/admin-create-client` from the
admin dashboard. Until this exists, the dashboard creates a profile-only
row and tells the operator to invite manually — that fallback ships now.

---

## 2. `verify-security-answer` (optional)

### Purpose
The forgot-password flow used to verify a security-question answer in the
browser by comparing against a hash read from `clients.package_details`.
That leaks the hash to anyone who can read the row. This function moves
the verification server-side.

**Status:** Optional. Frontend currently falls back to the Supabase email
reset link, which is fine for production. Build this only if the
security-question UX is a real product requirement.

### Required env
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SECURITY_RESET_TOKEN_SECRET   # HMAC secret used to mint reset tokens
```

### Request payload
```json
{
  "email": "user@example.com",
  "answer": "fluffy"
}
```

### Behaviour
1. Look up `public.clients` row by lower(email) using the service-role client.
2. Read `package_details->signup_profile->security_answer_hash`. If
   missing, return `{ ok: false }` (do NOT differentiate "no question set"
   from "wrong answer" — that leaks).
3. Hash the supplied answer with the same algorithm the frontend uses
   (`SHA-256(toLowerCase(trim(answer)))`).
4. If hashes match, mint a short-lived signed token
   (HMAC-SHA256, expires in 10 minutes, scoped to that user id) and return
   it. Otherwise return `{ ok: false }`.
5. The frontend then exchanges the token for a password reset link via a
   second function or by calling `auth.admin.generateLink({ type: 'recovery' })`.

### Security notes
- Never return the hash itself.
- Constant-time compare.
- Insert a row in `password_reset_requests` with `expires_at` and `used`
  flags so abuse is auditable.
- Apply per-IP and per-email rate limiting (5 attempts / 15 min).

### Deployment
```
supabase functions new verify-security-answer
supabase secrets set SECURITY_RESET_TOKEN_SECRET=$(openssl rand -hex 32)
supabase functions deploy verify-security-answer
```

Until this is deployed, leave `verifySecurityQuestion()` returning
`success: false` (it does already) and let the email reset flow handle all
forgot-password traffic.
