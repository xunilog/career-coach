Feature: Job Scoring
  Score job postings against the user's career profile using a simple LLM call with batched evaluation. Results are persisted to the `jobs.fit` column in SQLite.

  Background:
    Given the Career Coach app is running
    And the user has a career profile in the "career_profile" SQLite table
    And a search has returned new job postings stored in the "jobs" table
    And the Mistral LLM is available

  # REQ-SCOR-01
  Scenario: Batch score new jobs in groups of 10
    Given a search has unscored jobs (fit IS NULL) in the "jobs" table
    When the search execution completes and triggers scoring
    Then the system queries: SELECT * FROM jobs WHERE search_id = ? AND fit IS NULL
    And the system groups returned jobs into batches of maximum 10
    And for each batch, the system reads the career profile from the "career_profile" SQLite table
    And sends the profile + job summaries as a single prompt to the LLM
    And the LLM returns structured JSON with a fit score for each job: High, Medium, Low, or Skip
    And the Database Service executes for each scored job: UPDATE jobs SET fit = ? WHERE id = ?
    And the TanStack Query job cache is invalidated for this search
    And the results view shows color-coded fit:
      | High   | green        |
      | Medium | yellow       |
      | Low    | gray         |
      | Skip   | gray (dimmed) |

  # REQ-SCOR-02
  Scenario: Scoring prompt includes profile and job details
    Given a batch of unscored jobs
    When the LLM scoring prompt is constructed
    Then the prompt includes:
      | Profile summary from the career_profile table |
      | For each job: title, company, location, salary, description excerpt |
    And the prompt asks the LLM to score each job as High / Medium / Low / Skip
    And the response format is a structured JSON array of { jobId, fit, reason }

  # REQ-SCOR-03
  Scenario: Skip scoring for already-scored jobs
    Given a job in the "jobs" table has an existing fit score
    When the search is re-run and new results are merged
    Then the job retains its existing fit score (merge logic preserves it)
    And the scoring query only fetches jobs with "fit IS NULL"
    And the job is not included in any scoring batch

  # REQ-SCOR-04
  Scenario: Handle LLM scoring failure gracefully
    Given the LLM API returns an error during scoring
    When a batch of jobs is being scored
    Then the batch is retried once
    And if the retry also fails, all jobs in the batch are updated:
      UPDATE jobs SET fit = 'Medium' WHERE id IN (...)
    And the system logs the failure
    And the search execution continues to the next batch

  # REQ-SCOR-05
  Scenario: Score is displayed in the results table
    Given the "jobs" table has rows with fit values
    When the results table is rendered via TanStack Query
    Then fit scores are displayed with appropriate color coding
    And unscored jobs (fit IS NULL) render as "—" with no color

  # REQ-SCOR-06
  Scenario: Profile not available — skip scoring
    Given the user has no profile in the "career_profile" table
    When a search is executed and jobs need scoring
    Then the scoring step checks for the profile
    And the profile is not found or is empty
    Then scoring is skipped entirely
    And all unscored jobs remain with fit = NULL (rendered as "—")
    And a notification is shown: "Add a profile to enable job scoring"
