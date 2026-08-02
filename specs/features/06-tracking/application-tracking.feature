Feature: Application Status Tracking
  Track job application status through a defined lifecycle with notes and status history, persisted in SQLite.

  Background:
    Given the Career Coach app is running
    And the "jobs" and "status_history" tables exist in career-coach.db

  # REQ-TRAC-01
  Scenario: Update application status from job detail
    Given the user is viewing the job detail
    And the current status is "—" (no status)
    When the user opens the status dropdown
    Then the following options are available: --, Saved, Applied 📤, Interview 🤝, Offer 🎉, Rejected ❌, Archived
    When the user selects a new status
    Then a TanStack Query mutation fires via IPC
    And the IPC handler executes:
      UPDATE jobs SET status = ? WHERE id = ?
      INSERT INTO status_history (job_id, from_status, to_status) VALUES (?, ?, ?)
    And TanStack Query invalidates the job detail and search results queries
    And the UI updates to show the new status

  # REQ-TRAC-02
  Scenario: Status transition validation
    Given a job has status "--" or "Saved"
    Then the user can change it to any status
    Given a job has status "Applied 📤"
    Then the user cannot change it back to "--" or "Saved"
    Given a job has status "Interview 🤝"
    Then the user cannot change it back to "--", "Saved", or "Applied 📤"
    Given a job has status "Offer 🎉" or "Rejected ❌"
    Then the status is terminal; the user can only change to "Archived"
    Given a job has status "Archived"
    Then the user can change it to any status (un-archive)

  # REQ-TRAC-03
  Scenario: Archived jobs are hidden
    Given a job has status "Archived"
    When the search results view is rendered
    Then the query includes WHERE status != 'Archived'
    And the archived job is not shown in the table
    And the total count excludes archived jobs

  # REQ-TRAC-04
  Scenario: Show Archived toggle
    Given some jobs in the search have status "Archived"
    When the user views the search results
    Then a "Show Archived" toggle is available
    When the user enables "Show Archived"
    Then the query drops the status filter
    And archived jobs appear dimmed in the table

  # REQ-TRAC-05
  Scenario: Update freeform notes
    Given the user is viewing the job detail
    When the user types in the "Notes" field and saves
    Then a TanStack Query mutation fires:
      IPC invoke 'job-search:update-notes' with { jobId, notes }
    And the IPC handler executes: UPDATE jobs SET notes = ? WHERE id = ?
    And the notes are persisted in the jobs.notes column

  # REQ-TRAC-06
  Scenario: Status history records every change
    Given a job has status history entries in the status_history table
    When the user opens the status history panel
    Then the history is displayed with timestamps
    And the user can optionally add a note to a history entry

  # REQ-TRAC-07
  Scenario: Status updates with optional notes
    Given the user is viewing the job detail
    And the current status is "Applied 📤"
    When the user changes status to "Interview 🤝" with an optional note
    Then the IPC handler inserts into status_history with the note
    And the note is visible in the status history panel
