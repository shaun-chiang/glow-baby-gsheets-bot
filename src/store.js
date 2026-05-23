import { JWT } from "google-auth-library"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { config } from "./config.js"

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
  if (!sheet) return

  try {
    const row = HEADERS.map(f => entry[f] ?? "")
    await sheet.addRow(row)
  } catch (err) {
    console.error("Failed to write to Google Sheet:", err.message)
  }
}

export async function readEntries(fromDate, toDate) {
  if (!sheet) return []

  try {
    const rows = await sheet.getRows()
    return rows
      .map(r => {
        const e = {}
        HEADERS.forEach(h => { e[h] = r.get(h) ?? "" })
        return e
      })
      .filter(e => e.date >= fromDate && e.date <= toDate)
      .sort((a, b) => a.ts.localeCompare(b.ts))
  } catch (err) {
    console.error("Failed to read from Google Sheet:", err.message)
    return []
  }
}

export async function initStore() {
  try {
    await initSheet()
    console.log("Google Sheets connected")
  } catch (err) {
    console.error("Google Sheets init failed:", err.message)
  }
}
