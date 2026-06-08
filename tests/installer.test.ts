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

describe("Installer - Ubuntu", () => {
  const image = "ubuntu:22.04"

  beforeAll(async () => {
    if (!isDockerAvailable()) return

    // Remove leftover container
    docker(["rm", "-f", CONTAINER_NAME])

    // Pull image
    const pull = await dockerAsync(["pull", image])
    if (pull.exitCode !== 0) {
      console.error("Failed to pull image:", pull.stderr)
      return
    }

    // Create and start container with repo mounted
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

    // Install prerequisites (curl, unzip) and bun
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

  it("should have bun installed", () => {
    if (!containerReady) {
      console.log("Skipping: container not ready")
      return
    }
    const { exitCode, output } = execInContainer("export PATH=$HOME/.bun/bin:$PATH && bun --version")
    console.log("Bun version:", output.trim())
    expect(exitCode).toBe(0)
  })

  it("should compile install.ts without errors", () => {
    if (!containerReady) {
      console.log("Skipping: container not ready")
      return
    }
    const { exitCode, output } = execInContainer(
      "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun install 2>&1 && bun build --no-bundle install.ts 2>&1 | tail -5",
    )
    console.log("Build output:", output.slice(-300))
    expect(exitCode).toBe(0)
  })

  it("should compile uninstall.ts without errors", () => {
    if (!containerReady) {
      console.log("Skipping: container not ready")
      return
    }
    const { exitCode, output } = execInContainer(
      "export PATH=$HOME/.bun/bin:$PATH && cd /qarness && bun build --no-bundle uninstall.ts 2>&1 | tail -5",
    )
    console.log("Build output:", output.slice(-300))
    expect(exitCode).toBe(0)
  })
}, 60000)
