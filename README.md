# ToDoMe

A notebook for everything I need to remember to do. Write it down; dates are picked up as you type.

- **Today** fills itself: things dated today, plus anything highlighted. Missed things carry over for a week, then wait quietly in the Notebook.
- **Upcoming**: everything with a future date, by day.
- **Notebook**: everything written down, newest at the bottom.

Try: `call dentist tomorrow 9am` · `water plants every sunday` · `pay rent nov 30` · `stretch every weekday 7:30am` · `learn piano someday`

## One-time setup (Cloudflare)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick `ToDoMe`. Keep the project name `todome`. Build command `bun run build`, deploy command `npx wrangler deploy`. Save and deploy.
2. Worker **todome** → **Settings** → **Variables and Secrets** → **Add**: type **Secret**, name `APP_PASSWORD`, value = the password you'll sign in with.
3. Open the `todome.<your-subdomain>.workers.dev` link, sign in. On iPhone: Share → **Add to Home Screen**.

After that, every push to `main` deploys automatically. The database is created automatically on the first deploy; if the deploy log says it couldn't create it, add a D1 database named `todome` under **Storage & Databases → D1** and redeploy.

## Development

```bash
bun install
echo "APP_PASSWORD=dev" > .dev.vars
bun run dev
```
