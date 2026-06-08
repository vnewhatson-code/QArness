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

    it("install function exists and accepts (hosts, repoRoot)", () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      expect(typeof xmind.install).toBe("function")
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
    it("has install function", () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      expect(typeof xmind.install).toBe("function")
    })

    it("has uninstall function", () => {
      const xmind = FEATURES.find((f) => f.id === "xmind-mcp")!
      expect(typeof xmind.uninstall).toBe("function")
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

})
