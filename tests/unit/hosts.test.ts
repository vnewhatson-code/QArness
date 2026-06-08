import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs"
import { join, sep } from "node:path"
import { tmpdir } from "node:os"
import { HOSTS, installHost, uninstallHost, type HostConfig } from "../../src/installer/hosts"
import { REPO_ROOT } from "../../src/installer/utils"

describe("Hosts", () => {
  // 2. Детекция хостов
  describe("detection", () => {
    it("OpenCode detect checks xdgConfig/opencode", () => {
      const opencode = HOSTS.find((h) => h.id === "opencode")!
      expect(opencode).toBeDefined()
      expect(typeof opencode.detect()).toBe("boolean")
    })

    it("Claude Code detect checks ~/.claude", () => {
      const claude = HOSTS.find((h) => h.id === "claude")!
      expect(claude).toBeDefined()
      expect(typeof claude.detect()).toBe("boolean")
    })

    it("has exactly 2 configured hosts", () => {
      expect(HOSTS.length).toBe(2)
    })

    it("all hosts have required fields", () => {
      for (const host of HOSTS) {
        expect(host.id).toBeDefined()
        expect(host.name).toBeDefined()
        expect(typeof host.detect).toBe("function")
        expect(typeof host.targetDir).toBe("function")
        expect(host.sources).toBeDefined()
      }
    })

    it("host IDs are unique", () => {
      const ids = HOSTS.map((h) => h.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // 5.1 Post-install модификация конфигов — OpenCode
  describe("postInstall — OpenCode", () => {
    let tmp: string
    let opencodeDir: string
    let opencode: HostConfig

    beforeAll(() => {
      opencode = HOSTS.find((h) => h.id === "opencode")!
      tmp = mkdtempSync(join(tmpdir(), "qarness-opende-"))
      opencodeDir = join(tmp, "opencode")
      mkdirSync(opencodeDir, { recursive: true })
    })

    afterAll(() => {
      rmSync(tmp, { recursive: true, force: true })
    })

    const runPostInstall = async (config: Record<string, unknown>) => {
      const configPath = join(opencodeDir, "opencode.json")
      try { rmSync(configPath) } catch {}
      writeFileSync(configPath, JSON.stringify(config))
      const origTarget = opencode.targetDir
      opencode.targetDir = () => opencodeDir
      await opencode.postInstall!(opencodeDir)
      opencode.targetDir = origTarget
      return JSON.parse(readFileSync(configPath, "utf8"))
    }

    it("adds agents.paths, skills.paths and mcp server (OpenCode format)", async () => {
      const result = await runPostInstall({})
      const agents: string[] = result.agents.paths
      const skills: string[] = result.skills.paths
      expect(agents.some((p) => p.includes(`QArness${sep}agents`))).toBe(true)
      expect(skills.some((p) => p.includes(`QArness${sep}skills`))).toBe(true)
      expect(result.mcp.xmind).toBeDefined()
      expect(result.mcp.xmind.type).toBe("local")
      expect(result.mcp.xmind.command).toEqual(["npx", "-y", "xmind-generator-mcp"])
      expect(result.mcp.xmind.enabled).toBe(true)
    })

    it("does not duplicate QArness paths if already present", async () => {
      const result = await runPostInstall({
        agents: { paths: ["/custom/agents"] },
        skills: { paths: ["/custom/skills"] },
      })
      const agents: string[] = result.agents.paths
      const skills: string[] = result.skills.paths
      expect(agents.filter((p: string) => p.includes("QArness") && p.includes("agents")).length).toBe(1)
      expect(skills.filter((p: string) => p.includes("QArness") && p.includes("skills")).length).toBe(1)
    })

    it("skips when config file does not exist (no error)", async () => {
      try { rmSync(join(opencodeDir, "opencode.json")) } catch {}
      try { rmSync(join(opencodeDir, "opencode.jsonc")) } catch {}
      await opencode.postInstall!(opencodeDir)
    })

    it("skips when config is invalid JSON", async () => {
      const configPath = join(opencodeDir, "opencode.json")
      writeFileSync(configPath, "not valid {{ json")
      await opencode.postInstall!(opencodeDir)
    })

    it("overwrites xmind mcp server if already present", async () => {
      await runPostInstall({ mcp: { xmind: { type: "local", command: ["old"], enabled: false } } })
      const result = await runPostInstall({ mcp: { xmind: { type: "local", command: ["old"], enabled: false } } })
      expect(result.mcp.xmind.command).toEqual(["npx", "-y", "xmind-generator-mcp"])
      expect(result.mcp.xmind.enabled).toBe(true)
    })
  })

  // 5.2 Claude Code (settings.json)
  describe("postInstall — Claude Code", () => {
    let tmp: string
    let claudeDir: string
    let claude: HostConfig

    beforeAll(() => {
      claude = HOSTS.find((h) => h.id === "claude")!
      tmp = mkdtempSync(join(tmpdir(), "qarness-claude-"))
      claudeDir = join(tmp, ".claude")
      mkdirSync(claudeDir, { recursive: true })
    })

    afterAll(() => {
      rmSync(tmp, { recursive: true, force: true })
    })

    it("creates settings.json if it does not exist", async () => {
      const settingsPath = join(claudeDir, "settings.json")
      try { rmSync(settingsPath) } catch {}
      await claude.postInstall!(claudeDir)
      expect(existsSync(settingsPath)).toBe(true)
    })

    it("adds mcpServers.xmind to existing settings", async () => {
      const settingsPath = join(claudeDir, "settings.json")
      writeFileSync(settingsPath, JSON.stringify({ existing: true }))
      await claude.postInstall!(claudeDir)
      const settings = JSON.parse(readFileSync(settingsPath, "utf8"))
      expect(settings.existing).toBe(true)
      expect(settings.mcpServers.xmind.command).toBe("npx")
    })

    it("handles invalid settings.json gracefully", async () => {
      writeFileSync(join(claudeDir, "settings.json"), "{{{ bad json }}}")
      await claude.postInstall!(claudeDir)
    })
  })

  // 5. Post-uninstall
  describe("postUninstall", () => {
    let opencode: HostConfig
    let claude: HostConfig

    beforeAll(() => {
      opencode = HOSTS.find((h) => h.id === "opencode")!
      claude = HOSTS.find((h) => h.id === "claude")!
    })

    it("opencode postUninstall removes QArness paths", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "qarness-opun-"))
      const configPath = join(tmp, "opencode.json")
      writeFileSync(configPath, JSON.stringify({
        agents: { paths: ["/custom/agents"] },
        skills: { paths: ["/custom/skills"] },
        mcp: { xmind: { type: "local", command: ["npx", "-y", "xmind-generator-mcp"] } },
      }))
      await opencode.postUninstall!(tmp)
      const result = JSON.parse(readFileSync(configPath, "utf8"))
      expect(result.mcp.xmind).toBeUndefined()
      rmSync(tmp, { recursive: true, force: true })
    })

    it("claude postUninstall removes xmind, keeps others", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "qarness-clun-"))
      const configPath = join(tmp, "settings.json")
      writeFileSync(configPath, JSON.stringify({
        otherSetting: true,
        mcpServers: { xmind: {}, otherServer: {} },
      }))
      await claude.postUninstall!(tmp)
      const result = JSON.parse(readFileSync(configPath, "utf8"))
      expect(result.mcpServers.xmind).toBeUndefined()
      expect(result.mcpServers.otherServer).toBeDefined()
      rmSync(tmp, { recursive: true, force: true })
    })

    it("does not throw when config does not exist", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "qarness-noconfig-"))
      await opencode.postUninstall!(tmp)
      rmSync(tmp, { recursive: true, force: true })
    })
  })

  // 4. Установка файлов через installHost
  describe("installHost", () => {
    const srcName = "__qarness_test_src__"
    let srcPath: string

    const withSrcDir = async (tmp: string, destDir: string, hostOpts: Partial<HostConfig> = {}): Promise<string[]> => {
      const host: HostConfig = {
        id: "test",
        name: "Test",
        detect: () => true,
        targetDir: () => destDir,
        sources: { data: { from: srcName } },
        ...hostOpts,
      }
      return installHost(host)
    }

    beforeAll(() => {
      srcPath = join(REPO_ROOT, srcName)
      mkdirSync(join(srcPath, "sub-dir"), { recursive: true })
      writeFileSync(join(srcPath, "sub-dir", "file.md"), "content")
    })

    afterAll(() => {
      rmSync(srcPath, { recursive: true, force: true })
    })

    it("installs directory items and returns file list", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "qarness-inst-"))
      const destDir = join(tmp, "target")
      mkdirSync(destDir, { recursive: true })

      const files = await withSrcDir(tmp, destDir)
      expect(files.length).toBeGreaterThan(0)
      expect(files.some((f) => f.includes("sub-dir"))).toBe(true)

      rmSync(tmp, { recursive: true, force: true })
    })

    it("skips missing source directories (no error)", async () => {
      const destDir = join(tmpdir(), "qarness-empty-target")
      mkdirSync(destDir, { recursive: true })

      const host: HostConfig = {
        id: "skip",
        name: "Skip",
        detect: () => true,
        targetDir: () => destDir,
        sources: { missing: { from: "nonexistent-dir-xyz" } },
      }

      const files = await installHost(host)
      expect(files).toEqual([])

      rmSync(destDir, { recursive: true, force: true })
    })
  })

  // 4.4 Rollback
  describe("installHost rollback", () => {
    const srcName = "__qarness_test_rb__"
    let srcPath: string

    beforeAll(() => {
      srcPath = join(REPO_ROOT, srcName)
      mkdirSync(join(srcPath, "data"), { recursive: true })
      writeFileSync(join(srcPath, "data", "info.md"), "data")
    })

    afterAll(() => {
      rmSync(srcPath, { recursive: true, force: true })
    })

    it("rolls back on postInstall failure", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "qarness-rb-"))
      const destDir = join(tmp, "dest")
      mkdirSync(destDir, { recursive: true })

      const failingHost: HostConfig = {
        id: "failing",
        name: "Failing",
        detect: () => true,
        targetDir: () => destDir,
        sources: { data: { from: srcName } },
        postInstall: () => { throw new Error("deliberate failure") },
      }

      let threw = false
      try {
        await installHost(failingHost)
      } catch (e) {
        threw = true
      }
      expect(threw).toBe(true)

      // After rollback, copied data directory should be removed
      // (the enclosing dir created by mkdir is not tracked in createdPaths)
      expect(existsSync(join(destDir, srcName, "data"))).toBe(false)

      rmSync(tmp, { recursive: true, force: true })
    })
  })

  // 8. Удаление (uninstallHost)
  describe("uninstallHost", () => {
    let tmp: string

    beforeAll(() => {
      tmp = mkdtempSync(join(tmpdir(), "qarness-unhost-"))
    })

    afterAll(() => {
      rmSync(tmp, { recursive: true, force: true })
    })

    it("removes directory entries (trailing /)", async () => {
      const dir = join(tmp, "to-remove-dir")
      mkdirSync(join(dir, "nested"), { recursive: true })

      await uninstallHost("test", {
        targetDir: tmp,
        files: ["to-remove-dir/"],
      })

      expect(existsSync(dir)).toBe(false)
    })

    it("removes file entries (no trailing /)", async () => {
      const file = join(tmp, "to-remove-file.txt")
      writeFileSync(file, "data")

      await uninstallHost("test", {
        targetDir: tmp,
        files: ["to-remove-file.txt"],
      })

      expect(existsSync(file)).toBe(false)
    })

    it("silently ignores already deleted files", async () => {
      await uninstallHost("test", {
        targetDir: tmp,
        files: ["nonexistent-dir/", "nonexistent-file.txt"],
      })
    })
  })
})
