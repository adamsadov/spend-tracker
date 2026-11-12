# Ledger — personal budgeting tracker

Next.js + Tailwind + Recharts + Framer Motion.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current state

- Manual entries (amount, store, category, card, date, note), edit, delete with undo
- Overview: month / year totals, category breakdown (pie or bars), daily / monthly chart, recent transactions
- Transactions: filter by month, category, card, search; change a category inline
- Light / dark mode (follows system, toggle in header)
- Data is saved in **this browser's localStorage** for now (`src/lib/store.tsx`)

## Roadmap

1. Supabase: accounts + Postgres (`supabase/schema.sql` has the planned table and row-level security)
2. `/api/transactions` endpoint for the iOS Shortcuts "Transaction" automation (Apple Pay)
3. Deploy to Vercel, add to iPhone home screen
