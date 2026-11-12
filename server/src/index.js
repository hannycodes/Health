import "./env.js";

import { createApp } from "./app.js";

/**
 * `PORT` is often present but empty in shells and CI, and Number("") is 0,
 * which would bind a random port. Fall back unless the value is a real port.
 */
const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const port =
  Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort < 65536
    ? configuredPort
    : 8000;

const app = createApp();

const server = app.listen(port, () => {
  console.log(`MyHealth API listening on http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing the server.`);
  server.close(() => process.exit(0));
}

["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, () => shutdown(signal)));
