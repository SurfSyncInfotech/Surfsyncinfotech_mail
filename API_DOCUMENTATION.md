# SurfSync Mail API

This document describes the API implemented by the current project source. It is
based on the route handlers under `app/api/`; it does not imply that a route is
already reachable from the public internet.

## Base URL and request format

Use the base URL for the environment you are calling:

```text
Local development: http://localhost:3000
Planned production: https://apisyncmail.surfsyncinfotech.in
```

The production URL is usable only after the API process, reverse proxy, DNS, and
HTTPS are configured and verified. MySQL is an internal service and is not an
HTTP API or a public endpoint.

For JSON requests, send:

```http
Content-Type: application/json
```

Protected endpoints use:

```http
Authorization: Bearer <token>
```

## Authentication and roles

`POST /api/auth/login` returns a signed bearer token that expires after 12 hours.
The token contains the user ID, email, and role. Roles used by the API are
`customer`, `super_admin`, `company_admin`, and `employee`.

| Endpoint group | Required identity |
| --- | --- |
| `/api/company/*`, `/api/domains/*`, `/api/mailboxes/*` | `company_admin` token |
| `/api/mail/*` | `employee` token |
| `/api/admin/dashboard`, `/api/admin/companies`, `/api/admin/plans`, `/api/admin/migrations`, `/api/admin/stalwart/test`, `/api/onboarding/*` | `super_admin` token |
| `/api/admin/orders` | `ADMIN_API_KEY` bearer value (not a login token) |
| `/api/plans`, `/api/auth/*`, `/api/checkout/*` | No bearer token required by these handlers |

Most protected endpoints return `401` when the bearer token is missing, invalid,
or expired, and `403` when its role is not permitted.

## Endpoint index

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/plans` | Public | List active plans |
| `POST` | `/api/auth/register` | Public | Create a customer account |
| `POST` | `/api/auth/login` | Public | Log in and get a bearer token |
| `POST` | `/api/auth/reset-password` | Public | Request a reset token or set a new password |
| `POST` | `/api/checkout` | Public | Validate company details and create a pending order |
| `POST` | `/api/checkout/{id}/pay` | Public | Create a Razorpay order for card, UPI, or net banking |
| `POST` | `/api/checkout/{id}/upi` | Public | Create or check a UPI collect payment |
| `POST` | `/api/checkout/{id}/verify` | Public | Verify Razorpay checkout payment and start onboarding |
| `GET` | `/api/onboarding/{paymentId}` | Super admin | Read payment/onboarding status |
| `POST` | `/api/onboarding/complete` | Super admin | Complete onboarding for a paid order |
| `POST` | `/api/domains` | Company admin | Add a domain and receive its DNS records |
| `POST` | `/api/domains/verify` | Company admin | Check the domain's public DNS records |
| `GET` | `/api/company/dashboard` | Company admin | Read company, subscription, mailbox, storage, and domain summary |
| `POST` | `/api/mailboxes` | Company admin | Create a mailbox and employee login |
| `POST` | `/api/mailboxes/delete` | Company admin | Delete a mailbox and its employee login |
| `POST` | `/api/mailboxes/reset-password` | Company admin | Reset a mailbox login password |
| `POST` | `/api/mail/list` | Employee | List messages in a folder |
| `POST` | `/api/mail/read` | Employee | Read a message in the employee's mailbox |
| `POST` | `/api/mail/send` | Employee | Save/send a message |
| `GET` | `/api/admin/dashboard` | Super admin | Read system dashboard totals |
| `GET` | `/api/admin/companies` | Super admin | List companies |
| `POST` | `/api/admin/companies/status` | Super admin | Activate or suspend a company |
| `POST` | `/api/admin/plans` | Super admin | Create, update, or deactivate a plan |
| `POST` | `/api/admin/migrations` | Super admin | Create missing migration tables |
| `POST` | `/api/admin/stalwart/test` | Super admin | Test the Stalwart management API connection |
| `GET` | `/api/admin/orders` | `ADMIN_API_KEY` | List orders, optionally filtered by status |
| `GET` | `/api/admin/orders/{id}` | `ADMIN_API_KEY` | Read one order |

There is currently no payment webhook route or standalone health-check route.
`GET /api/plans` can be used as a basic smoke test, but it depends on database
configuration and connectivity.

## Authentication endpoints

### `POST /api/auth/register`

Request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "example123"
}
```

Passwords must be 8–72 characters and contain at least one letter and one
number. This endpoint creates a `customer` account; it does not create a
company or mailbox. Success returns `201`.

