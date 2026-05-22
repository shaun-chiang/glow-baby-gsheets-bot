import "dotenv/config"

function required(key) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export const config = {
  botToken: required("BOT_TOKEN"),
  timezone: process.env.TIMEZONE || "UTC",
}
