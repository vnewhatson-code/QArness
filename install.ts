#!/usr/bin/env bun
import * as p from "@clack/prompts"
import { VERSION, REPO_ROOT, manifestPath } from "./src/installer/utils"
import { HOSTS, installHost, uninstallHost } from "./src/installer/hosts"
import { FEATURES } from "./src/installer/features"
import { readManifest, writeManifest, removeManifest, type InstallManifest } from "./src/installer/manifest"
import { parseArgs, type CliArgs } from "./src/installer/cli"

const helpText = `QArness Installer v${VERSION}

Usage:
  bun install.ts              # Interactive TUI installer
  bun install.ts --yes        # Install all detected hosts
  bun install.ts --uninstall  # Remove everything
  bun install.ts --hosts opencode,claude --features xmind-mcp
  bun install.ts --yes --json # AI agent JSON output

Options:
  --yes, -y          Auto-install all detected hosts and features
  --json, -j         Structured JSON output (implies --yes)
  --uninstall        Remove all installed files
  --hosts <list>     Comma-separated: opencode,claude
  --features <list>  Comma-separated: xmind-mcp
  --help, -h         Show this help
`

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(helpText)
    return
  }

  // --- Uninstall ---
  if (args.uninstall) {
    p.intro("QArness Uninstaller")

    const manifest = await readManifest()
    if (!manifest) {
      p.log.warn("Файл манифеста не найден. Нечего удалять.")
      p.outro("Готово.")
      return
    }

    p.log.info(`Найдена установка v${manifest.version} от ${manifest.installedAt}`)
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
    return
  }

  // --- Install ---
  p.intro(`QArness Installer v${VERSION}`)

  // Phase 1: Detect hosts
  const detected = HOSTS.filter((h) => h.detect())
  const notDetected = HOSTS.filter((h) => !h.detect())

  for (const h of detected) p.log.success(`${h.name} обнаружен`)
  for (const h of notDetected) p.log.warn(`${h.name} не найден`)

  if (detected.length === 0 && args.hosts.length === 0) {
    p.log.error("Поддерживаемые AI-инструменты не обнаружены. Установите OpenCode или Claude Code.")
    p.outro("Нечего устанавливать.")
    return
  }

  // Phase 2: Select hosts
  let selectedHostIds: string[]

  if (args.yes || args.hosts.length > 0) {
    selectedHostIds = args.hosts.length > 0 ? args.hosts : detected.map((h) => h.id)
  } else {
    const result = await p.multiselect({
      message: "Куда установить QArness?",
      options: detected.map((h) => ({ value: h.id, label: h.name, hint: h.targetDir() })),
      initialValues: detected.map((h) => h.id),
      required: true,
    })
    if (p.isCancel(result)) {
      p.cancel("Отменено.")
      return
    }
    selectedHostIds = result as string[]
  }

  // Phase 3: Select features
  const availableFeatures = FEATURES.filter((f) =>
    selectedHostIds.some((hid) => {
      const host = HOSTS.find((h) => h.id === hid)
      return host !== undefined
    }),
  )

  let selectedFeatureIds: string[]

  if (args.yes || args.features.length > 0) {
    selectedFeatureIds =
      args.features.length > 0 ? args.features : availableFeatures.map((f) => f.id)
  } else {
    if (availableFeatures.length > 0) {
      const result = await p.multiselect({
        message: "Выберите дополнительные компоненты:",
        options: availableFeatures.map((f) => ({ value: f.id, label: f.name, hint: f.hint })),
        initialValues: availableFeatures.map((f) => f.id),
        required: false,
      })
      if (p.isCancel(result)) {
        p.cancel("Отменено.")
        return
      }
      selectedFeatureIds = result as string[]
    } else {
      selectedFeatureIds = []
    }
  }

  // Phase 4: Install hosts
  const s = p.spinner()
  const existingManifest = await readManifest()
  const manifest: InstallManifest = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    hosts: { ...(existingManifest?.hosts ?? {}) },
    features: { ...(existingManifest?.features ?? {}) },
  }

  let hostInstallFailed = false
  const successfulHostIds: string[] = []

  for (const hostId of selectedHostIds) {
    const host = HOSTS.find((h) => h.id === hostId)
    if (!host) {
      p.log.warn(`Неизвестный хост "${hostId}". Доступные: ${HOSTS.map((h) => h.id).join(", ")}`)
      hostInstallFailed = true
      continue
    }

    s.start(`Установка в ${host.name}...`)
    try {
      const files = await installHost(host)
      manifest.hosts[hostId] = { targetDir: host.targetDir(), files }
      successfulHostIds.push(hostId)
      s.stop(`${host.name}: ${files.length} элементов установлено`)
    } catch (err) {
      hostInstallFailed = true
      s.stop(
        `${host.name}: ошибка — ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // Phase 5: Install features
  for (const featureId of successfulHostIds.length > 0 ? selectedFeatureIds : []) {
    const feature = FEATURES.find((f) => f.id === featureId)
    if (!feature) {
      p.log.warn(
        `Неизвестный компонент "${featureId}". Доступные: ${FEATURES.map((f) => f.id).join(", ")}`,
      )
      continue
    }

    s.start(`Настройка ${feature.name}...`)
    const result = await feature.install(successfulHostIds, REPO_ROOT)
    const success = !result.includes("failed") && !result.includes("not found")
    manifest.features[featureId] = { installed: success }
    s.stop(result)
  }

  // Phase 6: Write manifest
  await writeManifest(manifest)

  if (args.json) {
    console.log(
      JSON.stringify({
        ok: !hostInstallFailed,
        version: VERSION,
        hosts: Object.keys(manifest.hosts),
        features: Object.fromEntries(
          Object.entries(manifest.features).map(([k, v]) => [k, v.installed]),
        ),
      }),
    )
  } else {
    p.log.info(`Манифест записан в ${manifestPath()}`)
    if (hostInstallFailed) {
      p.outro(
        `Завершено с ошибками. v${VERSION} установлено в ${Object.keys(manifest.hosts).length}/${selectedHostIds.length} хост(ов).`,
      )
    } else {
      p.outro(
        `Готово! v${VERSION} установлено в ${selectedHostIds.length} хост(ов) с ${selectedFeatureIds.length} компонент(ами).`,
      )
    }
  }

  if (hostInstallFailed) {
    process.exitCode = 1
  }
}

await main()