### `POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "example123"
}
```

Success returns `200` with `token` and a user object containing `userId`, `name`,
`email`, and `role`. Invalid credentials return `401`.

### `POST /api/auth/reset-password`

Request a reset token:

```json
{ "email": "user@example.com" }
```

Then submit the reset token and a new password:

```json
{
  "resetToken": "<reset-token>",
  "password": "new-example123"
}
```

Reset tokens expire after 30 minutes and are single-use. The current API does
not send reset emails. `RETURN_RESET_TOKEN=true` includes the token in the
response and is intended only for local testing; do not enable it in
production. The request response is deliberately generic for unknown emails.

## Plans and checkout

### `GET /api/plans`

Returns active plans as `{ "success": true, "count": n, "plans": [...] }`.
Each plan includes its ID, prices, currency, mailbox/storage limits, features,
and GST percentage. A configured MySQL connection and auth secret are required
for this handler to serve the catalog.

### `POST /api/checkout`

Creates a pending order. This endpoint allows up to 8 attempts per minute per
observed client IP (in-memory, per process).

Required JSON fields:

```json
{
  "planId": "desk",
  "companyName": "Example Company",
  "companyDomain": "example.com",
  "adminName": "Example Admin",
  "adminEmail": "admin@example.com",
  "contactNumber": "9876543210"
}
```

`planId` must be `desk`, `studio`, `house`, or `hall`. The admin email must use
the supplied company domain. The contact number must be a valid 10-digit Indian
mobile number (an optional leading country code `91` is accepted). Success
returns the order `id`, amount, GST, currency, plan name, and status.

### `POST /api/checkout/{id}/pay`

JSON body:

```json
{ "method": "card" }
```

`method` may be `card`, `upi`, or `netbanking`. Success returns the Razorpay
public key ID, Razorpay order ID, amount in paise, and checkout details. This
endpoint returns `503` if Razorpay credentials are not configured.

### `POST /api/checkout/{id}/upi`

Create a UPI collect request:

```json
{ "vpa": "name@bank" }
```

Poll an existing request:

```json
{ "refresh": true }
```

The response status is `paid`, `failed`, or `pending`, or contains an `error`.
The VPA format is validated before contacting Razorpay.

### `POST /api/checkout/{id}/verify`

Request:

```json
{
  "razorpay_order_id": "<razorpay-order-id>",
  "razorpay_payment_id": "<razorpay-payment-id>",
  "razorpay_signature": "<razorpay-signature>"
}
```

The API validates the signature and confirms the payment's order, amount,
currency, and captured/authorized status through Razorpay before marking the
order paid and attempting workspace onboarding. A browser redirect alone is
not proof of payment.

## Company and mailbox endpoints

### Domains

`POST /api/domains` and `POST /api/domains/verify` both require a
`company_admin` bearer token.

Add a domain:

```json
{ "domain": "example.com" }
```

Success returns the domain and four DNS records (MX, SPF, DKIM, and DMARC).
Verification request:

```json
{ "domain": "example.com" }
```

The verification response includes a `checks` object with `mx`, `spf`, `dkim`,
and `dmarc` booleans. A domain is marked verified only when all checks pass.

### `GET /api/company/dashboard`

Requires a `company_admin` bearer token. Returns company status, subscription,
mailbox count/allowance, storage use/allowance, and domains with verification
status.

### Mailboxes

All three mailbox endpoints require a `company_admin` bearer token and JSON
body `{ "email": "person@example.com" }`.

- `POST /api/mailboxes` creates an employee login and returns a one-time
  `temporaryPassword`. The company's domain must already be verified and the
  plan must have an unused mailbox allowance.
- `POST /api/mailboxes/delete` deletes that company's mailbox and employee
  account.
- `POST /api/mailboxes/reset-password` resets the employee login and returns a
  new `temporaryPassword`.

Mailbox creation currently changes SurfSync's MySQL records only. It does not
provision a mailbox in Stalwart.

## Employee mail endpoints

All mail endpoints require an employee bearer token. The mail handler rejects
request text longer than 1,000,000 characters. Sending is limited to 30
attempts per minute per mailbox (in-memory, per process).

### `POST /api/mail/list`

Optional JSON body:

```json
{ "folder": "inbox" }
```

Allowed folders: `inbox`, `sent`, `drafts`, `trash`, and `spam`. If omitted,
the folder defaults to `inbox`. Returns message metadata without message bodies.

### `POST /api/mail/read`

Request:

```json
{ "messageId": "msg_..." }
```

Returns the message body only when the message belongs to the authenticated
employee's mailbox. Otherwise returns `404`.

### `POST /api/mail/send`

Request:

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Message text"
}
```

The sender's sent copy is saved in MySQL. If the recipient is another active
SurfSync mailbox, the API attempts to add an inbox copy. External delivery requires `STALWART_SMTP_HOST`,
`STALWART_SMTP_USERNAME`, `STALWART_SMTP_PASSWORD`, and an SMTP account
authorized to send as the employee. `STALWART_SMTP_PORT` is optional and
defaults to `587`. Without SMTP configuration, an external message is saved in
Sent but is not delivered externally. `acceptedByMailServer: true` means
Stalwart accepted the message for processing; it is not proof of inbox delivery.

