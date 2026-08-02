Feature: API Key Management
  As a user
  I want to configure my Anthropic API key in the app
  So that LLM features work without relying on environment variables at build time

  Background:
    Given the app is running in production mode (no VITE_ANTHROPIC_API_KEY env variable)
    And the default LLM provider is "anthropic"

  # ── Startup gate ──────────────────────────────────────────────────────────

  Scenario: App starts without any stored API key
    Given no API key is stored in the database for the active provider
    And no VITE_* environment variable provides a key for that provider
    When the app launches
    Then a full-screen gate page is displayed with the title "Enter Anthropic API Key"
    And the main application shell (header, sidebar, outlet) is NOT rendered
    And the gate page shows an input field for the API key and a "Verify & Continue" button

  Scenario: App starts with a verified key in the database
    Given a verified API key is stored in the database for the active provider
    When the app launches
    Then the full-screen gate page is skipped
    And the main application shell renders immediately

  Scenario: App starts with an env variable in dev mode
    Given the VITE_ANTHROPIC_API_KEY environment variable is set
    When the app launches
    Then the full-screen gate page is skipped
    And the main application shell renders immediately
    And the env variable key is used for all LLM calls

  # ── Key verification ──────────────────────────────────────────────────────

  Scenario: User submits a valid API key
    Given the user is on the full-screen gate page
    And the user has entered a valid Anthropic API key
    When the user clicks "Verify & Continue"
    Then the app calls GET https://api.anthropic.com/v1/models with the provided key
    And the API returns a 200 status
    And the key with verified_at timestamp is stored in the provider_keys table
    And the gate page transitions away
    And the main application shell renders

  Scenario: User submits an invalid API key
    Given the user is on the full-screen gate page
    And the user has entered an invalid Anthropic API key
    When the user clicks "Verify & Continue"
    Then the app calls GET https://api.anthropic.com/v1/models with the provided key
    And the API returns a 401 or 403 status
    And the key is NOT stored in the database
    And an error message is displayed: "Invalid API key. Please check your key and try again."
    And the gate page remains visible

  Scenario: Network error during verification
    Given the user is on the full-screen gate page
    And the user has entered an API key
    When the user clicks "Verify & Continue"
    And the verification request fails due to a network error (no internet, DNS failure, timeout)
    Then an error message is displayed: "Unable to reach Anthropic. Check your internet connection and try again."
    And a "Retry" button is shown alongside the error
    And the key is NOT stored in the database
    And the gate page remains visible

  # ── Profile menu ──────────────────────────────────────────────────────────

  Scenario: Update API key from the profile menu
    Given the user is on the main application shell
    When the user clicks the settings icon (⚙) in the header
    Then a dropdown menu appears with an "API Keys" option
    When the user clicks "API Keys"
    Then a modal opens with "Anthropic API Key" label and a password-type input field
    And the current key is masked (asterisks) but prepopulated if one exists in the database
    And a "Verify & Save" button is present

  Scenario: Successful key update via modal
    Given the API Keys modal is open
    And the user has entered a new valid Anthropic API key
    When the user clicks "Verify & Save"
    Then the app calls GET https://api.anthropic.com/v1/models with the provided key
    And the API returns a 200 status
    And the key with updated verified_at timestamp is upserted in the provider_keys table
    And the modal closes
    And the model cache is cleared so subsequent LLM calls use the new key

  Scenario: Invalid key update via modal
    Given the API Keys modal is open
    And the user has entered an invalid API key
    When the user clicks "Verify & Save"
    Then the API returns a 401 or 403 status
    And the key is NOT stored in the database
    And an error message is displayed inside the modal
    And the modal stays open

  # ── Runtime behavior ──────────────────────────────────────────────────────

  Scenario: getModel falls back to database when env var is absent
    Given no VITE_ANTHROPIC_API_KEY environment variable is set
    And a verified API key exists in the provider_keys table for "anthropic"
    When any LLM call is made via getModel()
    Then the key from the database is used

  Scenario: getModel prefers env var over database
    Given VITE_ANTHROPIC_API_KEY is set to "env-key"
    And a different key "db-key" exists in the provider_keys table for "anthropic"
    When any LLM call is made via getModel()
    Then the env var key "env-key" is used

  Scenario: getModel throws when no key is available
    Given no VITE_ANTHROPIC_API_KEY environment variable is set
    And no key exists in the provider_keys table for the active provider
    When any LLM call is made via getModel()
    Then an error is thrown: "Missing API key for provider 'anthropic'"
