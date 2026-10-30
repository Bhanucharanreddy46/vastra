# Implementation Plan — Vastra Mandatory Login Gate, Patron Profile & Order Tracking

Implement a mandatory luxury entry gate requiring patrons to authenticate via Google Sign-In or Email prior to exploring Vastra, paired with a dedicated full-page patron profile dashboard (`/profile.html`) featuring saved delivery address management and interactive 4-stage order tracking (*Placed*, *Atelier Tailoring*, *Dispatched*, *Delivered*).

---

## 1. User Directives & Clarification Alignments
- **Mandatory Login Gate**: Unauthenticated visitors are intercepted before entering the main website with an elevated Vastra couture entry gate (supporting Google Sign-In and Email authentication).
- **Dedicated Profile Dashboard**: Full-page experience at `/profile.html` matching Vastra’s signature obsidian (`#11100E`), champagne gold (`#D9C7A3`), Bodoni Moda, and Jost styling.
- **Profile Fields**: Name, Email, Phone Number, and Delivery Address (Flat/House, Street/Locality, City, State, PIN code, and Landmark) with live editing and instant synchronization.
- **Order Tracking Stages**: Exactly 4 stages as requested:
  1. **Placed**
  2. **Atelier Tailoring**
  3. **Dispatched**
  4. **Delivered**
- **Cart & Order Linking**: Orders submitted through the simulated Instant UPI / Card checkout are automatically attributed to the active patron and stored in their order tracking history.

---

## 2. Architecture & File Structure

```
├── public/
│   ├── auth.js              # Central authentication module (Firebase Auth & Google Sign-In, Session, Patron state)
│   ├── profile.html         # Dedicated Patron Profile & Order Tracking dashboard
│   ├── profile.css          # Haute-couture styling for profile and 4-stage tracking stepper
│   ├── vastra-cart.js       # Synchronizes placed orders with active patron session
│   ├── vastra-cart.css      # Cart drawer styling
│   └── index.html           # Embedded login gate & patron header navigation
├── clothing-catalog.html    # Updated header with Profile link & authentication awareness
├── server.js                # Endpoints for patron profile management and user-specific order queries
└── data/
    ├── orders.json          # Persistent order records with customer details and tracking timeline
    └── patrons.json         # Persistent user profiles (address, contact details, preferences)
```

---

## 3. Detailed Component Specifications

### A. Central Authentication Engine (`public/auth.js`)
1. **Firebase Authentication & Google Sign-In**:
   - Initialized with provisioned project config (`firebase-applet-config.json`): Google OAuth Client ID, API Key, and Auth Domain.
   - **Google Sign-In**: Popup or One-Tap authorization with automatic profile hydration (Name, Email, Google avatar).
   - **Email Authentication**: Password or luxury One-Time Passcode (OTP) simulation for new and returning patrons.
   - **Demo / Instant VIP Patron Mode**: Instant one-click login for test patron (`kmbhanucharanreddy@gmail.com`) to allow instant evaluation without friction.
2. **Session Persistence & Global State**:
   - Session stored in `localStorage` under `vastra_patron_session`.
   - Helper methods: `VastraAuth.getUser()`, `VastraAuth.loginWithGoogle()`, `VastraAuth.loginWithEmail()`, `VastraAuth.logout()`, `VastraAuth.updateProfile()`.
   - Dispatch custom event `vastra:auth-change` across pages so headers and buttons dynamically reflect the patron's status.

### B. Mandatory Login Gate (`public/index.html` & `public/auth.js`)
1. **Gatekeeper Veil & Modal**:
   - Fixed full-screen luxury curtain (`z-index: 9999`) rendered immediately if `!VastraAuth.isAuthenticated()`.
   - Design: Deep matte black backdrop with silk texture, shimmering gold monogram crest, and Bodoni Moda headline: *"Welcome to Vastra — An Atelier of Bespoke Indian Luxury"*.
   - Tabbed login options:
     - **Continue with Google** (Official branded button with Google G icon and gold hairline border).
     - **Email Sign-In / Register** (Minimalist floating inputs for Email, Password/OTP, and Full Name).
     - **Fast VIP Pass** (Pre-filled quick access for evaluation).
