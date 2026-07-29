# EC-10 — Province coverage guard

Don't sell catalogue items nobody can deliver. Availability is derived from
`credential_policies` + verified, non-expired professional credentials +
`coverage_provinces`. Capacity never blocks sellability; it only sets
`capacityConstrained`.

## Rule

An item is orderable in a province when ≥1 professional has:

- required credential type for the item (`NONE` → always available)
- credential `status = verified` and not expired
- province in `coverage_provinces`

## Enforcement (three layers)

1. `GET /service-catalog?province=BS` — each item includes `available`, reason copy, and **nulls price** when unavailable.
2. `POST /service-catalog/quote`, checkout, property order create — `CoverageAvailabilityService.assertOrderable` hard-rejects.
3. Pricing UI — province selector, unavailable rows (no price), “Avvisami…” → `POST /service-catalog/demand`.

## Demand log

Migration `0034_service_demand_log.sql`. Answers “which professional to recruit next, and where”.

## Admin

`GET /admin/coverage-matrix` + ops console **Coverage** tab: province × item matrix with qualified count and demand.

## Province resolution

Order create uses `req.province` or property/listing province. **No blind `MI` fallback** for sellability (was dangerous). Assignment spawn skips when province is unknown.

## Related

- Domain: `apps/api/src/professionals/domain/coverage.ts`
- Service: `apps/api/src/professionals/coverage-availability.service.ts` (provided by `AssignmentsModule`)
