
## The 7-Step Core Booking Workflow
1. **Search:** Customer searches for a trip entering locations, dates, and passenger count.
2. **Quote:** System calculates routing and displays available car types with estimated prices.
3. **Confirmation:** Customer confirms the booking, completes payment (or authorization), and receives a receipt/confirmation.
4. **Dispatch:** The backend dispatches the driver (algorithm-based auto-assign or manual override by a dispatcher).
5. **Transit:** Driver accepts and navigates to the pickup. Live GPS tracking is shared with the customer.
6. **Completion:** Driver ends the trip. Final payment is settled, the customer is prompted to leave a rating, and a final receipt is sent.
7. **Logging:** The completed trip data is pushed to the admin dashboard to update revenue and performance analytics.

---

## Key User Stories & Acceptance Criteria

### Story 1: The Quick Airport Booker
**As an** arriving passenger,
**I want** to use the pre-set "Airport to Hotel" button,
**So that** I don't have to manually type complex addresses while carrying my luggage.
* **Acceptance Criteria 1:** Clicking the pre-set card immediately populates the "From" field with the local Airport.
* **Acceptance Criteria 2:** The Date Picker UI must be highly visible and utilize the *DM Sans* font for quick readability.

### Story 2: The On-Duty Driver
**As a** driver,
**I want** to see incoming job requests clearly on my app,
**So that** I can accept them safely while in my vehicle.
* **Acceptance Criteria 1:** Job offers display estimated distance, payout, and passenger count clearly.
* **Acceptance Criteria 2:** If the driver accepts, the app seamlessly transitions into navigation mode.

### Story 3: The System Dispatcher
**As a** management admin,
**I want** to view all active cars and pending bookings on a live map,
**So that** I can manually intervene if a driver cancels.
* **Acceptance Criteria 1:** The live map updates vehicle locations in real-time (low latency).
* **Acceptance Criteria 2:** I can click on a "Pending" booking and assign it directly to an available driver nearby.


