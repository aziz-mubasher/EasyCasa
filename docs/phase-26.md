# Phase 26 — Wire the Enquiry Order Bridge to Phase 10

**Goal:** extract a clean enquiry → order bridge so convert produces a real Phase 10 order through an explicit mapping + adapter. Phase 24 already called `OrdersService` inline; this phase structures that hop (pure mapping, listing price context, single reconciliation adapter) so buyer-side drafts map cleanly onto the property-scoped Phase 10 API.

Adapted from the Prisma scaffold to **Drizzle**.

---

## Funnel hop

```
convert (Phase 24)
  → OrdersBridge.createFromDraft
  → DrizzleListingOrderContext (listing price → referenceValueCents)
  → buildCreateOrderInput (pure: BUYER/OWNER, items, source: ENQUIRY)
  → Phase10OrdersAdapter
       → find/create properties row for listing
       → OrdersService.create(propertyId, { items, referenceValueCents })
  → { orderId } → enquiry CONVERTED + orderId set
```

---

## Layout

```
apps/api/src/enquiries/order-bridge/
  types.ts                     # CreateOrderInput, ListingOrderContext
  order-mapping.ts             # buildCreateOrderInput (pure)
  order-mapping.spec.ts        # 4 tests
  ports.ts                     # OrdersServicePort, ListingOrderContextPort
  orders.bridge.ts             # OrdersBridge (OrderCreationPort)
  phase10-orders.adapter.ts    # Phase10OrdersAdapter + DrizzleListingOrderContext
```

`OrdersModule` already exports `OrdersService`. The module binds
`PHASE10_ORDERS_SERVICE` → `useExisting: OrdersService`.

---

## Reconciliation

Bridge contract wants:

```ts
createOrder({ partyUserId, partyRole, listingId, itemCodes, referenceValueCents, source })
```

Real Phase 10 API is:

```ts
OrdersService.create(propertyId, { items?, packageCode?, referenceValueCents? })
```

**`Phase10OrdersAdapter` is the only place that bridges them:** resolve/create the listing's property fascicolo, then call `create`. `partyUserId` / `partyRole` / `source` are logged but not yet columns on `service_orders` (owner-centric Phase 10 model).

---

## Acceptance

- [x] `buildCreateOrderInput` — 4 unit tests
- [x] Bridge + Drizzle adapter wired in `EnquiriesModule`
- [x] Buyer catalog codes already present (Phase 24 / `0016_phase24.sql`)
- [ ] Live convert on staging → real order id on enquiry
- [ ] Deep-link inbox "Order created" → order screen (no dedicated order route yet)
- [ ] Persist buyer party on orders when Phase 10 gains party columns

---

## Caveats

- Orders still hang off the **listing owner's** property fascicolo; the seeker is the logical BUYER party in the draft only.
- Rent vs sale reference-value interpretation stays in Phase 8/10 pricing (bridge passes raw listing price × 100).
- Idempotency: Phase 24 `canConvertToOrder` 409s once `orderId` is set.
