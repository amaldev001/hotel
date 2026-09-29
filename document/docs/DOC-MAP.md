# DOC-MAP — Documentation Purpose Index

This file maps each documentation file to its logical purpose. Use it to quickly navigate to the correct file when working on a specific concern.

---

## Requirements & Product Scope

| Purpose | File |
|---|---|
| Product definition, boundaries, and global engineering rules | [`00-MASTER-SPEC.md`](./00-MASTER-SPEC.md) |
| Product requirements document (PRD) — personas, scope, v1 boundaries | [`01-PRD.md`](./01-PRD.md) |
| Software requirements specification — all requirement IDs (AUTH, CUS, RES, ADM, NFR) | [`02-SRS.md`](./02-SRS.md) |
| Testable Given/When/Then acceptance criteria for every requirement | [`03-FUNCTIONAL-REQUIREMENTS.md`](./03-FUNCTIONAL-REQUIREMENTS.md) |

---

## Roles & Access Control

| Purpose | File |
|---|---|
| Role definitions, capability matrix, endpoint access matrix | [`04-ROLES-PERMISSIONS.md`](./04-ROLES-PERMISSIONS.md) |
| Authentication/authorization implementation details | [`10-AUTHENTICATION-AUTHORIZATION.md`](./10-AUTHENTICATION-AUTHORIZATION.md) |

---

## Database Design

| Purpose | File |
|---|---|
| Full collection schemas, indexes, ER diagram | [`06-DATABASE-DESIGN.md`](./06-DATABASE-DESIGN.md) |
| Index strategy and query plan | [`31-DATABASE-INDEX-AND-QUERY-PLAN.md`](./31-DATABASE-INDEX-AND-QUERY-PLAN.md) |

---

## API Specification

| Purpose | File |
|---|---|
| All REST endpoint definitions with auth, params, responses, error codes | [`07-API-SPECIFICATION.md`](./07-API-SPECIFICATION.md) |
| Per-endpoint contract template | [`30-API-CONTRACT-TEMPLATES.md`](./30-API-CONTRACT-TEMPLATES.md) |
| Validation rules and canonical error code registry | [`17-VALIDATION-ERROR-HANDLING.md`](./17-VALIDATION-ERROR-HANDLING.md) |

---

## Architecture & Backend

| Purpose | File |
|---|---|
| System architecture diagram, layer responsibilities, tech stack | [`05-SYSTEM-ARCHITECTURE.md`](./05-SYSTEM-ARCHITECTURE.md) |
| Backend middleware order, services, transactions, background jobs | [`09-BACKEND-SPECIFICATION.md`](./09-BACKEND-SPECIFICATION.md) |

---

## Order Flow & State Machine

| Purpose | File |
|---|---|
| Order state machine, transitions, cancellation rules, Mermaid diagram | [`15-ORDER-LIFECYCLE.md`](./15-ORDER-LIFECYCLE.md) |
| Cart rules, checkout algorithm, pricing formula, idempotency | [`13-CART-CHECKOUT.md`](./13-CART-CHECKOUT.md) |
| Sequence diagrams for checkout, payment, expiry, refund, and status flows | [`29-DATA-FLOW-AND-SEQUENCE.md`](./29-DATA-FLOW-AND-SEQUENCE.md) |

---

## Payment Integration

| Purpose | File |
|---|---|
| Payment gateway, order-first sequencing, webhook policy, expiry job, refunds | [`14-PAYMENT-INTEGRATION.md`](./14-PAYMENT-INTEGRATION.md) |

---

## Restaurant, Menu & Notifications

| Purpose | File |
|---|---|
| Restaurant lifecycle, operating hours, service areas | [`11-RESTAURANT-MANAGEMENT.md`](./11-RESTAURANT-MANAGEMENT.md) |
| Menu categories, items, diet enum, soft delete, upload rules | [`12-MENU-MANAGEMENT.md`](./12-MENU-MANAGEMENT.md) |
| In-app notification events, schema, API endpoints | [`16-NOTIFICATIONS.md`](./16-NOTIFICATIONS.md) |

---

## Security

| Purpose | File |
|---|---|
| Security controls and requirements | [`18-SECURITY.md`](./18-SECURITY.md) |
| Threat model with mitigations | [`32-SECURITY-THREAT-MODEL.md`](./32-SECURITY-THREAT-MODEL.md) |

---

## Frontend

| Purpose | File |
|---|---|
| All pages/routes, UI states, component requirements | [`08-FRONTEND-SPECIFICATION.md`](./08-FRONTEND-SPECIFICATION.md) |
| UX principles, interaction guidelines, monetary display rules | [`19-UI-UX.md`](./19-UI-UX.md) |

---

## Testing

| Purpose | File |
|---|---|
| Testing stack (Jest, Supertest, Vitest, Playwright), test scenarios | [`20-TESTING-QA.md`](./20-TESTING-QA.md) |
| Requirement-to-implementation traceability | [`24-TRACEABILITY-MATRIX.md`](./24-TRACEABILITY-MATRIX.md) |
| Definition of Done (all gates a feature must pass) | [`25-DEFINITION-OF-DONE.md`](./25-DEFINITION-OF-DONE.md) |

---

## Deployment & Operations

| Purpose | File |
|---|---|
| Docker, env variable table, replica set, release checklist | [`21-DEPLOYMENT.md`](./21-DEPLOYMENT.md) |
| Health check, logging rules, monitoring, backup strategy | [`33-OPERATIONS-MONITORING-BACKUP.md`](./33-OPERATIONS-MONITORING-BACKUP.md) |
| Pre-production release readiness checklist | [`34-RELEASE-READINESS.md`](./34-RELEASE-READINESS.md) |

---

## Development Process & Guidelines

| Purpose | File |
|---|---|
| Developer setup, feature sequence, quality gates, build phases | [`22-DEVELOPMENT-WORKFLOW.md`](./22-DEVELOPMENT-WORKFLOW.md) |
| Implementation phase roadmap | [`26-IMPLEMENTATION-ROADMAP.md`](./26-IMPLEMENTATION-ROADMAP.md) |
| Detailed implementation checklist (living doc) | [`28-IMPLEMENTATION-CHECKLIST.md`](./28-IMPLEMENTATION-CHECKLIST.md) |
| AI coding agent rules and constraints | [`23-AI-CODING-RULES.md`](./23-AI-CODING-RULES.md) |

---

## Decisions & Change Control

| Purpose | File |
|---|---|
| All 30 resolved decisions with tags [D1]–[D22] | [`27-OPEN-DECISIONS.md`](./27-OPEN-DECISIONS.md) |
| Change request template for post-v1 features | [`35-CHANGE-REQUEST-TEMPLATE.md`](./35-CHANGE-REQUEST-TEMPLATE.md) |
| Changelog (spec pack version history) | [`36-CHANGELOG.md`](./36-CHANGELOG.md) |
| Known limitations and out-of-scope constraints | [`37-KNOWN-LIMITATIONS.md`](./37-KNOWN-LIMITATIONS.md) |
