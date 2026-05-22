import { launchBot } from "./bot.js"
import { initStore } from "./store.js"
import { mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(__dirname, "..", "data"), { recursive: true })

await initStore()
launchBot()
