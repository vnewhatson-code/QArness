#!/usr/bin/env bun
import * as p from "@clack/prompts"
import { HOSTS, uninstallHost } from "./src/installer/hosts"
import { FEATURES } from "./src/installer/features"
import { readManifest, removeManifest } from "./src/installer/manifest"
import { VERSION } from "./src/installer/utils"

const main = async () => {
  p.intro(`QArness Uninstaller v${VERSION}`)

  const manifest = await readManifest()
  if (!manifest) {
    p.log.warn("Манифест не найден. Нечего удалять.")
    p.outro("Готово.")
    return
  }

  p.log.info(`Найдена установка v${manifest.version} от ${manifest.installedAt}`)

  const confirm = await p.confirm({
    message: "Удалить QArness?",
    initialValue: false,
  })

  if (p.isCancel(confirm) || confirm !== true) {
    p.cancel("Отменено.")
    return
  }

  const s = p.spinner()

  for (const feature of FEATURES) {
    if (manifest.features[feature.id]?.installed) {
      s.start(`Удаление ${feature.name}...`)
      await feature.uninstall(manifest)
      s.stop(`${feature.name} удалён`)
    }
  }

  for (const [hostId, hostData] of Object.entries(manifest.hosts)) {
    const host = HOSTS.find((h) => h.id === hostId)
    s.start(`Удаление из ${host?.name || hostId}...`)
    await uninstallHost(hostId, hostData, host)
    s.stop(`${host?.name || hostId} удалён`)
  }

  await removeManifest()
  p.outro("QArness полностью удалён.")
}

await main()
