# Diff Details

Date : 2026-09-20 11:41:23

Directory /home/kelvinmutugi/projects/dominium_airbnb_next_js/my-app

Total : 57 files,  4374 codes, 232 comments, 742 blanks, all 5348 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [BOOKINGSETUP.md](/BOOKINGSETUP.md) | Markdown | 30 | 0 | 8 | 38 |
| [app/account/bookings/actions.ts](/app/account/bookings/actions.ts) | TypeScript | 67 | 3 | 14 | 84 |
| [app/account/bookings/page.tsx](/app/account/bookings/page.tsx) | TypeScript JSX | 32 | 2 | 3 | 37 |
| [app/account/layout.tsx](/app/account/layout.tsx) | TypeScript JSX | 47 | 0 | 6 | 53 |
| [app/account/loading.tsx](/app/account/loading.tsx) | TypeScript JSX | 9 | 2 | 1 | 12 |
| [app/account/page.tsx](/app/account/page.tsx) | TypeScript JSX | 73 | 3 | -2 | 74 |
| [app/account/payments/page.tsx](/app/account/payments/page.tsx) | TypeScript JSX | 90 | 2 | 9 | 101 |
| [app/account/payouts/page.tsx](/app/account/payouts/page.tsx) | TypeScript JSX | 76 | 2 | 10 | 88 |
| [app/account/profile/actions.ts](/app/account/profile/actions.ts) | TypeScript | 95 | 7 | 20 | 122 |
| [app/account/profile/page.tsx](/app/account/profile/page.tsx) | TypeScript JSX | 22 | 3 | 3 | 28 |
| [app/account/reviews/page.tsx](/app/account/reviews/page.tsx) | TypeScript JSX | 72 | 2 | 7 | 81 |
| [app/account/security/page.tsx](/app/account/security/page.tsx) | TypeScript JSX | 54 | 3 | 8 | 65 |
| [app/apartments/\[id\]/page.tsx](/app/apartments/%5Bid%5D/page.tsx) | TypeScript JSX | 12 | 0 | 2 | 14 |
| [app/api/bookings/route.ts](/app/api/bookings/route.ts) | TypeScript | 1 | 0 | 0 | 1 |
| [app/api/listings/route.ts](/app/api/listings/route.ts) | TypeScript | 88 | 0 | 12 | 100 |
| [app/api/payments/paystack/initialize/route.ts](/app/api/payments/paystack/initialize/route.ts) | TypeScript | 138 | 0 | 24 | 162 |
| [app/api/payments/paystack/verify/route.ts](/app/api/payments/paystack/verify/route.ts) | TypeScript | 36 | 0 | 7 | 43 |
| [app/api/payments/paystack/webhook/route.ts](/app/api/payments/paystack/webhook/route.ts) | TypeScript | 46 | 2 | 14 | 62 |
| [app/booking/\[id\]/page.jsx](/app/booking/%5Bid%5D/page.jsx) | JavaScript JSX | 31 | 0 | 5 | 36 |
| [app/booking/payment/callback/PaymentCallback.tsx](/app/booking/payment/callback/PaymentCallback.tsx) | TypeScript JSX | 153 | 0 | 34 | 187 |
| [app/booking/payment/callback/page.tsx](/app/booking/payment/callback/page.tsx) | TypeScript JSX | 25 | 0 | 3 | 28 |
| [app/lib/account.ts](/app/lib/account.ts) | TypeScript | 63 | 4 | 13 | 80 |
| [app/lib/format.ts](/app/lib/format.ts) | TypeScript | 69 | 4 | 14 | 87 |
| [app/lib/payments/placeholder.ts](/app/lib/payments/placeholder.ts) | TypeScript | 17 | 4 | 4 | 25 |
| [app/lib/paystack-payment.ts](/app/lib/paystack-payment.ts) | TypeScript | 63 | 0 | 15 | 78 |
| [app/lib/paystack.ts](/app/lib/paystack.ts) | TypeScript | 65 | 0 | 13 | 78 |
| [app/lib/routes.ts](/app/lib/routes.ts) | TypeScript | 7 | 3 | 1 | 11 |
| [app/lib/supabase/client.ts](/app/lib/supabase/client.ts) | TypeScript | 1 | 1 | 0 | 2 |
| [app/lib/supabase/route.ts](/app/lib/supabase/route.ts) | TypeScript | 185 | 11 | 18 | 214 |
| [app/listings/\[county\]/page.tsx](/app/listings/%5Bcounty%5D/page.tsx) | TypeScript JSX | 90 | 0 | 10 | 100 |
| [components/ApartmentDetails.tsx](/components/ApartmentDetails.tsx) | TypeScript JSX | 13 | 0 | 0 | 13 |
| [components/Countydirectory.tsx](/components/Countydirectory.tsx) | TypeScript JSX | -19 | 19 | 0 | 0 |
| [components/HeroSection.tsx](/components/HeroSection.tsx) | TypeScript JSX | -1 | 4 | 0 | 3 |
| [components/SearchBar.tsx](/components/SearchBar.tsx) | TypeScript JSX | 20 | 11 | 1 | 32 |
| [components/account/AccountNav.tsx](/components/account/AccountNav.tsx) | TypeScript JSX | 63 | 2 | 8 | 73 |
| [components/account/AvatarUpload.tsx](/components/account/AvatarUpload.tsx) | TypeScript JSX | 77 | 2 | 11 | 90 |
| [components/account/BookingActions.tsx](/components/account/BookingActions.tsx) | TypeScript JSX | 109 | 2 | 13 | 124 |
| [components/account/BookingCard.tsx](/components/account/BookingCard.tsx) | TypeScript JSX | 76 | 3 | 8 | 87 |
| [components/account/BookingsTabs.tsx](/components/account/BookingsTabs.tsx) | TypeScript JSX | 73 | 2 | 7 | 82 |
| [components/account/PayoutForm.tsx](/components/account/PayoutForm.tsx) | TypeScript JSX | 106 | 2 | 11 | 119 |
| [components/account/ProfileForm.tsx](/components/account/ProfileForm.tsx) | TypeScript JSX | 115 | 2 | 9 | 126 |
| [components/account/SecurityForms.tsx](/components/account/SecurityForms.tsx) | TypeScript JSX | 89 | 2 | 9 | 100 |
| [components/account/ui.tsx](/components/account/ui.tsx) | TypeScript JSX | 177 | 8 | 22 | 207 |
| [components/account/useAction.tsx](/components/account/useAction.tsx) | TypeScript JSX | 24 | 6 | 5 | 35 |
| [components/booking/BookingCard.tsx](/components/booking/BookingCard.tsx) | TypeScript JSX | 800 | 28 | 235 | 1,063 |
| [components/fearturedListingCard.tsx](/components/fearturedListingCard.tsx) | TypeScript JSX | -29 | 29 | 0 | 0 |
| [components/listings/Countybasedlistings/CountyBasedListings.tsx](/components/listings/Countybasedlistings/CountyBasedListings.tsx) | TypeScript JSX | 285 | 7 | 62 | 354 |
| [components/listings/Feartured/FeaturedListings.tsx](/components/listings/Feartured/FeaturedListings.tsx) | TypeScript JSX | 38 | -4 | 1 | 35 |
| [components/listings/Filtersidebar.tsx](/components/listings/Filtersidebar.tsx) | TypeScript JSX | 169 | 20 | 19 | 208 |
| [components/listings/HorizontalListingCarousel.tsx](/components/listings/HorizontalListingCarousel.tsx) | TypeScript JSX | -12 | 0 | 0 | -12 |
| [components/listings/Mombasa/Listings.tsx](/components/listings/Mombasa/Listings.tsx) | TypeScript JSX | 42 | 2 | 1 | 45 |
| [components/listings/Nairobi/Listings.tsx](/components/listings/Nairobi/Listings.tsx) | TypeScript JSX | 40 | 3 | 2 | 45 |
| [components/minimalListingCard.tsx](/components/minimalListingCard.tsx) | TypeScript JSX | -11 | 11 | 0 | 0 |
| [components/navigationBar.tsx](/components/navigationBar.tsx) | TypeScript JSX | 23 | 0 | 2 | 25 |
| [supabase/migrations/20260916150000\_guest\_checkout.sql](/supabase/migrations/20260916150000_guest_checkout.sql) | MS SQL | 139 | 0 | 16 | 155 |
| [supabase/migrations/20260919000000\_fix\_authenticated\_booking.sql](/supabase/migrations/20260919000000_fix_authenticated_booking.sql) | MS SQL | 122 | 0 | 15 | 137 |
| [types/account.ts](/types/account.ts) | TypeScript | 89 | 13 | 9 | 111 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details