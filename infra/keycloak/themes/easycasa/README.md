# EasyCasa Keycloak theme (`easycasa`)

Login + email + a minimal welcome page. Account and Admin themes stay stock.

**Parent:** `base` (Keycloak 24–26). The look lives in `login/template.ftl` and
the `kc*Class` map in `login/theme.properties`. Inherited pages
(`login.ftl`, reset, new password, verify-email, terms) render inside that
layout.

If `kc.sh --version` is older than 24, **delete `login/register.ftl`** and
redeploy. Older servers do not have `user-profile-commons.ftl` /
`register-commons.ftl`. The parent `register.ftl` still picks up our CSS.

## Do not

- Load fonts or scripts from a third-party host
- Merge marketing consent into the terms checkbox
- Enable `VERIFY_EMAIL` as a default action before realm SMTP exists
- Enable `VERIFY_PROFILE` (locks out null-email users)
- Turn on “e-mail as username”
- Recreate the VPS container without `docker inspect` first
  (`docs/runbooks/keycloak.md`)

## Policy version

`ecPolicyVersion` in `login/theme.properties`. Changelog:
`POLICY-CHANGELOG.md`. Bump them together.
