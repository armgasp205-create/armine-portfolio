import { randomBytes } from "node:crypto";

const fail = (status, message) => Object.assign(new Error(message), { status });
const adminEmail = "armine.gasparyan94@mail.ru";

export async function verifySupabaseToken(token) {
    let response;
    try {
        response = await fetch("https://mmucgmsnlcfywypjokyw.supabase.co/auth/v1/user", {
            headers: { apikey: "sb_publishable_ROro5WJZJLiFSg15_VlTRg_M28oe0qG", Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
        });
    } catch { throw fail(503, "Մուտքի ստուգումը ժամանակավորապես անհասանելի է։"); }
    if (!response.ok) throw fail(response.status >= 500 ? 503 : 401, "Կրկին մուտք գործիր քո հաշիվ։");
    const user = await response.json();
    if (!user.id || !user.email_confirmed_at) throw fail(401, "Հաստատիր էլ․ հասցեդ և մուտք գործիր։");
    return { id: user.id, email: user.email, role: user.email?.toLowerCase() === adminEmail ? "admin" : "user" };
}

export function createAuth(verify = verifySupabaseToken, publicOrigin = "") {
    const sessions = new Map();
    const secure = publicOrigin.startsWith("https://") ? "; Secure" : "";
    const authenticate = async request => {
        const cookie = request.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith("portfolio_session="))?.slice(18);
        const session = sessions.get(cookie);
        const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1] || (session?.expires > Date.now() ? session.token : null);
        if (!token) throw fail(401, "Մուտք գործիր քո հաշիվ՝ շարունակելու համար։");
        return verify(token);
    };
    return {
        authenticate,
        async handle(request, response, url, send) {
            if (!url.pathname.startsWith("/api/auth/")) return false;
            if (request.headers.origin && request.headers.origin !== (publicOrigin || `http://${request.headers.host}`)) throw fail(403, "Հարցման աղբյուրը թույլատրված չէ։");
            if (url.pathname === "/api/auth/session" && request.method === "POST") {
                const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
                if (!token || token.length > 8192) throw fail(401, "Մուտք գործիր քո հաշիվ։");
                const user = await verify(token);
                for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
                const id = randomBytes(32).toString("hex");
                sessions.set(id, { token, expires: Date.now() + 3600000 });
                response.setHeader("Set-Cookie", `portfolio_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure}`);
                send(200, { user }); return true;
            }
            if (url.pathname === "/api/auth/logout" && request.method === "POST") {
                const id = request.headers.cookie?.match(/(?:^|;\s*)portfolio_session=([^;]+)/)?.[1];
                sessions.delete(id);
                response.setHeader("Set-Cookie", `portfolio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
                send(200, { signedOut: true }); return true;
            }
            if (url.pathname === "/api/auth/me" && request.method === "GET") { send(200, { user: await authenticate(request) }); return true; }
            throw fail(404, "Հասցեն չի գտնվել։");
        },
    };
}
