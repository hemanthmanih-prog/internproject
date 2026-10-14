# Loan Management System --- Complete Design Specification

> **Purpose:** Build a fully working local-first Loan Management System
> for the Maker--Checker assignment. This document is the implementation
> contract for Antigravity. Build the actual application, backend,
> database migrations, authentication, tests, and setup documentation.
> Do not stop at mockups or a frontend prototype.

## 1. Non-negotiable implementation rules

-   Implement real React screens connected to real Spring Boot REST
    APIs.
-   Use PostgreSQL for persistent application data. Data must survive
    browser refreshes, application restarts, and computer restarts as
    long as the local PostgreSQL data directory is retained.
-   Use JWT access-token authentication and server-side role-based
    authorization.
-   Use database migrations (Flyway) as the source of truth for schema
    creation and updates.
-   Do not use mock arrays, fake API responses, `localStorage` as the
    database, hard-coded dashboard statistics, simulated authentication,
    TODOs, placeholder buttons, or unfinished screens.
-   Do not claim a feature works until its end-to-end implementation and
    tests exist.
-   Never put database credentials, JWT signing secrets, or privileged
    credentials in frontend code or source control.
-   If an external service is not configured, keep the core application
    working locally; do not silently substitute fake success.
-   Seed only clearly documented local demo users and customer records
    through a backend seed process. Demo passwords must be documented
    for local development only and must be changeable.
-   Every visible action must either work, be explicitly disabled with
    an explanation, or be removed.
-   Keep business rules enforced by the backend even when the frontend
    also validates them.
-   Use clear error messages and loading, empty, success, and failure
    states.

## 2. Technology stack

### Frontend

-   React with TypeScript and Vite.
-   React Router for navigation.
-   A consistent accessible component system using semantic HTML and CSS
    (or a maintained component library if installed and configured).
-   Fetch or Axios for HTTP requests; use one shared API client.
-   React Hook Form and Zod (or equivalent) for form validation.
-   Vitest and React Testing Library for frontend tests.

### Backend

-   Java 21.
-   Spring Boot 3.x.
-   Spring Web, Spring Security, Spring Data JPA, Jakarta Validation.
-   Spring Security JWT support using a maintained JOSE/JWT library
    compatible with the selected Spring Boot version.
-   PostgreSQL JDBC driver.
-   Flyway database migrations.
-   BCrypt password hashing through Spring Security.
-   Maven.
-   JUnit 5, Spring Boot Test, MockMvc, and Testcontainers where
    available for integration tests. Tests must also have a documented
    local execution path.

### Local infrastructure

-   PostgreSQL 16 or another supported current PostgreSQL version.
-   Docker Compose for PostgreSQL as the recommended reproducible local
    setup.
-   Backend default address: `http://localhost:8080`.
-   Frontend default address: `http://localhost:5173`.
-   PostgreSQL default local port: `5432`.
-   Configure frontend API base URL using `VITE_API_BASE_URL`; default
    to `http://localhost:8080/api/v1`.
-   Configure backend database URL, username, password, JWT secret, and
    token expiry through environment variables.

## 3. Product scope and roles

This is a loan-processing workflow for existing customers. It is not a
real banking or credit-bureau integration. Do not imply that it performs
real credit checks, disburses money, or connects to a bank.

### MAKER

Can: - Log in and log out. - View the dashboard and loan list allowed by
policy. - Search existing customers by customer ID or customer name. -
Open a customer detail view. - Create a loan for an existing customer. -
Submit a loan into `PENDING_APPROVAL`. - View loan details and workflow
history. - View their own profile.

Cannot: - Approve or reject any loan. - Approve their own loan. - Create
or edit customers unless a separate customer-management permission is
deliberately added (not in the base assignment). - Change loan status by
sending arbitrary API requests.

### CHECKER

Can: - Log in and log out. - View loans, including pending approvals. -
Open loan details and review customer/loan information. - Approve a
pending loan if they are not the maker who created it. - Reject a
pending loan only after providing a meaningful rejection reason. - View
the audit/workflow history.

