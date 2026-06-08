import { existsSync } from "node:fs"
import { cp, mkdir, readdir, readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join, dirname, resolve } from "node:path"

export const REPO_ROOT = resolve(import.meta.dir, "../..")
export const VERSION = existsSync(join(REPO_ROOT, ".version"))
  ? (await readFile(join(REPO_ROOT, ".version"), "utf8")).trim()
  : "unknown"

export const xdgConfig = () => process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
export const manifestPath = () => join(homedir(), ".qarness", "manifest.json")

export const commandExists = (cmd: string): boolean => {
  try {
    const result = Bun.spawnSync(["bash", "-c", `command -v ${cmd}`], {
      stdout: "pipe",
      stderr: "pipe",
    })
    return result.exitCode === 0
  } catch {
    return false
  }
}

export const copyDir = async (src: string, dest: string): Promise<void> => {
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
}

export const copyFile = async (src: string, dest: string): Promise<void> => {
  await mkdir(dirname(dest), { recursive: true })
  await cp(src, dest)
}

export const listItems = async (
  dir: string,
  pattern?: string,
  exclude?: string[],
): Promise<string[]> => {
  if (!existsSync(dir)) return []
  const items = await readdir(dir)
  return items.filter((item) => {
    if (exclude?.includes(item)) return false
    if (pattern) {
      const regex = new RegExp("^(" + pattern.replace(/\*/g, ".*") + ")$")
      if (!regex.test(item)) return false
    }
    return true
  })
}
