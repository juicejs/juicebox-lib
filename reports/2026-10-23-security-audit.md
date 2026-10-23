# Security Audit — 2026-10-23

## Summary

This repository is `juicebar`, an Angular 18 front-end component library (login, user management, exports) that talks to a Juicebox backend over RPC. No hardcoded secrets, injection sinks, or debug endpoints were found. Angular's built-in sanitizer covers the `[innerHTML]` bindings, and authorization is enforced on the server. The main risk is the dependency tree: the locked Angular 18.2.x and Socket.IO packages have published high-severity advisories, including several Angular sanitizer-bypass XSS issues. Session tokens are also handled in ways that make an XSS or a logging leak more damaging.

Open findings: Critical: 0, High: 1, Medium: 2, Low: 1

No earlier reports were found in `reports/`, so there are no previous findings to re-check.

## Findings

### 1. Outdated Angular framework with known XSS / sanitizer-bypass advisories

- **Severity:** High
- **Status:** Open
- **Location:** `package.json:11-21` (lockfile resolves `@angular/core` to 18.2.10, `package-lock.json:563-564`)

```json
"@angular/common": "^18.2.0",
"@angular/compiler": "^18.2.0",
"@angular/core": "^18.2.0",
```

- **Impact:** `npm audit` flags every `@angular/*` package `<=19.2.25` as High. Advisories include GHSA-v4hv-rgfq-gp49 (stored XSS via SVG/MathML attributes), GHSA-jrmj-c5cx-3cw6 (unsanitized SVG script attributes), GHSA-58w9-8g37-x9v5 (two-way binding sanitization bypass), GHSA-hh8m-fm6v-7cvg (host binding sanitization bypass), and GHSA-58c5-g7wp-6w37 / GHSA-jfgx-762w-99vr (XSRF token leakage). The library relies on Angular's sanitizer to render HTML: `confirmation-dialog.component.html:1-5` binds `title`, `message`, and `info` with `[innerHTML]`. A sanitizer bypass therefore leads directly to script execution. That script can read the session token from `localStorage` (finding 3).
- **Recommendation:** Upgrade all `@angular/*`, `@angular/cdk`, and `@angular/material` packages to a patched release (Angular 19.2.26+ or the current major). Then regenerate `package-lock.json` and update the library's `peerDependencies` (`projects/juicebar/package.json`) to match.

### 2. Vulnerable Socket.IO / Engine.IO / ws versions (and unused server package shipped as a dependency)

- **Severity:** Medium
- **Status:** Open
- **Location:** `package.json:25-26`; lockfile `socket.io-parser` 4.2.4 (`package-lock.json:12335-12336`), `ws` 8.17.1 (`package-lock.json:14390-14391`)

```json
"socket.io": "^4.4.0",
"socket.io-client": "^4.4.0",
```

- **Impact:** `npm audit` reports High-severity DoS advisories for `engine.io` (GHSA-r635-g3xr-vw7x, GHSA-2gc4-cqfq-p2gv), `socket.io-parser` (GHSA-677m-j7p3-52f9, GHSA-2m8v-j782-fhvr), and `ws` (GHSA-96hv-2xvq-fx4p memory exhaustion, GHSA-58qx-3vcg-4xpx uninitialized memory disclosure). These mainly affect server-side use. The library only uses the client (`socket-io.service.ts`), but it lists the `socket.io` server package as a runtime dependency. Any consumer that installs it inherits the vulnerable server stack. Severity is reduced to Medium because the browser code does not run the server.
- **Recommendation:** Run `npm audit fix` to move to patched `socket.io-parser`, `engine.io`, and `ws` releases. Also remove `socket.io` from `dependencies`, since only `socket.io-client` is needed.

### 3. Session token stored in `localStorage`

- **Severity:** Medium
- **Status:** Open
- **Location:** `projects/juicebar/src/lib/core/shared/services/juice.service.ts:136-143`

```ts
setToken(token: string) {
    localStorage.setItem('juice_token', JSON.stringify(token));
}
getToken(): string {
    ...
    const token = localStorage.getItem('juice_token');
```

- **Impact:** The bearer token sent as the `authorization` / `juice-token` header is readable by any JavaScript running on the origin. Any XSS lets an attacker steal it and replay it from anywhere: through the Angular advisories in finding 1, through a compromised dependency, or through a co-hosted app on the same origin. The same token also grants the privileged "login as another user" flow (`Juicebox.service.ts`, `loginAsAnotherUser`). The token persists until it is explicitly cleared.
- **Recommendation:** Move the session to an `HttpOnly`, `Secure`, `SameSite` cookie issued by the backend, with CSRF protection. If header tokens must stay, keep them in memory only (or in `sessionStorage` at minimum), use short lifetimes with rotation, and add a strict Content-Security-Policy to reduce the XSS risk.

### 4. Session token sent in WebSocket URL query string

- **Severity:** Low
- **Status:** Open
- **Location:** `projects/juicebar/src/lib/core/shared/services/socket.service.ts:32`

```ts
this.config.options.query = {token: this.juicebox.pleaseExtendYourServiceDontDoThis().getToken()};
```

- **Impact:** Socket.IO adds `query` parameters to the WebSocket handshake URL (`/socket.io/?token=...`). Reverse proxies, load balancers, and server access logs routinely record full request URLs. The session token can therefore leak into logs and monitoring systems, where anyone with log access can replay it.
- **Recommendation:** Send the token with Socket.IO's `auth` option (`options.auth = { token }`), which travels in the connection payload instead of the URL. Read it server-side from `socket.handshake.auth.token`.
