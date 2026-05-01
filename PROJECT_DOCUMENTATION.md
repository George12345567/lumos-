# Lumos Digital Ascent - Project Documentation

## Project Overview

**Project Name:** Lumos Digital Ascent  
**Version:** 1.0.0  
**Type:** Full-stack Web Application  
**Description:** Modern marketing website for Lumos Agency with complete authentication system, customer management, dashboard, and creative studio features  
**Technology Stack:** React 18, TypeScript, Vite, TailwindCSS, Supabase (Backend)

---

## Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── admin/       # Admin-specific components
│   ├── pricing/     # Pricing components
│   └── ui/         # Base UI components (Radix UI based)
├── config/           # Configuration files
├── context/         # React Context providers
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
│   ├── supabaseClient.js    # Supabase client initialization
│   ├── supabaseAdmin.js   # Admin client (service role)
│   ├── sessionAuth.ts       # Session authentication
│   ├── validation.ts     # Form validation
│   ├── errors.ts       # Error handling
│   ├── logger.ts       # Logging utility
│   ├── constants.ts   # App constants
│   ├── pricingEngine.ts # Pricing calculation
│   ├── collectBrowserData.ts # Browser fingerprinting
│   └── utils.ts     # General utilities
├── pages/           # Page components
├── services/         # API service layer
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Backend Architecture (Supabase Edge Functions)

```
supabase/functions/
├── _shared/
│   └── cors.ts          # CORS headers helper
├── hybrid-signup/        # User registration
├── client-login/         # Authentication
├── client-portal/        # Client dashboard
├── client-reset-password/ # Password reset
├── admin-dashboard/     # Admin dashboard
├── admin-client-modal/    # Client management modal
├── admin-client-update/   # Client updates
├── profile-service/       # Profile management
├── send-magic-link/     # Magic link auth
├── send-otp/           # SMS OTP
└── verify-otp/         # OTP verification
```

---

## Features

### 1. Authentication System

- **Hybrid Authentication:** Supabase Auth + Custom clients table
- **Login Methods:**
  - Email/Password login
  - Username + Password login
  - Magic Link (passwordless)
  - SMS OTP verification
- **Security Features:**
  - Rate limiting
  - Account lockout after failed attempts
  - Security question verification
  - Password hashing
  - Session management
  - Auth event logging

### 2. Client Management

- **User Registration:** Full signup flow with company details
- **Profile Management:**
  - Avatar customization (14 styles)
  - Company branding
  - Contact information
  - Social links
- **Client Portal:**
  - Dashboard
  - Order history
  - File uploads
  - Messaging

### 3. Admin Dashboard

- **Dashboard Overview:**
  - Statistics (orders, contacts, designs)
  - Recent activity
  - Revenue tracking
- **Client Management:**
  - View all clients
  - Update client details
  - Package assignment
  - Notes and offers
- **Order Management:**
  - Create/Update/Delete orders
  - Status tracking
  - Order conversion
- **Contact Management:**
  - View contacts
  - Status updates
- **Pricing Requests:**
  - Package requests
  - Custom requests
  - Conversion to orders

### 4. Design/Studio Features

- **Theme System:**
  - 12+ built-in themes
  - Custom color palettes
  - Dark/Light mode
  - Glass effects
- **Preview System:**
  - Desktop/Mobile/Tablet preview
  - 3D transformations
  - Real-time preview
- **Content Management:**
  - Menu items (with categories)
  - Featured items
  - Ratings display
  - Stock management

### 5. Commerce Features

- **Pricing Engine:**
  - Base price calculation
  - Add-ons
  - Quantity discounts
  - Service combinations
- **Discount Codes:**
  - Percentage discounts
  - Fixed amount discounts
  - Usage limits
- **Order Processing:**
  - Package selection
  - Custom plans
  - Order status tracking

---

## Database Schema

### Core Tables

| Table | Description |
|-------|------------|
| `clients` | Main user table |
| `profiles` | Extended profile data |
| `orders` | Client orders |
| `contacts` | Contact form submissions |
| `pricing_requests` | Pricing requests |
| `saved_designs` | Design configurations |
| `client_messages` | Message history |
| `client_updates` | Client milestones |
| `client_assets` | File uploads |

### Authentication Tables

| Table | Description |
|-------|------------|
| `auth_events` | Auth event logging |
| `rate_limits` | Rate limiting |
| `magic_links` | Magic link tokens |
| `login_attempts` | Login history |
| `phone_verifications` | OTP codes |

### Utility Tables

| Table | Description |
|-------|------------|
| `packages` | Pricing packages |
| `discounts` | Discount codes |
| `avatar_presets` | Avatar styles |
| `reviews` | User reviews |
| `profile_activity` | Activity log |

### Storage

- **Bucket:** `client-assets`
- **Allowed Types:** JPEG, PNG, GIF, WebP, PDF
- **Max Size:** 10MB

---

## API Endpoints

### Edge Functions

| Function | Method | Description |
|----------|--------|-------------|
| `/hybrid-signup` | POST | User registration |
| `/client-login` | POST | Authentication |
| `/client-portal` | POST | Client dashboard |
| `/client-reset-password` | POST | Password reset |
| `/admin-dashboard` | POST | Admin operations |
| `/admin-client-modal` | POST | Client management |
| `/admin-client-update` | POST | Client updates |
| `/profile-service` | POST | Profile management |
| `/send-magic-link` | POST | Magic link email |
| `/send-otp` | POST | SMS OTP |
| `/verify-otp` | POST | OTP verification |

---

## Environment Variables

### Required Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_TOKEN_SECRET=
```

### Optional Variables

```env
VITE_SITE_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Security

### Row Level Security (RLS)

- Clients can only access their own data
- Admin can access all data
- Storage policies per user

### Authentication Flow

1. User signs up via `hybrid-signup` function
2. Supabase Auth user created + clients row inserted
3. Confirmation email sent
4. User verifies email
5. Can now login with credentials

### Rate Limiting

- 5 signups per 15 minutes per IP
- 5 login attempts before lockout
- 3 OTP attempts per phone

---

## Running the Project

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Deploy to Vercel

The project is configured for Vercel deployment with:
- Edge Functions support
- Analytics
- Speed Insights

---

## Project Structure

```
lumos-digital-ascent/
├── src/                    # React frontend
├── supabase/
│   ├── functions/          # Edge functions
│   └── templates/         # Email templates
├── public/                # Static assets
├── dist/                 # Build output
├── AVATARS/              # Avatar images
└── DATABASE_SCHEMA.sql    # Database schema
```

---

## Dependencies

### Core

- React 18.3.1
- TypeScript 5.8.3
- Vite 7.2.4
- TailwindCSS 3.4.17
- Supabase JS 2.86.0

### UI Components

- Radix UI (complete component library)
- Lucide React (icons)
- Framer Motion (animations)
- Recharts (charts)
- Sonner (toasts)

### Form & Validation

- React Hook Form
- Zod (validation)
- Hookform Resolvers

### Utilities

- date-fns
- class-variance-authority
- tailwind-merge
- cmdk

---

## License

MIT License - See LICENSE file

---

## Author

Lumos Agency  
https://lumos-agency.com