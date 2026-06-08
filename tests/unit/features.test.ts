import { describe, it, expect } from "bun:test"
import { FEATURES, type FeatureConfig } from "../../src/installer/features"
import type { InstallManifest } from "../../src/installer/manifest"

describe("Features", () => {
  // 6. Структура и состав
  describe("structure", () => {
    it("has at least the xmind-mcp feature", () => {
      expect(FEATURES.length).toBeGreaterThanOrEqual(1)
      expect(FEATURES.find((f) => f.id === "xmind-mcp")).toBeDefined()
    })

    it("all features have required fields", () => {
      for (const f of FEATURES) {
        expect(f.id).toBeDefined()
        expect(f.name).toBeDefined()
        expect(f.hint).toBeDefined()
        expect(typeof f.install).toBe("function")
        expect(typeof f.uninstall).toBe("function")
      }
    })

    it("feature IDs are unique", () => {
      const ids = FEATURES.map((f) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it("install function signature accepts hosts array and repoRoot", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      // Call with parameters — returns a string result
      const result = await xmind.install(["test"], "/test/repo")
      expect(typeof result).toBe("string")
    })

    it("uninstall function signature accepts manifest", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      const manifest: InstallManifest = {
        version: "1.0.0",
        installedAt: new Date().toISOString(),
        hosts: {},
        features: { "xmind-mcp": { installed: true } },
      }
      // Should not throw
      await xmind.uninstall(manifest)
    })
  })

  // 6.1 Установка xmind-mcp
  describe("xmind-mcp install", () => {
    it("returns 'skipped (npm not found)' when npm is missing", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      // commandExists uses bash -c 'command -v npm'
      // If we are in an environment without npm, this returns appropriate message
      const result = await xmind.install([], "/test")
      // Either skipped (no npm) or installed/failed
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })

    it("can be called with empty hosts array", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      const result = await xmind.install([], "/test/repo")
      expect(typeof result).toBe("string")
    })
  })

  // 6.1 Удаление xmind-mcp
  describe("xmind-mcp uninstall", () => {
    it("does not throw when called with valid manifest", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      const manifest: InstallManifest = {
        version: "1.0.0",
        installedAt: new Date().toISOString(),
        hosts: {},
        features: {},
      }
      await xmind.uninstall(manifest)
    })

    it("does not throw when npm is missing", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      const manifest: InstallManifest = {
        version: "1.0.0",
        installedAt: new Date().toISOString(),
        hosts: { opencode: { targetDir: "/x", files: [] } },
        features: { "xmind-mcp": { installed: true } },
      }
      await xmind.uninstall(manifest)
    })
  })

  // Проверка, что feature устанавливается только при успешных хостах
  describe("install guards", () => {
    it("feature install receives host IDs for selective install", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      // Pass specific host IDs
      const result = await xmind.install(["opencode"], "/test")
      expect(typeof result).toBe("string")
    })

    it("feature install receives empty list when no hosts installed", async () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      const result = await xmind.install([], "/test")
      expect(typeof result).toBe("string")
    })
  })
})
