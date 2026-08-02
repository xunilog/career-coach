Feature: Scheduling
  Automatically run due searches on a schedule using a main process timer that queries the `searches` SQLite table.

  Background:
    Given the Career Coach app is running
    And the main process has started the scheduler (setInterval, 60s tick)

  # REQ-SCHD-01
  Scenario: Daily search runs after 24 hours
    Given a search with schedule "daily"
    And "last_run_at" is 24+ hours in the past
    When the 60-second scheduler tick fires
    Then the scheduler queries the "searches" table for due searches
    And the search is identified as due (24h elapsed)
    And the search is queued for execution
    And after execution, "last_run_at" is updated to the current time

  # REQ-SCHD-02
  Scenario: Weekly search runs after 7 days
    Given a search with schedule "weekly"
    And "last_run_at" is 168+ hours in the past
    When the 60-second scheduler tick fires
    Then the search is identified as due (168h elapsed)
    And the search is queued for execution

  # REQ-SCHD-03
  Scenario: Monthly search runs after 30 days
    Given a search with schedule "monthly"
    And "last_run_at" is 720+ hours in the past
    When the 60-second scheduler tick fires
    Then the search is identified as due (720h ≈ 30 days elapsed)
    And the search is queued for execution

  # REQ-SCHD-04
  Scenario: Manual searches are never auto-triggered
    Given a search with schedule "manual"
    And "last_run_at" is null (never run)
    When the 60-second scheduler tick fires
    Then the search is not queued
    And the search is skipped entirely by the scheduler

  # REQ-SCHD-05
  Scenario: Searches are queued sequentially with 2s delay
    Given 3 searches are due
    When the scheduler queues them
    Then they execute in order with a 2-second delay between each completion
    And progress is streamed via "job-search:run-all:stream:<id>"

  # REQ-SCHD-06
  Scenario: App start checks for due searches
    Given the app was closed while searches became due
    When the app starts
    Then the scheduler immediately queries the "searches" table for due searches
    And a banner is shown: "N searches are due — Run now?"
    And the user can click "Run now" or "Dismiss"
    When the user clicks "Run now"
    Then all due searches are queued and executed

  # REQ-SCHD-07
  Scenario: Scheduler respects in-progress searches
    Given the scheduler is running searches
    And the shared in-progress guard indicates a search is running
    When the 60-second tick fires again
    Then the tick is ignored
    And no new searches are queued

  # REQ-SCHD-08
  Scenario: Error handling during scheduled runs
    Given a scheduled search fails after all retries
    When the scheduler processes the failure
    Then a "search-error" event is emitted
    And the search's "last_run_at" is NOT updated (remains at the old timestamp)
    And the search will be retried on the next tick
    And the remaining queued searches continue to execute
