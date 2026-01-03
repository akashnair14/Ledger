# Optimization and Cleanup Implementation Plan

## Done
- [x] Optimized `useSupabase.ts` hooks (fixed duplicate error checks, improved caching, added `fetchAllTransactions`).
- [x] Switched `AnalyticsPage` to use Supabase data.
- [x] Switched `TransactionsPage` to use Supabase data.
- [x] Switched `SettingsPage` exports to use Supabase data.
- [x] Removed unused `crypto-js` dependency from `package.json`.

## To Do
- [ ] Remove unused `lib/sync` directory (contains Google Drive sync code which is redundant/unsupported).
- [ ] Remove `app/sync` directory (Sync UI is confusing since it only syncs Dexie).
- [ ] Optimize `app/page.tsx` (Customers list) with better search/filter.
- [ ] Optimize `app/customers/[id]/page.tsx` (Customer Detail) - refactor large components.
- [ ] Final Build & Lint check.
- [ ] Performance check for Supabase queries.

## Design Improvements
- [ ] Ensure all pages have consistent loading states.
- [ ] Improve error reporting (replace `alert` with something better if possible, or at least standardized).
