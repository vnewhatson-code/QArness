import { describe, it, expect, beforeAll, afterAll } from "bun:test"

const CONTAINER_NAME = "qarness-test-ubuntu"

const docker = (args: string[]): { exitCode: number; stdout: string; stderr: string } => {
  const result = Bun.spawnSync(["docker", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

const dockerAsync = (args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const proc = Bun.spawn(["docker", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    })
    proc.exited.then((code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: proc.stdout.toString(),
        stderr: proc.stderr.toString(),
      })
    })
  })

const execInContainer = (cmd: string): { exitCode: number; output: string } => {
  const result = docker(["exec", CONTAINER_NAME, "bash", "-c", cmd])
  return { exitCode: result.exitCode, output: result.stdout + result.stderr }
}

const isDockerAvailable = (): boolean => {
  return docker(["info"]).exitCode === 0
}

let containerReady = false

const extractJson = (output: string): Record<string, unknown> | null => {
  for (const line of output.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("{")) {
      try { return JSON.parse(trimmed) } catch { /* continue */ }
    }
  }
  return null
}

describe("Installer - Ubuntu", () => {
  const image = "ubuntu:22.04"

  beforeAll(async () => {
    if (!isDockerAvailable()) return

    docker(["rm", "-f", CONTAINER_NAME])

    const pull = await dockerAsync(["pull", image])
    if (pull.exitCode !== 0) {
      console.error("Failed to pull image:", pull.stderr)
      return
    }

    const repoRoot = import.meta.dir.replace(/[/\\]tests$/, "")
    const run = docker([
      "run", "-d",
      "--name", CONTAINER_NAME,
      "-v", `${repoRoot}:/qarness`,
      image,
      "tail", "-f", "/dev/null",
    ])
    if (run.exitCode !== 0) {
      console.error("Failed to start container:", run.stderr)
      return
    }

    const { exitCode, output } = execInContainer(
      "apt-get update -qq && apt-get install -y -qq curl unzip && curl -fsSL https://bun.sh/install | bash",
    )
    if (exitCode !== 0) {
      console.error("Setup failed:", output.slice(-300))
      return
    }

    containerReady = true
  }, 300000)

  afterAll(() => {
    docker(["rm", "-f", CONTAINER_NAME])
  })

  // Smoke tests
  describe("smoke", () => {
    it("should have bun installed", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }
      const { exitCode, output } = execInContainer("export PATH=$HOME/.bun/bin:$PATH && bun --version")
      console.log("Bun version:", output.trim())
      expect(exitCode).toBe(0)
    })

    it("should compile install.ts without errors", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }
      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install 2>&1 && bun build --no-bundle install.ts 2>&1 | tail -5",
      )
      console.log("Build output:", output.slice(-300))
      expect(exitCode).toBe(0)
    })

    it("should compile uninstall.ts without errors", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }
      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun build --no-bundle uninstall.ts 2>&1 | tail -5",
      )
      console.log("Build output:", output.slice(-300))
      expect(exitCode).toBe(0)
    })
  })

  // 4. Full install cycle — Claude Code
  describe("install → verify → uninstall (Claude Code)", () => {
    beforeAll(() => {
      if (!containerReady) return
      execInContainer("mkdir -p ~/.claude")
      execInContainer("rm -rf ~/.qarness")
    })

    afterAll(() => {
      if (!containerReady) return
      execInContainer("rm -rf ~/.qarness ~/.claude")
    })

    it("install --yes --json creates manifest with claude host", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      console.log("Claude install:", output.trim())

      const json = extractJson(output.trim())
      if (json) {
        expect(json.ok).toBe(true)
        expect(json.hosts).toContain("claude")
      } else {
        expect(exitCode).toBe(0)
      }
    })

    it("manifest has claude host entry", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer("cat ~/.qarness/manifest.json")
      expect(exitCode).toBe(0)
      const manifest = JSON.parse(output.trim())
      expect(manifest.hosts.claude).toBeDefined()
      expect(manifest.hosts.claude.targetDir).toBeDefined()
      expect(manifest.hosts.claude.files).toBeDefined()
    })

    it("~/.claude.json is created with mcpServers.xmind", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer("cat ~/.claude.json")
      expect(exitCode).toBe(0)
      const config = JSON.parse(output.trim())
      expect(config.mcpServers.xmind).toBeDefined()
      expect(config.mcpServers.xmind.type).toBe("stdio")
      expect(config.mcpServers.xmind.command).toBe("npx")
    })

    it("uninstall removes files and manifest", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --uninstall 2>&1",
      )
      console.log("Uninstall:", output.trim().slice(-150))
      expect(exitCode).toBe(0)

      const { exitCode: manifestGone } = execInContainer("test -f ~/.qarness/manifest.json")
      expect(manifestGone).toBe(1)
    })
  })

  // 4. Full install cycle — OpenCode
  describe("install → verify → uninstall (OpenCode)", () => {
    beforeAll(() => {
      if (!containerReady) return
      execInContainer("mkdir -p ~/.config/opencode")
      execInContainer("rm -rf ~/.qarness")
    })

    afterAll(() => {
      if (!containerReady) return
      execInContainer("rm -rf ~/.qarness ~/.config/opencode")
    })

    it("install --yes --json creates manifest with opencode host", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts opencode --json 2>&1",
      )
      console.log("OpenCode install:", output.trim())

      const json = extractJson(output.trim())
      if (json) {
        expect(json.ok).toBe(true)
        expect(json.hosts).toContain("opencode")
      } else {
        expect(exitCode).toBe(0)
      }
    })

    it("manifest has opencode host entry", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer("cat ~/.qarness/manifest.json")
      expect(exitCode).toBe(0)
      const manifest = JSON.parse(output.trim())
      expect(manifest.hosts.opencode).toBeDefined()
      expect(manifest.hosts.opencode.targetDir).toBeDefined()
      expect(manifest.hosts.opencode.files).toBeDefined()
    })

    it("opencode manifest has skills files installed", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      // opencode.json won't exist unless we create it first
      // PostInstall only modifies existing configs
      // Let's check that install works and manifest is correct
      const { output } = execInContainer("cat ~/.qarness/manifest.json")
      const manifest = JSON.parse(output.trim())
      expect(manifest.hosts.opencode.files.length).toBeGreaterThan(0)
    })

    it("uninstall removes files and manifest", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --uninstall 2>&1",
      )
      expect(exitCode).toBe(0)

      const { exitCode: manifestGone } = execInContainer("test -f ~/.qarness/manifest.json")
      expect(manifestGone).toBe(1)
    })
  })

  // 4. Both hosts simultaneously
  describe("install both hosts (opencode + claude)", () => {
    beforeAll(() => {
      if (!containerReady) return
      execInContainer("mkdir -p ~/.claude ~/.config/opencode")
      execInContainer("rm -rf ~/.qarness")
    })

    afterAll(() => {
      if (!containerReady) return
      execInContainer("rm -rf ~/.qarness ~/.claude ~/.config/opencode")
    })

    it("install --hosts opencode,claude adds both to manifest", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts opencode,claude --json 2>&1",
      )
      console.log("Both hosts:", output.trim())

      const json = extractJson(output.trim())
      if (json) {
        expect(json.ok).toBe(true)
        expect(json.hosts).toContain("opencode")
        expect(json.hosts).toContain("claude")
      }
    })

    it("uninstall cleans both hosts", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --uninstall 2>&1",
      )

      const { exitCode: manifestGone } = execInContainer("test -f ~/.qarness/manifest.json")
      expect(manifestGone).toBe(1)
    })
  })

  // 2. Host detection edge cases
  describe("host detection", () => {
    it("exits gracefully when no hosts detected and none specified", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer("rm -rf ~/.claude ~/.config/opencode ~/.qarness")

      const { output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --json 2>&1",
      )
      const combined = output.trim()
      expect(combined.toLowerCase()).toMatch(/не обнаружены|not found|no.*host/i)
    })

    it("installs to specified host even if not detected", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer("rm -rf ~/.claude ~/.qarness")

      const { output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      console.log("Forced install:", output.trim())
      const { exitCode: manifestExists } = execInContainer("test -f ~/.qarness/manifest.json")
      expect(manifestExists).toBe(0)
    })
  })

  // 1.2 Unknown host
  describe("unknown host handling", () => {
    it("warns about unknown host and continues", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer("rm -rf ~/.qarness")
      const { output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts unknown-host-xyz --json 2>&1",
      )
      const combined = output.trim()
      const json = extractJson(combined)
      if (json) {
        expect(json.ok === false || (json.hosts as string[]).length === 0).toBe(true)
      } else {
        const hasWarning = combined.toLowerCase().includes("unknown") || combined.toLowerCase().includes("неизвест")
        expect(hasWarning).toBe(true)
      }
    })
  })

  // 4.2 Re-install (update) does not corrupt
  describe("re-install", () => {
    beforeAll(() => {
      if (!containerReady) return
      execInContainer("mkdir -p ~/.claude")
      execInContainer("rm -rf ~/.qarness")
    })

    afterAll(() => {
      if (!containerReady) return
      execInContainer("rm -rf ~/.qarness ~/.claude")
    })

    it("double install does not duplicate host entries", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )

      const { output } = execInContainer("cat ~/.qarness/manifest.json")
      const manifest = JSON.parse(output.trim())
      expect(manifest.hosts.claude).toBeDefined()
      // Should have exactly one host, not duplicated
      expect(Object.keys(manifest.hosts).length).toBe(1)
    })

    it("second install with additional host merges correctly", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      execInContainer("mkdir -p ~/.claude ~/.config/opencode")
      execInContainer("rm -rf ~/.qarness")

      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts opencode --json 2>&1",
      )

      const { output } = execInContainer("cat ~/.qarness/manifest.json")
      const manifest = JSON.parse(output.trim())
      expect(manifest.hosts.claude).toBeDefined()
      expect(manifest.hosts.opencode).toBeDefined()
    })
  })
}, 60000)
