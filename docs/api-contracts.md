# MyFinance — API Contracts

> **Version:** 1.0 | **Date:** March 4, 2026
> Base URL: `/api` | Auth: JWT via NextAuth session cookie
> All responses wrap in `{ success: boolean, data?: T, error?: string }`

---

## Auth `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new user account |
| `POST` | `/api/auth/[...nextauth]` | Public | NextAuth handler (login / logout / session) |
| `GET` | `/api/auth/session` | Public | Current session info |

### POST `/api/auth/register`
```json
// Request
{ "email": "user@example.com", "password": "min8chars", "language": "th" }

// Response 201
{ "success": true, "data": { "userId": "uuid", "email": "...", "tier": "free" } }

// Error 409
{ "success": false, "error": "EMAIL_ALREADY_EXISTS" }
```

---

## Tax `/api/tax`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tax/years` | Public | List all active tax years |
| `GET` | `/api/tax/config/:year` | Public | Full tax config for a year (brackets, deductions, allowances) |
| `GET` | `/api/tax/inputs/:year` | User | Get saved tax inputs for a year |
| `POST` | `/api/tax/inputs/:year` | User | Save / upsert tax inputs for a year |
| `POST` | `/api/tax/calculate` | User | Calculate tax from inputs (returns full breakdown) |

### GET `/api/tax/config/:year`
```json
// Response 200
{
  "success": true,
  "data": {
    "year": 2025,
    "brackets": [
      { "minIncome": 0, "maxIncome": 150000, "rate": 0 },
      { "minIncome": 150001, "maxIncome": 300000, "rate": 5 }
    ],
    "personalAllowances": {
      "selfAmount": 60000,
      "spouseAmount": 60000,
      "childAmountPerChild": 30000,
      "parentAmountPerParent": 30000,
      "maxParents": 2,
      "expenseDeductionRate": 50,
      "expenseDeductionMax": 100000
    },
    "deductionTypes": [
      {
        "id": "uuid",
        "code": "SSF",
        "nameTh": "กองทุน SSF",
        "nameEn": "Super Savings Fund",
        "maxAmount": 200000,
        "maxRateOfIncome": 30,
        "combinedCapGroup": "SSF_RMF_ESG",
        "combinedCapAmount": 500000
      }
    ]
  }
}
```

### POST `/api/tax/inputs/:year`
```json
// Request
{
  "filingStatus": "single",
  "annualSalary": 840000,
  "bonus": 70000,
  "otherIncome": 0,
  "spouseIncome": 0,
  "withheldTax": 45000,
  "providentFund": 42000,
  "socialSecurity": 9000,
  "deductions": [
    { "deductionTypeId": "uuid-ssf", "amount": 100000 },
    { "deductionTypeId": "uuid-life-ins", "amount": 50000 }
  ]
}

// Response 200
{ "success": true, "data": { "taxInputId": "uuid", "updatedAt": "..." } }
```

### POST `/api/tax/calculate`
```json
// Request — same shape as tax inputs
{ "year": 2025, "filingStatus": "married_joint", "annualSalary": 840000, ... }

// Response 200
{
  "success": true,
  "data": {
    "grossIncome": 910000,
    "totalDeductions": 280000,
    "taxableIncome": 630000,
    "taxBeforeCredit": 68500,
    "withheldTax": 45000,
    "taxOwed": 23500,
    "effectiveRate": 7.53,
    "marginalBracket": 20,
    "isRefund": false,
    "breakdown": {
      "deductionsByType": [
        { "code": "SSF", "claimed": 100000, "allowed": 100000, "taxSaving": 20000 }
      ],
      "unusedDeductionRoom": [
        { "code": "RMF", "roomLeft": 123000, "potentialSaving": 24600 }
      ]
    }
  }
}
```

---

## Goals `/api/goals`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/goals` | User | List all active goals |
| `POST` | `/api/goals` | User | Create a new goal |
| `GET` | `/api/goals/:id` | User | Get a single goal |
| `PATCH` | `/api/goals/:id` | User | Update goal (amount, contribution, date) |
| `DELETE` | `/api/goals/:id` | User | Soft-delete (set `is_active = false`) |
| `POST` | `/api/goals/:id/simulate` | User | What-if simulation |

### POST `/api/goals`
```json
// Request
{
  "name": "Retirement Fund",
  "goalType": "retirement",
  "targetAmount": 15000000,
  "currentAmount": 500000,
  "monthlyContribution": 15000,
  "annualReturnRate": 7,
  "targetDate": "2055-01-01"
}

// Response 201
{ "success": true, "data": { "id": "uuid", "projectedCompletionDate": "2053-06-01", "onTrack": true } }
```

### POST `/api/goals/:id/simulate`
```json
// Request
{ "newMonthlyContribution": 20000, "newAnnualReturnRate": 8 }

// Response 200
{ "success": true, "data": { "projectedCompletionDate": "2050-03-01", "timeSavedMonths": 39 } }
```

---

