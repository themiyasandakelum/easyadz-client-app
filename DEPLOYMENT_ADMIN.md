# Admin + User: Separate Sessions (No More "Stuck")

When logged in as both User and Admin at the same time, the app can get stuck because they share one Firebase session. Use **separate origins** so each has its own session.

---

## Production: Use Subdomains

| App   | URL                  | Firebase session |
|-------|----------------------|------------------|
| User  | `easyadz.lk` or `app.easyadz.lk` | Separate |
| Admin | `admin.easyadz.lk`   | Separate         |

### 1. Add admin subdomain in your hosting (Vercel, etc.)

- Add `admin.easyadz.lk` as a domain
- Point it to the same project as your main app

### 2. Add to Firebase authorized domains

1. Firebase Console → Authentication → Settings
2. Authorized domains → Add domain
3. Add `admin.easyadz.lk` (and `easyadz.lk` if not already there)

### 3. DNS

Add a CNAME or A record for `admin.easyadz.lk` pointing to your host.

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
