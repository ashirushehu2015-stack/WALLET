# MangaPay Mobile Wallet

## Project Overview
MangaPay is a production-style mobile wallet UI (Nigerian Naira ₦) with:
- Home screen with balance card + Fund / Send / Withdraw actions
- History with filters + search + receipt modal
- Profile with KYC, DVA, linked banks, biometric toggle
- Bottom sheets for Fund, Send, Withdraw
- PIN modal (demo PIN = 1234) + Biometrics simulation
- Success modal with reference

## Design System (Milky Palette) — DO NOT CHANGE
- Background: #FDFBF7
- Surface: #FFFFFF
- Elevated: #F9F6F1
- Border: #EDE8E0
- Text Primary: #1C1917
- Text Secondary: #78716C
- Accent (Deep Warm Teal): #0F766E
- Accent Soft: #CCFBF1
- Font: Plus Jakarta Sans
- Card radius: 16px | Bottom sheet radius: 24px
- Soft shadow: 0 4px 20px rgba(28,25,23,0.06)
- Button height: 52–56px

## Tech Stack
- Vite + React 18 + TypeScript
- Tailwind CSS v4 (@tailwindcss/vite)
- lucide-react for icons
- Mock API in src/api/api.ts (in-memory balance + transactions)

## Key Files
- src/App.tsx – root state + sheet orchestration
- src/screens/HomeScreen.tsx, HistoryScreen.tsx, ProfileScreen.tsx
- src/components/*BottomSheet.tsx, PINModal.tsx, SuccessModal.tsx, BottomTabs.tsx
- src/api/api.ts – fundWallet / sendMoney / withdraw helpers

## Demo Rules
- PIN is always 1234
- Biometrics always succeeds after ~900ms
- Starting balance: ₦248,500.00
- Withdraw fee: ₦100
- All amounts in NGN

## Preferred Next Steps
1. Keep the exact milky palette and component patterns
2. Prefer bottom sheets over full-page modals for actions
3. Keep mobile-first (max-width ~430px)
4. When adding real payments, keep the same FundBottomSheet UX
