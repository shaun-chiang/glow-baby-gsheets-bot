import { appendFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { JWT } from "google-auth-library"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { config } from "./config.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, "..", "data")
const JSONL_FILE = join(DATA_DIR, "entries.jsonl")

const HEADERS = ["ts", "date", "time", "type", "amount", "pee", "poop", "poop_color", "poop_texture", "note"]

let sheet = null

async function initSheet() {
  const auth = new JWT({
    email: config.serviceAccount.client_email,
    key: config.serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const doc = new GoogleSpreadsheet(config.sheetId, auth)
  await doc.loadInfo()

  let target = doc.sheetsByIndex[0]
  if (!target) {
    target = await doc.addSheet({ title: "Entries", headerValues: HEADERS })
    sheet = target
    return
  }

  try {
    await target.loadHeaderRow()
    const existing = [...target.headerValues]
    const hasAll = HEADERS.every(h => existing.includes(h))
    if (!hasAll) {
      await target.setHeaderRow(HEADERS)
    }
  } catch {
    await target.setHeaderRow(HEADERS)
  }

  sheet = target
}

export async function writeEntry(entry) {
  const jsonl = JSON.stringify(entry) + "\n"
  appendFileSync(JSONL_FILE, jsonl)

  if (sheet) {
    try {
      const row = HEADERS.map(f => entry[f] ?? "")
      await sheet.addRow(row)
    } catch (err) {
      console.error("Failed to write to Google Sheet:", err.message)
    }
  }
}

export async function initStore() {
  try {
    await initSheet()
    console.log("Google Sheets connected")
  } catch (err) {
    console.error("Google Sheets init failed, data will only be saved locally:", err.message)
  }
}
