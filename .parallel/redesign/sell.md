# Sell + Pay re-skin report

- app/sell-screen.tsx — replaced ScreenHeader with inline "Sell" 26px-bold sticky header (shared ScreenHeader blocked at 17/20px); content px-5 pt-4; tiles/cart/customer rows to clean anatomy (17px titles, 14px meta, tabnum-bold money, hover:bg-surface2/50), icons to rounded-full tint chips (accentsoft/violet/gold per palette); accent kept to Charge CTA, chips, flash-activate.
- app/pay-screen.tsx — inline "Payment" header matching sell; killed all uppercase micro-labels ("AMOUNT DUE", "SPLIT PAYMENTS", etc.) → text-[15px] font-medium text-ink2 sentence case; collected/split/change amounts tabnum text-ink bold; remaining-due + credit text-warn when > 0; MoMo network chip bg-info/10 text-info; method tints normalized to /10 alpha pattern, icon chips rounded-full.
- Behavior untouched: cart lines, qty steppers, discount, draft/split payments, NumberPad, placeOrder, receipts, tax.
- Blocked notes: components/shell/* (ScreenHeader/tabbar) shared + off-limits, so headers were inlined in both screens; logic identical. No other files edited.
- Verify: ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint app/sell-screen.tsx app/pay-screen.tsx — both PASS.