Cannot: - Approve or reject a loan they created themselves. - Change a
final `APPROVED` or `REJECTED` loan back to pending. - Use maker-only
loan creation endpoints unless a separate permission is intentionally
approved.

### Authorization rules

-   All protected backend endpoints require a valid, non-expired JWT.
-   Role checks must be enforced in Spring Security and, where
    appropriate, in the service layer.
-   Hiding a button in React is not security.
-   A user must not be able to access another role's restricted action
    by manually calling the API.
-   Never trust a user ID, role, creator name, status, or approval actor
    supplied by the browser. Derive the current user from the
    authenticated principal.
-   A checker cannot approve or reject their own loan. Compare immutable
    user IDs on the server, not display names.
-   Only `PENDING_APPROVAL` loans can be decided upon. Concurrent
    decisions must not result in two successful outcomes.

## 4. Main user journeys

### 4.1 Login

1.  User opens `/login`.
2.  User enters username and password.
3.  React sends credentials to `POST /api/v1/auth/login`.
4.  Backend validates the credentials and returns a signed JWT and safe
    user profile (user ID, username, display name, role).
5.  React stores the access token in memory where practical and sends it
    as `Authorization: Bearer <token>` on API requests.
6.  On refresh, use the selected secure session strategy. Preferred
    production approach: short-lived access token plus refresh token in
    an HttpOnly, Secure, SameSite cookie, with server-side refresh-token
    rotation and revocation. For a local assignment, a simpler
    short-lived bearer-token flow is acceptable if documented; do not
    claim it is equivalent to the production refresh-token design.
7.  On `401`, clear client authentication state and return to login. On
    `403`, show an access-denied message without exposing sensitive
    details.
8.  Logout must invalidate/revoke refresh sessions if refresh tokens are
    implemented and clear client-side state.

**Security note:** Do not persist long-lived JWTs or passwords in
`localStorage`. If using bearer access tokens only, keep the token in
memory and document that refreshing the page requires signing in again,
unless a secure refresh flow is implemented.

### 4.2 Maker creates a loan

1.  Maker opens `/customers`.
2.  Maker searches by customer ID or name.
3.  Backend returns matching customers from PostgreSQL with pagination.
4.  Maker selects a customer and opens `/loans/new?customerId=...`.
5.  Maker enters loan type, principal amount, tenure in months, and
    remarks.
6.  React performs immediate form validation and submits to the backend.
7.  Backend validates the customer exists and is active, validates
    fields, derives the maker identity from the JWT, creates a unique
    loan reference, sets status to `PENDING_APPROVAL`, and writes a
    `CREATED` workflow event in one database transaction.
8.  UI shows the created loan reference and pending status from the API
    response.
9.  The loan appears in the real loan list after refetching from the
    backend.

### 4.3 Checker reviews and decides

1.  Checker opens `/approvals` or filters the loan list by
    `PENDING_APPROVAL`.
2.  Checker opens a loan detail page with customer information, loan
    terms, maker identity, remarks, and history.
3.  Checker chooses Approve or Reject.
4.  Reject requires a reason (trimmed, non-empty, with a reasonable
    maximum length).
5.  Backend rechecks the authenticated role, current status, and
    maker/checker identity inside a transaction.
6.  Backend records the decision, checker ID, timestamp, and workflow
    event.
7.  Status becomes `APPROVED` or `REJECTED`.
8.  UI displays the result from the API. If another checker has already
    decided, show a conflict message and reload the latest record.

### 4.4 Loan list

-   Show loan reference, customer ID, customer name, loan type, amount,
    tenure, creator, status, and created date.
-   Support status filters: All, Pending Approval, Approved, Rejected.
-   Support search by loan reference and customer ID/name if implemented
    in the API.
-   Use pagination and stable sorting.
-   Show loading, empty, and API error states.
-   Do not load all records into the browser to filter locally.

## 5. Navigation and pages

### Shared layout

-   Left sidebar: Dashboard, Customers, Loans; show Approvals for
    CHECKER.
-   Header: page title, signed-in user display name, role badge, profile
    menu, Logout.
