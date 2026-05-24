# SpeakUp 🎙️ — MVP

> Daily Communication & Career Coach for Engineering Students

## 🚀 Features
- 📖 **AI Vocabulary** — Claude generates 5 fresh words daily with Tamil meanings
- ✍️ **Writing Practice** — Real Claude AI feedback on clarity, grammar, vocabulary
- 🔤 **Grammar Exercises** — Fill-in-the-blank with instant tips
- 📰 **Reading Comprehension** — Passage + 3 questions
- 🎙️ **Accent Training** — Shadowing, sound drills, word stress, rhythm
- 💼 **Interview Prep** — Mock AI interviewer with Claude feedback
- 📅 **Streak Calendar** — Tracks daily completion 2025–2029
- 🔐 **Real Auth** — Supabase email/password + Google OAuth
- 💾 **Real Database** — Progress, streaks, XP all saved to Supabase

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js + Express |
| Database & Auth | Supabase (PostgreSQL) |
| AI | Anthropic Claude API |
| Hosting | Vercel |

## ⚙️ Setup Guide

### 1. Clone the repo
```bash
git clone https://github.com/AjithZen-Zone/SpeakUp.git
cd SpeakUp
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **SQL Editor** → paste the full contents of `supabase_schema.sql` → Run
3. Go to **Authentication → Providers** → enable Google OAuth
4. Copy your **Project URL** and **anon key** from Settings → API

### 3. Set up Anthropic API
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 4. Configure environment
```bash
cp .env.example .env
```
Fill in your `.env`:
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Update frontend config
In `public/index.html`, find these lines and replace:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 6. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 7. Deploy to Vercel
```bash
npm install -g vercel
vercel
# Follow prompts, add env vars in Vercel dashboard
```

## 📁 Project Structure
```
SpeakUp/
├── server.js              # Express backend + API routes
├── package.json
├── vercel.json            # Vercel deployment config
├── supabase_schema.sql    # Full DB schema — run in Supabase
├── .env.example           # Environment variables template
└── public/
    └── index.html         # Full frontend app
```

## 🔑 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/vocab/generate` | Generate 5 AI vocab words |
| POST | `/api/writing/feedback` | Get Claude AI writing feedback |
| POST | `/api/interview/feedback` | Get Claude AI interview feedback |
| POST | `/api/tasks/daily` | Generate today's task set |
| POST | `/api/streak/update` | Update user streak |
| GET | `/api/progress/:user_id` | Get user progress history |

## 🗄️ Database Tables
- `profiles` — user info, streak, XP, level
- `progress` — daily module completions
- `vocab_log` — words each user has learned
- `writing_log` — writing submissions + scores
- `daily_tasks` — cached daily task sets

## 📱 Coming Soon
- [ ] Mobile app (React Native)
- [ ] Push notifications for daily reminders
- [ ] Leaderboard with friends
- [ ] AI-generated reading passages
- [ ] Voice recording + analysis

---
Built with ❤️ using Claude AI by Anthropic
