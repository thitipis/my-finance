# MyFinance — Requirements Document

> **Version:** 0.4 (Draft)
> **Date:** March 4, 2026
> **Author:** Thiti + GitHub Copilot (AI Project Advisor)
> **Status:** In Discussion

---

## 1. Project Overview

**MyFinance** is a web-based personal finance advisor designed specifically for **Thai employed individuals (มนุษย์เงินเดือน)**. It helps users understand their tax obligations, optimize deductions, plan financial goals, and receive AI-powered personalized financial advice — all in one place.

### 1.1 Competitive Positioning — Replacing iTax

iTax is the most popular Thai tax app today, but it is **tax-filing only**. MyFinance wins by going beyond:

| Feature | iTax | MyFinance |
|---|---|---|
| Thai tax calculator | ✅ | ✅ |
| Multi-year tax history | ✅ | ✅ |
| Modern, beautiful UX | ❌ | ✅ |
| Bilingual (Thai + English) | ❌ | ✅ |
| Financial goals & planning | ❌ | ✅ |
| AI financial advisor | ❌ | ✅ |
| Insurance gap analysis | ❌ | ✅ |
| Tax optimization suggestions | ❌ | ✅ |
| Config-driven tax rules (no redeploy needed) | ❌ | ✅ |

**Strategic goal:** Be the "iTax + financial advisor" super-app for Thai salary earners.

---

## 2. Target Users

| Attribute | Detail |
|---|---|
| Primary user | Thai salary earners (มนุษย์เงินเดือน) — filing ภงด.91 |
| Income type | Single employer, monthly salary |
| Financial literacy | Beginner to intermediate |
| Language | Thai and English (bilingual app) |

---

## 3. Platform & Accessibility

| Phase | Platform |
|---|---|
| Phase 1 (MVP) | **Web app** — desktop & mobile-responsive (must work well on mobile browser) |
| Phase 2 | Native **mobile app** (iOS / Android) |

---

## 4. Business Model — Freemium

| Tier | Features |
|---|---|
| **Free** | Tax calculator (all years, married filing supported), financial goals (all types), insurance suggestion checklist, financial health score (numeric only — no AI explanation) |
| **Premium** | Everything in Free + all AI features: AI health score explanation, monthly AI tips, AI tax optimization, insurance gap analysis, AI chat advisor |

> **AI gate rule:** All Gemini API calls are **100% Premium only**. Free users never trigger AI. Limits are controlled via feature flags in Admin Panel — adjustable without code changes.

---

## 5. Authentication

- Email & password (with email verification)
- Password reset via email
- JWT-based session management
- Future consideration: Google Sign-In / LINE Login

---

## 6. Data & Privacy

### 6.1 PDPA Compliance Approach

MyFinance **does not collect unnecessary personal identifiable information (PII)**. Strategy:

- **No** collection of: National ID (เลขบัตรประชาชน), full legal name, phone number, or bank account info
- Stored user data is limited to: email (hashed reference), self-entered financial figures, and goal preferences
- All financial data entered by the user is treated as **anonymous financial parameters**, not linked to a real-world identity
- AI requests to Gemini API are sent **per-session only** — no conversation history stored on server

### 6.2 Database

- Relational database (PostgreSQL via Supabase)
- User accounts: `user_id`, `email`, `password (bcrypt)`, `tier`, `created_at`
- **All user financial data persisted to DB:** tax inputs per year, financial goals, insurance checklist, preferences — all linked to `user_id`
- No raw PII fields (no national ID, no full legal name, no phone, no bank account)
- Users can access their data from any device after login

---

## 7. Core Features

### 7.1 Tax Calculator (ภงด.91)

Calculate Thai personal income tax for salary earners.

**Filing Status (must-have Phase 1):**
- Single (โสด)
- Married — spouse has no income (คู่สมรส ไม่มีรายได้)
- Married — spouse has income, filing separately (คู่สมรส มีรายได้ แยกยื่น)
- Married — filing jointly (คู่สมรส รวมยื่น)

Filing status affects: spouse allowance (60,000 THB), joint income splitting, and applicable deduction limits.

**Inputs (manual entry by user):**
- Annual salary / monthly salary
- Bonus
- Other income (if any)
- Spouse income (if married filing jointly)

**Supported Deductions:**
| Category | Deduction Items |
|---|---|
| Standard expense deduction | 50% of income, max 100,000 THB |
| Personal allowance | 60,000 THB (self) + 60,000 THB per spouse/child/parent |
| SSF (กองทุนรวมหุ้นระยะยาว) | Up to 30% of taxable income, max 200,000 THB |
| RMF (กองทุนรวมเพื่อการเลี้ยงชีพ) | Up to 30% of taxable income, combined limit 500,000 THB |
| Thai ESG Fund | Up to 30% of taxable income, max 300,000 THB |
| Life insurance premium | Up to 100,000 THB |
| Health insurance premium | Up to 25,000 THB |
| Parental health insurance | Up to 15,000 THB per parent, max 2 parents |
| Mortgage interest (ดอกเบี้ยบ้าน) | Up to 100,000 THB |
| Social Security (ประกันสังคม) | Actual amount paid (approx. 9,000 THB/year) |
| Easy E-Receipt (ช้อปดีมีคืน) | Up to 50,000 THB (when applicable) |
| Provident Fund (กองทุนสำรองเลี้ยงชีพ) | Up to 15% of income, max 500,000 THB combined |

