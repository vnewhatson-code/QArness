import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"

export default function (pi: ExtensionAPI) {
  pi.registerCommand("qarness:version", {
    description: "Show QArness version",
    handler: async (_args, ctx) => {
      ctx.ui.notify("QArness installed", "info")
    },
  })
}
