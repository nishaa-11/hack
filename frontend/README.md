# CivicPulse Frontend (Expo)

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env` and set values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL`

`EXPO_PUBLIC_API_URL` should point to the backend API root:

- Android emulator: `http://10.0.2.2:3001/api/v1`
- iOS simulator/web: `http://localhost:3001/api/v1`
- Physical device: `http://<YOUR_LOCAL_IP>:3001/api/v1`

## 3) Start backend first

From `backend/`:

```bash
npm install
npm run dev
```

## 4) Start frontend

From `frontend/`:

```bash
npm run start
```

## Connected screens

The following tabs are connected to backend endpoints using `frontend/lib/api.ts`:

- `Profile` → `/profiles/me`, `/profiles/me/impact`, `/profiles/me/badges`, `/reports/mine`, `/rewards/me`
- `Challenges` → `/challenges`, `/challenges/me`, `/challenges/:id/join`, `/challenges/:id/progress`
- `Ranks` → `/leaderboard`
- `Report` → `/categories`, `/locations/wards`, `POST /reports`

All API calls include the active Supabase access token in `Authorization: Bearer <token>`.
