# ShareCommute campus ride sharing

ShareCommute is a campus-focused web application for finding and offering shared journeys. Students and faculty can compare rides by pickup point, destination, departure time and available seats. The application displays a transparent equal share of the journey cost and lets users manage bookings and cancellations.

## Problem and objective

Informal ride coordination scatters journey details across messages and personal contacts. A small web platform can collect routes and times in one place, show available seats and make the expected contribution understandable. The objective is to implement and demonstrate this workflow with clear requirements and tested behaviour.

## Scope

The core functions are ride search, offers, seat reservations, cancellation and fare splitting. Named Pune landmarks keep route selection simple. Matching is based on identical pickup and destination points, the selected date and a configurable time tolerance. It is a deterministic filter rather than an AI model.

## Two delivery phases

Phase 1 provides the final application's responsive frontend and reusable business rules using clearly labelled sample data and device-local persistence. Phase 2 adds verified institutional accounts, a shared database, authorised server operations, atomic seat reservations, recurring commutes and a small administration view.

## Method

Develop a working slice, inspect it in the browser, test the core rules, and extend it while preserving the same architecture. Use React and TypeScript for the interface, separate pure modules for business logic, and a repository boundary for persistence. Store monetary values as integer paise to avoid floating-point rounding errors.

## Evaluation

Demonstrate successful search, booking, cancellation and offer creation; rejection of invalid input; exact fare totals; persistence; and mobile usability. In Phase 2, also demonstrate verified access, ownership protection and competing attempts to book the last seat. Report actual results and limitations rather than speculative savings or performance figures.

## Reference

Quick Ride provides a practical reference for finding and offering shared rides: https://quickride.in/ and https://quickride.in/help.php. ShareCommute is an independent academic project with original branding and a smaller campus scope.
