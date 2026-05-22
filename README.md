# glow-baby-bot

A Telegram bot that brings the Glow Baby experience to chat. Log feeds and diaper changes right from Telegram — quick `/feed 120` or step through the interactive diaper wizard.

## Commands

- `/feed [ml] [@datetime] [note]` — log a feed (e.g. `/feed 120 @14:30`)
- `/diaper` — log a diaper (interactive wizard: pee, poop, color, texture)
- `/skip` — skip optional wizard step
- `/cancel` — cancel current input
- `/start` — show help

## Setup

```
cp .env.example .env
# fill in BOT_TOKEN and TIMEZONE
npm install
npm start
```

Data is stored in `data/entries.jsonl` and `data/entries.csv`.
