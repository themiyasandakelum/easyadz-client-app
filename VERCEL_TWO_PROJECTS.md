# Deploy User + Admin as Separate Vercel Projects

Two deployments from the same repo = separate URLs = separate Firebase sessions. No more "stuck" when logged in as both.

---

## Step 1: Create two Vercel projects

### Project 1 – User app
1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import your GitHub repo
3. **Project Name:** `easyadz` (or `matrimonial`)
4. **Root Directory:** `.` (leave default)
5. **Environment Variables:** Add all your env vars (Firebase, Supabase, etc.)
6. Deploy

**URL:** `easyadz.vercel.app` (or your custom domain)

---

### Project 2 – Admin app
1. **Add New** → **Project**
2. Import the **same** GitHub repo
3. **Project Name:** `easyadz-admin` (or `matrimonial-admin`)
4. **Root Directory:** `.` (same)
5. **Environment Variables:** Same as Project 1, **plus** add:
   - `NEXT_PUBLIC_IS_ADMIN` = `true`
6. Deploy

**URL:** `easyadz-admin.vercel.app`

---

## Step 2: Firebase authorized domains

Firebase Console → Authentication → Settings → Authorized domains → Add:

- `easyadz.vercel.app`
- `easyadz-admin.vercel.app`
- Your custom domains (e.g. `easyadz.lk`, `admin.easyadz.lk`)

---

## Step 3: Custom domains (optional)

### User project
- Add `easyadz.lk` and `www.easyadz.lk`

### Admin project
- Add `admin.easyadz.lk`

The middleware will redirect `admin.easyadz.lk/` → `admin.easyadz.lk/admin`.

---

## Result

| App   | URL                         | Firebase session |
|-------|-----------------------------|------------------|
| User  | `easyadz.vercel.app`        | Separate         |
| Admin | `easyadz-admin.vercel.app`  | Separate         |

You can stay logged in as user and admin at the same time in different tabs.
