import { useState } from "react";
import { signIn } from "../lib/store";

export function Login() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pw || busy) return;
          setBusy(true);
          setErr("");
          const r = await signIn(pw);
          setBusy(false);
          if (r === "wrong") setErr("That password isn’t right.");
          else if (r === "not-set-up") setErr("No password is set yet. Add APP_PASSWORD in Cloudflare, then try again.");
          else if (r === "error") setErr("Couldn’t reach the server. Check your connection and try again.");
        }}
      >
        <h1>ToDoMe</h1>
        <p>Sign in once on each device. You’ll stay signed in.</p>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {err && <p className="err" role="alert">{err}</p>}
      </form>
    </div>
  );
}
