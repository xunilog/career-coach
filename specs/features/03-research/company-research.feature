Feature: Company Research
  Generate structured company research via a simple LLM call, streamed to the UI, and persisted to the SQLite `research` table.

  Background:
    Given the Career Coach app is running
    And the "research" table exists in career-coach.db
    And the Mistral LLM is available

  # REQ-RSCH-01
  Scenario: Generate company research successfully
    Given the user is viewing the job detail for a job
    And no row exists in the "research" table for this job
    And the "Research" tab shows "No research yet. Click Research Company to generate."
    When the user clicks "Research Company"
    Then a streaming channel "company-research:stream:<requestId>" is created
    And the LLM generates research covering 5 sections: overview, culture, news, key people, and market position
    And the content is streamed via IPC as { type: "chunk", section, content } events
    And when "done" is received, the research row is UPSERTed into the "research" table
    And the "Generate Resume" and "Generate Cover Letter" buttons become enabled

  # REQ-RSCH-02
  Scenario: Research output structure (5 sections)
    When the research is complete and persisted to the "research" table
    Then the table columns contain these sections:
      | overview   | Industry, size, funding, HQ                              |
      | culture    | Company culture & values                                 |
      | news       | Recent news, product launches, layoffs, funding          |
      | key_people | Leaders, hiring manager information                      |
      | market     | Product & market position, competitors                   |
    And the "generated_at" column is set to the current timestamp

  # REQ-RSCH-03
  Scenario: Research is manual, not automatic
    Given the user navigates to a new job detail for the first time
    Then the "research" table has no row for this job
    And the Research tab is empty
    And the "Generate Resume" and "Generate Cover Letter" buttons are disabled
    And no API calls are made until the user explicitly clicks "Research Company"

  # REQ-RSCH-04
  Scenario: Re-generate replaces existing research
    Given a row already exists in the "research" table for a job
    When the user clicks "Research Company" again
    Then the existing row is UPSERTed with fresh research data
    And the streaming UI shows new content replacing old content
    And the "generated_at" column is updated to the current timestamp

  # REQ-RSCH-05
  Scenario: Handle research failure
    Given the Mistral LLM returns an error during research generation
    When the company research is running
    Then an "error" event is emitted: { type: "error", message: "..." }
    And the existing row in the "research" table (if any) is NOT overwritten
    And the Research tab shows the error message

  # REQ-RSCH-06
  Scenario: Research precondition for resume and cover letter
    Given the user is viewing the job detail
    And no row exists in the "research" table for this job
    Then the "Generate Resume" button is disabled
    And the "Generate Cover Letter" button is disabled
    And a tooltip shows: "Run Company Research first"
    When the user runs company research successfully
    Then both generation buttons become enabled