**Outputs:**
- Estimated annual tax payable
- Effective tax rate
- Marginal tax bracket
- Tax already withheld (ภาษีหัก ณ ที่จ่าย) vs remaining to pay / refund
- Breakdown chart per deduction category

**Multi-Year Support:**
- Users can calculate tax for any supported tax year (e.g., 2023, 2024, 2025)
- Each tax year has its own configuration snapshot
- Useful for late filing, amended returns, and year-over-year comparison

**Tax Brackets** — stored as config, not hardcoded. Example (2025 rates):
| Taxable Income (THB) | Rate |
|---|---|
| 0 – 150,000 | 0% (exempt) |
| 150,001 – 300,000 | 5% |
| 300,001 – 500,000 | 10% |
| 500,001 – 750,000 | 15% |
| 750,001 – 1,000,000 | 20% |
| 1,000,001 – 2,000,000 | 25% |
| 2,000,001 – 5,000,000 | 30% |
| 5,000,001+ | 35% |

---

### 7.1.1 Configuration-Driven Tax Engine

All tax rules are **stored in the database** and managed via an **Admin Panel** — no code change or redeployment needed when the Revenue Department updates the law.

**Config entities managed in DB:**

| Config Entity | Example |
|---|---|
| `tax_years` | 2023, 2024, 2025, 2026 — activate/deactivate per year |
| `tax_brackets` | Per year: income range, tax rate % |
| `deduction_types` | Name, description, formula type, active flag |
| `deduction_limits` | Per year per deduction: max amount, max % of income, combined cap |
| `personal_allowances` | Per year: self, spouse, child, parent amounts |
| `feature_flags` | Enable/disable any feature globally or per tier (e.g., `ai_chat`: free=false, premium=true) |
| `ai_limits` | Max AI calls per day per tier (free=0, premium=configurable) |

**Config update flow:**
```
Revenue Department announces law change
  → Admin logs into Admin Panel
  → Updates affected config (e.g., new deduction limit)
  → Change is live immediately — zero code deployment needed
```

**Versioning:** Each config change is timestamped and logged in an audit table so historical tax year calculations remain accurate.

---

### 7.2 Financial Goals

Users can create and track multiple financial goals with target amounts, deadlines, and annual growth assumptions.

**Goal Types:**
| Goal | Description |
|---|---|
| Retirement Savings | Target amount at age X, given current savings & monthly contribution |
| Emergency Fund | 3–6 months of monthly expenses |
| Investment Portfolio Growth | Set % annual target (e.g., 7% p.a.) and track progress |
| Home / Car Purchase | Lump-sum or installment savings planning |
| Education Fund | Target tuition cost by year X |
| Custom Goal | User-defined name, amount, date |

**Data persistence:** All goal data is **stored in the database** (linked to `user_id`). Users can return on any device and see their goals.

**Goal Features:**
- Progress bar with current vs target
- Estimated completion date based on contribution rate
- Alert when off-track
- Simulate "what-if" scenarios (increase monthly savings, change return rate)

---

### 7.3 AI Financial Advisor (Powered by Google Gemini)

#### 7.3.1 Financial Health Score
- Score from 0–100 based on: emergency fund coverage, tax efficiency, insurance coverage, goal progress
- **Free tier:** Numeric score only (e.g., "72 / 100") — no explanation
- **Premium tier:** Gemini generates plain-language explanation in Thai/English + actionable improvement suggestions ranked by impact

#### 7.3.2 Monthly Personalized Tips *(Premium only)*
- Generated monthly based on user's current financial snapshot
- Context-aware: e.g., "You're entering Q4 — good time to top up SSF before year end"
- Delivered as a card/notification in the dashboard
- Free users see a blurred placeholder with upgrade prompt

#### 7.3.3 Tax Optimization Suggestions *(Premium only)*
- Analyze current deductions vs maximum allowable
- Highlight unused deduction room with estimated tax saving amount
- Prioritize suggestions by tax-saving impact
- Example: "Buying 50,000 THB more SSF could save you 7,500 THB in tax"

#### 7.3.4 Insurance Gap Analysis *(Premium only)*
- Compare user's current insurance coverage vs recommended levels
- Flag critical gaps (e.g., no health insurance)
- Suggest type and approximate coverage amount needed
- Does NOT recommend specific products/brands (to avoid regulatory issues)

#### 7.3.5 AI Chat Advisor *(Premium only)*
- Conversational interface powered by Gemini
- Context: user's tax inputs + goals passed as session context (not stored)
- Can answer questions like: "Should I buy SSF or RMF this year?" / "How much life insurance do I need?"
- Responds in Thai or English based on user's message language
- Disclaimer shown: "This is AI-generated advice, not certified financial planning"

