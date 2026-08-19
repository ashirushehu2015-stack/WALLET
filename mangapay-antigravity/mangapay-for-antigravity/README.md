# MangaPay – Mobile Wallet

Clean React + Vite + TypeScript + Tailwind source for the MangaPay wallet.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:4000

## Instant preview (no install)

Open `mangapay-demo.html` in any browser.

## For Antigravity

1. Open this folder as a **New Project** (or File → Open Folder in Antigravity IDE)
2. The agent will read `AGENTS.md` automatically
3. Example prompt:
   > Continue MangaPay. Keep the milky palette. Add [your feature].

## Structure

```
src/
  api/api.ts          # mock backend
  components/         # BottomTabs, sheets, PIN, Success
  screens/            # Home, History, Profile
  App.tsx             # state + orchestration
  index.css           # milky theme tokens
```
