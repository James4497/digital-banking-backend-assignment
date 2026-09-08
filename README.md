# SmartFunds Bank — Digital Banking System Backend

A backend system for a digital bank, built as a TS Academy backend engineering
assignment. Supports customer onboarding, account management, and core
banking operations, integrating with the NibssByPhoenix API for
identity verification and inter-bank transfers.

## Tech Stack

- Node.js / Express
- MongoDB / Mongoose
- Axios (for NibssByPhoenix API integration)

## Features

- **Customer onboarding** — verifies a customer's BVN or NIN with
  NibssByPhoenix before creating an account. The account number and
  ₦15,000 pre-funded balance are issued by NibssByPhoenix and mirrored
  locally.
- **Account operations** — balance check, name enquiry.
- **Funds transfer** — intra-bank (within SmartFunds Bank) and inter-bank
  (via NibssByPhoenix) transfers, each running inside a MongoDB
  transaction so a failed transfer never leaves a customer debited
  without a corresponding credit.
- **Transaction tracking** — status check by reference, and full
  transaction history per customer, with strict data isolation (a
  customer can only ever see their own transactions).

## Setup

1. Clone the repo:
   ```
   git clone https://github.com/James4497/digital-banking-backend-assignment.git
   cd digital-banking-backend-assignment
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root with the following variables:
   ```
   MONGODB_URI=<your MongoDB connection string>
   NIBSS_BASE_URL=https://nibssbyphoenix.onrender.com/api
   NIBSS_API_KEY=<your NibssByPhoenix API key>
   NIBSS_API_SECRET=<your NibssByPhoenix API secret>
   PORT=8000
   ```
   (`NIBSS_API_KEY` / `NIBSS_API_SECRET` are obtained by calling
   NibssByPhoenix's `POST /api/fintech/onboard` endpoint with your email
   and bank name — see their Swagger docs.)

4. Start the server:
   ```
   npm run dev
   ```
   The API will be running at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/customers/onboard` | Onboard a new customer (verifies BVN or NIN with NibssByPhoenix, creates account) |
| GET | `/api/accounts/:accountNumber/balance` | Check account balance |
| GET | `/api/accounts/:accountNumber/name-enquiry` | Resolve an account number to the holder's name |
| GET | `/api/accounts/:accountNumber` | Get full account details |
| POST | `/api/transfers/intra-bank` | Transfer between two SmartFunds Bank accounts |
| POST | `/api/transfers/inter-bank` | Transfer to an account at another bank, via NibssByPhoenix |
| GET | `/api/transactions/:reference` | Check the status of a transaction by reference |
| GET | `/api/transactions/customer/:customerId` | Get a customer's full transaction history |

## Notes on the NibssByPhoenix Integration

- Onboarding requires either a `bvn` or a `nin` (not both). The customer's
  identity is verified with NibssByPhoenix (`insertBvn`, or `insertNin` +
  `validateNin`) before any local record is created.
- Account creation is delegated to NibssByPhoenix's
  `POST /api/account/create` endpoint, which generates the account number
  and pre-funds it with ₦15,000. This account number is then used locally
  too, so the account is discoverable by NibssByPhoenix for inter-bank
  transfers.
- `kycType` must be sent in lowercase (`"bvn"` / `"nin"`) — the
  NibssByPhoenix API returns a 500 error on uppercase input, which isn't
  documented in their Swagger spec.

## Testing

A Postman collection covering all endpoints (including edge cases —
insufficient funds, non-existent accounts, invalid amounts, missing
fields) is included in this repo / available on request.

Transfers can be tested between accounts created by this system, or with
accounts created by classmates working against the same NibssByPhoenix
sandbox.