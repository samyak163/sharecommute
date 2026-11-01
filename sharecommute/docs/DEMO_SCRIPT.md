# ShareCommute mentor demonstration

Approximate duration: 5 minutes. Start the local app with `npm run dev`. Sample rides are added for today and the next seven days; `npm run seed:samples` adds any missing dates without clearing bookings. The retained frontend now uses the shared local server and SQLite backend.

1. **State the problem.** People from the same campus often travel toward the same areas at similar times. ShareCommute makes those journeys easier to discover and coordinate.
2. **Verify an account.** Use a real @mitwpu.edu.in inbox. Request a code, open the branded ShareCommute email, and enter its six-digit code. The code expires in ten minutes; a resend is available after one minute. There is no local-code sign-in. Have an already verified session ready if the live inbox is slow.
3. **Search and compare.** Choose a date with sample rides and a campus route. Show carpool/cab/bike filters, departure times, seats and estimated cost. Adjust the time tolerance to show that matching follows an explicit rule. Explain that the map is a landmark diagram.
4. **Book.** Open a labelled sample ride and reserve a seat. Explain the displayed occupancy and equal share before confirming. This is a real reservation in the local database against a fictional sample offer; no payment or actual journey is arranged.
5. **Explain the arithmetic.** The host is included. Currency is integer paise. For ₹100 split three ways, shares are ₹33.34, ₹33.33 and ₹33.33, summing exactly to ₹100.
6. **Manage.** Visit My rides, reload to demonstrate persistence, cancel the booking, and show that seats return to availability.
7. **Offer.** Post a ride with a future departure, an available seat count and total journey cost. Show it in Offered rides and cancel it. Show weekday recurrence if time permits. Try an invalid identical origin/destination to show validation.
8. **Show engineering evidence.** Open PLAN.md and the test results. Explain the separation of UI, rules and storage, server ownership checks and atomic seat updates. Administration is assigned through the local CLI; participant contact details require a confirmed booking. Consult PROJECT_STATUS.md for which manual checks have actually passed.

Use accurate language: “local database reservation”, “sample member”, “estimated cost share”. Email verification proves access to an inbox, not identity or institution approval. Do not claim live tracking, payment settlement, AI, emissions reductions or a campus pilot. Shared data and reservation protection run on this local server; the website has not been deployed publicly.
