# Visual Identity & Design System (Hitch)

## 1. Theme Overview
* **Theme Name:** Soft Pop
* **Vibe:** Modern, Trustworthy, Clean, and Accessible.
* **Design Philosophy:** Minimalist UI with a focus on speed (one-tap booking) and clear contrast. Free of distractions.

## 2. Color Palette (OKLCH Framework)
The project uses Tailwind CSS with OKLCH color spaces to ensure vibrant, highly accessible color scaling across both Light and Dark modes.

### Light Mode (Default)
* **Background:** `oklch(0.9789 0.0082 121.6272)` (Soft, warm off-white for reduced eye strain)
* **Foreground (Text):** `oklch(0 0 0)` (Pure Black for maximum readability)
* **Primary (Brand Focus):** `oklch(0.5106 0.2301 276.9656)` (Vibrant Purple/Blue - Used for CTAs like "See prices")
* **Primary Foreground:** `oklch(1.0000 0 0)` (White text on primary elements)
* **Secondary:** `oklch(0.7038 0.1230 182.5025)` (Teal/Water green for secondary actions)
* **Accent:** `oklch(0.7686 0.1647 70.0804)` (Warm Orange/Yellow for alerts or highlights)

### Dark Mode
* **Background:** `oklch(0 0 0)` (Pure Black)
* **Foreground (Text):** `oklch(1.0000 0 0)` (Pure White)
* **Primary (Brand Focus):** `oklch(0.6801 0.1583 276.9349)` (Adjusted Purple/Blue for dark mode visibility)
* **Card/Popover Backgrounds:** `oklch(0.2455 0.0217 257.2823)` (Deep Midnight Blue/Gray to separate from the black background)

## 3. Typography
The platform utilizes Google Fonts, imported via Next.js `next/font/google` for optimal performance.
* **Primary Font (Sans-serif):** `DM Sans`
  * *Usage:* All standard UI text, Headings (H1-H6), Buttons, Form labels, and Navigation. Chosen for its clean, geometric readability.
* **Secondary Font (Monospace):** `Space Mono`
  * *Usage:* Technical or tabular data. specifically Receipt Numbers, Booking IDs, GPS Coordinates, and Fare break-downs.

## 4. UI Geometry & Effects
* **Border Radius:** `1rem` (16px). This rounded aesthetic applies to all major components (Booking Cards, Search Widgets, Dialogs, and Buttons) to create a welcoming, "Soft" UI.
* **Borders:** Thin, subtle borders (`oklch(0 0 0)` in light mode, adjusted in dark mode) to define sections without heavy shading.
* **Shadows:** Minimalist approach. Base shadow opacity is set very low (`0.05`) with a dark base color (`#1a1a1a`) to give a slight floating effect to active cards without looking messy.

## 5. Component Implementation Rules (Shadcn UI)
1. **Search Widget:** Must sit prominently on the `Background` color. Input fields must have clear focus states using the `--ring` variable (`oklch(0.7853 0.1041 274.7134)`).
2. **Pre-set Trip Cards:** Should utilize subtle shadow hover states to indicate clickability.
3. **Buttons:** Primary CTAs must use the `--primary` color. Destructive actions (like "Cancel Ride") must use the predefined `--destructive` red (`oklch(0.6368 0.2078 25.3313)`).
