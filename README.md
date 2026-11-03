# Ledgerly - Personal Finance & Budgeting App

A full-stack personal finance app built with **React 18, Vite, Tailwind CSS and Supabase (Postgres + Auth)**.
It is responsive from phones to desktops, supports light and dark themes, and installs as a PWA.

## Features

- **Authentication**: email and password sign up, sign in, sign out, forgot password and reset password
- **Dashboard**: total balance, monthly income and spending with month-over-month change, savings rate, six-month chart, spending breakdown, recent transactions, budget and goal progress
- **Transactions**: add, edit, delete; search by description; filter by type, category, account and date range; pagination; CSV export
- **Accounts**: checking, savings, credit card, cash and investment accounts with live balances; archive or delete
- **Budgets**: monthly limit per category with progress bars, month navigation, over-budget warnings
- **Goals**: savings goals with target dates, deposits and withdrawals, progress tracking
- **Reports**: preset or custom date ranges, income vs spending, net cash flow, category breakdown, CSV export
- **Categories**: default set created on signup; create, edit and delete your own with color and icon
- **Admin dashboard**: app-wide statistics (users, sign-ups, active users, transaction volume, popular categories) and a searchable user list, visible only to admins
- **Settings**: profile, currency (29 options), light/dark/system theme, change password, export all data, delete all data
- **PWA**: installable, offline app shell, update on new deploy, home-screen shortcuts, offline banner
- **Security**: Postgres Row Level Security on every table, so each user can only access their own rows

## Prerequisites

- Node.js 18 or newer
- A free Supabase account: https://supabase.com

## 1. Set up the database (Supabase)

1. In Supabase, click **New project**. Choose a name, a strong database password and a region, then wait for it to finish provisioning.
2. Open **SQL Editor** in the left sidebar and click **New query**.
3. Open `supabase/schema.sql` from this project, copy the entire file, paste it into the editor and click **Run**. You should see "Success. No rows returned".
   This creates the tables, indexes, the `account_balances` view, Row Level Security policies, and a trigger that creates a profile and default categories whenever a user signs up.
4. Go to **Project Settings > API** and copy:
   - **Project URL**
   - **anon public** key
5. Go to **Authentication > URL Configuration** and set:
   - **Site URL**: `http://localhost:5173` for development (use your production URL after you deploy)
   - **Redirect URLs**: add `http://localhost:5173/**` and, later, `https://your-domain.com/**`
   These are required for the password reset and email confirmation links to land back in the app.
6. Optional: under **Authentication > Providers > Email**, you can turn off **Confirm email** to skip email verification while developing. Leave it on in production.

> If you created users before running the SQL, run the optional backfill block at the bottom of `schema.sql` once so they get a profile and default categories.

## 2. Run the app locally

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
```

Edit `.env` and paste your values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:5173, create an account, add an account (for example "Checking"), then add a transaction.

## 2b. Create an admin user

Admins get an **Admin** item in the sidebar with app-wide statistics. Admin status can only be granted from the Supabase SQL Editor, never from inside the app, so users cannot promote themselves.

1. Run `supabase/admin.sql` once in the SQL Editor (after `schema.sql`). It adds the `is_admin` column, locks it from client writes, and creates the `admin_dashboard()` and `admin_users()` functions.
2. Sign up in the app with the account you want to make admin.
3. In the SQL Editor run (with your email):

```sql
update public.profiles
   set is_admin = true
 where id = (select id from auth.users where email = 'you@example.com');
```

4. Refresh the app. The **Admin** page appears in the sidebar (and under More on mobile).

To remove access, run the same statement with `is_admin = false`.

What admins can see: totals, sign-ups and transactions per month, active users (recorded a transaction in the last 30 days), most-used categories, account types, volume per currency, and a user list with name, email, join date, last sign-in and record counts. Admins cannot read any user's transactions, balances or goals; row level security is unchanged and the admin functions return only counts and totals.

## 3. Build for production and test the PWA

The service worker is only generated in production builds:

```bash
npm run build
npm run preview
```

Open the preview URL (http://localhost:4173) in Chrome or Edge. You will see an install icon in the address bar, and an **Install app** button appears in the sidebar and in Settings. On iOS Safari use Share > Add to Home Screen. To verify offline behavior, open DevTools > Application > Service Workers and tick **Offline**; the app shell still loads.

PWAs require HTTPS in production (localhost is exempt).

## 4. Deploy

Any static host works. The app is a single-page app, so unknown paths must serve `index.html`. Rewrite config is included for both options below.

**Vercel**: import the repository, framework preset Vite, add the two environment variables, deploy. (`vercel.json` is included.)

**Netlify**: build command `npm run build`, publish directory `dist`, add the two environment variables. (`public/_redirects` is included.)

After deploying, update **Site URL** and **Redirect URLs** in Supabase Authentication settings to your production domain.

## Project structure

```
supabase/schema.sql        Database schema, RLS policies, triggers
supabase/admin.sql         Admin role and statistics functions (run after schema.sql)
public/                    PWA icons, favicon, SPA redirects
src/
  main.jsx, App.jsx        Entry point and routes (lazy loaded)
  context/                 Auth, data (profile/accounts/categories), theme, toasts
  hooks/                   Debounce, online status, PWA install prompt
  lib/                     Supabase client, formatting, CSV, icon maps
  components/              Layout, modal, confirm dialog, transaction form, UI parts
  pages/                   Login, Register, Dashboard, Transactions, Accounts,
                           Budgets, Goals, Reports, Categories, Settings, Admin
```

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | Display name and currency, one row per user |
| `accounts` | Bank accounts, cards, cash; opening balance |
| `categories` | Income and expense categories with color and icon |
| `transactions` | Income and expense entries (amount is always positive; `type` sets the direction) |
| `budgets` | Monthly limit per expense category (repeats every month) |
| `goals` | Savings goals with target, progress and optional deadline |
| `account_balances` (view) | Opening balance plus income minus expenses per account |

## Security notes

- The anon key in `.env` is designed to be public. Protection comes from Row Level Security, which `schema.sql` enables on every table.
- Never put the `service_role` key in this app or in any `VITE_` variable.
- Transactions and budgets also verify that the referenced account or category belongs to the same user.

## Customizing

- Brand color: change `brand: colors.teal` in `tailwind.config.js` (any Tailwind palette works) and `theme_color` in `vite.config.js`.
- Icons: replace the PNGs in `public/` (192, 512, maskable 512, and 180 for Apple) and `favicon.svg`.
- Default categories: edit `seed_default_categories` in `schema.sql`.

## Troubleshooting

- **"Supabase is not configured" screen**: `.env` is missing or the dev server was not restarted after creating it.
- **New users have no categories**: the signup trigger was not created. Re-run `schema.sql`, then run the backfill block.
- **`account_balances` errors**: security-invoker views need Postgres 15 or newer, which all current Supabase projects use.
- **Reset email link says expired**: check that the Redirect URLs in Supabase include your site's address followed by `/**`.
- **Stale app after a deploy**: the service worker updates automatically; close and reopen the app once.
