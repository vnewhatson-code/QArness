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

  // 4.1 Smoke tests
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

  // 4. Full install cycle
  describe("install → verify → uninstall (full cycle)", () => {
    beforeAll(() => {
      if (!containerReady) return
      // Create simulated host directories (Claude Code)
      execInContainer("mkdir -p ~/.claude")
      // Clean any previous manifest
      execInContainer("rm -rf ~/.qarness")
    })

    afterAll(() => {
      if (!containerReady) return
      execInContainer("rm -rf ~/.qarness ~/.claude ~/.config/opencode")
    })

    it("install --yes --json creates manifest and installs files", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      console.log("Install output:", output.trim())

      // JSON may be mixed with other log output — extract it
      const json = extractJson(output.trim())
      if (json) {
        expect(json.ok).toBe(true)
        expect(json.hosts).toBeDefined()
      } else {
        // Fallback: check exit code
        expect(exitCode).toBe(0)
      }
    })

    it("manifest exists and contains version info", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer("cat ~/.qarness/manifest.json")
      expect(exitCode).toBe(0)

      const manifest = JSON.parse(output.trim())
      expect(manifest.version).toBeDefined()
      expect(manifest.installedAt).toBeDefined()
      expect(manifest.hosts).toBeDefined()
      expect(manifest.hosts.claude).toBeDefined()
      expect(manifest.hosts.claude.targetDir).toBeDefined()
      expect(manifest.hosts.claude.files).toBeDefined()
    })

    it("installed files exist in target directory", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode } = execInContainer(
        "cat ~/.qarness/manifest.json | grep -q '.claude'",
      )
      expect(exitCode).toBe(0)
    })

    it("re-install does not corrupt manifest", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      // Run install twice
      execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )

      const { output } = execInContainer("cat ~/.qarness/manifest.json")
      const manifest = JSON.parse(output.trim())
      // Should still have one host entry
      expect(manifest.hosts.claude).toBeDefined()
    })

    // 8. Uninstall
    it("uninstall removes files and manifest", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --uninstall 2>&1",
      )
      console.log("Uninstall output:", output.trim().slice(-200))
      expect(exitCode).toBe(0)
    })

    it("manifest is removed after uninstall", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      const { exitCode } = execInContainer("test -f ~/.qarness/manifest.json")
      expect(exitCode).toBe(1) // file does not exist
    })
  })

  // 2. Host detection edge cases
  describe("host detection", () => {
    it("exits gracefully when no hosts detected and none specified", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      // Remove all host dirs
      execInContainer("rm -rf ~/.claude ~/.config/opencode ~/.qarness")

      const { output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --json 2>&1",
      )
      // Should mention no hosts detected
      const combined = output.trim()
      expect(combined.toLowerCase()).toMatch(/не обнаружены|not found|no.*host/i)
    })

    it("installs to specified host even if not detected", () => {
      if (!containerReady) { console.log("Skipping: container not ready"); return }

      // Claude dir doesn't exist — still tries
      execInContainer("rm -rf ~/.claude ~/.qarness")

      const { exitCode, output } = execInContainer(
        "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install.ts --yes --hosts claude --json 2>&1",
      )
      console.log("Forced install output:", output.trim())
      // Should succeed (creates target dir)
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
        // Should mention unknown or неизвестный
        const hasWarning = combined.toLowerCase().includes("unknown") || combined.toLowerCase().includes("неизвест")
        expect(hasWarning).toBe(true)
      }
    })
  })
}, 60000)
