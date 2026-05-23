import { Telegraf } from "telegraf"
import { config } from "./config.js"
import { writeEntry, readEntries } from "./store.js"

const bot = new Telegraf(config.botToken)
const sessions = new Map()

function getSession(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, {})
  return sessions.get(chatId)
}

function clearSession(chatId) {
  sessions.delete(chatId)
}

function pad(n) {
  return String(n).padStart(2, "0")
}

function makeTimestamp(timeStr, fallbackDate) {
  const now = timeStr && timeStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})$/)
    ? new Date(`${timeStr.includes("T") ? timeStr : timeStr.replace(" ", "T")}:00`)
    : fallbackDate || new Date()
  if (timeStr && !timeStr.match(/^\d{4}-/)) {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      now.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0)
    }
  }
  const y = now.getFullYear()
  const mo = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const h = pad(now.getHours())
  const mi = pad(now.getMinutes())
  const ts = `${y}-${mo}-${d}T${h}:${mi}:00`
  const date = `${y}-${mo}-${d}`
  const time = `${h}:${mi}`
  return { ts, date, time }
}

function buildFeedEntry({ amount, note, time }, startedAt) {
  const { ts, date, time: tm } = makeTimestamp(time, startedAt)
  return { ts, date, time: tm, type: "feed", amount: amount || "", pee: "", poop: "", poop_color: "", poop_texture: "", note: note || "" }
}

function buildDiaperEntry({ pee, poop, poop_color, poop_texture, note, time }, startedAt) {
  const { ts, date, time: tm } = makeTimestamp(time, startedAt)
  return { ts, date, time: tm, type: "diaper", amount: "", pee: pee ? "yes" : "", poop: poop ? "yes" : "", poop_color: poop_color || "", poop_texture: poop_texture || "", note: note || "" }
}

function parseFeedInline(text) {
  let time = "", amount = "", note = text

  // Full datetime: 2026-05-22 14:30 or @2026-05-22T14:30
  const fullMatch = text.match(/(?:@)?(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})/)
  if (fullMatch) {
    time = fullMatch[1] + " " + fullMatch[2]
    note = note.replace(fullMatch[0], "").trim()
  } else {
    // Time only: @14:30 or 14:30
    const timeMatch = text.match(/(?:@)?(\d{1,2}:\d{2})/)
    if (timeMatch) {
      time = timeMatch[1]
      note = note.replace(timeMatch[0], "").trim()
    }
  }

  const amountMatch = note.match(/^(\d+)\s*/)
  if (amountMatch) {
    amount = amountMatch[1] + "ml"
    note = note.slice(amountMatch[0].length).trim()
  }
  return { amount, time, note }
}

function entrySummary(entry) {
  const lines = [`📅 ${entry.date} ${entry.time}`]
  if (entry.type === "feed") {
    lines[0] = `🍼 Feed ${lines[0]}`
    if (entry.amount) lines.push(`   Amount: ${entry.amount}`)
  } else {
    lines[0] = `🧷 Diaper ${lines[0]}`
    if (entry.pee) lines.push(`   💧 Pee`)
    if (entry.poop) lines.push(`   💩 Poop`)
    if (entry.poop_color) lines.push(`   Color: ${entry.poop_color}`)
    if (entry.poop_texture) lines.push(`   Texture: ${entry.poop_texture}`)
  }
  if (entry.note) lines.push(`   📝 ${entry.note}`)
  return lines.join("\n")
}

async function confirmAndSave(ctx, entry, fromWizard = false) {
  await writeEntry(entry)
  clearSession(ctx.chat.id)
  await ctx.reply(`✅ Logged\n${entrySummary(entry)}`)
  if (fromWizard) {
    await ctx.reply(buildShortcut(entry))
  }
}

function buildShortcut(entry) {
  if (entry.type === "feed") {
    let cmd = "/feed"
    if (entry.amount) cmd += ` ${entry.amount}`
    if (entry.time) cmd += ` @${entry.time}`
    if (entry.note) cmd += ` ${entry.note.includes(" ") ? `"${entry.note}"` : entry.note}`
    return cmd
  }

  let cmd = "/diaper"
  if (entry.pee) cmd += " --pee"
  if (entry.poop) cmd += " --poop"
  if (entry.poop_color) cmd += ` --color ${entry.poop_color}`
  if (entry.poop_texture) {
    const tex = entry.poop_texture
    cmd += ` --tex ${tex.includes(" ") ? `"${tex}"` : tex}`
  }
  if (entry.note) cmd += ` --note ${entry.note.includes(" ") ? `"${entry.note}"` : entry.note}`
  if (entry.time) cmd += ` @${entry.time}`
  return cmd
}

