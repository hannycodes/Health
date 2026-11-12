/**
 * Static entrypoint for Freebuff Sites.
 *
 * The application is a client-side React SPA, so the Worker only needs to hand
 * requests to the asset layer. Client-side routes are covered by `spa: true` in
 * the deployment manifest.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
