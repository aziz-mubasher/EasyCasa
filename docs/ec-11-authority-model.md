# EC-11 — Authority model

Capability is not authority. Marketplace access always needs three gates:

1. **Capability** — may this principal attempt this *kind* of action?
2. **Relationship** — are they connected to *this instance* as required?
3. **Projection** — of the allowed object, which fields do they receive?

Most real leaks are projection failures: the endpoint authorises correctly, then
serialises the whole row.

## Repo mapping (pre-EC-8)

EC-8 capabilities / `conductor` realm role were not shipped. This run introduces
the vocabulary and fail-closed Nest guards, mapping **existing** Keycloak /
`UserRole` values:

| Realm / UserRole | Capabilities |
|---|---|
| (any authenticated) | `seeker` |
| `buyer` / `seeker` | `seeker` |
| `seller` | `owner`, `conductor` |
| `agent` / `partner` / `pro_marketer` | `agency_member`, `owner`, `conductor` |
| `professional` | `professional`, `conductor` |
| `conductor` (future) | `conductor` |
| `admin` / `admin_*` | `admin` |

Admin personas (`support`, `operations`, `finance`, `dpo`, `aml`, `superadmin`)
are read from realm roles `admin_support`, … Legacy bare `admin` maps to
`superadmin` for back-compat.

## Decorators

```ts
@RequiresCapability('conductor')
@RequiresRelationship('viewing.conductor')
@SerializeFor('conductor')
async confirm(...) { … }
```

Also:

- `@RequiresAuth()` — authenticated, no specific capability (self `/me/*`)
- `@RequiresAdminRole('aml')` — admin sub-persona
- `@Roles(...)` — legacy; also stamps derived capabilities so routes stay declared

**Fail closed:** `CapabilityGuard` rejects any route that is neither `@Public`
nor capability-declared. Enforced by `route-authority.spec.ts` (static scan).

## Relationship rules (deny by default)

Documented in the Kaizen brief; enforced today in domain services + metadata.
Metadata keys: `viewing.conductor`, `viewing.participant`, `listing.owner`,
`assignment.self`, `self`.

Fixes in this run:

- Listing update/publish: `ownerUserId` **or** `agentId` **or** `mediatorUserId`
- Open `POST /assignments/:id/start|deliver` now `@Roles('admin')` — professionals
  use task-scoped `/me/assignments/*`

## Progressive disclosure (viewings)

Serializers in `apps/api/src/authority/serializers/viewing.serializer.ts`:

- `ViewingForSeeker` — address only when `CONFIRMED`
- `ViewingForConductor` — address always; `b4aBandMaxCents` never on seeker DTO

Mutual reveal of full names/contacts still incomplete (emails only) — follow-up.

## Audit

`authority_audit_log` (`0035_authority_audit.sql`) — append-only.
`AuthorityAuditService.record(...)` for admin PII unredact / AML reads.

## Deferred (explicit)

| Item | Why |
|---|---|
| `agency_members` table + agent vs agency-owner | Greenfield schema |
| Support redaction UI + unredact-with-reason | Needs admin SPA work |
| Public listing street address gate | Product decision vs SEO |
| Full RelationshipGuard DB checks | Metadata + service checks for now |
| Keycloak realm role sync for `admin_*` / `conductor` | Ops / kcadm (see runbooks/roles.md) |
| EC-8 role enum rewrite (`buyer`→`seeker`) | Separate brief |

## Validation checklist

- [x] Route enumeration test (fail closed declaration)
- [x] Capability mapping unit tests
- [x] Viewing seeker/conductor serializers
- [x] Listing ownership uses ownerUserId
- [x] Assignment start/deliver not open to any auth user
- [ ] Agency agent cannot remove members — N/A until agency_members
- [ ] Support redaction + audit unredact — scaffolding only
- [ ] AML admin-only persona without legacy superadmin — needs realm roles live
