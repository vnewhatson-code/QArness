import { HOSTS, uninstallHost } from "../../installer/hosts"
import { FEATURES } from "../../installer/features"
import { readManifest, removeManifest } from "../../installer/manifest"

export const cmdRemove = async () => {
  console.log("Удаление QArness...")
  console.log("ВНИМАНИЕ: Это удалит QArness и все его файлы")
  console.log()

  const manifest = await readManifest()
  if (!manifest) {
    console.log("Манифест не найден. QArness не установлен.")
    return
  }

  // Remove features
  for (const feature of FEATURES) {
    if (manifest.features[feature.id]?.installed) {
      console.log(`Удаление ${feature.name}...`)
      await feature.uninstall(manifest)
    }
  }

  // Remove from hosts
  for (const [hostId, hostData] of Object.entries(manifest.hosts)) {
    const host = HOSTS.find((h) => h.id === hostId)
    console.log(`Удаление из ${host?.name || hostId}...`)
    await uninstallHost(hostId, hostData, host)
  }

  await removeManifest()
  console.log("QArness полностью удалён.")
}
