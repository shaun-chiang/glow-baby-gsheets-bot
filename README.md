# glow-baby-bot

A Telegram bot that brings the Glow Baby experience to chat. Log feeds and diaper changes right from Telegram — quick `/feed 120` or step through the interactive diaper wizard.

## Commands

- `/feed [ml] [@datetime] [note]` — log a feed (e.g. `/feed 120 @14:30`)
- `/diaper` — log a diaper (interactive wizard: pee, poop, color, texture)
- `/skip` — skip optional wizard step
- `/cancel` — cancel current input
- `/start` — show help

## Setup

### 1. Create your Google Sheet

1. Go to https://sheets.new to create a new Google Sheet
2. Copy the **Sheet ID** from the URL — it's the long hash in `/spreadsheets/d/THIS_PART/`
3. The sheet will be auto-populated with these columns:

```
ts,date,time,type,amount,pee,poop,poop_color,poop_texture,note
```

### 2. Create a Service Account

1. Go to https://console.cloud.google.com/apis/credentials
2. Click **Create Credentials** → **Service Account**
3. Give it a name (e.g. "glow-baby-bot") and click **Done**
4. Click on the service account, go to **Keys** → **Add Key** → **Create New Key** → **JSON**
5. Download the JSON key file and save it as `service-account-key.json` in this project root
6. Copy the **Email** from the service account details page
7. Share your Google Sheet with that email address as **Editor**

### 3. Configure

```
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `TIMEZONE` | e.g. `Asia/Shanghai`, `America/New_York` (default: UTC) |
| `SHEET_ID` | The Google Sheet ID from step 1 |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to your JSON key file (default: `./service-account-key.json`) |

### 4. Run

```
npm install
npm start
```

## Data Storage

- **Google Sheets** — each entry is appended as a new row (primary storage)
- **`data/entries.jsonl`** — local JSONL backup (one JSON object per line)
