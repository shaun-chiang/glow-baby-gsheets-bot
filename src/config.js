import "dotenv/config"
import { readFileSync, existsSync } from "fs"

function required(key) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

const sheetId = required("SHEET_ID")
const serviceAccountKeyPath = required("GOOGLE_SERVICE_ACCOUNT_KEY_PATH")

if (!existsSync(serviceAccountKeyPath)) {
  throw new Error(
    `Service account key file not found at ${serviceAccountKeyPath}. ` +
    "Download the JSON key from Google Cloud Console and place it there, " +
    "or set GOOGLE_SERVICE_ACCOUNT_KEY_PATH to the correct path."
  )
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountKeyPath, "utf-8"))

export const config = {
  botToken: required("BOT_TOKEN"),
  timezone: process.env.TIMEZONE || "UTC",
  sheetId,
  serviceAccount,
}
