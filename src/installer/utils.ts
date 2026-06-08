import { existsSync, statSync } from "node:fs"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
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
  const srcStat = statSync(src)
  if (srcStat.isDirectory()) {
    await mkdir(dest, { recursive: true })
    const entries = await readdir(src)
    for (const entry of entries) {
      await copyDir(join(src, entry), join(dest, entry))
    }
  } else {
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, await readFile(src))
  }
}

export const copyFile = async (src: string, dest: string): Promise<void> => {
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, await readFile(src))
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
