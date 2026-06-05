# SPA Token Demo -- Lab Setup

This app demonstrates token-based authentication using a React SPA with a Spring Boot backend and Keycloak as the OIDC provider.

## Architecture

```
Browser (React SPA)
    |
    |-- OIDC login --> Keycloak (Authorization Code + PKCE)
    |                   returns access_token (JWT)
    |
    |-- Bearer token --> Spring Boot API (/api/notes)
                          validates JWT signature via Keycloak JWK endpoint
```

The access token is stored in the browser (managed by keycloak-js) and sent as an `Authorization: Bearer <token>` header on every API request.
The SPA also exposes a lab-only token dump for inspecting the access, ID, and refresh tokens locally.

## Prerequisites

- Keycloak running at `https://keycloak.192.168.50.10.nip.io`
- Realm `api-security` with an OIDC client `spa-token-demo` (public client, Authorization Code flow)
- PostgreSQL database `spa_token_demo` on `192.168.50.10:5432`
- TLS certificates issued by the cluster's internal Vault PKI CA

## Internal CA Trust

The lab cluster uses TLS certificates signed by an internal CA (HashiCorp Vault PKI).
Browsers will show a certificate warning -- this is expected in the lab environment.

The Spring Boot backend also needs to trust this CA when it contacts Keycloak
to fetch JWK keys for token validation. Java does not trust the internal CA by default,
so we bundle the CA chain in the application and configure a custom SSL context.

### What was done

1. Exported the CA chain (root + intermediate) from Vault:

   ```bash
   vault read -field=certificate pki/cert/ca > root-ca.pem
   vault read -field=certificate pki_int/cert/ca > int-ca.pem
   cat root-ca.pem int-ca.pem > src/main/resources/internal-ca.pem
   ```

2. Added `app.internal-ca` property in `application.yaml` pointing to the bundled PEM.

3. Created `JwtConfig.java` that:
   - Loads the internal CA certificates from the PEM file
   - Builds a custom `SSLContext` with a `TrustStore` containing those CAs
   - Creates a `RestTemplate` that uses this SSL context for HTTPS connections
   - Wires it into the `NimbusJwtDecoder` so JWK fetches from Keycloak succeed

### Why not just disable SSL verification?

Disabling SSL verification (`TrustAllCerts`) is a common shortcut but defeats the
purpose of TLS entirely. In a real deployment you would either:
- Use a publicly trusted CA (e.g., Let's Encrypt)
- Add the internal CA to the JVM truststore at deployment time
- Bundle the CA in the application (what we do here)

## Test user

| Username | Password | Realm        |
|----------|----------|--------------|
| student  | student  | api-security |

## Token dump

After login, the Token Dump section can show and download a JSON file containing:

- `access_token`
- `id_token`
- `refresh_token`
- decoded JWT payloads when the token format allows it
- `githubUsername: "torinks"` as dump metadata

The dump is local to the browser and is intended for lab inspection only.

## Running locally

```bash
cd frontend && npm install && npm run dev    # starts on :3000
cd backend && ./gradlew bootRun              # starts on :8080
```

The frontend defaults to `https://keycloak.192.168.50.10.nip.io` for Keycloak.
Override with `VITE_KEYCLOAK_URL` env var if needed.

## Deployed URLs

| Service   | URL                                                |
|-----------|----------------------------------------------------|
| SPA       | https://spa-token-demo.192.168.50.10.nip.io        |
| API       | https://spa-token-demo.192.168.50.10.nip.io/api    |
| Keycloak  | https://keycloak.192.168.50.10.nip.io              |
