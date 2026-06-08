export type CliArgs = {
  yes: boolean
  uninstall: boolean
  json: boolean
  hosts: string[]
  features: string[]
  help: boolean
}

export const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    yes: false,
    uninstall: false,
    json: false,
    hosts: [],
    features: [],
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--yes":
      case "-y":
        args.yes = true
        break
      case "--uninstall":
      case "--remove":
        args.uninstall = true
        break
      case "--json":
      case "-j":
        args.json = true
        args.yes = true
        break
      case "--hosts":
        args.hosts = (argv[++i] || "").split(",").filter(Boolean)
        break
      case "--features":
        args.features = (argv[++i] || "").split(",").filter(Boolean)
        break
      case "--help":
      case "-h":
        args.help = true
        break
    }
  }
  return args
}
