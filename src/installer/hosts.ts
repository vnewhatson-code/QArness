import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile, rm } from "node:fs/promises"
import { join, dirname } from "node:path"
import { copyDir, copyFile, listItems, commandExists, xdgConfig, getHomeDir, REPO_ROOT } from "./utils"

export type SourceMapping = {
  from: string
  pattern?: string
  exclude?: string[]
}

export type HostConfig = {
  id: string
  name: string
  detect: () => boolean
  targetDir: () => string
  sources: Record<string, SourceMapping>
  postInstall?: (targetDir: string) => Promise<void>
  postUninstall?: (targetDir: string) => Promise<void>
}

export const HOSTS: HostConfig[] = [
  {
    id: "opencode",
    name: "OpenCode",
    detect: () => existsSync(join(xdgConfig(), "opencode")),
    targetDir: () => join(xdgConfig(), "opencode"),
    sources: {
      skills: { from: "skills" },
    },
    postInstall: async (targetDir) => {
      // Skills are copied to targetDir/skills/ by installHost — OpenCode auto-discovers them.
      // Only clean stale QArness path references and add MCP server if config exists.
      const configFiles = ["opencode.json", "opencode.jsonc"]
      for (const f of configFiles) {
        const configPath = join(targetDir, f)
        if (!existsSync(configPath)) continue

        let config: Record<string, unknown>
        try {
          config = JSON.parse(await readFile(configPath, "utf8"))
        } catch {
          continue
        }

        // Clean stale QArness path references from previous installs
        if (config.agents?.paths) {
          ;(config.agents as Record<string, unknown>).paths = (
            (config.agents as Record<string, unknown>).paths as unknown[]
          ).filter((p: unknown) => typeof p === "string" && !(p as string).includes("QArness"))
        }
        if (config.skills?.paths) {
          ;(config.skills as Record<string, unknown>).paths = (
            (config.skills as Record<string, unknown>).paths as unknown[]
          ).filter((p: unknown) => typeof p === "string" && !(p as string).includes("QArness"))
        }

        // Add MCP server (OpenCode format)
        if (!config.mcp) config.mcp = {}
        ;(config.mcp as Record<string, unknown>).xmind = {
          type: "local",
          command: ["npx", "-y", "xmind-generator-mcp"],
          enabled: true,
        }

        await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
        break
      }
    },
    postUninstall: async (targetDir) => {
      // Remove QArness paths from opencode config
      const configFiles = ["opencode.json", "opencode.jsonc"]
      for (const f of configFiles) {
        const configPath = join(targetDir, f)
        if (!existsSync(configPath)) continue
        try {
          const config = JSON.parse(await readFile(configPath, "utf8"))
          if (config.agents?.paths) {
            config.agents.paths = config.agents.paths.filter(
              (p: string) => !p.includes("QArness"),
            )
          }
          if (config.skills?.paths) {
            config.skills.paths = config.skills.paths.filter(
              (p: string) => !p.includes("QArness"),
            )
          }
          if (config.mcp?.xmind) {
            delete config.mcp.xmind
          }
          await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
        } catch {
          // skip
        }
      }
    },
  },
  {
    id: "claude",
    name: "Claude Code",
    detect: () => existsSync(join(getHomeDir(), ".claude")),
    targetDir: () => join(getHomeDir(), ".claude"),
    sources: {
      skills: { from: "skills" },
    },
    postInstall: async (_targetDir) => {
      // Claude Code reads MCP servers from ~/.claude.json (NOT settings.json)
      const configPath = join(getHomeDir(), ".claude.json")
      let config: Record<string, unknown> = {}
      if (existsSync(configPath)) {
        try {
          config = JSON.parse(await readFile(configPath, "utf8"))
        } catch {
          // start fresh
        }
      }

      if (!config.mcpServers) config.mcpServers = {}
      ;(config.mcpServers as Record<string, unknown>).xmind = {
        type: "stdio",
        command: "npx",
        args: ["-y", "xmind-generator-mcp"],
      }

      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
    },
    postUninstall: async (_targetDir) => {
      const configPath = join(getHomeDir(), ".claude.json")
      if (!existsSync(configPath)) return
      try {
        const config = JSON.parse(await readFile(configPath, "utf8"))
        if (config.mcpServers?.xmind) {
          delete config.mcpServers.xmind
          if (Object.keys(config.mcpServers).length === 0) {
            delete config.mcpServers
          }
          await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
        }
      } catch {
        // skip
      }
    },
  },
]

export const installHost = async (host: HostConfig): Promise<string[]> => {
  const targetDir = host.targetDir()
  const installedFiles: string[] = []
  const createdPaths: string[] = []

  try {
    for (const [key, mapping] of Object.entries(host.sources)) {
      const srcDir = join(REPO_ROOT, mapping.from)
      if (!existsSync(srcDir)) continue

      const destDir = join(targetDir, mapping.from)
      const items = await listItems(srcDir, mapping.pattern, mapping.exclude)

      for (const item of items) {
        const src = join(srcDir, item)
        const dest = join(destDir, item)
        createdPaths.push(dest)
        await copyDir(src, dest)
        installedFiles.push(`${mapping.from}/${item}/`)
      }
    }

    if (host.postInstall) {
      await host.postInstall(targetDir)
    }

    return installedFiles
  } catch (error) {
    // Rollback
    for (const p of createdPaths.reverse()) {
      await rm(p, { recursive: true, force: true }).catch(() => {})
    }
    throw error
  }
}

export const uninstallHost = async (
  hostId: string,
  hostData: { targetDir: string; files: string[] },
  host?: HostConfig,
): Promise<void> => {
  for (const file of hostData.files) {
    const fullPath = join(hostData.targetDir, file)
    if (file.endsWith("/")) {
      await rm(fullPath, { recursive: true, force: true }).catch(() => {})
    } else {
      const { unlink } = await import("node:fs/promises")
      await unlink(fullPath).catch(() => {})
    }
  }

  if (host?.postUninstall) {
    await host.postUninstall(hostData.targetDir)
  }
}