// ── Feed ──────────────────────────────────────────────

bot.command("feed", async (ctx) => {
  const text = ctx.message.text.slice("/feed".length).trim()
  if (text) {
    const parsed = parseFeedInline(text)
    const entry = buildFeedEntry(parsed)
    await confirmAndSave(ctx, entry)
    return
  }
  const s = getSession(ctx.chat.id)
  s.type = "feed"
  s.data = {}
  s.startedAt = new Date()
  s.step = "amount"
  await ctx.reply("How many ml?")
})

// ── Diaper ────────────────────────────────────────────

bot.command("diaper", async (ctx) => {
  const s = getSession(ctx.chat.id)
  s.type = "diaper"
  s.data = {}
  s.startedAt = new Date()
  s.step = "pee"
  await ctx.reply("Was there pee?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Yes", callback_data: "d:pee:yes" }],
        [{ text: "No", callback_data: "d:pee:no" }],
      ],
    },
  })
})

// ── Cancel ────────────────────────────────────────────

bot.command("cancel", (ctx) => {
  clearSession(ctx.chat.id)
  ctx.reply("Cancelled.")
})

bot.command("skip", (ctx) => advanceWizard(ctx))

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function timeAgo(date) {
  const diff = Math.round((Date.now() - date) / 60000)
  if (diff < 1) return "~1m"
  if (diff < 60) return `${diff}m`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

bot.command("logs", async (ctx) => {
  const parts = ctx.message.text.split(/\s+/).slice(1)
  let from, to

  if (parts.length === 2) {
    from = parts[0]
    to = parts[1]
  } else if (parts.length === 1) {
    from = to = parts[0]
  } else {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    from = formatDate(yesterday)
    to = formatDate(today)
  }

  const entries = await readEntries(from, to)

  if (!entries.length) {
    await ctx.reply(`No entries from ${from} to ${to}.`)
    return
  }

  const feeds = entries.filter(e => e.type === "feed").sort((a, b) => b.ts.localeCompare(a.ts))
  let msg = ""
  if (feeds.length) {
    msg += `🕐 ${timeAgo(new Date(feeds[0].ts))} since last feed\n`
  }
  msg += `📋 Logs ${from} → ${to}\n`

  const grouped = {}
  for (const e of entries) {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  }

  for (const [date, items] of Object.entries(grouped)) {
    msg += `\n📅 ${date}\n`
    for (const e of items) {
      msg += `  ${e.time} `
      if (e.type === "feed") {
        msg += `🍼 ${e.amount || "feed"}`
      } else {
        msg += "🧷 diaper"
        if (e.pee) msg += " 💧"
        if (e.poop) msg += " 💩"
      }
      if (e.note) msg += ` 📝${e.note}`
      msg += "\n"
    }
  }

  if (msg.length > 4000) {
    const chunks = msg.match(/[\s\S]{1,4000}/g)
    for (const chunk of chunks) {
      await ctx.reply(chunk)
    }
  } else {
    await ctx.reply(msg)
  }
})

bot.command("start", (ctx) =>
  ctx.reply(
    "👶 Baby Tracker Bot\n\n" +
    "/feed [ml] [@HH:MM] [note] — log a feed\n" +
    "/diaper — log a diaper (interactive)\n" +
    "/logs [from] [to] — show entries (default: yesterday→today)\n" +
    "/cancel — cancel current input"
  )
)

// ── Diaper wizard callbacks ───────────────────────────

bot.action(/^d:pee:(.+)$/, (ctx) => {
  const s = getSession(ctx.chat.id)
  if (!s || s.type !== "diaper" || s.step !== "pee") return
  ctx.answerCbQuery()
  s.data.pee = ctx.match[1] === "yes"
  s.step = "poop"
  ctx.editMessageText("Was there poop?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Yes", callback_data: "d:poop:yes" }],
        [{ text: "No", callback_data: "d:poop:no" }],
      ],
    },
  })
})