## Administrative endpoints

### Super-admin token endpoints

These require `Authorization: Bearer <super-admin-login-token>`.

- `GET /api/admin/dashboard`: returns company counts, paid revenue, and storage
  totals.
- `GET /api/admin/companies`: returns company, subscription, domain, and
  mailbox details.
- `POST /api/admin/companies/status` with
  `{ "companyId": "cmp_...", "status": "suspended" }` or `"active"`. This also
  changes the company's mailbox statuses.
- `POST /api/admin/plans`: body must include `action` equal to `create`,
  `update`, or `deactivate`. `create` requires `name`, `monthlyPrice`,
  `annualPrice`, `currency`, `mailboxLimit`, and `storageGb`; `features` is an
  optional list of short strings. `update` also requires `planId`; omitted
  fields retain their existing values. `deactivate` requires `planId`.
- `POST /api/admin/migrations`: no body required. Creates missing migration
  tables. Back up the database before running schema-changing operations.
- `POST /api/admin/stalwart/test`: no body required. Tests the Stalwart
  management API configuration, not SMTP delivery.

### `ADMIN_API_KEY` order endpoints

These use `Authorization: Bearer <ADMIN_API_KEY>` rather than a user JWT.
`ADMIN_API_KEY` must be at least 24 characters. `ADMIN_CORS_ORIGIN` optionally
allows browser requests from one exact origin for these order endpoints.
These are currently the only handlers that implement explicit CORS headers;
other routes do not set cross-origin headers in their handlers.

- `GET /api/admin/orders` lists orders. Optional query parameter `status` may
  be `paid`, `pending_payment`, or `failed`; other values return the unfiltered
  list.
- `GET /api/admin/orders/{id}` returns one order or `404`.

## Environment and database requirements

The API reads secrets and connection settings from the server process
environment. Never put production values in browser code or commit them.

| Variable | Purpose |
| --- | --- |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | MySQL connection; port defaults to `3306` |
| `AUTH_JWT_SECRET` | Signs login/reset tokens; minimum 24 characters |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Initial super-admin creation; password must meet the API password rules |
| `ADMIN_API_KEY` | Separate bearer credential for order-list endpoints; minimum 24 characters |
| `ADMIN_CORS_ORIGIN` | Optional exact browser origin for order-endpoint CORS |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional payment integration; required for payment processing |
| `RETURN_RESET_TOKEN` | Local testing only; leave unset/false in production |
| `STALWART_HOST`, `STALWART_PORT`, `STALWART_ADMIN_USERNAME`, `STALWART_ADMIN_PASSWORD`, `STALWART_USE_HTTPS` | Optional Stalwart management API test configuration |
| `STALWART_SMTP_HOST`, `STALWART_SMTP_PORT`, `STALWART_SMTP_USERNAME`, `STALWART_SMTP_PASSWORD` | Optional external-mail SMTP submission |
| `MAIL_MX_HOST`, `SPF_INCLUDE` | MX/SPF values returned for customer domain setup |
| `SERVER_STORAGE_GB`, `STORAGE_ALERT_PERCENT` | Optional super-admin storage dashboard thresholds |

The project uses MySQL via `mysql2`. Some routes create missing tables or add
missing columns when first used; `/api/admin/migrations` creates additional
tables. Review and back up the existing database before running migrations.
For a same-server deployment, keep MySQL reachable only locally/private and
configure the API to connect to that private address. Do not expose port 3306
as a public API endpoint.

## Error responses

Error response shapes are not fully uniform: most account/mail routes use
`{ "success": false, "message": "..." }`, while checkout and the API-key
protected order routes may use `{ "error": "..." }`.

Common HTTP statuses:

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, missing fields, or invalid values |
| `401` | Missing/invalid token or API key |
| `403` | Authenticated identity lacks the required role |
| `404` | Requested order, company, domain, mailbox, or message was not found |
| `409` | Conflict, such as a duplicate account, suspended company, or paid order |
| `413` | Mail request text exceeds 1,000,000 characters |
| `429` | In-memory request limit reached |
| `500` | Internal service or database failure |
| `502` | Payment or SMTP service did not accept the request |
| `503` | Required service configuration is absent or incomplete |

## Operational limitations

- The API does not expose a database-over-HTTP endpoint. Clients call the API;
  the API connects to MySQL privately.
- Checkout and mailbox creation do not automatically provision Stalwart
  mailboxes. Inbound mail synchronization is not implemented.
- SMTP is optional. Its TLS certificate must validate; do not disable
  certificate verification.
- If a browser frontend is on a different origin, account for the CORS behavior
  above before integrating it with these API routes.
- Rate limits are held in process memory and are not shared across multiple
  workers or servers.
- There is no payment webhook route in the current source. Payment completion
  uses the checkout verification endpoint.
