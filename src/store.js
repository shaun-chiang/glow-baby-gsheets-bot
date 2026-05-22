import { appendFileSync, existsSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, "..", "data")
const JSONL_FILE = join(DATA_DIR, "entries.jsonl")
const CSV_FILE = join(DATA_DIR, "entries.csv")

const CSV_HEADER = "ts,date,time,type,amount,pee,poop,poop_color,poop_texture,note\n"

if (!existsSync(CSV_FILE)) {
  writeFileSync(CSV_FILE, CSV_HEADER)
}

function toCsvValue(val) {
  if (val === null || val === undefined) return ""
  const s = String(val)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsvRow(entry) {
  const fields = ["ts", "date", "time", "type", "amount", "pee", "poop", "poop_color", "poop_texture", "note"]
  return fields.map(f => toCsvValue(entry[f])).join(",") + "\n"
}

export function writeEntry(entry) {
  const jsonl = JSON.stringify(entry) + "\n"
  const csv = toCsvRow(entry)
  appendFileSync(JSONL_FILE, jsonl)
  appendFileSync(CSV_FILE, csv)
  return entry
}
