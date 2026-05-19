---
name: mindmap-generator
description: Generates mind maps for testing from feature information. The skill is activated when the user requests to create a mind map. The skill checks if the feature information is prepared in docs\QA\__workspace_inbox__, and if so, continues the mind map creation process according to generalized rules. It also analyzes the source code to compile a list of checks for the QA engineer.
---

# Mind Map for Testing

This skill automatically creates mind maps for testing in the `docs/QA` directory based on feature information provided by the user.

## How to Use

1. The user requests to create a mind map
2. The skill checks if the feature information is prepared in `docs\QA\__workspace_inbox__`
3. If the information is not prepared, the skill informs the user that they need to add feature information in the form of a text file
4. If the information is prepared, the skill proceeds with the task

## Work Process

### Step 1: Check Data Preparation
- The skill checks for files in `docs\QA\__workspace_inbox__`
- If files are missing - informs the user that they need to prepare a file with feature information
- If the data is prepared - moves to the next step

### Step 2: Analyze Incoming Files and Source Code
- Determines the feature name based on file contents
- Checks if test documentation already exists for this feature
- Runs the `@explore` sub-agent to analyze source code from recent commits related to the feature
- Compiles a list of checks for the QA engineer based on source code analysis

### Step 3: User Confirmation
- If documentation exists - requests user confirmation
- If documentation does not exist - suggests a Russian name for the feature folder
- Requests confirmation to create the feature folder

### Step 4: Generate Mind Map
- Creates `MINDMAP.md` file in the feature folder, copying the template from the `templates` folder
- Follows generalized rules for mind map structure defined by the template

### Step 5: Check for Necessary Changes
- After creating the `MINDMAP.md` file, asks the user if anything needs to be changed
- If the user responds that changes are needed - allows making edits until confirmed that the xmind file can be created
- If the user responds that the file can be created - proceeds to the next step

### Step 6: Create XMind File
- Creates `mindmap.xmind` file in the feature folder based on the content of `MINDMAP.md`
- Uses the xmind mcp server to convert markdown to xmind format

## What is a Feature Test Check Mind Map for a QA Engineer

A feature test check mind map for a QA engineer is a structured diagram that represents a systematic set of test cases and checks needed for complete testing of the feature's functionality. It includes:

### Main Components:
1. **Центральный раздел** - main feature functionality
2. **Категории проверок** - analysis and breakdown into subsections by action/parameter/value technique
3. **Общие проверки** - checks related to the entire feature as a whole
4. **Проверки по категориям** - specific test cases for each category
5. **Специфические сценарии** - category including special boundary cases and non-trivial scenarios
6. **Условия и сценарии** - situations when checks should be performed
7. **Результаты** - expected outcomes of checks

The mind map should account for major testing directions (functional, non-functional, UI/UX, test design techniques, etc.).

### Purpose of the Test Check Mind Map:
- Ensure complete coverage of all functionality aspects
- Structure the testing process for efficient QA engineer work
- Provide clear recommendations for testing
- Minimize the risk of missed checks

### Advantages of Using:
- Systematization of testing
- Simplification of test case planning and execution
- Improved testing quality through complete coverage
- Easier documentation of testing results
- Reduced probability of errors during testing

## Rules for Creating Mind Maps

1. **Analysis of Description Structure**
   - Highlight key sections and subsections
   - Define hierarchy of conditions and scenarios
   - Separate main scenarios from alternative ones
   - Consider dependencies between elements

2. **Mind Map Structure**
   - **Центральный раздел** - main functionality or goal
   - **Главный раздел** - configurations specified in the feature information file/ general for all configuration checks
   - **Подраздел** - specific behavior scenarios
   - **Условия** - criteria for transitioning between scenarios
   - **Итоги** - results of scenario execution

3. **Logical Organization**
   - Follow logical sequence of scenarios
   - Consider relationships between various conditions
   - Consider alternative paths and backup options
   - Ensure complete coverage of all described cases

4. **Quality Control**
   - Check logical sequence of scenarios
   - Ensure all described conditions are accounted for
   - Verify scenarios match the description
   - Ensure there are no contradictions
   - Ensure complete coverage of all possible behavior paths

5. **Flexibility and Scalability**
   - Create a structure that is easy to extend
   - Use universal categories independent of specifics
   - Enable adaptation to different types of descriptions
   - Structure information so it's understandable for reuse

## Input Data Requirements

Input data must be located in the `docs\QA\__workspace_inbox__` folder and contain information about the feature that needs to be covered with test documentation.

## Output Data Requirements

Output files:
- `docs/QA/[feature_name]/MINDMAP.md`
- `docs/QA/[feature_name]/mindmap.xmind`

The file must contain a fully structured mind map according to generalized rules, including a list of checks for the QA engineer. All content in the final document must be in Russian language.