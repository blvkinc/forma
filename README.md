# FORMA

FORMA is a digital art marketplace prototype based on the SRS in `forma-srs-dev-plan.docx`. The current app focuses on the visible marketplace experience: auctions, artist profiles, commissions, social feed, buyer dashboard, artist studio, and admin console.

## Current Status

- Source SRS: `forma-srs-dev-plan.docx`
- Original visual prototype: `digital-art-platform.jsx`
- Runnable app entry: `src/App.jsx`
- SRS-driven work plan: `docs/work-plan.md`

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

## Useful Commands

```bash
npm run build
npm run preview
```

## Development Direction

The SRS targets a production stack of Next.js 14, TypeScript, Tailwind CSS, Node.js, Prisma, PostgreSQL, Redis/BullMQ, Stripe Connect, Persona, Cloudflare R2, and a modular monolith backend. This repo now starts by making the supplied UI prototype runnable, then progressively moves toward that production architecture.
