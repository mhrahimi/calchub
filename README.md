# CalcHub

27 calculators for finance, tax, and math — runs in your browser. No account, no server.

**[Live demo →](https://mhrahimi.github.io/calchub/)**

---

## What's included

- 27 calculators covering loans, tax, corporate finance, statistics, and unit conversion
- History, favorites, and saved calculations stay in IndexedDB on your device
- Export results as PDF or CSV
- Static site, built for GitHub Pages with route-level code splitting

---

## Calculator coverage

| Category | Examples | Count |
|----------|----------|------:|
| Financial | Mortgage, Loan, Amortization, Investment, Retirement | 10 |
| Tax & Salary | Income Tax, Salary / Take-Home | 2 |
| Investing | Black-Scholes, Bond YTM & Duration | 2 |
| Corporate Finance | Cap Table, CRE Waterfall, DCF / LBO | 3 |
| Math & Statistics | Fractions, Std Dev, P-Value, GCF/LCM | 6 |
| Geometry | Triangle Solver, Trigonometry | 2 |
| General | Date, Unit Conversion | 2 |

Full specs: [docs/calculators/](docs/calculators/)

---

## Quick start

**Requirements:** Node.js 20+, npm 10+

```bash
git clone https://github.com/mhrahimi/calchub.git
cd calchub
npm install
npm run dev
```

Open `http://localhost:5173/calchub/`

```bash
npm run test        # unit tests (111+)
npm run build       # production build → dist/
npm run preview     # serve dist/ locally
npm run check       # test + build (same as CI)
```

---

## Deploy to GitHub Pages

1. Push to the `main` branch on GitHub.
2. In **Settings → Pages**, set source to **GitHub Actions**.
3. Every push to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): `npm ci` → `npm test` → `npm run build` → publish `dist/`.

Manual deploy: **Actions → Deploy to GitHub Pages → Run workflow**.

---

## Privacy

Your calculations are stored locally in this browser unless you explicitly export or share them. No analytics or authentication required.

---

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts · Decimal.js · IndexedDB

Architecture and product specs: [docs/README.md](docs/README.md)

---

## Disclaimer

Calculations are for informational purposes only and are not tax, legal, or investment advice.
