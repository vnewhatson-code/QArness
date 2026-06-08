import { readManifest, writeManifest } from "../../installer/manifest"

export const cmdConfig = async (args: string[]) => {
  const subcommand = args[0]

  switch (subcommand) {
    case "proxy": {
      const action = args[1]
      switch (action) {
        case "set": {
          const url = args[2]
          if (!url) {
            console.log("Использование: qarness config proxy set <url>")
            return
          }
          const manifest = await readManifest()
          if (manifest) {
            manifest.features["proxy"] = { installed: true, metadata: { url } }
            await writeManifest(manifest)
          }
          console.log(`Прокси установлен: ${url}`)
          break
        }
        case "clear": {
          const manifest = await readManifest()
          if (manifest) {
            delete manifest.features["proxy"]
            await writeManifest(manifest)
          }
          console.log("Прокси удалён")
          break
        }
        default:
          console.log("Использование: qarness config proxy <set|clear> [url]")
      }
      break
    }
    case "show": {
      const manifest = await readManifest()
      if (manifest) {
        console.log(JSON.stringify(manifest, null, 2))
      } else {
        console.log("Конфигурация не найдена")
      }
      break
    }
    default:
      console.log("Доступные настройки:")
      console.log("  proxy  - Настройка прокси")
      console.log("  show   - Показать конфигурацию")
      console.log()
      console.log("Использование: qarness config <setting> <action> [value]")
  }
}
