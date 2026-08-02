Feature: Inbox & Search Results Views
  View and navigate job search results through inbox aggregation and per-search result tables, backed by SQLite.

  Background:
    Given the Career Coach app is running
    And the "searches" and "jobs" tables contain data in career-coach.db

  # REQ-INBX-01
  Scenario: Inbox aggregates new results across all searches
    When the user navigates to the Inbox view
    Then TanStack Query executes a query joining jobs with searches for all rows where is_new = 1
    And a table renders the aggregated new jobs
    And the table columns include: Search Name, Job Title, Company, Fit, Date Found
    And the toolbar shows a "Search All" button and a new-results count

  # REQ-INBX-02
  Scenario: Inbox is empty when no new results
    Given all jobs have is_new = 0 in the database
    When the user navigates to the Inbox view
    Then the query returns zero rows
    And the table shows an empty state: "No new results"
    And a "Search All" button is available

  # REQ-INBX-03
  Scenario: Clicking an inbox row navigates to search results
    Given the Inbox shows a new result from a specific search
    When the user clicks on that row
    Then the active search ID is set to that search's ID
    And the user is navigated to the search results view for that search

  # REQ-INBX-04
  Scenario: Search results view renders jobs table for a search
    When the user navigates to a search results view
    Then TanStack Query fetches jobs for that search, excluding archived
    And a table is rendered with columns: index, ID, Title, Company, Location, Salary, Fit, New, Resume, Cover, Status
    And the toolbar shows: Search Now, Edit Search, Delete Search buttons and a total/new count

  # REQ-INBX-05
  Scenario: Color-coded fit scores in results table
    Given the results table is rendered
    When a job has fit "High" then the Fit cell shows green
    When a job has fit "Medium" then the Fit cell shows yellow
    When a job has fit "Low" then the Fit cell shows gray
    When a job has fit "Skip" then the entire row is dimmed

  # REQ-INBX-06
  Scenario: Sortable columns in results view
    Given the results table is rendered
    When the user clicks a column header
    Then the table sorts by that column
    And clicking the same header again reverses the sort order

  # REQ-INBX-07
  Scenario: New marker behavior (is_new flag)
    Given a job has is_new = 1 in the database
    Then the "New" column shows a sparkle marker
    When the user clicks the job to view details
    Then the is_new flag is set to 0 in the database
    And TanStack Query invalidates the inbox and results queries
    And the sparkle marker disappears

  # REQ-INBX-08
  Scenario: Status column shows application progress
    When a job has status "Applied 📤" then the Status column shows "Applied 📤"
    When a job has status "Interview 🤝" then the Status column shows "Interview 🤝"
    When a job has status "Offer 🎉" then the Status column shows "Offer 🎉"
    When a job has status "Rejected ❌" then the Status column shows "Rejected ❌"
    When a job has status "Archived" then the row is hidden (filtered by WHERE status != 'Archived')

  # REQ-INBX-09
  Scenario: Resume and Cover indicators via existence check
    Given the results table is rendered
    When a job has a row in the adapted_resumes table then the "Resume" column shows a checkmark
    When a job has a row in the cover_letters table then the "Cover" column shows a checkmark
    When a job has neither then both columns show "—"

  # REQ-INBX-10
  Scenario: Search All streams progress via IPC
    When the user clicks "Search All"
    Then the renderer subscribes to a streaming channel and invokes the search-all operation
    And events are streamed: start, search-start, search-page, search-done (per search), done
    And after "done", TanStack Query invalidates inbox and search-result caches
