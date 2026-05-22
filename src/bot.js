import { Telegraf } from "telegraf"
import { config } from "./config.js"
import { writeEntry } from "./store.js"

const bot = new Telegraf(config.botToken)

function localTimestamp() {
  return new Date().toLocaleString("sv-SE", { timeZone: config.timezone })
}

bot.command("feed", async (ctx) => {
  const time = localTimestamp()
  writeEntry({ timestamp: time, type: "feed" })
  await ctx.reply(`✅ Feed logged at ${time}`)
})

bot.command("diaper", async (ctx) => {
  const time = localTimestamp()
  const detail = ctx.message.text.split(" ").slice(1).join(" ") || ""
  writeEntry({ timestamp: time, type: "diaper", detail })
  await ctx.reply(`✅ Diaper logged at ${time}${detail ? ` (${detail})` : ""}`)
})

bot.command("start", (ctx) =>
  ctx.reply(
    "👶 Baby Tracker Bot\n\n/feed — log a feed\n/diaper [type] — log a diaper (e.g. /diaper wet)"
  )
)

export function launchBot() {
  bot.launch()
  console.log("Bot started")
}

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
