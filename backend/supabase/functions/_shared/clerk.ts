import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "https://esm.sh/jose@6.0.10";

const DEFAULT_ISSUERS = [
  "https://current-phoenix-8305.clerk.accounts.dev",
  "https://emerging-grackle-5286.clerk.accounts.dev",
];

const ISSUERS = Array.from(
  new Set([
    ...(Deno.env.get("CLERK_ISSUER_URL") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    ...DEFAULT_ISSUERS,
  ]),
);

const JWKSETS = ISSUERS.map((issuer) => ({
  issuer,
  jwks: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
}));

export type ClerkUser = {
  id: string;
  email: string | null;
  claims: JWTPayload;
};

export async function verifyClerkToken(req: Request): Promise<ClerkUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  for (const { issuer, jwks } of JWKSETS) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        clockTolerance: 10,
      });
      if (payload.role !== "authenticated") return null;
      if (typeof payload.sub !== "string" || !payload.sub) return null;
      return {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        claims: payload,
      };
    } catch {
      // try the next configured issuer
    }
  }
  return null;
}
