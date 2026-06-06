# FORMA Auth Email Templates

Supabase Auth email branding is configured in the Supabase Dashboard, not in the React app.

## Confirm Signup

- Dashboard path: Authentication > Email Templates > Confirm signup
- Subject: `Confirm your FORMA account`
- HTML body: copy `confirm-signup.html`

## Sender Branding

To remove the default Supabase sender/branding, configure custom SMTP:

- Dashboard path: Authentication > Settings > SMTP
- Sender name: `FORMA`
- Sender email: a verified domain-owned address such as `no-reply@auth.yourdomain.com`
- DNS: configure SPF, DKIM, and DMARC with the email provider

Supabase's default mailer is for development and can show Supabase branding/rate limits. Production needs custom SMTP plus branded templates.

Docs:

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
