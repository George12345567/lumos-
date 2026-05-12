# Lumos Supabase Email Templates

These HTML files are ready to paste into Supabase Auth email templates.

Templates included:

- `confirm-signup.html` - LUMOS Confirm Your Signup
- `invite-user.html` - You have been invited to LUMOS
- `magic-link.html` - Magic Link
- `confirm-email-change.html` - Confirm Email Change
- `reset-password.html` - Reset Your Password
- `confirm-reauthentication.html` - Confirm Reauthentication

They use Supabase template variables:

- `{{ .ConfirmationURL }}`
- `{{ .SiteURL }}`
- `{{ .Email }}`
- `{{ .NewEmail }}`

Logo reference:

```html
{{ .SiteURL }}/brand/lumos-logo.png
```

No local Windows paths are used.
