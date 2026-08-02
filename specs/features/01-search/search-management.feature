Feature: Job Search Management
  Create, read, update, and delete saved job searches, persisted in SQLite via IPC handlers.

  Background:
    Given the Career Coach app is running
    And the "searches" table exists in career-coach.db

  # REQ-SRCH-01
  Scenario: Create a new search with simple fields
    When the user clicks "+ Add Search"
    Then a modal form appears with simple fields:
      | Field     | Type   | Required |
      | Job Title | text   | yes      |
      | Location  | text   | yes      |
      | Schedule  | select | yes      |
    When the user fills in:
      | Job Title | VP Growth     |
      | Location  | United States |
      | Schedule  | daily         |
    And the user clicks "Save"
    Then the frontend calls "search:check-duplicate" via IPC invoke
    And no duplicate is found
    Then the frontend calls "search:create" via IPC invoke with the form data
    And the Database Service inserts a new row into the "searches" table
    And a UUID is generated for the "id" column
    And the "filters" column is set to "{}" (empty JSON)
    And the "created_at" column is set to the current timestamp
    And the TanStack Query cache for "search:list" is invalidated
    And the nav panel refreshes to show the new search

  # REQ-SRCH-02
  Scenario: Create a new search with advanced filters
    When the user clicks "+ Add Search"
    And the user expands the "Advanced" section
    Then additional fields appear:
      | Field            | Type             |
      | Workplace Types  | multi-select     |
      | Commitment Types | multi-select     |
      | Seniority Level  | multi-select     |
      | Salary Range     | range (min/max)  |
      | Date Range       | number (days)    |
    When the user fills in:
      | Job Title        | Staff Engineer       |
      | Location         | San Francisco, CA    |
      | Schedule         | weekly               |
      | Workplace Types  | Remote, Hybrid       |
      | Commitment Types | Full Time            |
      | Seniority Level  | Senior, Staff        |
      | Salary Range     | 180000 to 250000     |
      | Date Range       | 61                   |
    And the user clicks "Save"
    Then the "search:create" IPC handler is called
    And the "filters" column stores a JSON object with the advanced filter values

  # REQ-SRCH-03
  Scenario: Prevent duplicate search titles
    Given a search "VP Growth — Remote, US" already exists in the "searches" table
    When the user creates a new search with:
      | Job Title | VP Growth  |
      | Location  | Remote, US |
    And the user clicks "Save"
    Then the frontend calls "search:check-duplicate" via IPC invoke
    And the Database Service executes:
      SELECT COUNT(*) AS count FROM searches WHERE title = ? AND location = ?
    And the result count is > 0
    Then an error message is shown: "A search with this title and location already exists"
    And "search:create" is NOT called

  # REQ-SRCH-04
  Scenario: Edit an existing search without changing its ID
    Given a search with id "srch-abc123" exists with title "VP Growth"
    When the user selects "VP Growth / Remote US" in the nav panel
    And the user clicks "Edit Search"
    Then the modal is pre-populated with values fetched via "search:get" IPC handler
    When the user changes:
      | Job Title | Head of Growth |
      | Location  | United States  |
    And the user clicks "Save"
    Then the "search:update" IPC handler is called with the updated fields
    And the search ID remains unchanged
    And the TanStack Query cache for "search:list" is invalidated

  # REQ-SRCH-05
  Scenario: Delete a search and all cascading data
    Given a search "srch-abc123" exists with 47 related job records in the "jobs" table
    When the user selects "VP Growth / Remote US" in the nav panel
    And the user clicks "Delete Search"
    Then a confirmation dialog appears: "Delete this search and all 47 job postings?"
    When the user confirms
    Then the "search:delete" IPC handler is called with id "srch-abc123"
    And SQLite cascades the delete to all related rows in jobs, research, adapted_resumes, cover_letters, status_history
    And the TanStack Query cache for "search:list" is invalidated
    And the user is navigated back to the Inbox view

  # REQ-SRCH-07
  Scenario: Delete a search from the edit modal
    Given a search "srch-abc123" exists with title "VP Growth"
    When the user opens the edit modal for "VP Growth"
    Then a "Delete Search" button is visible on the bottom left of the modal footer
    When the user clicks "Delete Search"
    Then a confirmation dialog appears: "Delete this search and all its job postings?"
    When the user confirms
    Then the "search:delete" IPC handler is called with id "srch-abc123"
    And SQLite cascades the delete to all related rows in jobs, research, adapted_resumes, cover_letters, status_history
    And the TanStack Query cache for "search:list" is invalidated
    And the modal closes
    And the user is navigated to the Inbox view

  # REQ-SRCH-06
  Scenario: Nav panel shows all saved searches with stats
    Given the "searches" table contains at least one search
    When the app renders the nav panel
    Then TanStack Query calls "search:list" via IPC invoke
    And the nav panel shows each search with its title, location, and metadata
    And an "Add Search" button is visible
