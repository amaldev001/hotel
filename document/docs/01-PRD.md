# 01 — Product Requirements Document (PRD)

## 1. Executive Summary
The Food Ordering & Restaurant Management Platform is a full-stack web application that enables customers to discover local restaurants, browse menus, manage a shopping cart, obtain instant price quotes, checkout using online payment or Cash on Delivery / Pay at Pickup, and track order progress in real-time through an in-app timeline. Restaurant owners manage their operating parameters, categories, menu items, and order fulfillment workflow. Administrators manage user accounts, create and manage restaurants, oversee platform orders, and issue full refunds.

---

## 2. Product Objectives
- Provide a responsive web interface for seamless food discovery and checkout.
- Guarantee financial integrity by computing all subtotals, taxes, delivery fees, and order totals on the server in minor currency units (`[D4]`).
- Ensure robust security with httpOnly cookie-based JWT authentication, Argon2 password hashing, strict CSRF origin checking, and signature-verified payment webhooks.
- Streamline operations for single-owner restaurants with minimal complexity (no staff accounts, no driver apps, no live GPS mapping).

---

## 3. User Personas & Roles

### 3.1 Customer `[D1]`
- **Self-Registration**: Registers account with name, email, phone, and password (`[D2]`).
- **Profile & Addresses**: Manages profile information and saves up to 5 delivery addresses (`[D22]`).
- **Discovery & Search**: Searches active restaurants by name or menu item, filtered by cuisine tags and delivery postal code eligibility (`[D8]`, `[D16]`, `[D27]`, `[D28]`).
- **Cart & Quote**: Manages a single-restaurant cart (max 30 lines, quantity 1-20 per line, `[D6]`). Requests server-side calculated quote (`POST /checkout/quote`, `[D9]`).
- **Checkout & Payment**: Orders via online payment (`<RAZORPAY or STRIPE - EDIT ME>`) or Cash on Delivery / Pay at Pickup (`[D11]`). Online orders use order-first sequencing (`PAYMENT_PENDING` with 15-minute auto-expiry, `[D24]`).
- **Order Tracking & Notifications**: Monitors order progress via polled timeline (`[D15]`) and receives in-app notifications (`[D18]`). Can cancel eligible orders prior to preparation (`[D13]`).

### 3.2 Restaurant Owner `[D1]`, `[D3]`
- **Account Provisioning**: Created exclusively by Admin alongside restaurant creation with a temporary password (`mustChangePassword=true`, `[D2]`).
- **Single Restaurant Scope**: Manages exactly one restaurant (`[D3]`).
- **Operational Controls**: Defines weekly operating hours in `APP_TIMEZONE` (`[D10]`, `[D22]`), toggles `acceptingOrders`, specifies `servicePostalCodes`, `deliveryFee`, and `minOrderAmount` (`[D9]`).
- **Menu Management**: Creates and updates menu categories and items (diet: veg/non-veg, preparation time, availability, image, `[D7]`). Soft-deletes items (`[D26]`).
- **Order Fulfillment**: Views incoming order queue, advances state through standard transitions, or rejects/cancels orders with mandatory reason (`[D8]`, `[D13]`).

### 3.3 System Administrator `[D1]`
- **Bootstrap & CLI**: Bootstrapped via initial CLI command (`npm run create-admin`, `[D2]`).
- **User & Restaurant Management**: Activates/deactivates user accounts, creates restaurants with owner accounts, toggles restaurant status (`ACTIVE` <-> `SUSPENDED`, `[D2]`, `[D3]`).
- **Platform Oversight**: Manages global cuisine tag list (`ADM-003`), monitors order statuses, cancels any non-terminal order with reason (`[D13]`), and issues full refunds via payment gateway API (`[D14]`, `[D21]`).

---

## 4. V1 Feature Scope & Out-of-Scope Boundaries

### 4.1 In Scope for V1
- Single-restaurant cart and checkout logic (`[D6]`).
- Server-side tax calculation (`TAX_PERCENT` env variable) and restaurant-level delivery fees / minimum order amounts (`[D9]`).
- Order-first online payment sequencing with 15-minute unpaid order expiry (`[D11]`, `[D24]`).
- Cash on Delivery (COD) and Pay at Pickup payment methods (`[D11]`).
- Signature-verified payment webhook processing (`[D25]`).
- Admin-triggered full refunds via payment gateway API (`[D14]`, `[D21]`).
- Weekly operating hours and operational status evaluation in `APP_TIMEZONE` (`[D10]`, `[D22]`).
- Service area postal code filtering (`[D28]`).
- Local volume image file uploads with magic-byte validation (JPEG, PNG, WebP, max 2 MB, `[D20]`).
- In-app notification system for customer and restaurant order events (`[D18]`).
- Database text search with index optimization (`[D16]`, `[D27]`).

### 4.2 Out of Scope for V1 (`[D20]`)
- Password recovery / password reset workflows (`AUTH-005`, `AUTH-006` marked out of scope, `[D19]`).
- Multiple restaurant owner staff accounts or multi-branch management (`[D3]`).
- Customer reviews, ratings, and feedback (`[D20]`).
- Coupons, discount codes, loyalty rewards, and promotional engines (`[D20]`).
- Favorites and saved restaurant lists (`[D20]`).
- Food variants, size options, and add-on selections (`[D20]`).
- Live driver GPS tracking, driver mobile app, or external delivery integrations (`[D8]`, `[D20]`).
- Email, SMS, or mobile push notification integration (`[D18]`, `[D20]`).
- Partial refunds (`[D14]`, `[D20]`).
- Scheduled / future order placement (`[D20]`).
- Hard data deletion scripts or automated retention purging (`[D26]`).