-   Responsive layout: sidebar collapses to a mobile menu.
-   Use consistent spacing, accessible contrast, keyboard focus, form
    labels, and meaningful status text/icons.

### Pages

1.  **Login** (`/login`)
    -   Username and password fields.
    -   Show/hide password.
    -   Submit loading state.
    -   Generic invalid-credentials message.
    -   No public registration endpoint in the base assignment; users
        are provisioned by the local seed process or a separately
        secured admin process.
2.  **Dashboard** (`/`)
    -   Real counts retrieved from backend for total, pending, approved,
        and rejected loans.
    -   Maker view may include loans created by that maker plus
        permitted shared metrics.
    -   Checker view emphasizes pending approvals.
    -   Recent loans list populated from the API.
    -   Every statistic must come from a database-backed endpoint, not a
        hard-coded number.
3.  **Customer Search** (`/customers`)
    -   Search input, clear control, results table, pagination.
    -   Columns: Customer ID, Name, Email, Phone, Status, View.
    -   Search by customer ID or name; case-insensitive name search.
    -   Empty search should return a limited paginated list or ask for a
        search term, consistently documented.
4.  **Customer Details** (`/customers/:id`)
    -   Customer identity/contact information and active status.
    -   Related loans list if allowed.
    -   "Create Loan" action for MAKER only and active customers only.
5.  **Create Loan** (`/loans/new`)
    -   Select/confirm existing customer.
    -   Loan type: `PERSONAL`, `HOME`, `VEHICLE`, `EDUCATION`,
        `BUSINESS`, `AGRICULTURE` (enum values can be adjusted
        consistently).
    -   Principal amount in INR, tenure in months, remarks.
    -   Do not calculate or display an interest rate, EMI, or approval
        eligibility unless those rules are explicitly defined and
        implemented. The assignment does not define them.
    -   Show validation messages beside fields and a confirmation before
        submission.
6.  **Loan List** (`/loans`)
    -   Filterable, paginated table with status badges.
    -   Clicking a row opens loan details.
    -   Preserve filters in URL query parameters where practical.
7.  **Loan Details** (`/loans/:id`)
    -   Loan reference, customer details, amount, tenure, type, remarks,
        status, creator, timestamps.
    -   Workflow history in chronological order.
    -   Checker actions only while pending and only when the current
        user is not the maker.
    -   Reject dialog requires a reason.
    -   Maker sees read-only status and history.
8.  **Approvals** (`/approvals`)
    -   CHECKER-only pending-approval queue.
    -   Sorting by oldest pending first by default.
    -   Pagination and a link to each loan.
    -   Clear empty state when there are no pending loans.
9.  **Access Denied / Not Found**
    -   Clear non-sensitive messages and links back to an allowed page.

## 6. Data model

Use UUID primary keys or another consistent generated identifier. Use
UTC timestamps in the backend and serialize ISO-8601 timestamps with
timezone information. Display them in the browser's local timezone.

### `app_user`

-   `id` UUID primary key.
-   `username` unique, normalized, not null.
-   `display_name` not null.
-   `password_hash` not null; BCrypt only, never plaintext.
-   `role` enum: `MAKER`, `CHECKER`.
-   `enabled` boolean default true.
-   `created_at`, `updated_at`.
-   Never expose `password_hash` in an API response.

### `customer`

-   `id` UUID primary key.
-   `customer_code` unique, human-readable (for example, `CUS-10001`).
-   `full_name` not null.
-   `email` nullable or required consistently by validation.
-   `phone` nullable or required consistently by validation.
-   `address` optional.
-   `active` boolean default true.
-   `created_at`, `updated_at`.

### `loan`

-   `id` UUID primary key.
-   `loan_reference` unique human-readable reference, generated
    server-side (for example, `LN-<date>-<unique suffix>`).
-   `customer_id` foreign key to `customer.id`, not null.
-   `loan_type` enum.
-   `principal_amount` `NUMERIC(15,2)`, greater than zero and bounded by
    documented business limits.
