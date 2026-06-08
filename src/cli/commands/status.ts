import { VERSION, REPO_ROOT, commandExists } from "../../installer/utils"
import { readManifest } from "../../installer/manifest"

export const cmdStatus = async () => {
  const manifest = await readManifest()

  console.log(`QArness v${VERSION}`)
  console.log(`Установлен в: ${REPO_ROOT}`)
  console.log()

  if (manifest) {
    console.log("Интегрированные AI-инструменты:")
    for (const [hostId, hostData] of Object.entries(manifest.hosts)) {
      console.log(`  ✓ ${hostId} (${hostData.targetDir})`)
    }

    console.log()
    console.log("Компоненты:")
    for (const [featureId, featureData] of Object.entries(manifest.features)) {
      console.log(`  ${featureData.installed ? "✓" : "✗"} ${featureId}`)
    }
  } else {
    console.log("QArness не установлен. Запустите: bun install.ts")
  }

  console.log()
  console.log("Зависимости:")

  const deps = [
    { name: "Git", cmd: "git" },
    { name: "Node.js", cmd: "node" },
    { name: "npm", cmd: "npm" },
    { name: "Bun", cmd: "bun" },
  ]

  for (const dep of deps) {
    console.log(`  ${commandExists(dep.cmd) ? "✓" : "✗"} ${dep.name}`)
  }
}
