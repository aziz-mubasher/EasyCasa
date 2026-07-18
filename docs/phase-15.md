# Phase 15 — Professional Portal

**Goal:** the last major user-facing surface — the workbench for the authorized professionals (mediatori, tecnici, APE assessors, photographers, notai) who execute the ordered work. An assignment inbox, task detail with start + deliverable upload, and a credential vault. Built as a section of the **Phase 7 universal app** (iOS / Android / web), so a tecnico can upload an APE from the field.

Design reference: `easycasa-system-design.md` §3.3. Consumes the Phase 11 assignment engine and the Phase 14 presign upload.

---

## Reinforcing the professional-only principle

The portal makes the "collaborate only with authorized professionals" rule tangible from the supply side:

- The credential vault shows each credential's verification state; a professional **submits** credentials (REA, RC insurance, albo, APE certification) but they land `PENDING` — only EasyCasa admin verification (Phase 13) makes them count.
- The inbox only ever shows assignments the credential gate already routed to this professional (Phase 11). Start/deliver are **ownership-checked server-side** — a professional can only act on their own assignments.

---

## What's in this bundle

```
apps/api/src/
  professionals/domain/pro-actions.ts      # nextProAction(status) — shared, pure (+ test)
  professional-me/professional-me.module.ts # /me/professional, /me/assignments, ownership-checked start/deliver
packages/api-client/src/phase15.ts          # EasyCasaProfessionalApi

apps/mobile/
  app/(pro)/
    _layout.tsx                # pro section (ProApiProvider)
    index.tsx                  # assignment inbox
    [assignmentId].tsx         # task detail: start + deliverable upload
    credentials.tsx            # credential vault: list + submit
  src/api/
    professional.tsx           # ProApiProvider / useProApi
    professional-hooks.ts      # profile, inbox, start, deliver, submit-credential
  src/components/pro/
    AssignmentCard.tsx  StatusPill.tsx  CredentialRow.tsx
  src/i18n/locales/pro.{en,it,es}.json
```

---

## Backend endpoints (included, not just prompted)

```
GET  /me/professional                    → the current professional's profile + credentials
GET  /me/assignments                     → enriched inbox (assignment + task context)
POST /me/assignments/:id/start           → ownership-checked; ASSIGNED → IN_PROGRESS
POST /me/assignments/:id/deliver         → ownership-checked; IN_PROGRESS → DELIVERED (+ url)
```

`/me/*` resolves the professional from the authenticated user; start/deliver return `403` if the assignment isn't theirs and `409` if the status doesn't allow the action. The transition rules come from the shared `nextProAction` — the same function the app uses to decide which button to show, so client and server never disagree.

---

## Acceptance criteria

- [x] `nextProAction` correct — **3 tests pass (sandbox)**.
- [x] `professional-me` backend (profile, inbox, ownership-checked start/deliver) **type-checks `--strict` (sandbox)**.
- [x] `@easycasa/api-client` Phase 15 surface type-checks with real zod (sandbox).
- [x] All 9 professional-portal app files **parse clean**; EN/IT/ES locales valid (sandbox).
- [ ] `pnpm --filter @easycasa/mobile typecheck` with the Expo toolchain.
- [ ] End-to-end: assigned task appears in inbox → start → upload deliverable → admin approves.

---

## Honest caveats

- **Implemented in-repo (Drizzle, not Prisma):** migration `0012_phase15.sql` adds `professionals.user_id` + `user_role = professional`; `/me/*` resolves via `UsersService.getOrCreate` → DB user id → professional row.
- **Reuses Phase 9 `upload.ts`** (`pickAndUploadDocument`) and Phase 14 `/uploads/presign` for deliverables.
- **Credential submission** currently posts type + reference/expiry; verifying the *document* behind a credential (uploading the actual policy/enrolment PDF) is a follow-up.
- **Entry point:** Profile → Professional is shown when `GET /me` role is `professional` or `admin`.

---

## Cursor prompts

1. **Link professional to user.** "Add `userId` to the `Professional` model (unique), backfilled from onboarding, so `/me/professional` resolves the current user's professional profile."

2. **Wire the module + guard.** "Import `ProfessionalMeModule` into `AppModule` behind the OIDC auth guard; ensure `/me/*` requires an authenticated user."

3. **Role-gated entry.** "Add a 'Professional' entry (profile screen or tab) visible only to users with the professional role, routing to `/(pro)`."

4. **Credential document upload.** "Extend the credential vault to upload the supporting document (presign + PUT) and attach its URL to the credential for the admin verifier to review."

5. **Push on assignment.** "When an assignment is created for a professional, send a push (Phase 7 devices) so the inbox surfaces new work in real time."
