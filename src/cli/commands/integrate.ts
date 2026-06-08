import { HOSTS, installHost } from "../../installer/hosts"
import { readManifest, writeManifest } from "../../installer/manifest"
import { VERSION } from "../../installer/utils"

export const cmdIntegrate = async (ai?: string) => {
  if (!ai) {
    console.log("Доступные AI-инструменты для интеграции:")
    for (const h of HOSTS) {
      console.log(`  ${h.id}  -  ${h.name}`)
    }
    console.log()
    console.log("Использование: qarness integrate <id>")
    return
  }

  const host = HOSTS.find((h) => h.id === ai)
  if (!host) {
    console.log(`Неизвестный AI-инструмент: ${ai}`)
    console.log(`Доступные: ${HOSTS.map((h) => h.id).join(", ")}`)
    return
  }

  if (!host.detect()) {
    console.log(`${host.name} не обнаружен`)
    return
  }

  console.log(`Интеграция с ${host.name}...`)

  try {
    const files = await installHost(host)
    const manifest = (await readManifest()) || {
      version: VERSION,
      installedAt: new Date().toISOString(),
      hosts: {},
      features: {},
    }
    manifest.hosts[host.id] = { targetDir: host.targetDir(), files }
    await writeManifest(manifest)
    console.log(`✓ ${host.name}: ${files.length} элементов установлено`)
  } catch (err) {
    console.log(
      `✗ Ошибка: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
