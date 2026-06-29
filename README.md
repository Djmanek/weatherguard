# WeatherGuard Admin

A secure, invite-only weather alert service connecting a React admin dashboard to a Telegram bot.

---

## System Design

### Database Schema (MongoDB)

**`users` collection**

| Field | Type | Description |
|---|---|---|
| `displayName` | String | From OAuth provider |
| `email` | String | From OAuth provider |
| `provider` | `"google" \| "github"` | OAuth provider used |
| `providerId` | String | Provider's unique user ID |
| `status` | `"pending" \| "approved" \| "rejected"` | Access state |
| `role` | `"user" \| "admin"` | Admin determined by `ADMIN_EMAIL` env var |
| `telegramChatId` | String \| null | Set when user links Telegram via bot |
| `city` | String \| null | User's alert city (set via `/setcity` in bot) |
| `avatarUrl` | String \| null | Profile picture from OAuth |
| `createdAt` | Date | Mongoose timestamp |

**`alert_logs` collection** *(future — for audit trail)*

| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId | Ref to users |
| `message` | String | Alert content sent |
| `sentAt` | Date | Delivery timestamp |

---

## Data Flow

### Authentication
```
User → Google/GitHub OAuth → NestJS Passport strategy
     → findOrCreate() in MongoDB
     → JWT issued → stored in localStorage
     → redirected to /dashboard or /admin
```

### Access Request & Approval
```
User signs in → status = "pending" (default)
Admin logs in → GET /admin/users/pending
Admin clicks Approve → PATCH /admin/users/:id/status { status: "approved" }
  → UsersService.updateStatus()
  → If telegramChatId set: TelegramService.sendApprovalNotification()
```

### Ensuring Only Approved Users Receive Alerts
```
node-cron fires every hour (0 * * * *)
  → AlertsService.dispatchAlerts()
  → UsersService.findApprovedWithTelegram()
      Query: { status: "approved", telegramChatId: { $ne: null } }
  → For each user:
      → AlertsService.fetchWeather(user.city ?? "London")
      → TelegramService.sendWeatherAlert(user.telegramChatId, message)
```

The gate is enforced at two levels:
1. **Status check** — only `approved` users are queried
2. **Telegram check** — only users who have linked their Telegram receive messages

