Feature: Resume Adaptation
  Generate an ATS-optimized, human-authentic adapted resume via the Writer→Scorer(ATS)→Reviewer(Humanizer) LangGraph pipeline (Graph 2).

  Background:
    Given the Career Coach app is running
    And the user has career profile, work experiences, and a base resume draft in SQLite
    And company research exists in the "research" table for the target job
    And LangGraph Graph 2 (Writer→Scorer→Reviewer) is compiled and ready
    And the Mistral LLM is available

  # REQ-GENR-01
  Scenario: Generate adapted resume via Writer→Scorer→Reviewer pipeline
    Given the user is viewing the job detail
    And the "Resume" tab shows "Click Generate Resume to create an adapted version"
    When the user clicks "Generate Resume"
    Then a streaming channel "document:resume:stream:<requestId>" is created
    And the Writer agent generates a draft from the base resume, job description, company research, profile, and experiences
    And the Scorer agent evaluates ATS match (target >= 85%)
    And the Reviewer agent evaluates human authenticity (target >= 80%)
    And streaming events are received: start, chunk (×N), score, feedback, personalization, done
    And when "done" is received, the adapted resume is persisted to the "adapted_resumes" table
    And the editor switches to editable mode
    And the score panel shows final ATS and Human scores

  # REQ-GENR-02
  Scenario: Writer agent produces initial draft from inputs
    When the Writer agent is invoked
    Then it reads inputs from SQLite:
      | career_profile  | Career profile (Colors/DISC, drivers, values) |
      | work_experiences | Work experiences (quantified, STAR format)    |
      | resume_draft    | Base resume (comprehensive kitchen-sink)      |
      | jobs.description | Job description                              |
      | research.*      | Company research (all 5 sections)             |
    And the Writer generates a draft tailored to maximize ATS keyword match while sounding authentic
    And the draft is returned in clean Markdown

  # REQ-GENR-03
  Scenario: Scorer agent evaluates ATS match (target 85%)
    When the Scorer agent is invoked on a draft
    Then it evaluates across four dimensions:
      | Dimension              | Weight | Criteria                                    |
      | Keyword match          | 40%    | How many JD keywords appear naturally?      |
      | Missing qualifications | 30%    | Are any hard requirements absent?           |
      | Structure/formatting   | 20%    | Standard sections, ATS-parseable            |
      | Seniority alignment    | 10%    | Does the tone match the role's level?       |
    And the Scorer returns JSON: { atsScore, passed, feedback }
    And "passed" is true when atsScore >= 85
    And if atsScore < 85, feedback includes specific, actionable items

  # REQ-GENR-04
  Scenario: Reviewer agent evaluates human authenticity (target 80%)
    When the Reviewer agent is invoked on a draft
    Then it detects and flags AI tells: em-dashes, GPT-isms, robotic cadence, over-polished text, bullet homogeneity, excessive adjectives
    And the Reviewer scores across four dimensions:
      | Dimension              | Weight |
      | Lexical naturalness    | 35%    |
      | Sentence variety       | 25%    |
      | Voice consistency      | 25%    |
      | Imperfection tolerance | 15%    |
    And the Reviewer returns JSON: { humanScore, passed, feedback, suggestions }
    And "passed" is true when humanScore >= 80

  # REQ-GENR-05
  Scenario: Max 5 iterations with feedback loops
    Given the Writer→Scorer→Reviewer pipeline is running
    And the iteration counter starts at 1
    When both Scorer and Reviewer evaluate the draft (same iteration)
    And the combined feedback is sent to Writer for the next iteration if either score is below threshold
    When both Scorer and Reviewer pass (atsScore >= 85 AND humanScore >= 80)
    Then the graph routes to END
    And the best draft (highest combined score across iterations) is returned
    When the iteration counter reaches 5 without passing
    Then the graph routes to END with the best draft
    And a warning flag is set: { cappedAtMaxIterations: true }

  # REQ-GENR-06
  Scenario: Scores always visible in collapsible score panel
    Given the adapted resume is displayed in the editor
    Then a collapsible score panel is visible below the editor
    And the panel shows ATS Match score, Human Authenticity score, expandable feedback, and personalization suggestions
    And a "Re-Score" button is available

  # REQ-GENR-07
  Scenario: Re-score after manual edits (Writer skipped)
    Given an adapted resume exists in the "adapted_resumes" table
    And the user has manually edited the content
    When the user clicks "Re-Score"
    Then the Writer is NOT invoked
    And only Scorer and Reviewer evaluate the current content
    And the "adapted_resumes" row is updated with new scores
    And the editor content is NOT modified

  # REQ-GENR-08
  Scenario: Personalization suggestions from Reviewer
    When the Reviewer completes evaluation
    Then it also emits "personalization" events with suggestions based on the user's profile and experiences
    And the suggestions appear in the score panel
    And the user can apply suggestions manually (they are NOT auto-applied)

  # REQ-GENR-09
  Scenario: Resume is editable after generation
    Given the adapted resume has been generated and is displayed
    Then the Resume tab editor is in editable mode
    And the user can modify any part of the resume
    And changes persist to "adapted_resumes.content" on save
    And the save does NOT trigger re-scoring

  # REQ-GENR-10
  Scenario: Re-generate overwrites existing adapted resume
    Given an adapted resume already exists for the job
    When the user clicks "Generate Resume" again
    Then a confirmation dialog appears
    When the user confirms
    Then the existing "adapted_resumes" row is overwritten
    And the full pipeline runs from scratch

  # REQ-GENR-11
  Scenario: Chat iteration on adapted resume
    Given an adapted resume is displayed in the editor
    And the right-side chat panel is open
    When the user types in chat requesting changes
    Then the chat context includes the current document, job description, research, profile, and experiences
    And the LLM responds with a full updated resume (not diffs)
    And the user can click "Re-Score" to evaluate the chat-modified content

  # REQ-GENR-12
  Scenario: Resume generation requires company research
    Given no row exists in the "research" table for the job
    Then the "Generate Resume" button is disabled
    And a tooltip shows: "Run Company Research first"
    When the user runs company research and it completes
    Then the Generate Resume button becomes enabled

  # REQ-GENR-13
  Scenario: Handle resume generation failure
    Given the LLM API returns an error during resume generation
    When the user clicks "Generate Resume"
    Then an "error" event is emitted
    And any existing "adapted_resumes" row is not overwritten
    And the Resume tab shows the error message
