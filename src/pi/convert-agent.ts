import { parse as parseYaml, stringify as stringifyYaml } from "yaml"

type OpenCodeFrontmatter = {
  description?: string
  mode?: string
  temperature?: number
  tools?: Record<string, boolean> | string
}

type PiSubagentFrontmatter = {
  name?: string
  description?: string
  tools?: string
  systemPromptMode?: string
  inheritProjectContext?: boolean
  inheritSkills?: boolean
}

export function convertAgentToPiFormat(
  content: string,
  defaultName: string,
): string | null {
  // Parse frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const rawYaml = match[1]
  const body = match[2]

  let frontmatter: OpenCodeFrontmatter
  try {
    frontmatter = parseYaml(rawYaml) as OpenCodeFrontmatter
  } catch {
    return null
  }

  // Convert tools format
  let toolsStr: string | undefined
  if (typeof frontmatter.tools === "object" && frontmatter.tools !== null) {
    toolsStr = Object.entries(frontmatter.tools)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ")
  } else if (typeof frontmatter.tools === "string") {
    toolsStr = frontmatter.tools
  }

  // Build pi-subagents frontmatter
  const piFrontmatter: PiSubagentFrontmatter = {
    name: defaultName,
    description: frontmatter.description,
    tools: toolsStr || "read, write, bash",
    systemPromptMode: "replace",
    inheritProjectContext: false,
    inheritSkills: false,
  }

  const yaml = stringifyYaml(piFrontmatter, { lineWidth: 0 })
  return `---\n${yaml}---\n${body}`
}
