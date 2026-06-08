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
    hint: "Mindmap generation via XMind",
    install: async () => {
      if (!commandExists("npm")) {
        return "skipped (npm not found)"
      }
      const result = Bun.spawnSync(["npm", "install", "-g", "xmind-mcp-server"], {
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
      Bun.spawnSync(["npm", "uninstall", "-g", "xmind-mcp-server"], {
        stdout: "pipe",
        stderr: "pipe",
      })
    },
  },
]
