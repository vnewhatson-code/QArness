import { REPO_ROOT } from "../../installer/utils"

export const cmdUpdate = async () => {
  console.log("Проверка обновлений...")

  try {
    const result = Bun.spawnSync(
      ["git", "fetch", "origin"],
      { cwd: REPO_ROOT, stdout: "pipe", stderr: "pipe" },
    )

    if (result.exitCode !== 0) {
      console.log("Не удалось проверить обновления")
      return
    }

    const local = Bun.spawnSync(["git", "rev-parse", "@"], {
      cwd: REPO_ROOT,
      stdout: "pipe",
    })
    const remote = Bun.spawnSync(["git", "rev-parse", "@{u}"], {
      cwd: REPO_ROOT,
      stdout: "pipe",
    })

    const localHash = local.stdout.toString().trim()
    const remoteHash = remote.stdout.toString().trim()

    if (localHash === remoteHash) {
      console.log("QArness уже обновлён до последней версии")
      return
    }

    console.log("Доступно обновление. Установка...")

    const pull = Bun.spawnSync(["git", "pull", "origin", "main"], {
      cwd: REPO_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    })

    if (pull.exitCode === 0) {
      console.log("Обновление завершено!")
    } else {
      console.log("Ошибка обновления")
    }
  } catch {
    console.log("Ошибка проверки обновлений")
  }
}
