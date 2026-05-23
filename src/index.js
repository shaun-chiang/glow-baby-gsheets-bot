import { launchBot } from "./bot.js"
import { initStore } from "./store.js"

await initStore()
launchBot()
