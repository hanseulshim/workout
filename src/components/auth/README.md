# auth

Client authentication UI components for email/password sign-in, account registration, and sign-out using Supabase Auth.

## Interface

- `[login-form.tsx:LoginForm]` — Renders the sign-in card form (`email`, `password`) with link to `/auth/signup`.
- `[signup-form.tsx:SignupForm]` — Renders the account registration card form (`email`, `password`) with link to `/auth/login`.
- `[logout-button.tsx:LogoutButton]` — Renders a ghost icon button (`aria-label="Sign out"`) that terminates the current session.

## Invariants

- `[signup-form.tsx:SignupForm]` — Enforces `required` and `minLength={8}` on the password input and sets `emailRedirectTo` to `${location.origin}/auth/callback`.
- `[login-form.tsx:LoginForm]`, `[signup-form.tsx:SignupForm]` — Submit buttons are disabled while `loading` is `true` to prevent duplicate auth requests.

## Side Effects

- `[login-form.tsx:LoginForm]` — Calls `supabase.auth.signInWithPassword`; displays `toast.error` on failure, or navigates via `router.push("/")` and `router.refresh()` on success.
- `[signup-form.tsx:SignupForm]` — Calls `supabase.auth.signUp`; displays `toast.error` on failure, or `toast.success` and `router.push("/auth/login")` on success.
- `[logout-button.tsx:LogoutButton]` — Calls `supabase.auth.signOut`, then navigates via `router.push("/auth/login")` and `router.refresh()`.

## Verification

```bash
npm run lint && npm run build
```
