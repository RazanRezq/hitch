# Product Requirements Document (PRD)

## 1. Platform Architecture
The platform is powered by a central API/Backend layer connecting three distinct front-end applications:

### A. Passenger Interface (Web & App)
* **Landing Page:** * Two pre-set trip cards at the top for one-tap booking: "Airport → Hotel" and "Hotel → Airport" (includes scheduled reminders).
  * Custom Search Widget: Fields for From/To addresses, pickup date & time, passenger count, and a "See prices" Call-to-Action (CTA).
* **Passenger App Features:** Book rides, track the driver in real-time on a map, process secure payments, and rate the driver post-trip.

### B. Driver App
* **Core Functions:** Accept incoming job requests, utilize built-in navigation for optimal routing, and review daily/weekly earnings status.

### C. Management App (Admin Dashboard)
* **Live Operations:** A live map for dispatching, monitoring active trips, and receiving system alerts.
* **Control Panel Modules:**
  * **Bookings & Dispatch:** Create, view, and edit bookings. Auto or manual driver assignment.
  * **Drivers & Fleet:** Manage profiles, compliance documents, ratings, and vehicle records (type, capacity, license plates).
  * **Pricing & Payments:** Configure fare rules, pricing zones, and promo codes. Manage transactions, refunds, invoices, and payouts.
  * **Notifications & Reports:** Configure triggers for SMS, Push, and Email alerts. Generate revenue and driver performance reports.
