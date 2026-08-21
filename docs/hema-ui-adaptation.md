# Hema UI adaptation guide

This checkout keeps New API's upstream application behavior and applies the
hemaAPI presentation through a thin, reviewable adaptation layer.

## Boundary

UI work may change scoped styles, visual assets, presentation wrappers,
display-only classes, and `data-slot` metadata. It must not change:

- route paths, route guards, redirects, permissions, or sidebar filtering;
- API request/response contracts, React Query keys, mutations, or polling;
- authentication, OAuth, CAPTCHA, Passkey, 2FA, billing, or quota behavior;
- Zustand stores, form schemas, validation, or administrator configuration;
- upstream project metadata, licenses, attribution, package names, or imports.

Administrator-configured site names, logos, home URLs, HTML, and Markdown keep
priority over Hema defaults.

## Hema-owned surface

| Purpose                              | Location                                                        |
| ------------------------------------ | --------------------------------------------------------------- |
| Shared theme and component overrides | `web/src/styles/hema-user.css`                                  |
| Theme entry point                    | `web/src/styles/index.css`                                      |
| Brand default mapping                | `web/src/lib/brand-adapter.ts`                                  |
| Hema mark                            | `web/public/hemaapi-mark.svg`                                   |
| Bundled Hema home                    | `web/public/hema-home/`                                         |
| Auth presentation                    | `web/src/features/auth/auth-layout.tsx`                         |
| Public shell and header slots        | `web/src/components/layout/components/public-layout.tsx`        |
| Shared internal shell                | `web/src/components/layout/components/authenticated-layout.tsx` |
| Shared page presentation slots       | `web/src/components/layout/components/section-page-layout.tsx`  |
| Shared table presentation slots      | `web/src/components/data-table/`                                |
| Shared primitive style contract test | `web/src/styles/__tests__/hema-user-contract.test.ts`           |

Feature entry files may add only display classes such as `hema-data-page`,
`hema-wallet-page`, `hema-catalog-page`, `hema-rankings-page`,
`hema-playground-page`, or `hema-admin-page`. Keep feature hooks and rendered
workflow components unchanged. The setup wizard uses both `hema-public-shell`
and `hema-setup-page` because it runs before either public or authenticated
route layout is available.

## Upstream upgrade workflow

1. Fetch the upstream release and inspect changes before merging.
2. Resolve route, auth, API, store, billing, and form conflicts in favor of the
   new upstream behavior.
3. Reapply only the Hema presentation hooks listed above.
4. Confirm that administrator-configured branding and home content still win.
5. Run the checks below before creating a deployment artifact.

Do not resolve a conflict by replacing a new upstream feature file with an old
Hema copy. Reattach the smallest presentation hook to the updated component.

## Verification

Run from `web/`:

```bash
npm run typecheck
npm run lint
npm run format:check
NODE_OPTIONS=--no-experimental-webstorage npm test
npm run build
```

The `NODE_OPTIONS` override avoids Node 25's incomplete experimental
`localStorage` implementation leaking into jsdom tests. It is not required on
Node versions without experimental web storage.

If the repository's preferred Bun runtime is available, use the equivalent
`bun run` commands. This workstation currently uses npm for the same scripts.

After the frontend build, run from the repository root:

```bash
go build -o new-api-local .
./new-api-local --port 3000
```

Browser regression must cover:

- home, sign-in, sign-up, password recovery, OAuth callback, and error pages;
- pricing, model details, rankings, about, legal documents, and setup;
- dashboard, API keys, models, usage logs, wallet, profile, subscriptions;
- channels, users, redemption codes, system information, and system settings;
- playground, chat loading/error states, and external chat handoff;
- desktop and mobile widths, light and dark themes;
- loading, empty, error, disabled, validation, drawer, dialog, menu, and toast
  states;
- protected-route redirects and administrator permission boundaries.

## Deployment gate

Before uploading to a server, verify the production environment separately:

- secure session cookies and explicit trusted proxy configuration;
- persistent database and upload paths;
- HTTPS origin, OAuth callback URLs, and CAPTCHA origins;
- a database backup and a rollback copy of the previous binary/container;
- health check, login, API relay, quota deduction, and administrator access
  after deployment.

## Current deployment target

The New API instance for this checkout is the Hong Kong site:

- Public origin: `https://ai.hemasir.online`
- API base URL: `https://ai.hemasir.online/v1`
- Reverse proxy: Cloudflare -> Nginx -> `newapi-hybrid:3000`
- Public status endpoint: `https://ai.hemasir.online/api/status`

This is separate from the Sub2API visual reference at `https://k.hemasir.online`.
Do not deploy the New API frontend artifact to the Sub2API compose project or
reuse its container name, database, Redis instance, or proxy configuration.
After a deployment, verify the public status version, the Hema brand asset,
the sign-in and registration routes, and the `/v1` API relay independently.
