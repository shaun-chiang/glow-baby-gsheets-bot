import { appendFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, "..", "data", "entries.jsonl")

export function writeEntry(entry) {
  appendFileSync(DATA_FILE, JSON.stringify(entry) + "\n")
  return entry
}
