# 🎮 EduPlay — Gamified Learning Platform

Piattaforma di apprendimento gamificata per corsi di Digital Marketing, AI e Sales.

## Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Web Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Mobile | React Native + Expo |
| Backend | Supabase (PostgreSQL + pgvector + Auth) |
| AI Tutor | Ollama (self-hosted) + LangChain + RAG |
| Email | Resend |
| Push | OneSignal |
| Pagamenti | Stripe |
| Automazioni | n8n (self-hosted) |
| Video | YouTube Unlisted |
| Deploy | Vercel (web) + EAS (mobile APK) |
| Monorepo | Turborepo + pnpm workspaces |

## Struttura del Progetto

```
eduplay/
├── apps/
│   ├── web/          # Next.js 14 App Router
│   └── mobile/       # Expo React Native
├── packages/
│   ├── types/        # TypeScript types + Database types
│   └── utils/        # Utility functions condivise
├── supabase/
│   └── migrations/   # SQL migrations
└── .github/
    └── workflows/    # CI/CD
```

## Setup Locale

### Prerequisiti

- Node.js 20+
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Ollama](https://ollama.com) (per AI Tutor)

### 1. Clona il repository

```bash
git clone https://github.com/TUO-USERNAME/eduplay.git
cd eduplay
```

### 2. Installa le dipendenze

```bash
pnpm install
```

### 3. Configura le variabili d'ambiente

```bash
cp .env.example apps/web/.env.local
```

Compila `.env.local` con i tuoi valori Supabase, Stripe, Resend, ecc.

### 4. Applica le migrazioni Supabase

```bash
# Avvia Supabase locale
supabase start

# Applica le migrazioni
supabase db push
```

### 5. Avvia in sviluppo

```bash
# Web
pnpm web         # http://localhost:3000

# Mobile (in un secondo terminale)
pnpm mobile      # Expo Dev Server
```

## Gamification

| Meccanica | Descrizione |
|-----------|-------------|
| XP Points | Guadagnati completando lezioni e quiz |
| 6 Livelli | Novizio → Apprendista → Praticante → Esperto → Master → Guru |
| EduCoins | Valuta virtuale per il negozio |
| Badge | 19+ badge sbloccabili |
| Streak | Bonus per giorni consecutivi |
| Missioni | Sfide giornaliere e settimanali |
| Leaderboard | Classifica globale, per corso e settimanale |

## AI Agents (21 selezionati)

L'AI Tutor usa **Ollama** (Llama 3.1 8B) con RAG su **pgvector** per rispondere
alle domande degli studenti con contesto specifico per ogni corso.

## Corsi

- **Digital Marketing**: Base, Intermedio, Avanzato
- **Intelligenza Artificiale**: Base, Intermedio, Avanzato
- **Vendite**: Intermedio/Avanzato

## Deploy

### Web (Vercel)
```bash
vercel --prod
```

### Mobile APK (EAS Build)
```bash
cd apps/mobile
eas build --platform android --profile preview
```

## Variabili d'Ambiente

Vedi `.env.example` per la lista completa delle variabili necessarie.

---

Made with ❤️ by Simone
