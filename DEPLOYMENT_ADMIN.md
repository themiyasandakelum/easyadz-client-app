# Admin + User: Separate Sessions (No More "Stuck")

When logged in as both User and Admin at the same time, the app can get stuck because they share one Firebase session. Use **separate origins** so each has its own session.

---

## Vercel: Two separate projects (recommended)

See **[VERCEL_TWO_PROJECTS.md](./VERCEL_TWO_PROJECTS.md)** for step-by-step setup.

- **User project:** `easyadz.vercel.app`
- **Admin project:** `easyadz-admin.vercel.app` (set `NEXT_PUBLIC_IS_ADMIN=true`)

---

## Alternative: One project, subdomains

| App   | URL                  |
|-------|----------------------|
| User  | `easyadz.lk`         |
| Admin | `admin.easyadz.lk`   |

Add both domains to the same Vercel project. Add to Firebase authorized domains.

---

## Local development: Use different ports

```bash
# Terminal 1 – User app
npm run dev

# Terminal 2 – Admin app
npm run dev -- -p 4000
```

- User: http://localhost:3000  
- Admin: http://localhost:4000  

Different ports = different origins = separate Firebase sessions.

---

## Quick reference

- **Local:** `npm run dev` (user) + `npm run dev:admin` (admin on port 4000)
- **Production:** `easyadz.lk` (user) + `admin.easyadz.lk` (admin)
