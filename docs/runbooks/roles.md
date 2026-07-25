# Keycloak realm roles — additive production sync (K EC 1.35)

**Scope:** document how to add SmartLink / listing product roles on the **live** `easycasa` realm without re-importing `realm-easycasa.json` (re-import or overwrite drops real users such as `muba-user` and `muba-admin`).

**Authoritative definitions:** `infra/keycloak/realm-easycasa.json` → `roles.realm` (includes `seller`, `agent`, `partner`, `pro_marketer`, plus `buyer`, `seeker`, `admin`, …).

**API authorization (SmartLink):** listing **owners** may create/manage SmartLinks for their own listing without holding the `seller` realm role (ownership is enforced in `ShareLinksService`). Non-owners still need `seller` | `agent` | `partner` | `pro_marketer` **and** an assignment on the listing (`ownerUserId` / `agentId` / `mediatorUserId`). `buyer` / `seeker` cannot create links for listings they do not own.

---

## ⚠️ Blocker: admin console / bootstrap credentials

Production Keycloak admin login has been reported **broken** (bootstrap admin drift after container rebuilds). **Recover admin access before running `kcadm`** — for example:

1. Exec into the Keycloak container on the VPS.
2. Authenticate `kcadm.sh` against the **master** realm with a known admin, **or** create a temporary admin user via the Keycloak CLI (`kcadm create users` in master) — do **not** re-import the `easycasa` realm.
3. Rotate off any temporary admin account after role sync (see security backlog).

Until admin works, role assignment for agents/partners remains manual backlog; private owners are unblocked via API ownership rules without a `seller` role.

---

## Prerequisites (same as OIDC cutover)

```bash
export KC=/opt/keycloak/bin/kcadm.sh
export KC_SERVER=https://auth.easycasaita.com
export KC_REALM=easycasa

$KC config credentials \
  --server "$KC_SERVER" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"
```

Run from the Keycloak container or anywhere `kcadm` can reach `$KC_SERVER`.

---

## Step 1 — Create missing realm roles (idempotent)

Production has historically had only `buyer`, `seeker`, and `admin`. Add the product roles if absent:

```bash
ensure_realm_role() {
  local NAME=$1
  local DESC=$2
  if $KC get "roles/$NAME" -r "$KC_REALM" >/dev/null 2>&1; then
    echo "Role exists: $NAME"
  else
    echo "Creating role: $NAME"
    $KC create roles -r "$KC_REALM" -s "name=$NAME" -s "description=$DESC"
  fi
}

ensure_realm_role seller "Property owner listing to sell"
ensure_realm_role agent "Licensed mediator / agency staff"
ensure_realm_role partner "External partner (e.g. lender)"
ensure_realm_role pro_marketer "Professional marketer"
```

Optional — keep repo and live aligned for aliases already in JSON:

```bash
ensure_realm_role buyer "Seeker / prospective buyer (product: seeker)"
ensure_realm_role seeker "Alias of buyer for product naming; assign either"
```

Verify:

```bash
$KC get roles -r "$KC_REALM" | jq -r '.[].name' | sort
```

---

## Step 2 — Assign roles to users (manual, out of band)

This task does **not** auto-assign `seller` on publish (API uses ownership instead). Humans still assign:

| Role | When |
|------|------|
| `seller` | Optional label for owners; not required for SmartLink if they own the listing |
| `agent` | After REA / mediator verification (future task) |
| `partner` | Contractual partners |
| `pro_marketer` | Marketing staff |

Example (replace `USER_UUID`):

```bash
$KC add-roles -r "$KC_REALM" --uusername muba-user --rolename seller
# or by id:
# $KC add-roles -r "$KC_REALM" --uid "$USER_UUID" --rolename agent
```

Users must **log out and back in** (or refresh token) for new realm roles to appear in `realm_access.roles`.

---

## Step 3 — Smoke-check JWT

1. Log in as a user with only `buyer`.
2. Decode access token — should **not** include `seller` unless assigned.
3. Call `POST /share-links` for a listing they **own** → **201** (API ownership path).
4. Same user, another user's `listingId` → **403** `insufficient role` or `not authorized for this listing`.

See also `docs/runbooks/oidc-cutover.md` § “Reconciling corrected realm JSON with LIVE production”.
