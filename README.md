# ApexLoan — Full-Stack Loan Management System with MySQL

ApexLoan is a modern lending platform built with **Node.js, Express.js, and MySQL**, featuring responsive fintech UI, live EMI calculators, multi-stage application submission, real-time application tracking, and an underwriter officer management console.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express.js, `mysql2/promise` (connection pooling & prepared statements)
- **Security & Auth:** JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Database:** MySQL 8.0 (`loan_db`)
- **Frontend:** Vanilla HTML5, CSS3 (Design tokens, glassmorphism, responsive grid), Vanilla JavaScript
- **API Architecture:** RESTful JSON endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/apply`, `/api/track`, `/api/all`, `/api/status/:id`)

---

## 📁 Project Structure (Separated Frontend & Backend)

```text
loan/
├── backend/                  # Node.js + Express API & Database
│   ├── config/              # MySQL connection & memory DB fallback
│   ├── controllers/         # Auth, Loan & Customer controllers
│   ├── middleware/          # JWT authorization & role segregation
│   ├── routes/              # RESTful API endpoints
│   ├── scripts/             # DB migration & credential scripts
│   ├── .env                 # Environment variables (DB credentials)
│   ├── package.json         # Backend dependencies & scripts
│   └── server.js            # Express server entry point
│
├── frontend/                 # Client UI (HTML, CSS, JS)
│   ├── index.html           # Landing page & loan showcase
│   ├── auth.html            # Role login portal (Maker & Checker)
│   ├── maker.html           # Maker loan origination desk
│   ├── checker.html         # Four-Eyes checker sanction queue & audit
│   ├── apply.html           # Multi-stage loan application form
│   ├── track.html           # Real-time loan tracking
│   ├── admin.html           # Underwriter analytics dashboard
│   ├── css/                 # Modern styling & design system tokens
│   ├── js/                  # Frontend logic & auth guards
│   └── package.json         # Frontend standalone scripts
│
├── package.json             # Root unified runner scripts
└── README.md
```

---

## ⚖️ Maker & Checker (Four-Eyes Principle) Authentication

The system implements the banking industry standard **Maker-Checker** workflow with strict role segregation:

### 1. Role Capabilities & Responsibilities

| Role | Allowed Credentials | Access Restrictions |
| :--- | :--- | :--- |
| **CHECKER** | **Email:** `hemanthmanih@gmail.com`<br>**Password:** `24CSE019` *(Strict)* | • Sanction Authority: **APPROVE**, **REJECT**, or **DISBURSE**<br>• Access exclusively restricted to `hemanthmanih@gmail.com`<br>• Real-time Maker audit & credit risk review |
| **MAKER** | **Any Gmail / Email**<br>**Any Password** | • Originate loan proposals (`maker.html`, `apply.html`)<br>• Auto-provisioned for any email address<br>• **Restricted:** *Cannot Approve or Disburse (Blocked via HTTP 403 & Guard)* |

### 2. Available Run Scripts

From the root directory:
- `npm start` or `npm run dev` — Starts the backend server and serves the frontend seamlessly at [http://localhost:3000](http://localhost:3000).
- `npm run backend` — Runs the backend API service directly with auto-reload.
- `npm run frontend` — Runs the standalone frontend static server on port 3000.

---

## 🚀 Getting Started

### 1. Configure MySQL Credentials

Open the [`.env`](file:///c:/Users/heman/OneDrive/Desktop/loan/.env) file and enter your MySQL root password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=loan_db
PORT=3000
```

> **Note:** When the server connects with valid credentials, it **automatically** creates the `loan_db` database, sets up all schema tables, and seeds initial demo applications.

### 2. Run the Application

The server is currently running at:
👉 **[http://localhost:3000](http://localhost:3000)**

To run or restart manually at any time:
```bash
npm start
```
Or for development auto-reload:
```bash
npm run dev
```

---

## 📱 Application Modules & Pages

1. **Home & Live EMI Calculator** (`/` or [`index.html`](file:///c:/Users/heman/OneDrive/Desktop/loan/public/index.html)):
   - Interactive loan sliders for Amount, Annual Interest Rate, and Tenure.
   - Real-time calculation of Monthly Installment, Total Payable, and Interest.
   - Product showcase for Personal, Home, Auto, and Education loans.

2. **Loan Application Portal** ([`apply.html`](file:///c:/Users/heman/OneDrive/Desktop/loan/public/apply.html)):
   - **Step 1:** Identity & KYC (Name, Email, Mobile, DOB, PAN/ID, Residential Address).
   - **Step 2:** Employment & Income (Salaried/Self-Employed/Business, Monthly Net Income, Existing EMIs, Credit Score).
   - **Step 3:** Loan Customization (Loan Category, Tenure, Live EMI summary card).
   - **Step 4:** Review & Agreement (Comprehensive summary & direct submission to MySQL).
   - Generates a unique Tracking ID (e.g. `LN-2026-XXXXX`).

3. **Application Tracking** ([`track.html`](file:///c:/Users/heman/OneDrive/Desktop/loan/public/track.html)):
   - Search by Application Number, Email, or Phone.
   - 6-stage visual milestone stepper: `Submitted` ➔ `Under Review` ➔ `Document KYC` ➔ `Underwriting` ➔ `Sanction / Approval` ➔ `Disbursal`.
   - Complete audit trail pulled dynamically from MySQL `loan_status_history`.
   - Printable application sanction slip.

4. **Officer Review Portal** ([`admin.html`](file:///c:/Users/heman/OneDrive/Desktop/loan/public/admin.html)):
   - Underwriter metrics: Total Applications, Portfolio Value, Pending Count, Approved/Disbursed Count.
   - Filter by Status and Loan Type with live search.
   - Status update modal: update status to `UNDER_REVIEW`, `DOCS_VERIFICATION`, `APPROVED`, `REJECTED`, or `DISBURSED` with custom officer audit remarks.

---

## 🗄️ Database Schema

### `loan_applications` Table
- `id` (INT AUTO_INCREMENT PRIMARY KEY)
- `application_number` (VARCHAR(30) UNIQUE)
- `applicant_name`, `email`, `phone`, `dob`, `gender`, `pan_or_id`, `address`, `city`, `state`, `pincode`
- `employment_type`, `employer_name`, `monthly_income`, `existing_emis`, `credit_score`
- `loan_type`, `loan_amount`, `tenure_months`, `interest_rate`, `monthly_emi`, `loan_purpose`
- `status` (`SUBMITTED`, `UNDER_REVIEW`, `DOCS_VERIFICATION`, `APPROVED`, `REJECTED`, `DISBURSED`)
- `officer_notes`, `created_at`, `updated_at`

### `loan_status_history` Table
- `id` (INT AUTO_INCREMENT PRIMARY KEY)
- `application_id` (FOREIGN KEY -> `loan_applications.id`)
- `status`, `comment`, `changed_by`, `created_at`