-   `tenure_months` integer, bounded by documented business limits.
-   `remarks` nullable with a maximum length.
-   `status` enum: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`.
-   `created_by` foreign key to `app_user.id`, not null.
-   `decided_by` nullable foreign key to `app_user.id`.
-   `decision_reason` nullable; required for rejection, optional/empty
    for approval according to one consistent policy.
-   `created_at`, `updated_at`, `decided_at`.
-   Optimistic version column (`@Version`) or an equivalent concurrency
    control mechanism.

### `loan_workflow_event`

-   `id` UUID primary key.
-   `loan_id` foreign key to `loan.id`, not null.
-   `event_type`: `CREATED`, `APPROVED`, `REJECTED`.
-   `actor_user_id` foreign key to `app_user.id`, not null.
-   `from_status` nullable.
-   `to_status` not null.
-   `reason` nullable.
-   `created_at` not null.
-   Events are append-only from the application. No API should edit or
    delete audit history.

### Indexes and constraints

-   Unique index on `app_user.username`, `customer.customer_code`, and
    `loan.loan_reference`.
-   Index `loan.status`, `loan.created_by`, `loan.customer_id`,
    `loan.created_at`.
-   Index workflow events by `(loan_id, created_at)`.
-   Add foreign keys and not-null/check constraints where appropriate.
-   Use `NUMERIC/BigDecimal` for money, never floating-point types.
-   Store amounts in INR for this assignment and show `â‚¹` in the UI.

## 7. REST API contract

Base path: `/api/v1`. JSON request and response bodies. Use DTOs rather
than exposing JPA entities.

### Authentication

-   `POST /auth/login`
    -   Request: `{ "username": "...", "password": "..." }`
    -   Response: access token/session strategy plus
        `{ "id": "...", "username": "...", "displayName": "...", "role": "MAKER" }`.
    -   Invalid credentials: `401` with a generic error.
-   `POST /auth/refresh` only if refresh-token support is implemented.
-   `POST /auth/logout` only if session/refresh-token revocation is
    implemented.
-   `GET /auth/me`
    -   Returns current user's safe profile.
-   Never include passwords or password hashes in responses or logs.

### Customers (authenticated)

-   `GET /customers?query=&page=0&size=20&sort=fullName,asc`
    -   Search customer code/ID and case-insensitive name; return
        paginated results.
-   `GET /customers/{id}`
    -   Returns customer detail or `404`.
-   `GET /customers/{id}/loans?page=0&size=20`
    -   Returns permitted related loans.

### Loans (authenticated)

-   `POST /loans` --- MAKER only.
    -   Request:
        `{ "customerId": "...", "loanType": "PERSONAL", "principalAmount": 250000.00, "tenureMonths": 36, "remarks": "..." }`
    -   Server derives creator and sets `PENDING_APPROVAL`; the request
        must not accept `createdBy`, `status`, `decidedBy`, or
        `loanReference`.
    -   Response: created loan DTO with reference, status, customer
        summary, creator, and timestamps.
-   `GET /loans?page=0&size=20&status=PENDING_APPROVAL&query=`
    -   Paginated list. Define role visibility consistently: both roles
        may read the shared loan list required by the assignment; makers
        may optionally have an additional "my loans" filter. Do not
        reveal secrets or internal hashes.
-   `GET /loans/{id}`
    -   Returns loan detail plus workflow history or provide a separate
        history endpoint.
-   `GET /loans/{id}/history`
    -   Returns append-only workflow events.
-   `POST /loans/{id}/approve` --- CHECKER only.
    -   Optional request body `{ "comment": "Reviewed" }` if approval
        comments are supported. Otherwise accept an empty body and do
        not show a non-functional comment field.
-   `POST /loans/{id}/reject` --- CHECKER only.
    -   Request: `{ "reason": "Required rejection reason" }`.
-   `GET /dashboard/summary`
    -   Returns role-appropriate counts derived from SQL queries.
-   `GET /dashboard/recent-loans?size=5`
    -   Returns the most recent permitted loan records.

### Standard response patterns

-   `200 OK`: successful read/decision where suitable.
-   `201 Created`: successful loan creation.
-   `400 Bad Request`: invalid request fields.
-   `401 Unauthorized`: missing, invalid, or expired token / invalid
    credentials.
-   `403 Forbidden`: authenticated user lacks the required role or
    attempts to decide on their own loan.
-   `404 Not Found`: record does not exist.
-   `409 Conflict`: loan is no longer pending or a concurrent decision
    won.
-   `500 Internal Server Error`: generic message with a
    correlation/request ID; never expose stack traces, SQL, tokens, or
    secrets.

### Error JSON

Use one consistent shape, for example:
`{ "timestamp": "...", "status": 400, "error": "Validation failed", "message": "Please correct the highlighted fields.", "path": "/api/v1/loans", "fieldErrors": { "principalAmount": "Must be greater than zero" }, "requestId": "..." }`

## 8. Business rules and transactional behavior

1.  Loan creation is allowed only to an authenticated MAKER.
2.  The customer must exist and be active.
3.  Amount must be positive and within a clearly documented maximum,
    such as INR 100,000,000.00, unless the assignment owner specifies
    another limit.
4.  Tenure must be a positive integer within a documented maximum, such
    as 360 months.
5.  Trim remarks and enforce a maximum length (for example 1,000
    characters).
6.  New loans always start at `PENDING_APPROVAL`.
7.  Only CHECKER can decide a loan.
8.  A maker cannot decide their own loan.
9.  Only pending loans may be decided.
10. Rejection requires a non-empty reason after trimming; enforce a
    maximum length (for example 1,000 characters).
11. Update loan status, decision metadata, and append the workflow event
    in one transaction.
12. Use optimistic locking or a conditional database update to prevent
    double approval/rejection.
13. If the decision fails, no partial status or audit-event update may
    remain.
14. Audit events cannot be edited or deleted via the API.
15. All server validation is authoritative; frontend validation is for
    usability only.
16. Do not invent EMI, interest, eligibility, or disbursement
    calculations; they are outside the supplied assignment requirements.

## 9. JWT and application security

-   Authenticate with Spring Security and a maintained JWT
    implementation.
-   Sign tokens with a strong secret supplied through an environment
    variable, or use an asymmetric key pair configured outside source
    control.
-   Fail application startup in non-test environments if the JWT secret
    is missing, weak, or insecurely set.
-   Keep access tokens short-lived (for example 15 minutes). If refresh
    tokens are supported, rotate them and store only a hash of each
    refresh token in the database.
-   Validate signature, issuer/audience where configured, expiry, and
    allowed algorithm. Never accept an algorithm chosen unsafely from
    the token header.
-   Use BCrypt for passwords.
-   Use generic login failure responses to reduce username enumeration.
-   Configure CORS to allow only the configured local frontend origin by
    default; do not use wildcard origins with credentials.
-   Protect every endpoint except explicitly public login and health
    endpoints.
-   Apply role checks at request level and service level for sensitive
    operations.
-   Do not log passwords, bearer tokens, refresh tokens, or secret
    environment values.
-   Use parameterized queries and Spring Data methods; do not
    concatenate user input into SQL.
-   Limit request sizes and pagination sizes.
-   Return generic server errors to clients and detailed errors only to
    controlled server logs.
-   Include a simple health endpoint such as `/actuator/health`, with
    only safe health information exposed.
-   Production deployment requires HTTPS and secure cookie settings if
    cookies are used.
-   This assignment's demo accounts are local-only. Do not reuse their
    passwords in production.

### Local token strategy

Choose one strategy and implement it consistently: - **Recommended
stronger option:** access JWT in memory; refresh token in
HttpOnly/Secure/SameSite cookie, rotation and server-side revocation.
Document that local HTTP development needs a safe development-specific
cookie configuration. - **Simpler assignment option:** short-lived
access JWT in memory; user signs in again after a full page refresh.
This avoids pretending browser storage is secure and is acceptable if
clearly documented.

## 10. Local demo data and account provisioning

Provide a repeatable backend seed mechanism for local development
only: - One MAKER account. - One CHECKER account. - At least 10
realistic but fictional customer records. - Optionally a small number of
clearly labelled sample loans in different statuses, with valid audit
events. If sample loans are seeded, label them as demo data and make the
seed process idempotent. - Hash all seeded passwords with BCrypt. -
Document demo usernames and local-only passwords in `README.md`; never
use these credentials in production. - Seed only when an explicit
profile/environment variable such as `APP_SEED_DEMO_DATA=true` is
enabled, or use a dedicated local profile. - Do not reset existing data
every time the application starts. - Provide a safe method to change
demo passwords. - Do not add a public signup page unless specifically
requested; the assignment calls for MAKER and CHECKER login and existing
customers.

## 11. Database migrations

Use Flyway SQL migration files, for example: -
`V1__create_users_customers_loans_and_workflow.sql` -
`V2__add_indexes_and_constraints.sql` if separate migrations are useful.

Migrations must: - Create every required table, index, enum/check
constraint, and foreign key. - Run automatically at backend startup. -
Be safe and deterministic for a new local database. - Never rely on
Hibernate `ddl-auto=update` as the schema-management strategy. Use
`validate` in the normal local profile. - Be tested against PostgreSQL,
not only an in-memory database, for the main integration path.

## 12. Backend package structure

Use a clear layered architecture, for example:

``` text
backend/
  pom.xml
  src/main/java/com/example/loanmanagement/
    LoanManagementApplication.java
    config/
      SecurityConfig.java
      CorsConfig.java
      JwtProperties.java
    security/
      JwtAuthenticationFilter.java
      JwtService.java
      CustomUserDetailsService.java
      AuthenticatedUser.java
    auth/
      AuthController.java
      AuthService.java
      dto/
    user/
      User.java
      UserRepository.java
      Role.java
    customer/
      Customer.java
      CustomerRepository.java
      CustomerService.java
      CustomerController.java
      dto/
    loan/
      Loan.java
      LoanType.java
      LoanStatus.java
      LoanRepository.java
      LoanService.java
      LoanController.java
      LoanDecisionService.java
      dto/
    workflow/
      LoanWorkflowEvent.java
      LoanWorkflowEventRepository.java
      WorkflowService.java
    dashboard/
      DashboardController.java
      DashboardService.java
    common/
      ApiExceptionHandler.java
      ApiError.java
      NotFoundException.java
      ConflictException.java
  src/main/resources/
    application.yml
    db/migration/
  src/test/java/...