## Insurance `/api/insurance`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/insurance` | User | Get user's insurance profile |
| `PUT` | `/api/insurance` | User | Upsert insurance profile |

### PUT `/api/insurance`
```json
// Request
{
  "hasLifeInsurance": true,
  "lifeCoverageAmount": 3000000,
  "lifePremiumAnnual": 30000,
  "hasHealthInsurance": true,
  "healthPremiumAnnual": 25000,
  "hasCriticalIllness": false,
  "hasAccidentPa": false,
  "numDependents": 1
}
// Response 200
{ "success": true, "data": { "updatedAt": "..." } }
```

---

## AI `/api/ai` — Premium only

All endpoints return `403` with `{ "error": "PREMIUM_REQUIRED" }` for free-tier users.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/health-score` | Premium | Get financial health score + AI explanation |
| `GET` | `/api/ai/tips` | Premium | Get monthly AI tips |
| `GET` | `/api/ai/tax-optimize` | Premium | Tax optimization suggestions |
| `GET` | `/api/ai/insurance-gap` | Premium | Insurance gap analysis |
| `POST` | `/api/ai/chat` | Premium | Send message to AI advisor |

### GET `/api/ai/health-score`
```json
// Response 200
{
  "success": true,
  "data": {
    "score": 72,
    "components": {
      "emergencyFund": 60,
      "taxEfficiency": 85,
      "insuranceCoverage": 50,
      "goalProgress": 78
    },
    "explanation": "คะแนนของคุณอยู่ที่ 72/100...",
    "explanationEn": "Your score is 72/100...",
    "suggestions": [
      { "priority": 1, "action": "ซื้อประกันสุขภาพ", "impact": "high" }
    ]
  }
}
```

### POST `/api/ai/chat`
```json
// Request
{ "message": "ควรซื้อ SSF หรือ RMF ดีกว่ากัน?", "language": "th" }

// Response 200 (streaming supported)
{
  "success": true,
  "data": {
    "reply": "ขึ้นอยู่กับเป้าหมายของคุณ...",
    "disclaimer": "คำแนะนำนี้สร้างโดย AI ไม่ใช่การวางแผนทางการเงินที่ได้รับการรับรอง"
  }
}
```

---

## User `/api/user`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/profile` | User | Get profile (tier, language, created date) |
| `PATCH` | `/api/user/profile` | User | Update language preference |
| `POST` | `/api/user/upgrade` | User | Upgrade to premium (stub for payment) |
| `DELETE` | `/api/user/account` | User | Delete account and all data |

---

## Admin `/api/admin` — Admin role only

All endpoints require `admin` role. Returns `403` otherwise.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/tax-years` | List all tax years |
| `POST` | `/api/admin/tax-years` | Create new tax year |
| `PATCH` | `/api/admin/tax-years/:id` | Update / activate / deactivate |
| `GET` | `/api/admin/tax-brackets/:yearId` | List brackets for a year |
| `POST` | `/api/admin/tax-brackets/:yearId` | Add bracket |
| `PATCH` | `/api/admin/tax-brackets/:id` | Update bracket |
| `DELETE` | `/api/admin/tax-brackets/:id` | Delete bracket |
| `GET` | `/api/admin/personal-allowances/:yearId` | Get allowances for a year |
| `PUT` | `/api/admin/personal-allowances/:yearId` | Upsert allowances for a year |
| `GET` | `/api/admin/deduction-types` | List all deduction types |
| `POST` | `/api/admin/deduction-types` | Add deduction type |
| `PATCH` | `/api/admin/deduction-types/:id` | Update / toggle active |
| `GET` | `/api/admin/deduction-limits/:yearId` | List limits for a year |
| `PUT` | `/api/admin/deduction-limits/:yearId` | Bulk upsert limits for a year |
| `GET` | `/api/admin/feature-flags` | List all feature flags |
| `PATCH` | `/api/admin/feature-flags/:key` | Update free/premium toggle |
| `GET` | `/api/admin/audit-log` | Paginated audit log |
| `GET` | `/api/admin/analytics` | DAU/MAU, conversion, top events |

### GET `/api/admin/analytics`
```json
// Response 200
{
  "success": true,
  "data": {
    "dau": 142,
    "mau": 1830,
    "totalUsers": 5240,
    "premiumUsers": 312,
    "conversionRate": 5.95,
    "topEvents": [
      { "eventType": "tax_calculated", "count": 3210 },
      { "eventType": "goal_created", "count": 890 }
    ],
    "aiCallsToday": 204
  }
}
```

---

## Error Codes

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | Not logged in |
| `FORBIDDEN` | Logged in but insufficient role/tier |
| `PREMIUM_REQUIRED` | Feature requires Premium subscription |
| `EMAIL_ALREADY_EXISTS` | Registration duplicate |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request body (includes `fields` array) |
| `TAX_YEAR_NOT_ACTIVE` | Requested tax year is disabled |
| `AI_RATE_LIMIT` | AI daily call limit reached |
