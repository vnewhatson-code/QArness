import { REPO_ROOT, commandExists, VERSION } from "../../installer/utils"
import { readManifest } from "../../installer/manifest"

export const cmdDoctor = async () => {
  console.log(`QArness v${VERSION} — Диагностика`)
  console.log()

  let issues = 0

  // Check 1: File integrity
  console.log("Проверка целостности файлов...")
  const required = ["skills", "agents", "config", "src", ".version"]
  for (const dir of required) {
    const { existsSync } = await import("node:fs")
    if (!existsSync(`${REPO_ROOT}/${dir}`)) {
      console.log(`  ✗ Отсутствует: ${dir}`)
      issues++
    }
  }

  // Check 2: Dependencies
  console.log("Проверка зависимостей...")
  const deps = [
    { name: "Git", cmd: "git" },
    { name: "Node.js", cmd: "node" },
    { name: "Bun", cmd: "bun" },
  ]

  for (const dep of deps) {
    if (!commandExists(dep.cmd)) {
      console.log(`  ✗ ${dep.name} не установлен`)
      issues++
    }
  }

  // Check 3: Manifest
  console.log("Проверка манифеста...")
  const manifest = await readManifest()
  if (!manifest) {
    console.log("  ✗ Манифест не найден — запустите: bun install.ts")
    issues++
  } else {
    for (const [hostId, hostData] of Object.entries(manifest.hosts)) {
      const { existsSync } = await import("node:fs")
      if (!existsSync(hostData.targetDir)) {
        console.log(`  ✗ Путь хоста ${hostId} не существует: ${hostData.targetDir}`)
        issues++
      }
    }
  }

  // Check 4: Git repo
  console.log("Проверка Git репозитория...")
  const result = Bun.spawnSync(["git", "rev-parse", "--git-dir"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    console.log("  ✗ Не является Git репозиторием")
    issues++
  }

  // Summary
  console.log()
  if (issues === 0) {
    console.log("✓ Проблем не обнаружено")
  } else {
    console.log(`Обнаружено проблем: ${issues}`)
    console.log()
    console.log("Рекомендации:")
    console.log("  1. Переустановите: bun install.ts --yes")
    console.log("  2. Проверьте зависимости")
  }
}
