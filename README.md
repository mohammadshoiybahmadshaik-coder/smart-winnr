# Smart Winnr

Smart Winnr is a restaurant rating and review platform built with React, Express, and MongoDB. It has customer, restaurant-owner, and administrator roles. MongoDB is the source of truth; restaurant listings, review totals, averages, and rating distributions are loaded from the API.

## Requirements

- Node.js 18 or newer
- MongoDB (local or Atlas)

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a unique `JWT_SECRET` of at least 32 characters. Keep `.env` private.
2. Install and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. In a separate terminal, install and start React:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

4. Open the Vite URL (normally `http://localhost:5173`). The API health check is at `http://localhost:5000/`.

The public registration form creates customer accounts only. Administrators create owner accounts and assign them to restaurants from the admin screen. The first administrator must be created out-of-band; see **Create the first administrator** below.

## Create the first administrator

Never expose a public administrator signup. Create an admin once through a trusted local shell after configuring the API:

```powershell
cd backend
$env:ADMIN_NAME = "Administrator"
$env:ADMIN_EMAIL = "admin@example.com"
$secret = Read-Host "Set a unique admin password" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  npm run create-admin
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
```

The command enforces the same 8–16 character password policy as registration and does not print the password. The administrator email/password you chose are the sample login credentials for that database. Create a customer through registration and an owner through the admin interface; their chosen email/password pairs are the sample credentials for those roles. Do not put live credentials in source control or this README.

## Roles

- **Customer**: browse/search/filter restaurants, inspect reviews, submit one review per restaurant, edit their own review, and delete their own review.
- **Restaurant owner**: view only their assigned restaurant and its reviews/customers, see rating data, and update name, location, cuisine, and description.
- **Administrator**: view dashboard totals and platform rating distribution; manage users and restaurants; create owners and assign/unassign owners; view and remove reviews.

All role checks are enforced by the API. Request validation includes email/password rules, valid ObjectIds, review length, and integer ratings from 1 through 5. A unique database index on `(customer, restaurant)` prevents duplicate reviews. Restaurant averages and rating distributions are calculated with MongoDB aggregation.

## API

All responses are JSON. Protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/login` | Public | Login any role |
| GET | `/api/users/profile` | Authenticated | Current profile |
| GET | `/api/restaurants?search=&location=&cuisine=` | Public/optional auth | Search and list with aggregates and personal rating |
| GET | `/api/restaurants/:id` | Public/optional auth | Restaurant details and aggregates |
| GET | `/api/restaurants/:restaurantId/reviews` | Public | Restaurant reviews and average |
| GET | `/api/reviews/mine` | Customer | Customer's reviews |
| POST | `/api/reviews/restaurant/:restaurantId` | Customer | Create one review |
| PUT | `/api/reviews/:id` | Customer owner | Update own review |
| DELETE | `/api/reviews/:id` | Customer owner / admin | Delete review |
| GET | `/api/owner/restaurant` | Owner | View assigned restaurant |
| PATCH | `/api/owner/restaurant` | Owner | Update permitted restaurant details |
| GET | `/api/owner/reviews` | Owner | Reviews and reviewers for assigned restaurant |
| GET | `/api/admin/dashboard` | Admin | Totals, platform average, distribution |
| GET/POST | `/api/admin/users` | Admin | Search users / create an account |
| PATCH/DELETE | `/api/admin/users/:id` | Admin | Update or delete a user |
| GET/POST | `/api/admin/restaurants` | Admin | Search/list or create restaurants |
| PATCH/DELETE | `/api/admin/restaurants/:id` | Admin | Update or delete a restaurant |
| PATCH | `/api/admin/restaurants/:id/owner` | Admin | Assign/unassign owner (`{ "ownerId": "<id>" }` or `null`) |
| GET | `/api/admin/reviews` | Admin | Review moderation list |

`backend/postman/Smart-Winnr.postman_collection.json` includes ready-to-configure API requests. Set `baseUrl`, log in, then copy the returned token to the collection's `token` variable.

## Validation

```powershell
cd backend
npm test
npm run build
cd ..\frontend
npm test
npm run build
```

The backend tests use Node's built-in test runner and do not connect to a real database. For endpoint verification against persisted data, run MongoDB locally and use the Postman collection.
