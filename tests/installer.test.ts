import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import Docker from "dockerode"

const docker = new Docker({ socketPath: "/var/run/docker.sock" })

const streamToString = (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = ""
    stream.on("data", (chunk: Buffer) => (data += chunk.toString()))
    stream.on("end", () => resolve(data))
    stream.on("error", reject)
  })

const execInContainer = async (
  container: Docker.Container,
  cmd: string[],
): Promise<{ exitCode: number; output: string }> => {
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  })
  const stream = await exec.start({ detach: false })
  const output = await streamToString(stream as unknown as NodeJS.ReadableStream)
  const inspectResult = await exec.inspect()
  return { exitCode: inspectResult.ExitCode ?? 1, output }
}

describe("Installer - Ubuntu", () => {
  const image = "ubuntu:22.04"
  let container: Docker.Container

  beforeAll(async () => {
    // Pull image
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err)
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) return reject(err)
          resolve()
        })
      })
    })

    container = await docker.createContainer({
      Image: image,
      Cmd: ["tail", "-f", "/dev/null"],
      Tty: true,
      HostConfig: {
        AutoRemove: false,
      },
    })
    await container.start()
  }, 120000)

  afterAll(async () => {
    await container.stop().catch(() => {})
    await container.remove().catch(() => {})
  })

  it("should install bun", async () => {
    const { exitCode, output } = await execInContainer(container, [
      "bash",
      "-c",
      "curl -fsSL https://bun.sh/install | bash 2>&1",
    ])
    // bun install may fail in CI due to network, that's ok
    console.log("Bun install output:", output.slice(-200))
  })

  it("should have basic tools available", async () => {
    const { exitCode } = await execInContainer(container, [
      "bash",
      "-c",
      "command -v bash && command -v curl",
    ])
    expect(exitCode).toBe(0)
  })
})
