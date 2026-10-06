# ShareCommute mentor demonstration

Approximate duration: 5 minutes. Begin with Reset demo so the fictional rides are dated tomorrow. Explain that this is the first delivery phase of the final application; verification and shared backend data are the second phase.

1. **State the problem.** People from the same campus often travel toward the same areas at similar times. ShareCommute makes those journeys easier to discover and coordinate.
2. **Search.** Show campus to all destinations, then choose Shivajinagar Station. Adjust the time tolerance to show that matching follows an explicit rule.
3. **Compare.** Show carpool/cab/bike filters, departure times, seats and estimated cost. Explain that the map is a landmark diagram.
4. **Book.** Open Avani's ride. It costs ₹180 in total, with a host and one existing passenger. Booking one seat produces three travellers and a ₹60 share. Booking two seats produces four travellers and a ₹90 total for those two seats.
5. **Explain the arithmetic.** The host is included. Currency is integer paise. For ₹100 split three ways, shares are ₹33.34, ₹33.33 and ₹33.33, summing exactly to ₹100.
6. **Manage.** Visit My rides, reload to demonstrate persistence, cancel the booking, and show that seats return to availability.
7. **Offer.** Post a ride with a future departure, an available seat count and total journey cost. Show it in Offered rides and cancel it. Try an invalid identical origin/destination to show validation.
8. **Show engineering evidence.** Open PLAN.md and the test results. Explain the separation of UI, rules and storage. Describe the Phase 2 checks for verified accounts and simultaneous final-seat reservations.

Use accurate language: “demo reservation”, “sample member”, “estimated cost share”. Do not claim email verification, live tracking, payment settlement, AI, emissions reductions or multi-user concurrency are implemented in Phase 1.
