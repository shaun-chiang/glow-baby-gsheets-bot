# glow-baby-gsheets-bot

Replaces the paywalled Glow Baby app with a Telegram bot that logs feeds and diaper changes. Entries are stored locally in a JSONL format designed to map onto Glow Baby's CSV export schema — once we have the export file, rows will be pushed to Google Sheets in the same shape.

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
