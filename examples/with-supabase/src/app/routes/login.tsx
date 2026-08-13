import { signInWithPasswordAction, sendMagicLinkAction } from "@kamod-ch/otok-supabase/auth";

export const action = signInWithPasswordAction({
  successRedirect: "/dashboard",
  redirectAllowlist: ["/", "/dashboard", "/login"],
});

export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <form method="post">
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required />
        </label>
        <button type="submit">Sign in with password</button>
      </form>

      <h2>Magic link</h2>
      <p>Use the dedicated magic-link route action in a real app; see README.</p>
    </main>
  );
}

/** Example export for magic-link route modules. */
export const magicLinkAction = sendMagicLinkAction({
  successRedirect: "/login?checkEmail=1",
  redirectAllowlist: ["/", "/login"],
});
