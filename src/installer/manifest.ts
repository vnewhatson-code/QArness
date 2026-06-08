import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises"
import { dirname } from "node:path"
import { manifestPath } from "./utils"

export type InstallManifest = {
  version: string
  installedAt: string
  hosts: Record<string, { targetDir: string; files: string[] }>
  features: Record<string, { installed: boolean; metadata?: Record<string, unknown> }>
}

export const readManifest = async (): Promise<InstallManifest | null> => {
  const path = manifestPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

export const writeManifest = async (manifest: InstallManifest): Promise<void> => {
  const path = manifestPath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n", "utf8")
}

export const removeManifest = async (): Promise<void> => {
  const path = manifestPath()
  if (existsSync(path)) {
    await unlink(path)
  }
}
