# 35 — Change Request Template

Use this template for any requested change to v1 scope, architecture, database schema, API contracts, or security controls. Submit as a pull request against the relevant documentation files.

> [!NOTE]
> Before creating a change request, review `docs/37-KNOWN-LIMITATIONS.md` — many v1 constraints are documented there as known limitations with a recommended resolution path. Review `docs/27-OPEN-DECISIONS.md` to see if a related decision has already been resolved.

---

## Change ID
`CR-XXXX` — Replace with a sequential ID (e.g., CR-0001)

## Requested Change
Describe exactly what should change in a single clear statement.

## Reason / Business Case
Why is the change required? What problem does it solve or what value does it add?

## Affected Requirement IDs
List requirement IDs from `docs/02-SRS.md` that this change modifies or adds to:
- `AUTH-xxx`, `CUS-xxx`, `RES-xxx`, `ADM-xxx`, `NFR-xxx`

## Affected Modules
List the system modules affected (e.g., Order Lifecycle, Payment Integration, Restaurant Management).

## API Impact
- New endpoints: `METHOD /api/path`
- Changed endpoints: describe contract changes
- Removed endpoints: list with migration plan

## Database Schema Impact
- New collections or fields
- Changed indexes
- Migration plan (if records need backfilling)
- Impact on existing immutable snapshots (order data must not be retroactively altered)

## Security Impact
Describe any changes to:
- Authorization rules (roles, ownership)
- Authentication or session handling
- Payment flows or provider integration
- Attack surface changes

## UI Impact
- New pages / routes
- Changed components
- New UI states required

## Testing Impact
- New test cases to add to `docs/20-TESTING-QA.md`
- Tests to update
- New test scenarios for state machine or business rules

## Documentation Impact
List all documentation files that require updating if this change is approved.

## Open Questions
List any ambiguities that must be resolved before implementation can begin.

## Decision
`Approved` / `Rejected` / `Needs Clarification`

**Decision Date**:
**Decided By**:
**Decision Notes**:

---

> [!IMPORTANT]
> No implementation begins until the change is marked **Approved** and all open questions are resolved. Approved changes must have a corresponding decision entry added to `docs/27-OPEN-DECISIONS.md` and the changelog updated in `docs/36-CHANGELOG.md`.
