# sellfix (phase 2) — done
- sell-screen: ProductTile now hero-image layout (full-width aspect-square ProductArt top, rounded corners via overflow-hidden; name 15px semibold + price 17px bold tabnum below; low-stock/out-of-stock lines kept).
- sell-screen: existing customer picker was wired but restyled to brief — cart row "Customer" with secondary "Add customer" chip when none, User icon + name when chosen (tap to change); Sheet picker (search, Avatar rows, Walk-in clears) unchanged.
- pay-screen: added customer row after method Segmented (change/add pre-payment, Walk-in default — not forced) + same picker Sheet; payment/receipt/draft logic untouched.
- Verified: `tsc --noEmit` && `eslint app components lib` — both pass.
