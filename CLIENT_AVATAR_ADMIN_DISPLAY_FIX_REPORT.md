# CLIENT_AVATAR_ADMIN_DISPLAY_FIX_REPORT

## Root Cause

The admin dashboard (`ClientsSection.tsx`) was rendering `client.avatar_url` directly
as an `<img src={client.avatar_url}>`.

However, the avatar upload pipeline stores a **private storage path** in the database
(e.g. `abc123/avatars/1748000000-photo.jpg`), not a public URL. The bucket
`client-assets` is private, so a bare path is not a valid image URL and the browser
shows a broken-image icon.

The client-facing profile page (`ClientProfilePage.tsx`) correctly resolves the path
to a signed URL via `profileService.getAvatarUrl(path)` before rendering. The admin
dashboard was missing this step entirely.

Secondary issue: `profileService.getAvatarUrl()` did not explicitly reject `blob:`
and `file:` URLs. These can appear in `avatar_url` when a developer accidentally
saves a local preview URL instead of the storage path. Adding rejection for those
ensures they fall through to the initials fallback.

---

## How Avatar Upload Is Stored

| Upload path | What is saved to DB |
|-------------|---------------------|
| `ClientProfilePage.tsx → handleAvatarChange` | Storage **path** only (e.g. `<uid>/avatars/<ts>-<name>.jpg`) |
| `ProfileHero.tsx → onAvatarFileChosen` (test view only) | 1-year signed URL |

The main production flow saves the path. `profileService.uploadAvatar()` returns both
`{ path, url }`. Only `path` is persisted; `url` is used for immediate local display.

---

## Files Changed

### 1. `src/services/profileService.ts`

**Change:** Extended the guard block in `getAvatarUrl` to also reject `blob:` and
`file:` URLs and `http://localhost` URLs.

```ts
// Before
if (/^https?:\/\//i.test(trimmed)) return null;

// After
if (/^(blob:|file:)/i.test(trimmed)) return null;
if (/^https?:\/\/localhost/i.test(trimmed)) return null;
if (/^https?:\/\//i.test(trimmed)) return null;
```

**Why:** `blob:` URLs are session-local object URLs that cannot be resolved outside
the uploading browser tab. `file:` and `http://localhost` URLs are similarly invalid
in any other context. All return `null` → caller shows initials fallback.

---

### 2. `src/features/admin/sections/ClientsSection.tsx`

**Change 1 – Import:** Added `profileService` import.

**Change 2 – New component:** Added `ClientAvatar` component before `ClientCard`.

```tsx
function ClientAvatar({ path, initial, textSize = 'text-lg' }) {
  const [src, setSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setImgError(false);
    void profileService.getAvatarUrl(path).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [path]);

  // Show initials while loading, on null URL, or on image load error
  if (!src || imgError) return <InitialsBadge />;

  return <img src={src} onError={() => setImgError(true)} />;
}
```

**Change 3 – ClientCard** (was lines 233–237): replaced `{client.avatar_url ? <img ...> : <initials>}` with `<ClientAvatar path={client.avatar_url} initial={initial} />`.

**Change 4 – ClientDetailDrawer hero** (was lines 371–377): same replacement with `textSize="text-2xl"`.

---

## How the Admin Dashboard Now Resolves Signed URLs

1. Admin opens `/lumos-admin` → `ClientsSection` renders client cards.
2. Each `ClientCard` mounts a `ClientAvatar` with `path={client.avatar_url}`.
3. `ClientAvatar` calls `profileService.getAvatarUrl(path)` on mount.
4. `getAvatarUrl` calls `supabase.storage.from('client-assets').createSignedUrl(path, 3600)`.
5. The signed URL is set in local state and rendered as `<img src={signedUrl}>`.
6. If the signed URL cannot be generated (path invalid, RLS blocks, bucket missing),
   `getAvatarUrl` returns `null` → initials fallback renders instead.
7. If the image fails to load after the URL is set, `onError` sets `imgError = true`
   → initials fallback renders, no broken image icon.

Signed URLs are **never** written back to the database; they are ephemeral (1-hour TTL)
and generated fresh on each render/mount.

---

## Fallback Behavior

| Condition | Result |
|-----------|--------|
| `avatar_url` is null / empty | Initials (colored badge) |
| `avatar_url` starts with `blob:` | Initials |
| `avatar_url` starts with `file:` | Initials |
| `avatar_url` starts with `http://localhost` | Initials |
| `avatar_url` is any other `https?://` (old signed URL) | Initials |
| `avatar_url` is a valid storage path, signed URL resolves | Image |
| Image resolves but fails to load (`onError`) | Initials |

Cover images in admin use `client.cover_gradient` (a CSS gradient string). No image
URL is rendered for cover in the admin dashboard, so no fix was needed there.

---

## Commands Run

```bash
npm run lint       # 0 errors, 10 pre-existing warnings (unchanged)
npx tsc --noEmit   # 0 errors
npm run build      # ✓ built successfully
```

---

## Manual Test Checklist

- [ ] Open `/lumos-admin` → Clients tab.
- [ ] Client with a previously uploaded avatar now shows the avatar image (not broken icon).
- [ ] Client without an avatar shows colored initials badge.
- [ ] Open a client's detail drawer → avatar in hero section shows signed image or initials.
- [ ] Temporarily set `avatar_url` to `blob:...` in DB → admin shows initials, no broken image.
- [ ] Temporarily set `avatar_url` to `http://localhost/foo` → admin shows initials.
- [ ] Upload a new avatar from `/profile` → immediately visible in admin after page refresh.
- [ ] Signed URLs refresh on each admin page load (no stale URLs shown).
- [ ] Cover gradient in client card and drawer is unaffected.
- [ ] Language toggle (EN/AR) still works throughout admin.
- [ ] Pricing modal still opens on the home page.
