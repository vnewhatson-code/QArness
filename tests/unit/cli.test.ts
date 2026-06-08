import { describe, it, expect } from "bun:test"
import { parseArgs } from "../../src/installer/cli"

describe("parseArgs", () => {
  // 1.1 Базовые флаги
  describe("basic flags", () => {
    it("--help shows help", () => {
      expect(parseArgs(["--help"]).help).toBe(true)
      expect(parseArgs(["-h"]).help).toBe(true)
    })

    it("--yes enables auto-accept", () => {
      expect(parseArgs(["--yes"]).yes).toBe(true)
      expect(parseArgs(["-y"]).yes).toBe(true)
    })

    it("--json enables JSON output and implies --yes", () => {
      const args = parseArgs(["--json"])
      expect(args.json).toBe(true)
      expect(args.yes).toBe(true)
    })

    it("-j is short alias for --json", () => {
      const args = parseArgs(["-j"])
      expect(args.json).toBe(true)
      expect(args.yes).toBe(true)
    })

    it("--uninstall enables uninstall mode", () => {
      expect(parseArgs(["--uninstall"]).uninstall).toBe(true)
      expect(parseArgs(["--remove"]).uninstall).toBe(true)
    })

    it("default: all flags are false", () => {
      const args = parseArgs([])
      expect(args.yes).toBe(false)
      expect(args.uninstall).toBe(false)
      expect(args.json).toBe(false)
      expect(args.hosts).toEqual([])
      expect(args.features).toEqual([])
      expect(args.help).toBe(false)
    })
  })

  // 1.2 Выбор хостов и фич
  describe("hosts and features selection", () => {
    it("--hosts with single host", () => {
      expect(parseArgs(["--hosts", "opencode"]).hosts).toEqual(["opencode"])
      expect(parseArgs(["--hosts", "claude"]).hosts).toEqual(["claude"])
    })

    it("--hosts with comma-separated multiple hosts", () => {
      expect(parseArgs(["--hosts", "opencode,claude"]).hosts).toEqual(["opencode", "claude"])
    })

    it("--hosts with unknown host", () => {
      expect(parseArgs(["--hosts", "unknown"]).hosts).toEqual(["unknown"])
    })

    it("--hosts with empty value", () => {
      expect(parseArgs(["--hosts", ""]).hosts).toEqual([])
    })

    it("--hosts with comma-separated including empty", () => {
      expect(parseArgs(["--hosts", "opencode,"]).hosts).toEqual(["opencode"])
    })

    it("--features with single feature", () => {
      expect(parseArgs(["--features", "xmind-mcp"]).features).toEqual(["xmind-mcp"])
    })

    it("--features with unknown feature", () => {
      expect(parseArgs(["--features", "unknown"]).features).toEqual(["unknown"])
    })

    it("--features with empty value", () => {
      expect(parseArgs(["--features", ""]).features).toEqual([])
    })

    it("missing argument after --hosts results in empty string", () => {
      // When no next argument, ++i gives undefined, split gives [""], filter removes it
      expect(parseArgs(["--hosts"]).hosts).toEqual([])
    })

    it("missing argument after --features results in empty string", () => {
      expect(parseArgs(["--features"]).features).toEqual([])
    })
  })

  // 1.3 Комбинации флагов
  describe("flag combinations", () => {
    it("--yes --json", () => {
      const args = parseArgs(["--yes", "--json"])
      expect(args.yes).toBe(true)
      expect(args.json).toBe(true)
    })

    it("--yes --hosts opencode", () => {
      const args = parseArgs(["--yes", "--hosts", "opencode"])
      expect(args.yes).toBe(true)
      expect(args.hosts).toEqual(["opencode"])
    })

    it("--hosts opencode --features xmind-mcp (no --yes)", () => {
      const args = parseArgs(["--hosts", "opencode", "--features", "xmind-mcp"])
      expect(args.yes).toBe(false)
      expect(args.hosts).toEqual(["opencode"])
      expect(args.features).toEqual(["xmind-mcp"])
    })

    it("--json implies --yes", () => {
      const args = parseArgs(["--json"])
      expect(args.json).toBe(true)
      expect(args.yes).toBe(true)
    })

    it("--uninstall --yes", () => {
      const args = parseArgs(["--uninstall", "--yes"])
      expect(args.uninstall).toBe(true)
      expect(args.yes).toBe(true)
    })

    it("--uninstall with --hosts (unusual but valid)", () => {
      const args = parseArgs(["--uninstall", "--hosts", "opencode"])
      expect(args.uninstall).toBe(true)
      expect(args.hosts).toEqual(["opencode"])
    })

    it("combined flags: --yes --json --hosts opencode,claude --features xmind-mcp", () => {
      const args = parseArgs([
        "--yes", "--json",
        "--hosts", "opencode,claude",
        "--features", "xmind-mcp",
      ])
      expect(args.yes).toBe(true)
      expect(args.json).toBe(true)
      expect(args.hosts).toEqual(["opencode", "claude"])
      expect(args.features).toEqual(["xmind-mcp"])
    })

    it("all long aliases work", () => {
      expect(parseArgs(["-y"]).yes).toBe(true)
      expect(parseArgs(["-j"]).json).toBe(true)
      expect(parseArgs(["-j"]).yes).toBe(true)
      expect(parseArgs(["-h"]).help).toBe(true)
    })
  })

  // Неизвестные флаги — просто игнорируются (неопределённое поведение)
  describe("unknown flags", () => {
    it("unknown flag is silently ignored", () => {
      const args = parseArgs(["--unknown"])
      expect(args.yes).toBe(false)
      expect(args.help).toBe(false)
    })
  })
})
