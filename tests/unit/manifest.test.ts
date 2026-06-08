import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { readManifest, writeManifest, removeManifest, type InstallManifest } from "../../src/installer/manifest"

const originalHome = process.env.USERPROFILE || process.env.HOME
let tmpHome: string

const sampleManifest: InstallManifest = {
  version: "1.0.0",
  installedAt: "2025-01-01T00:00:00.000Z",
  hosts: {
    opencode: {
      targetDir: "/test/opencode",
      files: ["skills/checklist/", "skills/mindmap/"],
    },
  },
  features: {
    "xmind-mcp": { installed: true },
  },
}

describe("Manifest", () => {
  beforeAll(() => {
    tmpHome = mkdtempSync(join(tmpdir(), "qarness-home-"))
    // Override home dir via env for homedir()
    if (process.platform === "win32") {
      process.env.USERPROFILE = tmpHome
    } else {
      process.env.HOME = tmpHome
    }
  })

  afterAll(() => {
    if (process.platform === "win32") {
      process.env.USERPROFILE = originalHome
    } else {
      process.env.HOME = originalHome
    }
  })

  // 7.1 Чтение
  describe("readManifest", () => {
    it("returns null when manifest does not exist", async () => {
      const m = await readManifest()
      expect(m).toBeNull()
    })

    it("returns parsed manifest when valid JSON", async () => {
      await writeManifest(sampleManifest)
      const m = await readManifest()
      expect(m).not.toBeNull()
      expect(m!.version).toBe("1.0.0")
      expect(m!.hosts.opencode).toBeDefined()
      expect(m!.hosts.opencode.files).toEqual(["skills/checklist/", "skills/mindmap/"])
    })

    it("returns null for corrupted manifest (invalid JSON)", async () => {
      // Write invalid JSON directly
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      writeFileSync(manifestFile, "not valid json {{{")
      const m = await readManifest()
      expect(m).toBeNull()
    })

    it("correctly reads features data", async () => {
      await writeManifest(sampleManifest)
      const m = await readManifest()
      expect(m!.features["xmind-mcp"]).toBeDefined()
      expect(m!.features["xmind-mcp"].installed).toBe(true)
    })

    it("returns null for empty file", async () => {
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      writeFileSync(manifestFile, "")
      const m = await readManifest()
      expect(m).toBeNull()
    })
  })

  // 7.2 Запись
  describe("writeManifest", () => {
    it("creates .qarness directory if it does not exist", async () => {
      await writeManifest(sampleManifest)
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      expect(existsSync(manifestFile)).toBe(true)
    })

    it("writes valid JSON with all fields", async () => {
      await writeManifest(sampleManifest)
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      const raw = readFileSync(manifestFile, "utf8")
      const parsed = JSON.parse(raw)

      expect(parsed.version).toBe("1.0.0")
      expect(parsed.installedAt).toBeDefined()
      expect(parsed.hosts).toBeDefined()
      expect(parsed.features).toBeDefined()
    })

    it("JSON is pretty-printed with 2-space indent", async () => {
      await writeManifest(sampleManifest)
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      const raw = readFileSync(manifestFile, "utf8")
      // Should contain 2-space indentation
      expect(raw).toContain('  "version"')
    })

    it("overwrites existing manifest", async () => {
      const m1: InstallManifest = {
        version: "1.0.0",
        installedAt: "old",
        hosts: {},
        features: {},
      }
      await writeManifest(m1)

      const m2: InstallManifest = {
        version: "2.0.0",
        installedAt: "new",
        hosts: { claude: { targetDir: "/x", files: [] } },
        features: {},
      }
      await writeManifest(m2)

      const read = await readManifest()
      expect(read!.version).toBe("2.0.0")
      expect(read!.installedAt).toBe("new")
      expect(read!.hosts.claude).toBeDefined()
      expect(read!.hosts.opencode).toBeUndefined()
    })

    it("handles empty hosts and features", async () => {
      const empty: InstallManifest = {
        version: "1.0.0",
        installedAt: "empty",
        hosts: {},
        features: {},
      }
      await writeManifest(empty)
      const read = await readManifest()
      expect(read).not.toBeNull()
      expect(read!.hosts).toEqual({})
      expect(read!.features).toEqual({})
    })
  })

  // 7.3 Удаление
  describe("removeManifest", () => {
    it("removes the manifest file", async () => {
      await writeManifest(sampleManifest)
      const manifestFile = join(tmpHome, ".qarness", "manifest.json")
      expect(existsSync(manifestFile)).toBe(true)

      await removeManifest()
      expect(existsSync(manifestFile)).toBe(false)
    })

    it("does nothing when manifest does not exist", async () => {
      await removeManifest() // No error
      await removeManifest() // Still no error - idempotent
      // Test passes if no exception thrown
    })
  })
})
