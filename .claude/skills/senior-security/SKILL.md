---
name: "senior-security"
description: "Security engineering for threat modeling, vulnerability analysis, secure code review, and penetration testing. Use when asked about security reviews, threat analysis, vulnerability assessments, secure coding practices, security audits, attack surface analysis, WebSocket security, auction bid manipulation prevention, or OWASP guidance. Also use proactively before any feature ships to production."
triggers:
  - security review
  - threat modeling
  - vulnerability assessment
  - STRIDE analysis
  - penetration testing
  - secure coding
  - OWASP
  - WebSocket security
  - bid manipulation
  - authentication security
  - secret scanning
---

# Senior Security Engineer

Security engineering for the real-time auction platform. Covers threat modeling, secure code review, WebSocket security, and auction-specific attack vectors.

---

## Auction Platform Threat Model (STRIDE)

### High-Priority Threats

| Threat | Vector | Mitigation |
|--------|--------|------------|
| Bid manipulation | Race condition on bid placement | SELECT FOR UPDATE in DB transaction |
| Bid sniping via timing | Client clock manipulation | Server-side timestamp only |
| Fake bid injection | Unauthenticated WebSocket | Authenticate WS handshake with JWT |
| Auction result tampering | Direct DB access via API | Row-level permissions + audit log |
| Price scraping | Unauthenticated feed access | Auth required on all lot endpoints |
| DoS via bid flood | Malicious client spam | Per-user rate limiting (Redis) |
| Session hijacking | JWT theft | Short expiry (1h) + httpOnly refresh cookie |
| Privilege escalation | Missing role checks | Server-side RBAC on every endpoint |

---

## WebSocket Security Checklist

```typescript
// 1. Authenticate on upgrade (not just on connect)
server.on('upgrade', (req, socket, head) => {
  const token = req.headers['sec-websocket-protocol'] // or query param
  try {
    const user = verifyJWT(token)
    req.user = user
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})

// 2. Validate all incoming messages
ws.on('message', (raw) => {
  const msg = ClientMessageSchema.safeParse(JSON.parse(raw.toString()))
  if (!msg.success) { ws.close(1008, 'Invalid message'); return }
  // handle msg.data
})

// 3. Never trust client-sent timestamps, prices, or user IDs
// Always derive from server state
```

---

## Secure Code Review Checklist

### Before Any PR Merges

| Category | Check |
|----------|-------|
| Input Validation | All user input validated with Zod before use |
| SQL | ORM only — no string interpolation in queries |
| Auth | JWT verified server-side on every protected route |
| WebSocket | Handshake authenticated; messages schema-validated |
| Bid Logic | Race conditions prevented with DB-level locking |
| Secrets | No hardcoded credentials, tokens, or keys |
| Logging | No passwords, tokens, or PII in log output |
| Rate Limiting | Bid and auth endpoints rate-limited |
| Headers | Helmet applied; CORS restricted to known origins |
| Dependencies | No known CVEs in npm audit output |

---

## Secret Scanning (Run Before Every Commit)

```python
import re, pathlib, sys

SECRET_PATTERNS = {
  "aws_key":       re.compile(r"AKIA[0-9A-Z]{16}"),
  "private_key":   re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
  "jwt_secret":    re.compile(r'(?i)(jwt_secret|jwt_key)\s*[=:]\s*["\']?\S{8,}'),
  "db_url":        re.compile(r'postgres://\S+:\S+@'),
  "generic_secret":re.compile(r'(?i)(password|secret|api_key|token)\s*[=:]\s*["\'][^${\s]{8,}'),
}

def scan(root="."):
  findings = []
  for path in pathlib.Path(root).rglob("*"):
    if path.is_file() and path.suffix in {".ts",".js",".env",".yaml",".json"}:
      for lineno, line in enumerate(path.read_text(errors="replace").splitlines(), 1):
        for name, pattern in SECRET_PATTERNS.items():
          if pattern.search(line):
            findings.append(f"{path}:{lineno} [{name}]")
  return findings

if __name__ == "__main__":
  hits = scan()
  if hits:
    print("SECRETS FOUND:"); [print(h) for h in hits]; sys.exit(1)
  print("Clean.")
```

---

## STRIDE Analysis Methodology

1. Map data flows: client → WS/HTTP → API → DB → Redis → broadcast
2. Apply STRIDE to each boundary:
   - **S**poofing: Can someone fake a user identity?
   - **T**ampering: Can bid amounts be modified in transit?
   - **R**epudiation: Can a bidder deny placing a bid?
   - **I**nformation Disclosure: Can someone see another bidder's strategy?
   - **D**enial of Service: Can the auction be flooded/crashed?
   - **E**levation of Privilege: Can a buyer act as an auctioneer?
3. Score with DREAD (1–10): Damage, Reproducibility, Exploitability, Affected Users, Discoverability
4. Mitigate in priority order

---

## Cryptographic Standards

| Use Case | Algorithm |
|----------|-----------|
| JWT signing | RS256 (asymmetric) |
| Password hashing | Argon2id |
| Session tokens | crypto.randomBytes(32) |
| Data at rest | AES-256-GCM |
| TLS | TLS 1.3 minimum |

---

## Security Headers (Apply via Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.WS_URL],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))
```

---

## Fix Protocol

When a vulnerability is found:
1. **Assess severity** using DREAD
2. **Create a fix branch** — never patch inline on main
3. **Write a regression test** that reproduces the vulnerability
4. **Fix** the vulnerability
5. **Verify** the test now passes
6. **Document** in the security audit log

---

## OWASP Top 10 Quick Reference

| # | Risk | Primary Mitigation in This Project |
|---|------|-------------------------------------|
| A01 | Broken Access Control | RBAC on all endpoints, row-level checks |
| A02 | Cryptographic Failures | AES-256, TLS 1.3, Argon2id |
| A03 | Injection | Zod validation + ORM (no raw SQL) |
| A04 | Insecure Design | Threat model before building |
| A05 | Security Misconfiguration | Helmet, CORS allowlist, env secrets |
| A06 | Vulnerable Components | Weekly npm audit in CI |
| A07 | Auth Failures | JWT RS256, short expiry, rate limiting |
| A08 | Software Integrity | Lock files committed, no unverified CDN |
| A09 | Logging Failures | Structured logs, no PII, request IDs |
| A10 | SSRF | No server-side URL fetching from user input |
