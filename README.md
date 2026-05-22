# glow-baby-gsheets-bot

Telegram bot for tracking baby feeds and diaper changes. Runs locally and logs to a JSONL file — Google Sheets integration TBD.

## Commands

- `/feed` — log a feed
- `/diaper [type]` — log a diaper (e.g. `/diaper wet`, `/diaper poopy`)
- `/start` — show help

## Setup

```
cp .env.example .env
# fill in BOT_TOKEN
npm install
npm start
```

Data is stored in `data/entries.jsonl`.
