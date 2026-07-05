---
name: checklist-generator
description: "Generates QA checklists in docs/QA using three modes: (1) task + relevant analytics, (2) analytics only, (3) task only. For task-based requests, inbox lookup by task id is mandatory before mode selection."
---

# Checklist Generator (Lite)

All instructions are in English.
Final checklist must be written in Russian only.

This skill generates QA checklists in `docs/QA` using evidence from:
- `docs/QA/__workspace_inbox__/` (analytics)
- git commits
- `docs/Speciality/SPECIALITY.md` (optional additional evidence)

## Input Modes (exactly 3)

1. **Mode 1: task + analytics**
   - task id exists in request
   - relevant analytics file is found (by task-id match or context-title fallback)

2. **Mode 2: analytics only**
   - no task id in request
   - analytics file exists

3. **Mode 3: task only**
   - task id exists in request
   - no relevant analytics file found

If neither task id nor analytics exists, ask for missing input.

## Deterministic Mode Selector

Apply exactly:

```text
IF task_id exists:
  search relevant analytics in inbox
  IF found -> Mode 1
  ELSE -> Mode 3
ELSE:
  IF any analytics exists -> Mode 2
  ELSE -> ask for missing input
```

For task-based requests, inbox analytics lookup is mandatory before mode selection.
Commit search is forbidden until inbox lookup is completed.

## Non-negotiable Rules

1. Use only one of the three modes above.
2. For task-based requests, search analytics relevance in strict order:
   - full task id in file name
   - numeric part in file name
   - full task id in file text
   - numeric part in file text
3. If task-id match is not found and request contains feature title/context, allow fallback context match:
   - normalize text to lowercase; ignore brackets and punctuation
   - use 3-5 key tokens from request context (after task id)
   - consider analytics relevant if at least 2 tokens match file name or file content
4. If multiple analytics files match, choose by priority:
   - full id match before numeric-only
   - task-id match before context fallback match
   - newest modified file inside same priority
5. Use only evidence relevant to request/task id.
6. Do not invent details when evidence is missing.
7. Checklist content must be in Russian.
8. Checklist bullets must be noun phrases (no imperative verbs).
9. Create or update only `docs/QA/[feature_name]/CHECKLIST.md`.
10. Include only evidence-backed sections and bullets.
11. Do not include code internals (function names or low-level implementation details) in checklist bullets.
12. Before generation, check `docs/Speciality/`:
    - only one `.md` is allowed there: `SPECIALITY.md`
    - if `SPECIALITY.md` exists, use relevant facts from it

## Scope Limits (for weak model)

- Analytics files: max 1 relevant file.
- Commits: default max 2 commits.
- Adaptive escalation: allow up to 3 commits only if evidence is insufficient after 2 commits.
- Files per commit: max 2 relevant files.
- Final checklist size: 8-12 bullets.
- Sections: 3-5 sections only.

Evidence is insufficient when at least one is true:
- fewer than 5 specific facts extracted,
- facts cover only one checklist category.

## Workflow

### Step 1. Detect Inputs

1. Extract task id (if present).
2. Check analytics files in `docs/QA/__workspace_inbox__/`.
3. Resolve analytics relevance:
   - first by task-id match rules,
   - then by context-title fallback only if task-id match is absent.
4. Print preflight trace before continuing:
   - `Inbox scan: <N> files; task-id match: <file|none>; context match: <file|none>; selected mode: <Mode 1|Mode 2|Mode 3>`
5. Check `docs/Speciality/` single-file rule.
6. Select mode using deterministic selector.

### Step 2. Collect Evidence

- **Mode 1**: analytics is primary; commits enrich if available.
- **Mode 2**: analytics is primary.
- **Mode 3**: commits are primary.

For task-based requests, commit search order:

```bash
git log --all --grep="<task_id>" --pretty=format:"%H|%s|%an|%ad" --date=short
git log --all --grep="<task_id_lowercase>" --pretty=format:"%H|%s|%an|%ad" --date=short
git log --all --grep="<task_numeric_part>" --pretty=format:"%H|%s|%an|%ad" --date=short
```

Start commit search only after preflight trace is produced.

If commits are found:
1. Deduplicate by commit hash.
2. Analyze up to limit (default 2, adaptive max 3).
3. For each commit, inspect changed files and read up to 2 relevant files.
4. Extract concrete functional facts (UI changes, conditions, fields, validations, flows).

If task id exists and commits are not found:
- if relevant analytics exists -> continue with analytics evidence.
- if relevant analytics does not exist -> stop with fixed error message.

### Step 3. Generate Checklist

Use `templates/CHECKLIST.md` as baseline format.

Recommended sections (include only when evidence supports):
- Основной функционал
- Граничные случаи и валидация
- Негативные сценарии
- UI/UX
- Интеграции и зависимости

Do not add non-functional checks unless evidence explicitly requires them.

### Step 4. Save Result

1. Determine `feature_name` (human-readable, Russian if possible).
2. Save to `docs/QA/[feature_name]/CHECKLIST.md`.
3. Return file path.

## Fixed Error Messages

1. Missing inputs:
   - `Недостаточно данных: укажите task id или analytics-файл из docs/QA/__workspace_inbox__/.`

2. No evidence for task id:
   - `Данные для задачи <id> не найдены (нет коммитов и релевантной аналитики). Генерация невозможна.`

3. Invalid Speciality folder:
   - `Нарушено правило единого файла особенностей: в docs/Speciality должен быть только SPECIALITY.md.`

## Quality Gate (before save)

1. Every checklist bullet is directly evidence-backed.
2. No imperative bullet wording.
3. No duplicates by meaning.
4. Checklist text is fully in Russian.
5. Remove sections without strong evidence.
