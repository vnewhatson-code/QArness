---
name: checklist-generator
description: Generates testing checklists from feature information. The skill supports three modes - 1) with analytics file and task number, 2) with analytics file only, 3) with task number only. When task number is provided, searches for related git commits and analyzes changes. Creates CHECKLIST.md file in docs/QA/[feature_name]/ directory.
---

# Checklist Generator for Testing

This skill generates QA checklists in `docs/QA` using source evidence from analytics files and/or git commits.

## Non-negotiable Rules (MUST)

1. Follow one of three modes only:
   - Mode 1: task number + analytics file
   - Mode 2: analytics file only
   - Mode 3: task number only
2. If task number is provided, search commits first.
3. STOP and report failure if no evidence (commits or relevant analytics) is found. Do not invent details.
4. Use evidence from commits and/or analytics ONLY if they are explicitly relevant to the task ID.
5. Output checklist content only in Russian.
6. Write checklist items as noun phrases, not imperative verbs.
7. Create or update only `docs/QA/[feature_name]/CHECKLIST.md`.
8. Include only sections that are explicitly supported by evidence.
9. Before EVERY generation, check `docs/Speciality/`.
10. If `docs/Speciality/SPECIALITY.md` exists, use it as an additional evidence source.
11. In `docs/Speciality/`, only one markdown file is allowed: `SPECIALITY.md`.

## Prohibited (MUST NOT)

1. Do not generate a generic checklist unrelated to task evidence.
2. Do not skip commit search when task number is present.
3. Do not use random files from `docs/QA/__workspace_inbox__/` if they don't match the task ID or its numeric part.
4. Do not phrase checks as action verbs:
   - Wrong: "Проверить ...", "Убедиться ...", "Протестировать ..."
   - Correct: "Создание ...", "Наличие ...", "Сообщение ..."
5. Do not add a separate regression section by default.
6. Do not include code internals (function names, technical implementation details) in checklist items.
7. Do not add generic non-functional checks unless such requirements are explicitly present in commits/analytics.
8. Do not use generic vague terms like "компоненты", "система", "функционал", "корректная работа" without specific context found in evidence.
9. Do not read other `.md` files from `docs/Speciality/` if they are not `SPECIALITY.md`.

## Input Modes

Mode 1 (task + analytics):
- task number is provided by user
- analytics file exists in `docs/QA/__workspace_inbox__/`
- user explicitly asked to use analytics/inbox file OR analytics is explicitly linked to this task (task id mention)

Mode 2 (analytics only):
- no task number
- analytics file exists in `docs/QA/__workspace_inbox__/`

Mode 3 (task only):
- task number is provided
- no relevant analytics file

If neither task nor analytics exists, return a short request for missing data.

## Deterministic Workflow

Hard mode selector (apply exactly):

1. If user request contains task id and does not mention inbox/analytics/file -> Mode 3.
2. If user request contains task id and explicitly mentions inbox/analytics/file -> Mode 1.
3. If user request has no task id and analytics file exists -> Mode 2.
4. Otherwise request missing inputs.

Important:
- Presence of files in `docs/QA/__workspace_inbox__/` alone must not switch task requests to Mode 1.
- Example: `напиши чек-лист для задачи Diadoc1c-4935` is Mode 3.
- Example: `напиши чек-лист для задачи Diadoc1c-4935, используй файл из inbox` is Mode 1.

### Step 1. Detect available inputs

1. Parse user request and extract task id if present.
2. Check analytics files in `docs/QA/__workspace_inbox__/`.
3. Check `docs/Speciality/`:
   - if folder does not exist, continue without speciality data;
   - if folder exists and contains `.md` files other than `SPECIALITY.md`, STOP with message: "Нарушено правило единого файла особенностей: в docs/Speciality должен быть только SPECIALITY.md.";
   - if `docs/Speciality/SPECIALITY.md` exists, read it and extract candidate speciality facts.
4. Deduplicate speciality facts before checklist generation (same meaning with different wording should be treated as one fact).
5. If task id exists, mark analytics as relevant ONLY when at least one rule is true:
   - analytics file name contains task id or its numeric part;
   - analytics text mentions task id;
   - user explicitly asks to use analytics/inbox file.
   IF NO RULES ARE TRUE, ANALYTICS IS NOT RELEVANT FOR THIS TASK.
6. Select mode according to hard mode selector above.

### Step 2. Collect evidence

If task id exists (Mode 1 or Mode 3), commit search is mandatory.

Recommended commit search sequence:

```bash
git log --all --grep="<task_id>" --pretty=format:"%H|%s|%an|%ad" --date=short
git log --all --grep="<task_id_lowercase>" --pretty=format:"%H|%s|%an|%ad" --date=short
git log --all --grep="<task_numeric_part>" --pretty=format:"%H|%s|%an|%ad" --date=short
```