```

Keep controllers thin. Put business rules in services, database access
in repositories, request/response objects in DTOs, and global error
mapping in `@RestControllerAdvice`. Use `@Transactional` around loan
creation and decisions.

## 13. Frontend structure

``` text
frontend/
  package.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    routes/
      AppRoutes.tsx
      ProtectedRoute.tsx
      RoleRoute.tsx
    api/
      client.ts
      authApi.ts
      customersApi.ts
      loansApi.ts
      dashboardApi.ts
    auth/
      AuthProvider.tsx
      useAuth.ts
    components/
      AppLayout.tsx
      Sidebar.tsx
      Header.tsx
      DataTable.tsx
      StatusBadge.tsx
      LoadingState.tsx
      EmptyState.tsx
      ErrorState.tsx
      ConfirmDialog.tsx
      FormField.tsx
    pages/
      LoginPage.tsx
      DashboardPage.tsx
      CustomerSearchPage.tsx
      CustomerDetailsPage.tsx
      CreateLoanPage.tsx
      LoanListPage.tsx
      LoanDetailsPage.tsx
      ApprovalsPage.tsx
      AccessDeniedPage.tsx
      NotFoundPage.tsx
    types/
      auth.ts
      customer.ts
      loan.ts
      api.ts
    styles/
      tokens.css
      global.css
  .env.example