2. **Immediate Access Unlock**:
   - On successful login, the curtain smoothly dissolves with champagne particle fade, welcoming the patron by name and granting full access to catalog, festive collection, and bag.

### C. Dedicated Full-Page Patron Profile (`public/profile.html`)
1. **Haute-Couture Navigation & Hero Banner**:
   - Vastra header with back link to Home, Bag drawer button, and Logout CTA.
   - Patron greeting banner: Monogram initial badge, patron tier (*"Royal Patron"*), member since year, and quick summary stats (*Total Orders, Active Shipments, Saved Addresses*).
2. **Tabbed Sections**:
   - **Tab 1: My Profile & Delivery Address**:
     - Contact details card: Full Name, Email Address (verified badge), Phone Number with `+91` prefix.
     - Delivery Address card: Flat/House No., Building/Society, Street & Area, City, State, 6-digit PIN code, Landmark.
     - Interactive Edit & Save button with inline validation, success toast, and automatic persistence.
   - **Tab 2: Orders & Atelier Tracking**:
     - Active orders and completed past orders.
     - For each order:
       - Order ID (e.g. `VAS-ORD-2026-7842`), Placed Date, Total Amount (₹), and Payment Method (e.g. Instant UPI / GPay).
       - Visual 4-Stage Stepper:
         - **1. Placed** (Order received & verified)
         - **2. Atelier Tailoring** (Master artisans crafting embroidery & hand-finish)
         - **3. Dispatched** (Insured luxury courier partner en route)
         - **4. Delivered** (Hand-delivered in signature Vastra keepsake box)
       - Dynamic progress bar highlight indicating current stage, completed timestamps, and estimated delivery date.
       - Product breakdown with thumbnail photos, garment name, size selected, quantity, and unit price.
       - **Concierge Actions**:
         - Direct *"Inquire via WhatsApp"* button linking to `+91 94402 09898` with pre-filled message including Order ID.
         - Download / Print Luxury Invoice receipt slip.
   - **Tab 3: Measurements & Preferences**:
     - Saved sizing profile (Chest, Waist, Shoulder, Sleeve length, Kurta length) for bespoke custom orders.

### D. Cart Checkout & Order Synchronization (`public/vastra-cart.js` & `server.js`)
1. **Auto-Populate Patron Information**:
   - When checking out from the bag drawer, the patron's saved Name, Email, Phone, and Delivery Address are automatically loaded into the checkout form.
2. **Order Creation & Storage**:
   - When the patron completes UPI or Card payment simulation, the order is recorded in `/api/orders` with `patronId` / `email`.
   - The order immediately appears in the patron's Order Tracking timeline on `/profile.html` at the **"Placed"** stage, with simulated progression to **"Atelier Tailoring"**.

### E. Navigation Integration across Pages
1. **Header Updates (`index.html` & `clothing-catalog.html`)**:
   - Replace or complement actions with a dedicated **"My Profile"** patron button.
   - Displays avatar monogram and name when authenticated, clicking navigates smoothly to `/profile.html`.
   - Mobile navigation drawer includes "My Profile", "Track Orders", and "Sign Out" links.

---

## 4. Verification & Testing Plan
1. **Authentication Flow Verification**:
   - Test initial visit in unauthenticated state: Confirm mandatory login gate is displayed and blocks interaction with background content.
   - Test Google Sign-In / VIP login / Email login: Verify curtain fade-out, session storage persistence, and header badge update.
2. **Profile & Address Management**:
   - Navigate to `/profile.html`: Verify user name, email, phone, and delivery address load correctly.
   - Edit address fields and click "Save Details": Confirm updates persist across page reloads.
3. **Order Placement to Tracking Pipeline**:
   - Add items from the Festive Collection or Catalog into the Bag.
   - Proceed through simulated UPI / Card checkout.
   - Navigate to `/profile.html` Orders tab: Confirm the newly created order appears with exact items, size, amount, and the 4-stage timeline active at stage 1 (*Placed*).
4. **WhatsApp Concierge Link**:
   - Confirm order tracking WhatsApp button correctly directs to `+91 94402 09898` with order specifics.
5. **Applet Compilation**:
   - Run `compile_applet` to confirm zero syntax errors or build issues.