---

### 7.4 Insurance Suggestion Engine

| Insurance Type | Description |
|---|---|
| Life Insurance (ประกันชีวิต) | Recommend coverage = 10x annual income (rule of thumb) |
| Health Insurance (ประกันสุขภาพ) | Recommend based on age, number of dependents |
| Critical Illness (โรคร้ายแรง) | Suggest lump-sum rider based on income |
| Personal Accident (PA / ประกันอุบัติเหตุ) | Suggest annual coverage amount |

Output: Recommended coverage amounts, tax deduction eligibility of each type, and checklist of what user currently has (self-reported).

---

## 8. User Experience Requirements

- **Language:** Thai and English — user can switch language anytime
- **Dashboard:** Single-page overview of tax position, goal progress, health score, and AI tips
- **Mobile-first responsive design:** works fully on iPhone/Android browser
- **Accessibility:** WCAG 2.1 AA minimum
- **Onboarding:** Step-by-step guided setup wizard for first-time users (15–20 min to complete full profile)
- **Dark mode:** nice-to-have for Phase 1, required for Phase 2

---

## 9. Recommended Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Next.js 14** (React, App Router) | SEO, server components, mobile-responsive, large ecosystem |
| Styling | **Tailwind CSS** + shadcn/ui | Rapid UI development, accessible components |
| Backend / API | **Next.js API Routes** (or separate Node.js Express) | Monorepo simplicity for Phase 1 |
| Database | **PostgreSQL** via **Supabase** | Managed DB, built-in auth option, free tier available |
| ORM | **Prisma** | Type-safe DB access, easy migrations |
| AI | **Google Gemini API** (gemini-1.5-pro) | User preference; good Thai language support |
| Auth | **NextAuth.js** (Credentials provider) | Email/password support, session management |
| Charts | **Recharts** or **Chart.js** | Financial data visualization |
| Deployment | **Vercel** (Frontend) + Supabase (DB) | Free tier suitable for learning phase |
| i18n | **next-intl** | Thai + English translations |
| Admin Panel | **Custom Next.js admin route** (protected) | Manage config: tax rules, deductions, feature flags |

---

## 10. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Page load < 2s on mobile (LTE) |
| Security | HTTPS only, bcrypt passwords, no PII in logs |
| Availability | 99% uptime (Vercel SLA) |
| Data backup | Supabase daily automated backup |
| PDPA | No unnecessary PII collected; minimal data principle |
| API rate limits | Gemini API calls throttled per user per day (Premium: higher limits) |

---

## 11. Admin Panel Requirements

A protected internal admin interface for managing all configuration without code changes.

**Admin capabilities:**
| Section | Actions |
|---|---|
| Tax Years | Add new year, activate/deactivate, clone config from previous year |
| Tax Brackets | Edit income ranges and rates per year |
| Deduction Types | Add, edit, disable deduction types |
| Deduction Limits | Set max amounts and % caps per year per deduction |
| Personal Allowances | Update amounts per year (self, spouse, child, parent) |
| Feature Flags | Toggle features on/off globally or per subscription tier |
| Audit Log | View history of all config changes with timestamp and admin user |
| Usage Analytics | Active users (DAU/MAU), free vs premium ratio, AI call volume, goal creation count, top deduction types used |

**Access:** Admin role only — separate from regular user accounts. Not publicly accessible.

---

## 12. Out of Scope (Phase 1)

- Bank account / brokerage integration (Open Banking)
- Actual filing with Revenue Department (กรมสรรพากร)
- Recommending specific financial products or brokers
- Corporate / juristic person tax
- Freelancer / 40(2) income type (consider for Phase 2)
- Native mobile app
- LINE Login / Google OAuth

---

## 13. Open Questions

- [x] Should we support married filing jointly (คู่สมรส)? → **Yes, must-have Phase 1**
- [x] What is the AI feature set split by tier? → **Free tier has ZERO AI; all AI is Premium only; limits are config-driven**
- [x] Should financial goal data persist to DB? → **Yes, all user data persisted to DB**
- [x] Gemini API billing strategy → **Free users never call Gemini; Premium subscription must cover API cost**
- [x] Do we need an admin dashboard to monitor usage analytics? → **Yes, included in Admin Panel**

---

## 14. Next Steps

1. ~~Review and approve this requirements document~~ ✅
2. ~~Create system architecture diagram~~ ✅
3. ~~Design database schema~~ ✅ → see [database-schema.md](database-schema.md)
4. ~~Define API contracts~~ ✅ → see [api-contracts.md](api-contracts.md)
5. Set up project scaffolding (Next.js + Supabase + Prisma) ← **current**
6. Design UI / build core pages (dashboard, tax calculator, goals, AI chat)
7. Build core tax calculator engine + config seed data
8. Build AI features (Premium gate)

---

*This document will evolve as we discuss further. All decisions marked with ✅ are confirmed. Items marked with [ ] are still open.*
