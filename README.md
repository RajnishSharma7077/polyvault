# PolyVault

PolyVault is a two-sided marketplace for 3D assets. The project is being built
in milestones, starting from the ShopKart authentication patterns and adding
asset licensing, creator uploads, checkout, and protected digital downloads.

## Current implementation

- Customer registration and login with bcrypt-hashed passwords.
- JWT authentication using an HttpOnly cookie and protected profile APIs.
- Buyer-to-creator enablement and password change endpoint.
- Optional development-only demo buyer and creator accounts.
- Customer, asset, and embedded license-tier schemas.
- Public catalog with category, search, format, polycount, and license-price
  filters. Unpublished assets are hidden and original file paths are excluded.
- React authentication/session restoration with protected routes.
- Responsive marketplace dashboard with live catalog search, category filters,
  asset cards, account menu, creator-access actions, and loading/error/empty
  states.
- In-memory MongoDB integration tests for auth and catalog behavior.

Creator file uploads, cart and wishlist, Razorpay checkout, orders, gated
downloads, and the full marketplace pages are still being implemented.

## Requirements

- Node.js 20 or newer and npm.
- MongoDB Community Server or a MongoDB Atlas database.

## Setup

Install backend and frontend dependencies:

```bash
npm install
cd frontend
npm install
cd ..
```

Create a local environment file and set a MongoDB URI and long random JWT
secret:

```bash
cp .env.example .env
```

The `.env.example` contains placeholders only. Do not commit `.env`.
To create the sample accounts in a non-production development database, set
`ENABLE_DEMO_ACCOUNTS=true` in `.env` and restart the backend. The seed is
idempotent, creates only missing accounts, and never resets an existing demo
account's password. The demo creator account is enabled as a creator.

| Account | Email | Password |
| --- | --- | --- |
| Buyer | `buyer.demo@example.com` | `VaultDemo#2026` |
| Creator | `creator.demo@example.com` | `VaultDemo#2026` |

Start the backend and frontend in separate terminals:

```bash
npm run dev
```

```bash
cd frontend
npm run dev
```

The API listens on `http://localhost:5001`; Vite serves the web app at
`http://localhost:5173` and proxies API requests to the backend.

## Current API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health check |
| `POST` | `/customers/register` | Register a buyer |
| `POST` | `/customers/login` | Sign in and set the HttpOnly cookie |
| `GET` | `/customers/me` | Read the authenticated profile |
| `POST` | `/customers/logout` | Clear the authentication cookie |
| `PATCH` | `/customers/change-password` | Change the authenticated user's password |
| `PATCH` | `/customers/become-creator` | Enable creator access |
| `GET` | `/assets/categories` | List supported asset categories |
| `GET` | `/assets` | List published assets and apply catalog filters |
| `GET` | `/assets/:id` | Read a published asset |

Catalog query parameters include `search`, `category`, `format`,
`minPolycount`, `maxPolycount`, `minPrice`, `maxPrice`, `page`, and `limit`.
Pagination is capped at 48 assets per request.

## Tests and build

```bash
npm test
npm --prefix frontend run build
```

The backend integration tests use a temporary in-memory MongoDB instance and
do not require a configured local database. Running the application does
require `MONGO_URI` and `JWT_SECRET`.
