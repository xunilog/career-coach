Feature: Job Search Execution
  Execute saved searches against Indeed and LinkedIn via ts-jobspy and persist results to the SQLite `jobs` table.

  Background:
    Given the Career Coach app is running
    And the "searches" and "jobs" tables exist in career-coach.db
    And ts-jobspy is available for scraping Indeed and LinkedIn

  # REQ-EXEC-01
  Scenario: Run a single search successfully
    When the user navigates to a search results view
    And the user clicks "Search Now"
    Then the main process reads the search row from the "searches" table
    And the system scrapes job listings from Indeed and LinkedIn via ts-jobspy
    And the system paginates through all results
    And for each result, the merge logic checks if the job ID already exists:
      SELECT id FROM jobs WHERE search_id = ? AND id = ?
    And existing jobs retain their status, fit, description, notes, and is_new state
    And new jobs are inserted into the "jobs" table with is_new=1, fit=NULL, status='--'
    And after all results, the "searches" table is updated:
      UPDATE searches SET last_run_at = datetime('now') WHERE id = ?
    And TanStack Query invalidates the jobs cache for this search
    And the results view refreshes with the updated table
    And new jobs render with a sparkle icon (from is_new = 1)
    And a notification toast appears: "Search complete: N hits, M new"

  # REQ-EXEC-02
  Scenario: Run all searches sequentially
    Given the "searches" table contains multiple rows
    When the user clicks "Search All" from the Inbox view
    Then a streaming channel "job-search:run-all:stream:<uuid>" is created
    And the following events are emitted in order:
      | Event         | Payload                            |
      | start         | { total: N }                       |
      | search-start  | { current: 1, name: "..." }        |
      | search-page   | { current: 1, page: 1, newJobs: N }|
      | search-done   | { current: 1, totalHits: N, newHits: N } |
      | ...           | (repeat for each search)           |
      | done          | {}                                  |
    And there is a 2-second delay between each search
    And each search updates its "last_run_at" in the "searches" table on completion

  # REQ-EXEC-03
  Scenario: Retry with exponential backoff on rate limiting
    Given the job board returns an error (rate limit or transient failure)
    When the system attempts a search
    Then the call is retried with exponential backoff:
      | Attempt | Delay |
      | 1st     | 2s    |
      | 2nd     | 4s    |
      | 3rd     | 8s    |
      | 4th     | 16s   |
    And the maximum retry count is 3
    And the maximum delay cap is 60 seconds

  # REQ-EXEC-04
  Scenario: Skip search on persistent failure
    Given the job board returns errors after all retries
    When "Search All" is running
    Then a "search-error" event is emitted for the failed search
    And the remaining searches continue to execute
    And no rows are inserted or updated in the "jobs" table for that search
    And the "last_run_at" for that search in the "searches" table is NOT updated

  # REQ-EXEC-05
  Scenario: Only run non-manual searches during scheduled runs
    Given the "searches" table contains searches with different schedules
    When the system runs scheduled searches via the 60s tick
    Then the scheduler queries:
      SELECT * FROM searches WHERE schedule != 'manual'
    And manual searches are excluded from scheduled execution

  # REQ-EXEC-06
  Scenario: Build SearchState from database row
    Given a search row in the "searches" table with title, location, and filters
    When the search is executed
    Then the row's title, location, and filters (JSON) are mapped to the ts-jobspy query parameters
    And the filters JSON is parsed into structured search criteria

  # REQ-EXEC-07
  Scenario: Clear "is_new" flag when user views results
    Given a search has jobs with is_new = 1 in the "jobs" table
    When the user navigates to the results view for that search
    Then the Database Service executes:
      UPDATE jobs SET is_new = 0 WHERE search_id = ? AND is_new = 1
    And the sparkle icons disappear from those rows
    And the Inbox "new" count for that search drops to 0
