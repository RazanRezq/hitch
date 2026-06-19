# Data Structure & User Roles

## 1. User Roles (RBAC)
1. **Super Admin:** Full access to business settings, financial reports, and platform configuration.
2. **Dispatcher (Admin):** Access to the live map, manual dispatching tools, and active booking modifications.
3. **Driver:** Access limited to their assigned jobs, personal earnings, and navigation.
4. **Passenger:** Access to their personal booking history, payment methods, and live trip tracking.

## 2. Core Data Entities
* **Users:** `id`, `role`, `name`, `phone`, `auth_token`.
* **Fleet/Cars:** `id`, `driver_id`, `vehicle_type` (e.g., Sedan, SUV, Van), `capacity`, `license_plate`.
* **Bookings (Trips):** `id`, `passenger_id`, `driver_id`, `pickup_location`, `dropoff_location`, `scheduled_time`, `status` (Pending, Accepted, In-Transit, Completed), `price`.
* **Pricing Zones:** `id`, `zone_polygon` (GeoJSON), `base_fare`, `per_km_rate`.

## 3. Security & Compliance
* All payment data is tokenized; credit card details are never stored directly on the Hitch database.
* Live location data is strictly shared only between the assigned driver and the passenger during an active trip.