```

Frontend requirements: - Use typed API DTOs that match the backend
contract. - Centralize base URL, authorization headers, JSON handling,
and error parsing in one API client. - Never treat a successful HTTP
status as success if the response body indicates an application error. -
Refetch affected queries after creating/deciding a loan. - Prevent
double form submission while a request is pending. - Show server
validation errors beside relevant fields. - Never calculate permissions
solely from a role value saved in browser storage; use the authenticated
profile and rely on backend enforcement regardless. - Use no fake data
as a fallback when the backend is unavailable. Show a clear connection
error. - Avoid placing tokens, passwords, or private user details in
console logs. - Use semantic buttons and links; all controls must be
keyboard accessible.

## 14. Visual design direction

Build a polished, professional banking-style internal operations
dashboard, not a marketing landing page.

-   Use a light neutral background, white content surfaces, dark navy
    text, and one restrained blue accent.
-   Use a persistent left sidebar on desktop with a clear active state.
-   Use compact tables with readable typography and sufficient row
    spacing.
-   Use consistent status badges:
    -   `PENDING_APPROVAL`: amber.
    -   `APPROVED`: green.
    -   `REJECTED`: red.
-   Never communicate status through color alone; include text labels.
-   Use clear page headings, breadcrumbs where useful, consistent button
    hierarchy, and confirm dialogs for irreversible decisions.
-   Include skeleton/loading states only while data is genuinely
    loading.
-   Include helpful empty states and retry actions for failed requests.
-   Make layouts usable at 360px width and above.
-   Follow accessible contrast, focus indicators, labels, and keyboard
    navigation.
-   Do not add decorative charts that use fabricated data.

## 15. Configuration files

Provide `.env.example` files with variable names and safe example values
only. Do not commit real secrets.

Backend environment variables: - `SPRING_PROFILES_ACTIVE=local` -
`DB_URL=jdbc:postgresql://localhost:5432/loan_management` -
`DB_USERNAME=loan_app` - `DB_PASSWORD=change-me-local` -
`JWT_SECRET=replace-with-a-long-random-secret-for-local-development` -
`JWT_ACCESS_TTL_MINUTES=15` -
`APP_CORS_ALLOWED_ORIGIN=http://localhost:5173` -
`APP_SEED_DEMO_DATA=true`