Notes:
- For requests like `Diadoc1c-4935`, include exact search for `Diadoc1c-4935`.
- If exact match returns results, use them as primary evidence.
- If multiple variants return results, deduplicate by commit hash.

If commits were found:
- collect changed files via `git show <hash> --name-only --pretty=format:""`
- pick 2-3 most relevant files (e.g. .bsl, .feature, .xml with logic)
- MUST use `git show <hash> -- <file_path>` to read actual code changes for these files
- identify specific functional changes: new UI elements, modified conditions, added fields, changed validation rules
- MUST find at least 3 specific technical or functional facts to avoid generic items

If commits were NOT found and task id was provided:
- MUST check if any RELEVANT analytics exists (per Step 1.3).
- IF NO RELEVANT ANALYTICS: STOP IMMEDIATELY. Output: "Данные для задачи <id> не найдены (нет коммитов и релевантной аналитики). Генерация невозможна."
- DO NOT use unrelated files from docs/QA/__workspace_inbox__/.
- continue with analytics only if it was marked as relevant in Step 1.


If analytics exists:
- read analytics file from `docs/QA/__workspace_inbox__/`
- extract key scenarios, conditions, and constraints

If `docs/Speciality/SPECIALITY.md` exists:
- extract reusable feature/interface/implementation specifics
- mark speciality facts as relevant when they match task id, feature name, or request context
- use relevant speciality facts as additional evidence for checklist bullets

### Step 3. Branch logic by mode

Mode 1:
- use both sources (commits + analytics)
- analytics defines business intent, commits refine implementation impact
- if commits are not found, stop and ask user to verify task id or explicitly confirm analytics file

Mode 2:
- use analytics as primary source
- optionally inspect related code by keywords from analytics

Mode 3:
- use commit evidence as primary source
- if no commits found, ask user to verify task id or explicitly request analytics-based generation

### Step 4. Build checklist structure

Use template from `templates/CHECKLIST.md` as baseline.

Checklist must include:
1. Feature name and short description
2. Numbered categories with bullet checks
3. Concise, practical checks for manual QA

Recommended categories (adapt to evidence):
- Основной функционал
- Граничные случаи и валидация
- Негативные сценарии
- UI/UX
- Интеграции и зависимости
- Дополнительные проверки

Include only categories relevant to task evidence.
Do not add "Нефункциональные проверки" unless non-functional requirements are explicitly present in commits/analytics.
Include relevant facts from `docs/Speciality/SPECIALITY.md` in existing categories when they match context.

Category inclusion rules:
- Include section only if at least 2 checklist bullets in that section can be directly justified by source evidence.
- If evidence is missing, omit the section entirely.
- Before saving, remove any section that contains mostly generic checks not tied to task data.

### Step 5. Apply phrasing rules

Every checklist bullet must be a noun phrase.

Good examples:
- Создание документа из входящего ЭД
- Наличие кнопки "Подписать"
- Сообщение об ошибке при отсутствии прав
- Обработка пустых значений поля

Bad examples:
- Проверить создание документа
- Убедиться, что кнопка есть
- Протестировать обработку ошибок

### Step 6. Save result

1. Determine feature folder name (Russian human-readable name when possible).
2. Create/update `docs/QA/[feature_name]/CHECKLIST.md`.
3. Return generated file path.

## Error Handling

- No task id and no analytics: ask user to provide one of them.
- Task id provided, commits not found, analytics absent: ask to verify task id or provide analytics.
- Git command failure: report git access problem briefly.
- Feature name cannot be derived: ask user for folder name suggestion.
- `docs/Speciality/` has extra `.md` files: stop with fixed message about single-file rule.

## Checklist Quality Gate

Before finalizing, validate:

1. All checks are tied to evidence from commits/analytics.
2. No imperative verbs in checklist items.
3. No obvious duplication.
4. Wording is short and actionable.
5. Content is in Russian.
6. Every section has evidence-backed bullets; unsupported sections removed.
7. Duplicate speciality facts were merged before final checklist generation.

## Example Mode Behavior

### Example A: task with commits

User: `Напиши чек-лист для задачи Diadoc1c-4935`

Expected behavior:
1. Find commits by `Diadoc1c-4935`.
2. Analyze commit messages and changed files.
3. Infer fix/feature essence.
4. Generate focused checklist in `docs/QA/[feature_name]/CHECKLIST.md`.

### Example B: task not found

User: `Напиши чек-лист для задачи Diadoc1c-999999`

Expected behavior:
1. Search commits.
2. If nothing found and no analytics file is available, request additional input.
3. Do not generate generic checklist.
