import { REPO_ROOT, commandExists } from "./utils"
import type { InstallManifest } from "./manifest"

export type FeatureConfig = {
  id: string
  name: string
  hint: string
  install: (hosts: string[], repoRoot: string) => Promise<string>
  uninstall: (manifest: InstallManifest) => Promise<void>
}

export const FEATURES: FeatureConfig[] = [
  {
    id: "xmind-mcp",
    name: "XMind MCP Server",
    hint: "Mindmap generation via XMind (BangyiZhang/xmind-generator-mcp)",
    install: async () => {
      if (!commandExists("npx")) {
        return "skipped (npx not found)"
      }
      // npx will auto-install on first run; pre-install for faster startup
      const result = Bun.spawnSync(["npm", "install", "-g", "xmind-generator-mcp"], {
        stdout: "pipe",
        stderr: "pipe",
      })
      if (result.exitCode === 0) {
        return "XMind MCP Server installed globally"
      }
      return `failed: ${result.stderr.toString().trim()}`
    },
    uninstall: async () => {
      if (!commandExists("npm")) return
      Bun.spawnSync(["npm", "uninstall", "-g", "xmind-generator-mcp"], {
        stdout: "pipe",
        stderr: "pipe",
      })
    },
  },
]
