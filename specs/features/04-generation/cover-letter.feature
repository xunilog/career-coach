Feature: Cover Letter Generation
  Generate an ATS-optimized, human-authentic cover letter via the Writer→Scorer(ATS)→Reviewer(Humanizer) LangGraph pipeline (Graph 2). Same pipeline as resume adaptation, different prompts.

  Background:
    Given the Career Coach app is running
    And the user has a career profile in the "career_profile" SQLite table
    And company research exists in the "research" table for the target job
    And the Mistral LLM is available

  # REQ-GENC-01
  Scenario: Generate cover letter via Writer→Scorer→Reviewer pipeline
    Given the user is viewing the job detail
    And company research has been completed
    And the "Cover Letter" tab shows "Click Generate Cover Letter to create one"
    When the user clicks "Generate Cover Letter"
    Then a streaming channel "document:cover:stream:<requestId>" is created
    And the Writer agent generates an initial draft from JD + company research + profile
    And the Scorer agent evaluates ATS match against the JD
    And the Reviewer agent evaluates human authenticity
    And when "done" is received, the cover letter is UPSERTed into the "cover_letters" table
    And the editor switches to editable mode

  # REQ-GENC-02
  Scenario: Cover letter Writer prompt includes company research
    When the Writer agent is invoked for a cover letter
    Then the LLM receives:
      | Job description from jobs.description column            |
      | Company research from research table (all 5 sections)  |
      | Career profile from career_profile table               |
    And the Writer generates a professional cover letter referencing specific company information

  # REQ-GENC-03
  Scenario: Cover letter Scorer evaluates ATS match
    When the Scorer agent evaluates a cover letter
    Then it scores on 0-100% across these dimensions:
      | Dimension                   | Weight |
      | Keyword match from JD       | 40%    |
      | Company-specific references | 30%    |
      | Tone fit for role seniority | 20%    |
      | Structure (3-4 paragraphs)  | 10%    |
    And the target pass threshold is 85%

  # REQ-GENC-04
  Scenario: Cover letter Reviewer detects AI tells
    When the Reviewer agent evaluates a cover letter
    Then it scores on 0-100% across four dimensions (naturalness, variety, voice, imperfection tolerance)
    And it specifically flags cover-letter-specific AI tells: robotic openers, generic closers, over-enthusiasm, insincere admiration
    And the target pass threshold is 80%

  # REQ-GENC-05
  Scenario: Max 5 iterations, best draft wins
    Given the Writer→Scorer→Reviewer pipeline is running for a cover letter
    And the draft has gone through 5 iterations without both scores passing
    When the 5th iteration completes
    Then the pipeline stops
    And the draft with the highest combined (atsScore + humanScore) / 2 is returned
    And a notification is shown: "Cover letter generated with best-effort scores"

  # REQ-GENC-06
  Scenario: Cover letter is editable after generation
    Given a cover letter has been generated and is displayed
    Then the Cover Letter tab editor is in editable mode
    And the user can modify any part of the cover letter
    And changes are persisted to the "cover_letters" table on save

  # REQ-GENC-07
  Scenario: Re-Score after manual edits (Writer skipped)
    Given a cover letter is displayed in the editor after manual edits
    When the user clicks "Re-Score"
    Then only the Scorer and Reviewer run (Writer is skipped)
    And the score panel updates with new scores and feedback
    And the editor content is NOT changed

  # REQ-GENC-08
  Scenario: Re-generate overwrites existing cover letter
    Given a cover letter already exists for the job
    When the user clicks "Generate Cover Letter" again
    Then a confirmation dialog appears
    When the user confirms
    Then the Writer→Scorer→Reviewer pipeline runs from scratch
    And the existing "cover_letters" row is overwritten via UPSERT

  # REQ-GENC-09
  Scenario: Cover letter requires company research
    Given no row exists in the "research" table for the current job
    Then the "Generate Cover Letter" button is disabled
    And a tooltip shows: "Run Company Research first"
    When the user runs company research and it completes
    Then the Generate Cover Letter button becomes enabled

  # REQ-GENC-10
  Scenario: Generate resume and cover letter independently
    Given company research exists
    And no adapted resume has been generated
    When the user clicks "Generate Cover Letter"
    Then the cover letter is generated successfully
    And the resume tab remains unchanged
    And the cover letter does not depend on the resume

  # REQ-GENC-11
  Scenario: Handle cover letter generation failure
    Given the LLM API returns an error during cover letter generation
    When the user clicks "Generate Cover Letter"
    Then an "error" event is emitted
    And any existing "cover_letters" row is not overwritten
    And the Cover Letter tab shows the error message
