import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { copyDir, copyFile, listItems, commandExists, xdgConfig, getHomeDir, piDir, REPO_ROOT } from "./utils"
import { convertAgentToPiFormat } from "../pi/convert-agent"

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
  {
    id: "pi",
    name: "Pi Coding Agent",
    detect: () => {
      if (existsSync(piDir())) return true
      return commandExists("pi")
    },
    targetDir: () => piDir(),
    sources: {
      skills: { from: "skills" },
    },
    postInstall: async (targetDir) => {
      // 1. Create QArness extension
      const extDir = join(targetDir, "extensions", "qarness")
      await mkdir(extDir, { recursive: true })
      const extContent = await readFile(join(REPO_ROOT, "src", "pi", "extension.ts"), "utf8")
      await writeFile(join(extDir, "index.ts"), extContent, "utf8")

      // 2. Install pi-subagents (only if not already installed)
      const piPkgDir = join(targetDir, "packages", "pi-subagents")
      if (!existsSync(piPkgDir)) {
        const result = Bun.spawnSync(["pi", "install", "npm:pi-subagents"], {
          stdout: "pipe",
          stderr: "pipe",
        })
        if (result.exitCode !== 0) {
          throw new Error(
            `pi-subagents install failed: ${result.stderr.toString().trim()}`,
          )
        }
      }

      // 3. Convert and install agents to pi-subagents format
      const agentsSrcDir = join(REPO_ROOT, "agents")
      const agentsDestDir = join(getHomeDir(), ".pi", "agent", "agents")
      if (existsSync(agentsSrcDir)) {
        await mkdir(agentsDestDir, { recursive: true })
        const agentFiles = await readdir(agentsSrcDir)
        for (const file of agentFiles) {
          if (!file.endsWith(".md")) continue
          const srcPath = join(agentsSrcDir, file)
          const content = await readFile(srcPath, "utf8")
          const converted = convertAgentToPiFormat(content, file.replace(/\.md$/, ""))
          if (converted) {
            await writeFile(join(agentsDestDir, file), converted, "utf8")
          }
        }
      }
    },
    postUninstall: async (targetDir) => {
      // Remove QArness extension
      const extDir = join(targetDir, "extensions", "qarness")
      await rm(extDir, { recursive: true, force: true })
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
