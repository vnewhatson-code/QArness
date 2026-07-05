import { describe, it, expect } from "bun:test"
import { convertAgentToPiFormat } from "../../src/pi/convert-agent"

describe("convertAgentToPiFormat", () => {
  it("converts OpenCode format to pi-subagents format", () => {
    const input = `---
description: Test agent for stuff
mode: subagent
temperature: 0.3
tools:
  read: true
  write: true
  bash: true
---
# Test Agent
Do the thing.`
    const result = convertAgentToPiFormat(input, "test-agent")
    expect(result).not.toBeNull()

    // Should have name in frontmatter
    expect(result).toContain("name: test-agent")
    // Should have systemPromptMode
    expect(result).toContain("systemPromptMode: replace")
    // Should have tools as comma-separated string
    expect(result).toContain("tools: read, write, bash")
    // Should have inherit fields
    expect(result).toContain("inheritProjectContext: false")
    expect(result).toContain("inheritSkills: false")
    // Should preserve body
    expect(result).toContain("# Test Agent")
    expect(result).toContain("Do the thing.")
    // Should NOT have OpenCode-specific fields
    expect(result).not.toContain("mode: subagent")
    expect(result).not.toContain("temperature:")
  })

  it("handles files without frontmatter", () => {
    const result = convertAgentToPiFormat("Just body text", "test")
    expect(result).toBeNull()
  })

  it("handles string tools format", () => {
    const input = `---
description: Simple agent
tools: read, bash
---
Body`
    const result = convertAgentToPiFormat(input, "simple")
    expect(result).not.toBeNull()
    expect(result).toContain("tools: read, bash")
  })

  it("handles empty tools", () => {
    const input = `---
description: No tools
---
Body`
    const result = convertAgentToPiFormat(input, "no-tools")
    expect(result).not.toBeNull()
    expect(result).toContain("tools: read, write, bash")
  })

  it("handles invalid YAML gracefully", () => {
    const input = `---
description: "unclosed
tools: [bad
---
Body`
    const result = convertAgentToPiFormat(input, "bad-yaml")
    expect(result).toBeNull()
  })

  it("handles CRLF (Windows) line endings", () => {
    const input = "---\r\ndescription: Test agent\r\nmode: subagent\r\ntools:\r\n  read: true\r\n  write: true\r\n  bash: true\r\n---\r\n\r\n# Test Agent"
    const result = convertAgentToPiFormat(input, "test-agent")
    expect(result).not.toBeNull()
    expect(result).toContain("name: test-agent")
    expect(result).toContain("tools: read, write, bash")
    expect(result).toContain("# Test Agent")
  })
})
