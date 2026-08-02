Feature: Export
  Export adapted resumes and cover letters as PDF, copy to clipboard, and open apply URLs — all sourced from SQLite tables.

  Background:
    Given the Career Coach app is running
    And the user is viewing the job detail for a job

  # REQ-EXPT-01
  Scenario: Export adapted resume to PDF
    Given a row exists in "adapted_resumes" for the job
    And the Resume tab is active
    When the user clicks "Export PDF"
    Then the app queries "adapted_resumes.content" via IPC
    And the adapted resume markdown is rendered to HTML
    And Electron's "printToPDF" is invoked on the rendered content
    And a save dialog appears with a suggested filename
    When the user chooses a location and clicks Save
    Then the PDF is written to disk
    And a success notification is shown

  # REQ-EXPT-02
  Scenario: Export cover letter to PDF
    Given a row exists in "cover_letters" for the job
    And the Cover Letter tab is active
    When the user clicks "Export PDF"
    Then the app queries "cover_letters.content" via IPC
    And the cover letter markdown is rendered to HTML
    And a save dialog appears with a suggested filename
    When the user saves
    Then the PDF is written to disk

  # REQ-EXPT-03
  Scenario: No document to export
    Given no row exists in "adapted_resumes" for the job
    And the Resume tab is active
    Then the "Export PDF" button is disabled
    And a tooltip shows: "Generate a resume first"

  # REQ-EXPT-04
  Scenario: Copy document to clipboard
    Given an adapted resume row exists in the database
    And its content is displayed in the editor
    When the user clicks "Copy"
    Then the full markdown content from the database is copied to the clipboard
    And a success notification is shown

  # REQ-EXPT-05
  Scenario: Open apply URL in system browser
    Given the job row has "apply_url" set to a valid URL
    When the user clicks "Open Apply URL"
    Then the URL from "jobs.apply_url" is opened in the system's default web browser
    And the Career Coach app remains open in the background

  # REQ-EXPT-06
  Scenario: No apply URL available
    Given the job row has "apply_url" that is empty or null
    Then the "Open Apply URL" button is disabled
    And a tooltip shows: "No apply URL available for this job"

  # REQ-EXPT-07
  Scenario: Export filename convention
    Given a job with company and title
    When the user exports to PDF
    Then the suggested filename follows the pattern:
      | Resume       | "Resume_{Company}_{Title}.pdf"       |
      | Cover Letter | "Cover_Letter_{Company}_{Title}.pdf" |
    And special characters are sanitized (spaces → underscores, slashes removed)
