import cds from '@sap/cds';

/**
 * ============================================================
 *  DEV-ONLY ROLE PREVIEW
 * ============================================================
 *  Temporary, explicitly requested override (2026-08) - see
 *  CLAUDE.md §5 decision C7 for the full "why this normally isn't
 *  allowed" reasoning and why this exception exists.
 *
 *  Real auth is untouched: the client sends a plain custom header
 *  (X-Dev-Role, set by app/webapp/model/devRole.js), which this
 *  rewrites into a real Basic-Auth `Authorization` header for one of
 *  the five already-configured local mocked users (package.json)
 *  BEFORE cds's own auth middleware ever looks at the request -
 *  registered on the 'bootstrap' event, which fires before
 *  `cds.serve(...).in(app)` mounts that middleware. From there on,
 *  CAP's normal mocked-auth flow runs completely unmodified: it
 *  verifies the rewritten credentials and sets req.user for real, so
 *  every @restrict/@requires check still runs against a real role.
 *
 *  This file only exists because of that hook point: a plain
 *  cds-plugin.js at the project root is NOT auto-loaded by CAP
 *  (that mechanism only scans actual npm dependency packages, per
 *  node_modules/@sap/cds/lib/plugins.js) - a project-local server.js
 *  (here, or at the project root) is the real, documented extension
 *  point for this (node_modules/@sap/cds/bin/serve.js#_local_server_js).
 *
 *  Hard-gated to non-production: cds.env.profiles never includes
 *  'production' in a local `cds watch` session, and this file has no
 *  effect at all once deployed with the real xsuaa profile active.
 *  MUST be removed (or this guard proven airtight in review) before
 *  the real XSUAA rollout - tracked in TODO-INTEGRATION.md (I-25).
 * ============================================================
 */

const ROLE_TO_USER = {
  Employee: 'sami',
  Manager: 'nadia',
  HR: 'rh',
  Administrator: 'admin',
  Intern: 'stagiaire',
};

cds.on('bootstrap', (app) => {
  if (cds.env.profiles?.includes('production')) return;
  app.use((req, _res, next) => {
    const devUser = ROLE_TO_USER[req.headers['x-dev-role']];
    if (devUser) {
      req.headers.authorization = 'Basic ' + Buffer.from(`${devUser}:devrole`).toString('base64');
    }
    next();
  });
});

// Falling through to the standard bootstrapping - this file only adds
// the middleware above, it doesn't replace anything else.
export default cds.server;
