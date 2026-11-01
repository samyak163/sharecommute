# Final ShareCommute UI and UX proposal

Prepared: 1 November 2026, Asia/Kolkata. Status: items 1 and 2 implemented and tested on desktop; item 3 selected next; items 4–7 remain proposals.

The user selected item 1 first and asked for implementation, behaviour checks and visual iteration until the result is polished enough for the mentor demonstration. Apply this same implement–test–refine standard to later selected items. Keep the current API/database working; do not begin other proposed features as part of this step.

After item 1, the user requested a GitHub push and completion of any two remaining suggestions, step by step. Items 2 and 3 were selected. The earlier tested commits are now pushed and verified. Item 2 was completed before starting item 3; retain separate implementation and validation checkpoints.

The user wants the final PBL presentation to show a polished, useful campus commuting website. Keep the working email verification, Maps integration, API and SQLite database. Focus changes on visible features and interactions. Preserve the main built-in browser tab and keep its pane visible while the user watches and tests.

## Findings from the current interface

The first visible screen spends most of its height on the large heading and search form. Rides and the real map begin near the bottom. Ride details and the offer form are long dialogs. My rides currently has joined/offered tabs and a simple empty state; it can become a more useful place to prepare for a journey. The forest-green, white and lime branding is already coherent and should be retained.

These findings describe the pre-polish interface. Item 1 has now replaced the large find-page introduction with a compact search workspace and a wider, sticky route map. Ride preview and booking details are separate actions; card selection and the displayed route stay synchronized. Search state and the existing server-backed booking rules are preserved. Later items have not been implemented as part of this change.

## Item 1 validation

The actual desktop browser was 855×668. Both the first complete card and map canvas fit above the fold, without horizontal overflow. The map remained visible while selecting farther down the results. Tests covered keyboard and pointer selection, filtered previous/next routes, sorting while retaining selection, pending/applied search, seats and time flexibility, invalid endpoints, no-result recovery, rapid route switching, and opening the correct details from the map panel.

A real sample reservation persisted after reload, and cancellation restored capacity. The new work passed the existing 38 automated tests and the TypeScript/production build. No backend API or database schema changes were needed. The user explicitly waived phone testing in this step; a narrow-layout List/Map fallback exists but is not claimed as manually phone-tested. See PROJECT_STATUS.md for current evidence.

## Recommended scope and order

Item 2 validation: all 42 tests and the TypeScript/production build passed. Browser checks verified filtered comparisons, multi-seat repricing (₹75 lowest for two seats versus ₹90 on the next option), closest-departure changes when the requested time moved from 5:00 to 5:30 pm, no comparison badge for a single result, keyboard meeting-note disclosure without changing the selected route, and first-card visibility without horizontal overflow. The actual desktop screenshot is under ignored work/ux-2-ride-cards.png.

| Order | Upgrade | Behaviour and value |
| --- | --- | --- |
| 1 | Compact search with a larger map and ride list | Show useful rides and the map in the first screen. Selecting a ride clearly highlights its card and route. Use a map/list switch at phone widths. |
| 2 | Clearer ride cards | Make departure, route, seats and cost easy to scan. Label lowest cost or closest departure only when calculated from the current results. Surface vehicle and meeting information without crowding the card. |
| 3 | Booking review and a useful confirmation | Show seat selection and the recalculated cost breakdown before submission. After the existing API confirms a booking, show its real reference, time, pickup point, map directions and Add to calendar. |
| 4 | Next journey and improved My rides | Feature the nearest upcoming confirmed booking. Separate upcoming journeys, past departures and cancellations, using actual stored records. Expose directions, eligible host contact and cancellation. A past departure is not proof that a ride was completed. |
| 5 | Three-step offer form | Route and time, then seats and cost, then a final review. Retain entered values between steps, show the real map and fare-sharing preview, and post through the existing API only at final submission. Preserve weekday recurrence. |
| 6 | Faster repeat searches | Add Today/Tomorrow, swap pickup/drop-off, To campus/From campus and favourite landmark routes. Save preferences per account on this device; keep bookings in the shared database. |
| 7 | Consistent visual polish and mobile navigation | Improve typography, spacing, contrast, card selection, loading placeholders, success/error feedback and restrained transitions. Respect reduced motion and keyboard navigation. Add clear mobile access to Find, My rides, Offer and the existing account information. |

The booking/calendar feature and next-journey card provide useful new functionality. The search/map layout and ride cards give the largest immediate visual improvement. All can use the current API/database contract; favourite-search preferences and calendar downloads can be implemented in the frontend. Do not imply cross-device preference synchronization.

## Data and presentation rules

Use actual API results for bookings, counts, references and status. A profile panel can show the existing signed-in user's name, college email and email-verification state. Keep sample-member labels. Cost comparisons must use the selected seat count and current occupancy; explain closest-departure labels using the selected search time. Clear booking feedback, consistency and error prevention follow the [NN/G usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

## Review and mentor demonstration

Inspect desktop and the full mobile interface. Test real inbox sign-in, search and route selection, seat selection and cost review, a confirmed booking, persistence after reload, the booking reference and calendar download, cancellation and restored seats. Test the offer steps, back navigation, validation and final persistence using the existing server. Re-run appropriate tests and the production build after changes; update PROJECT_STATUS.md with actual results.

Suggested mentor flow: verify college email → search a campus route → compare rides on the map → reserve a seat → show the confirmation and calendar action → open My rides → demonstrate cancellation. Then show the offer wizard and recurring options if time permits.