### Telegram Account Linking
```
User visits /dashboard → GET /users/telegram-link
  → Returns t.me/weatherguard_bot?start=<base64(userId)>
User taps link → opens Telegram bot
Bot receives /start <token>
  → Decodes base64 → userId
  → UsersService.setTelegramChatId(userId, chatId)
  → Confirms linking in chat
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS (modular), TypeScript |
| Auth | Passport.js — Google OAuth2, GitHub OAuth2, JWT |
| Database | MongoDB via Mongoose |
| Scheduling | node-cron (hourly weather alerts) |
| Weather | OpenWeatherMap API |
| Notifications | node-telegram-bot-api |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack Query (React Query) |
| Deployment | Render (API) + Vercel (Admin) |

---

## Project Structure

```
weatherguard/
├── api/                          # NestJS backend
│   └── src/
│       ├── auth/                 # OAuth strategies + JWT
│       │   ├── auth.controller.ts
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts
│       │   ├── google.strategy.ts
│       │   ├── github.strategy.ts
│       │   └── jwt.strategy.ts
│       ├── users/                # User schema + CRUD
│       │   ├── user.schema.ts
│       │   ├── users.service.ts
│       │   ├── users.controller.ts
│       │   └── users.module.ts
│       ├── admin/                # Admin-only endpoints
│       │   ├── admin.controller.ts
│       │   └── admin.module.ts
│       ├── alerts/               # Cron + weather dispatch
│       │   ├── alerts.service.ts
│       │   ├── alerts.controller.ts
│       │   └── alerts.module.ts
│       ├── telegram/             # Bot service
│       │   ├── telegram.service.ts
│       │   └── telegram.module.ts
│       ├── common/
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── admin.guard.ts
│       │   └── decorators/
│       │       └── current-user.decorator.ts
│       ├── app.module.ts
│       └── main.ts
│
└── admin/                        # React frontend
    └── src/
        ├── pages/
        │   ├── LoginPage.tsx     # Google + GitHub login
        │   ├── AuthCallback.tsx  # Token capture + routing
        │   ├── DashboardPage.tsx # User status + Telegram link
        │   └── AdminDashboard.tsx# User table + approve/reject
        ├── components/
        │   └── ProtectedRoute.tsx
        ├── hooks/
        │   └── useAuth.ts
        ├── lib/
        │   └── api.ts            # Axios instance + interceptors
        └── App.tsx
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/google` | — | Initiate Google OAuth |
| GET | `/auth/github` | — | Initiate GitHub OAuth |
| GET | `/users/me` | JWT | Current user profile |
| GET | `/users/telegram-link` | JWT | Get Telegram deep-link |
| GET | `/admin/me` | JWT + Admin | Admin profile check |
| GET | `/admin/users` | JWT + Admin | All users |
| GET | `/admin/users/pending` | JWT + Admin | Pending requests |
| PATCH | `/admin/users/:id/status` | JWT + Admin | Approve / reject |
| POST | `/alerts/dispatch` | JWT + Admin | Manually trigger alerts |
| GET | `/alerts/preview/:city` | JWT + Admin | Preview weather data |

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- OpenWeatherMap API key ([openweathermap.org](https://openweathermap.org/api))
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))
- GitHub OAuth App ([github.com/settings/developers](https://github.com/settings/developers))

### 1. Clone & install

```bash
git clone https://github.com/yourusername/weatherguard
cd weatherguard

cd api && npm install
cd ../admin && npm install
```

### 2. Configure environment

**`api/.env`** (copy from `.env.example`):
```env
PORT=3000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/weatherguard
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

TELEGRAM_BOT_TOKEN=...
OPENWEATHER_API_KEY=...
ADMIN_EMAIL=your@email.com        # This email gets admin role on first login
```

**`admin/.env`**:
```env
VITE_API_URL=http://localhost:3000
```

### 3. Run locally

```bash
# Terminal 1 — API
cd api
npm run start:dev

# Terminal 2 — Admin
cd admin
npm run dev
```

Open http://localhost:5173

### 4. First-time setup

1. Sign in with the email matching `ADMIN_EMAIL` — you'll be routed to `/admin` automatically
2. Other users sign in → land on `/dashboard` with `pending` status
3. Admin reviews requests at `/admin`, clicks **Approve**
4. Approved users link Telegram via the dashboard button, then set city with `/setcity <city>` in the bot

### 5. Deploy

**API → Render**
- Connect GitHub repo, set root to `/api`
- Build: `npm run build`, Start: `node dist/main.js`
- Add all env vars in Render dashboard

**Admin → Vercel**
- Connect GitHub repo, set root to `/admin`
- Framework: Vite, Build: `npm run build`, Output: `dist`
- Add `VITE_API_URL=https://your-api.onrender.com`

---

## Telegram Bot Commands

| Command | Description |
|---|---|
| `/start <token>` | Link Telegram account (via dashboard button) |
| `/setcity <city>` | Set your weather alert city (e.g. `/setcity Mumbai`) |

---

## Architecture Notes

**Why JWT over sessions?** Stateless — no Redis needed, scales horizontally, works cleanly across Vercel + Render.

**Why node-cron over BullMQ?** The task is a simple hourly broadcast with no retry queue requirements. BullMQ adds Redis as a dependency; node-cron is sufficient and keeps the stack lighter.

**Admin seeding strategy:** The first user whose OAuth email matches `ADMIN_EMAIL` gets `role: admin` and `status: approved` on creation. No seed script or manual DB edit required.
