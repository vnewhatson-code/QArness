#!/usr/bin/env bun
import { VERSION, REPO_ROOT, commandExists } from "../installer/utils"
import { readManifest } from "../installer/manifest"

const usage = () => {
  console.log(`QArness v${VERSION} - AI-инструмент автоматизации QA работы

Использование:
  qarness <команда> [опции]

Команды:
  status              Статус установки и интеграций
  update              Проверка и установка обновлений
  integrate [ai]      Интеграция с AI-ассистентом
  config              Управление конфигурацией
  doctor              Диагностика проблем
  version             Версия QArness
  help                Показать эту справку

Примеры:
  qarness status
  qarness integrate opencode
  qarness config proxy set http://proxy.company.com:8080
  qarness doctor

Документация: https://github.com/vnewhatson-code/QArness`)
}

const commands: Record<string, () => Promise<void>> = {
  status: async () => {
    const { cmdStatus } = await import("./commands/status")
    await cmdStatus()
  },
  update: async () => {
    const { cmdUpdate } = await import("./commands/update")
    await cmdUpdate()
  },
  integrate: async () => {
    const { cmdIntegrate } = await import("./commands/integrate")
    await cmdIntegrate(process.argv[3])
  },
  config: async () => {
    const { cmdConfig } = await import("./commands/config")
    await cmdConfig(process.argv.slice(3))
  },
  doctor: async () => {
    const { cmdDoctor } = await import("./commands/doctor")
    await cmdDoctor()
  },
  remove: async () => {
    const { cmdRemove } = await import("./commands/remove")
    await cmdRemove()
  },
  version: async () => {
    console.log(`QArness v${VERSION}`)
  },
  help: async () => {
    usage()
  },
}

const command = process.argv[2]

if (!command || command === "--help" || command === "-h") {
  usage()
} else if (commands[command]) {
  await commands[command]()
} else {
  console.log(`Неизвестная команда: ${command}`)
  usage()
  process.exit(1)
}
