# Mateo Cruz — Autonomous Cinematic YouTube Video Studio

> "Enter one idea. Get a complete original long-form cinematic YouTube video."

## What This Is

Mateo Cruz is a fully automated long-form YouTube video production system powered by AI. It takes a single text prompt and produces a complete, monetization-safe cinematic video (10–60 minutes) featuring a consistent avatar character named **Mateo Cruz** — a heavyset Hispanic man with an American accent and a deep, emotional storytelling voice.

This is not a "random AI video generator." It is a **psychological storytelling engine** designed to produce original cinematic content in the style of emotionally powerful narrative YouTube channels.

---

## Key Features

- **One-prompt video generation** — describe an idea, get a full cinematic video
- **Consistent avatar** — Mateo Cruz appears across all videos with locked visual identity
- **Long-form output** — 10 to 60+ minute videos with structured story arcs
- **Full pipeline automation** — script → scenes → images → video → voiceover → music → SFX → subtitles → YouTube package
- **Character brain** — long-term memory across videos so the character evolves over time
- **Monetization-safe** — quality gate checks originality, repetition, advertiser safety, and copyright risk before export
- **YouTube-ready export** — title, description, chapters, thumbnail, tags, and transcript auto-generated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes / NestJS workers |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Queue | BullMQ + Redis |
| Storage | Cloudflare R2 / AWS S3 |
| AI Script | OpenAI GPT-4o / Claude |
| AI Voice | ElevenLabs API |
| AI Images | Flux / Stable Diffusion XL |
| AI Video | Runway Gen-4, Luma Dream Machine, Kling |
| AI Music | Suno API / licensed stock |
| Video Edit | FFmpeg (server-side workers) |
| Subtitles | Whisper / script-synced SRT |

---

## Project Structure

```
mateo-cruz/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── dashboard/      # Project dashboard
│   │   │   ├── projects/       # Project pages
│   │   │   ├── avatars/        # Avatar management
│   │   │   ├── billing/        # Credits & billing
│   │   │   └── api/            # API routes
│   │   └── components/
│   └── worker/                 # Background job workers
│       └── src/
│           ├── jobs/           # Individual pipeline jobs
│           ├── services/       # AI & infrastructure services
│           ├── prompts/        # AI prompt templates
│           ├── queues/         # BullMQ queue setup
│           ├── render/         # FFmpeg render engine
│           └── validators/     # Output validators
├── packages/
│   ├── database/               # Prisma schema & migrations
│   └── shared/                 # Types, constants, utils
└── docker-compose.yml
```

---

## Video Generation Pipeline

```
User Prompt
    ↓
Prompt Safety + Niche Classification
    ↓
Story Concept Generator
    ↓
Title + Angle Generator
    ↓
Long-Form Outline (Acts 1–5)
    ↓
Full Script (3,000–9,500 words)
    ↓
Chapter Breakdown
    ↓
Scene Breakdown (6–10s per scene)
    ↓
Avatar + Character Engine injection
    ↓
Keyframe Image Generation (Flux/SDXL)
    ↓
Image-to-Video Animation (Runway/Luma)
    ↓
Voiceover Generation (ElevenLabs)
    ↓
Background Music Generation
    ↓
Sound Effects Layer
    ↓
Subtitle Generation
    ↓
FFmpeg Assembly & Render
    ↓
Monetization Quality Gate
    ↓
YouTube Package Export (title, description, chapters, thumbnail, tags)
    ↓
Final MP4
```

---

## Avatar: Mateo Cruz

Mateo Cruz is the persistent digital character used across all videos:

- **Appearance**: Heavyset Hispanic man, ~30–35 years old, short dark hair, tired eyes, subtle beard, dark hoodie
- **Voice**: American accent, deep and slightly raspy, slow emotional pacing, controlled intensity
- **Personality**: Introspective, observant, speaks like confessing something — not dramatic but heavy
- **Theme**: Psychological struggles, internal conflict, symbolic storytelling
- **Channel**: Inside Mateo Cruz / @MateoCruz

The Character Brain system ensures:
- Same visual identity across every scene (via reference image injection)
- Same voice across every video (locked ElevenLabs voice ID)
- Long-term memory — each video references past events and evolves the character
- Emotional state transitions per scene

---

## Narrative Formula

Every generated video follows this cinematic structure (inspired by high-retention psychological storytelling):

1. **Hook (0–10s)** — confusing or unsettling opening
2. **Setup (0:45–3min)** — introduce environment and emotional state
3. **First Disturbance** — the phenomenon appears
4. **Escalation** — character tries to ignore it, it gets worse
5. **Reality Break** — something that shouldn't be possible happens
6. **Internal Tension** — emotional confrontation
7. **Climax** — peak psychological moment
8. **Unresolved Ending** — no clean resolution (mirrors real mental experience)

---

## Monetization Quality Gate

Before export, every video is automatically scored:

| Check | Threshold |
|---|---|
| Originality score | ≥ 70% |
| Scene variety | ≥ 8 unique environments |
| Script repetition | ≤ 30% |
| Voiceover present | Required |
| Hook quality | First 30s rated |
| Copyright risk | Pass required |
| Advertiser safety | Pass required |
| AI disclosure needed | Flagged if yes |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Redis + PostgreSQL locally)
- API keys: OpenAI, ElevenLabs, Runway, Replicate, Cloudflare R2

### Installation

```bash
git clone https://github.com/customerservice-prog/Mateo-Cruz.git
cd mateo-cruz
npm install
cp .env.example .env
# Fill in your API keys in .env
docker-compose up -d
npx prisma migrate dev
npm run dev
```

### Environment Variables

See `.env.example` for all required environment variables.

---

## Roadmap

- [x] Core pipeline architecture
- [x] Database schema
- [x] Avatar character system
- [x] Script + scene generation
- [x] Image generation with character lock
- [x] FFmpeg render engine
- [x] Quality gate
- [ ] Full animated video clips (Runway integration)
- [ ] Long-term character memory
- [ ] Auto YouTube upload
- [ ] Multi-channel support
- [ ] SaaS billing system

---

## License

MIT
