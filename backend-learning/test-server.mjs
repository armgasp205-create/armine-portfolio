// Trusted identities are injected only by tests, never by the executable server.
import { createTaskServer as createServer } from "./server.mjs";
export function createTaskServer(options = {}) {
    const server = createServer({ ...options, verifyIdentity: async () => ({id:"test-admin",email:"test@example.com",role:"admin"}) });
    server.prependListener("request", request => { request.headers.authorization = "Bearer test-token"; });
    return server;
}