Frontend: - `VITE_API_BASE_URL=http://localhost:8080/api/v1`

The actual `.env` file must be ignored by Git. The backend must fail
clearly if required secrets/configuration are absent or invalid. For
local setup, explain how to generate a random secret and set environment
variables in the user's shell. Never ship the example secret as a
production default.

## 16. Docker Compose and local persistence

Create a `docker-compose.yml` for PostgreSQL only, unless a complete
multi-service setup is implemented and documented. Use a named volume
for PostgreSQL data. Add a health check and persistent volume.

Requirements: - Database name: `loan_management`. - App database user:
`loan_app`. - Use environment variables for credentials; local example
values must be clearly marked local-only. - Do not expose PostgreSQL to
the public internet. - Document `docker compose up -d db`,
`docker compose down`, and the difference between stopping containers
and deleting the data volume. - Do not use `docker compose down -v` as a
normal stop command because it deletes the persisted database volume. -
Ensure Spring Boot waits/retries appropriately or provide clear
instructions to start the database before the backend.

## 17. Testing requirements

### Backend unit and integration tests

At minimum, implement tests for: 1. Valid maker can create a loan for an
active customer. 2. Created loan has `PENDING_APPROVAL`. 3. Loan
creation records the maker identity from authentication. 4. Loan
creation fails for missing customer. 5. Loan creation fails for inactive
customer. 6. Loan creation fails for invalid amount or tenure. 7.
Unauthenticated request receives `401`. 8. CHECKER cannot call the
maker-only create endpoint. 9. MAKER cannot approve or reject a loan.
10. CHECKER can approve a pending loan created by another user. 11.
CHECKER can reject a pending loan with a valid reason. 12. Rejecting
without a reason returns `400`. 13. A maker cannot approve or reject
their own loan. 14. A second decision on a final loan returns `409`. 15.
Concurrent decisions cannot both succeed. 16. Loan status and workflow
event commit or roll back together. 17. Customer search matches customer
ID/code and name. 18. Dashboard metrics come from database state. 19.
Passwords are stored as BCrypt hashes and are never returned. 20. JWT
invalid/expired tokens are rejected.

### Frontend tests

-   Login success and invalid credentials.
-   Role-based navigation.
-   Customer search loading, results, empty, and error states.
-   Create-loan validation and API error display.
-   Loan list status filtering and pagination.
-   Reject dialog requires a reason.
-   Checker actions are not shown to makers.
-   API `401` clears the authenticated state.

