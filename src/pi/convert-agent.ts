function buildYamlFrontmatter(data: Record<string, string | boolean | undefined>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`)
    } else if (typeof value === "string") {
      if (/^[:\{\}\[\]#&\*\?\|<>!%@`]/.test(value) || /\n/.test(value)) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else {
        lines.push(`${key}: ${value}`)
      }
    }
  }
  return lines.join("\n") + "\n"
}

export function convertAgentToPiFormat(
  content: string,
  defaultName: string,
): string | null {
  const normalized = content.replace(/\r\n/g, "\n")
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const body = match[2]

  // Extract tools from OpenCode format
  const rawYaml = match[1]
  let toolsStr = ""

  // Try block format first (tools: \n  read: true)
  const toolLines = rawYaml.split("\n").filter((l) =>
    /^\s+\w+:\s*true\s*$/.test(l),
  )
  if (toolLines.length > 0) {
    toolsStr = toolLines
      .map((l) => l.trim().split(":")[0])
      .filter(Boolean)
      .join(", ")
  }

  // Fallback: try inline format (tools: read, bash)
  if (!toolsStr) {
    const inlineMatch = rawYaml.match(/^tools:\s*(.+)$/m)
    if (inlineMatch) {
      toolsStr = inlineMatch[1].trim()
    }
  }

  // Extract description
  const descMatch = rawYaml.match(/^description:\s*(.+)$/m)
  const description = descMatch ? descMatch[1].trim() : undefined

  // Build pi-subagents frontmatter manually (avoids yaml package quirks)
  const frontmatter = buildYamlFrontmatter({
    name: defaultName,
    description,
    tools: toolsStr || "read, write, bash",
    systemPromptMode: "replace",
    inheritProjectContext: false,
    inheritSkills: false,
  })

  return `---\n${frontmatter}---\n${body}`
}
