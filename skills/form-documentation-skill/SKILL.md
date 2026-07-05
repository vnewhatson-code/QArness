---
name: form-documentation-skill
description: Skill to check for undocumented forms and generate documentation using form-documenter subagent
---

## What I do
- Check for forms without documentation
- Generate documentation for undocumented forms using the form-documenter subagent
- Process each undocumented form individually

## When to use me
Use this skill when you need to generate documentation for forms that lack documentation.

## How to use
1. First, run the documentation checker to identify missing documentation
2. Then, for each missing form, execute the form-documenter subagent

## Commands
To run the documentation check:
```
node checkFormsDocumentation.js
```

To document a specific form using the form-documenter subagent:
```
document {{formName}} using subagent "form-documenter"
```

## Example workflow
1. Run documentation check: `node checkFormsDocumentation.js`
2. For each form without documentation, call the form-documenter subagent
3. The subagent will generate markdown documentation for the form