### Test execution

-   `./mvnw test` or `mvn test` for backend.
-   `npm test` for frontend.
-   Provide a reliable integration-test setup using
    PostgreSQL/Testcontainers or a documented dedicated test database.
-   Do not make all tests pass by mocking away the business logic.
    Include service-level tests and API/database integration tests.

## 18. README and setup instructions

Write a complete `README.md` covering: 1. Required software and
versions: Java 21, Node.js LTS, npm, Docker Desktop or local PostgreSQL.
2. Project directory structure. 3. How to configure local environment
variables. 4. How to start PostgreSQL with Docker Compose. 5. How to run
Spring Boot and apply migrations. 6. How to install and start the React
frontend. 7. Local demo account usernames/passwords and how to change
them. 8. The frontend and backend URLs. 9. API endpoint summary. 10. How
to run backend and frontend tests. 11. How to troubleshoot common
database, port, CORS, and JWT configuration errors. 12. How to reset
local demo data safely and how to preserve the database volume. 13. A
security note that demo credentials and HTTP local development are not
production-ready.

Use actual commands that match the generated files. Do not document
scripts or commands that do not exist.

## 19. Definition of done

Do not mark the task complete until all of these are true:

-   [ ] React frontend builds without TypeScript/build errors.
-   [ ] Spring Boot backend compiles and starts successfully.
-   [ ] PostgreSQL connection works.
-   [ ] Flyway migrations create the schema automatically.
-   [ ] Demo seed is idempotent and only runs when explicitly enabled.
-   [ ] Login returns a real signed JWT and invalid credentials fail.
-   [ ] Protected API requests require a valid JWT.
-   [ ] MAKER and CHECKER restrictions are enforced server-side.
-   [ ] Customer search retrieves real database records.
-   [ ] Maker creates a loan and it persists in PostgreSQL.
-   [ ] Newly created loans appear in the list with `PENDING_APPROVAL`.
-   [ ] Checker can approve another maker's pending loan.
-   [ ] Checker can reject with a required reason.
-   [ ] Self-approval is blocked.
-   [ ] Duplicate/concurrent decisions are handled safely.
-   [ ] Status changes and workflow events are transactional.
-   [ ] Dashboard metrics reflect actual database state.
-   [ ] Loading, empty, validation, unauthorized, forbidden, conflict,
    and server-error states are implemented.
-   [ ] Backend and frontend tests are implemented and run.
-   [ ] README contains accurate local setup and test commands.
-   [ ] No mock data, fake login, dead buttons, unimplemented endpoints,
    TODO placeholders, or hard-coded success messages remain.

## 20. Required Antigravity execution plan

Implement in this order, testing each stage before moving forward:

1.  Inspect the current workspace and preserve useful existing work. Do
    not overwrite a working project blindly.
2.  Create or correct the project structure and configuration.
3.  Implement PostgreSQL schema migrations and local demo seeding.
4.  Implement user entities, password hashing, JWT authentication, and
    Spring Security.
5.  Implement customer search and customer detail APIs.
6.  Implement loan creation, listing, detail, workflow history, and
    transactional approval/rejection.
7.  Implement dashboard metrics from the database.
8.  Add API validation, centralized error handling, and role
    enforcement.
9.  Add backend unit and integration tests; run them and fix failures.
10. Implement the React layout, authentication state, routes, and
    role-aware navigation.
11. Connect each page to its real API and implement loading/error/empty
    states.
12. Add frontend tests and run the production build.
13. Write the README and environment examples.
14. Run the complete acceptance checklist and report the actual results.

At the end, report: - What was implemented. - Exact commands to run the
database, backend, frontend, and tests. - Local demo login
credentials. - Any tests/builds actually executed and whether they
passed. - Any remaining limitations honestly. Do not claim success for
commands or tests that were not run.

**Final instruction:** Build the complete working application from this
specification. Do not return only a plan, screenshots, mock UI, or code
snippets. If the workspace already contains the project, integrate with
it carefully and keep the implementation consistent with this document.