bot.action(/^d:poop:(.+)$/, (ctx) => {
  const s = getSession(ctx.chat.id)
  if (!s || s.type !== "diaper" || s.step !== "poop") return
  ctx.answerCbQuery()
  s.data.poop = ctx.match[1] === "yes"
  if (s.data.poop) {
    s.step = "color"
    ctx.editMessageText("What color?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Green", callback_data: "d:color:green" }],
          [{ text: "Yellow", callback_data: "d:color:yellow" }],
          [{ text: "Brown", callback_data: "d:color:brown" }],
          [{ text: "Black", callback_data: "d:color:black" }],
          [{ text: "Red", callback_data: "d:color:red" }],
          [{ text: "White", callback_data: "d:color:white" }],
        ],
      },
    })
  } else {
    s.step = "note"
    ctx.editMessageText("Any notes? (send or /skip)")
  }
})

bot.action(/^d:color:(.+)$/, (ctx) => {
  const s = getSession(ctx.chat.id)
  if (!s || s.type !== "diaper" || s.step !== "color") return
  ctx.answerCbQuery()
  s.data.poop_color = ctx.match[1]
  s.step = "texture"
  ctx.editMessageText("What texture?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Very runny", callback_data: "d:tex:very_runny" }],
        [{ text: "Runny", callback_data: "d:tex:runny" }],
        [{ text: "Mushy", callback_data: "d:tex:mushy" }],
        [{ text: "Mucusy", callback_data: "d:tex:mucusy" }],
        [{ text: "Solid", callback_data: "d:tex:solid" }],
        [{ text: "Little balls", callback_data: "d:tex:little_balls" }],
      ],
    },
  })
})

bot.action(/^d:tex:(.+)$/, (ctx) => {
  const s = getSession(ctx.chat.id)
  if (!s || s.type !== "diaper" || s.step !== "texture") return
  ctx.answerCbQuery()
  s.data.poop_texture = ctx.match[1].replace(/_/g, " ")
  s.step = "note"
  ctx.editMessageText("Any notes? (send or /skip)")
})

// ── Wizard text handler ───────────────────────────────

bot.on("text", (ctx) => {
  const s = getSession(ctx.chat.id)
  if (!s || !s.step) return
  if (s.step === "pee" || s.step === "poop" || s.step === "color" || s.step === "texture") return

  const text = ctx.message.text

  if (s.step === "amount") {
    s.data.amount = text.replace(/[^0-9]/g, "") + "ml"
    s.step = "note"
    ctx.reply("Any notes? (send or /skip)")
    return
  }

  if (s.step === "note") {
    s.data.note = text
    s.step = "time"
    ctx.reply("Custom datetime? (e.g. @2026-05-22 14:30, @14:30, or /skip)")
    return
  }

  if (s.step === "time") {
    s.data.time = text.replace("@", "")
    finishWizard(ctx)
    return
  }
})

// ── Wizard flow control ───────────────────────────────

function advanceWizard(ctx) {
  const s = getSession(ctx.chat.id)
  if (!s || !s.step) return

  if (s.step === "amount") {
    ctx.reply("How many ml? (required)")
    return
  }

  if (s.step === "note") {
    s.step = "time"
    ctx.reply("Custom datetime? (e.g. @2026-05-22 14:30, @14:30, or /skip)")
    return
  }

  if (s.step === "time") {
    finishWizard(ctx)
    return
  }
}

function finishWizard(ctx) {
  const s = getSession(ctx.chat.id)
  if (!s) return

  const entry = s.type === "feed"
    ? buildFeedEntry(s.data, s.startedAt)
    : buildDiaperEntry(s.data, s.startedAt)

  confirmAndSave(ctx, entry, true)
}

// ── Launch ────────────────────────────────────────────

async function startBot(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await bot.launch()
      console.log("Bot started")
      return
    } catch (err) {
      if (err?.response?.error_code === 409) {
        const wait = Math.min(1000 * 2 ** i, 30000)
        console.error(`409 Conflict (another instance?), retrying in ${wait}ms (${i + 1}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
  console.error("Bot failed to start after all retries")
}

export function launchBot() {
  startBot().catch(err => {
    console.error("Fatal bot error:", err)
    process.exit(1)
  })
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err)
  bot.stop("uncaughtException").catch(() => {})
  process.exit(1)
})

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err)
})

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
