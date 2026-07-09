# Taza Maestra — Café de Especialidad Web

Bilingual (ES/EN) specialty coffee e-commerce and ambassador platform built with Next.js 16 App Router, Tailwind CSS v4 and next-intl.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 (`@theme` directive) | 4.x |
| UI Components | React | 19.x |
| Internationalisation | next-intl | 4.13.0 |
| Icons | lucide-react | latest |
| State management | Zustand (with `persist`) | 5.0.14 |
| Fonts | Google Fonts via `next/font` | — |
| Images | `next/image` (Sharp) | — |

---

## Directory Structure

```
taza-maestra-web/
├── app/
│   └── [locale]/               # Locale-prefixed routes (/es, /en)
│       ├── layout.tsx           # Root layout: fonts, intl provider, Header/Footer
│       ├── page.tsx             # Home page
│       ├── tienda/page.tsx      # Shop (products + filters)
│       ├── embajadores/page.tsx # Ambassador landing
│       ├── blog/page.tsx        # Blog / learning hub
│       ├── acceso/page.tsx      # Register + login
│       └── producto/[id]/       # Product detail (dynamic)
│
├── components/
│   ├── home/                   # Home page sections
│   │   ├── Hero.tsx
│   │   ├── ProductCarousel.tsx
│   │   ├── Methods.tsx
│   │   ├── HowItWorks.tsx      # 3-step ambassador interactive flow (tabs)
│   │   ├── Origins.tsx
│   │   ├── Testimonials.tsx
│   │   └── FAQ.tsx
│   ├── shop/
│   │   ├── ProductCard.tsx     # Card with add-to-cart logic
│   │   └── CartDrawer.tsx      # Slide-in cart (Zustand-driven)
│   ├── auth/
│   │   └── AuthForm.tsx        # Register / login tabs
│   └── layout/
│       ├── Header.tsx          # Sticky header: nav, cart icon, locale switcher
│       ├── Footer.tsx
│       ├── LocaleSwitcher.tsx  # ES/EN flag buttons
│       └── ModeToggle.tsx      # Buyer vs Ambassador mode
│
├── lib/
│   ├── content.ts              # Exports typed data from content.json (filters disabled items)
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── format.ts               # formatCOP currency formatter
│   ├── nav.ts                  # next-intl navigation exports (Link, useRouter, usePathname)
│   ├── cart-store.ts           # Zustand cart store (persisted to localStorage)
│   └── auth-store.ts           # Zustand auth store (persisted to localStorage)
│
├── data/
│   └── content.json            # Single source of truth for all site content
│
├── messages/
│   ├── es.json                 # Spanish UI strings (next-intl)
│   └── en.json                 # English UI strings (next-intl)
│
├── contexts/
│   └── ModeContext.tsx         # React context: buyer vs ambassador display mode
│
├── i18n/
│   ├── routing.ts              # next-intl routing config (locales, defaultLocale)
│   └── request.ts              # next-intl server-side config
│
├── middleware.ts               # next-intl locale detection + redirect
└── public/                     # Static assets: logo, product images
```

---

## Key Features

### Bilingual (ES / EN)
- `middleware.ts` detects locale from URL prefix and redirects accordingly
- All routes are prefixed: `/es/tienda`, `/en/tienda`
- UI strings live in `messages/es.json` and `messages/en.json`
- Content data (`t_es` / `t_en` fields) is inline in `content.json`
- `LocaleSwitcher` swaps locale without a full page reload via `router.replace`

### Ambassador Flow
`HowItWorks.tsx` implements a 3-tab interactive flow with Lucide icons:
1. **Regístrate** — benefit cards (ShieldOff, Receipt, UserCheck icons)
2. **Elige tu plan** — 15% / 20% margin pricing cards
3. **Capacítate** — blog post grid with video (PlayCircle) and guide (BookOpen) badges

### Shopping Cart
- `CartItem` interface: `{ id, name, price, qty, swatch, img }`
- `useCartStore` (Zustand + persist): `addItem`, `setQty`, `removeItem`, `clearCart`, `openCart`
- `CartDrawer`: slide-in panel, keyboard trap via `inert` attribute, Escape key handler, body scroll lock
- `ProductCard` shows visual feedback ("✓ Añadido") for 1.5 s after adding

### Auth (localStorage-only)
- No backend; users are stored in Zustand `persist` under key `tm-auth`
- Registration validates all fields client-side and checks for duplicate emails
- Login checks only email (no password verification — placeholder until backend is ready)
- `useEffect` in `AuthForm` redirects to `/embajadores` if already logged in

### Buyer / Ambassador Mode
- `ModeContext` toggles display mode between `"cliente"` and `"embajador"`
- In ambassador mode, `ProductCard` shows wholesale price + strikethrough retail price

---

## Data Architecture

```
data/content.json
    │
    └── lib/content.ts          ← typed exports, filters _disabled items
            │
            ├── products[]      → ProductCarousel, ProductCard, product detail
            ├── methods[]       → Methods section (carousel)
            ├── steps[]         → HowItWorks tab labels
            ├── blogPosts[]     → HowItWorks panel 3, Blog page
            ├── testimonials[]  → Testimonials section
            ├── originFacts[]   → Origins section
            ├── faqs[]          → FAQ section
            └── benefits[]      → Ambassador landing

messages/{es,en}.json           ← UI label strings (next-intl)
```

To disable a product or method without deleting it, add `"_disabled": true` to the JSON entry. `lib/content.ts` filters these out at import time.

---

## State Management

| Store | localStorage key | Purpose |
|---|---|---|
| `useCartStore` | `tm-cart` | Cart items, drawer open state |
| `useAuthStore` | `tm-auth` | Registered users, current session |
| `ModeContext` | *(React context, not persisted)* | Buyer vs ambassador display mode |

---

## Internationalization

Routing is configured in `i18n/routing.ts`:

```ts
export const routing = createNavigation({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
});
```

Always import `Link`, `useRouter`, `usePathname` from `@/lib/nav` — **not** from `next/navigation` — so the current locale is automatically injected into all links and programmatic navigations.

---

## How to Run

```bash
npm install
npm run dev       # http://localhost:3000 (redirects to /es)
npm run build
npm run start
```

TypeScript check:
```bash
npx tsc --noEmit
```

---

## Accessibility Notes

- All sections use `aria-labelledby` or `aria-label`
- Tab panels use `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected` and `aria-controls`
- Cart drawer uses `role="dialog"`, `aria-modal`, `inert` for focus trapping
- Decorative icons: `aria-hidden="true"` (Lucide SVGs alongside text)
- Informative icon-only elements: `role="img"` + `aria-label` on wrapper
- Skip link: `<a href="#tm-main">` in layout, visible on focus
