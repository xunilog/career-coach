Feature: Conversation History with Persistence
  Persist Career Coach chat threads across app restarts with auto-summarized titles, date-ordered history, and smart default selection.

  Background:
    Given the Career Coach app is running
    And the "conversations" and "langgraph_checkpoints" tables exist in career-coach.db

  # REQ-CONV-01
  Scenario: First ever run — auto-create conversation
    Given no conversations exist in the database
    When the app starts
    Then a new conversation is created with a generated thread_id
    And the conversations table has one row with title "New Chat"
    And the chat panel shows the Welcome screen (empty messages)

  # REQ-CONV-02
  Scenario: Chat creates title from first user message
    Given a conversation exists with title "New Chat"
    When the user sends their first message
    After the agent responds
    Then the conversation title is updated to the first user message content
    And the title is truncated to 50 characters if longer

  # REQ-CONV-03
  Scenario: Conversations persist across restarts
    Given the user has created multiple conversations with titles
    When the app is closed and reopened
    Then the dropdown shows all conversations
    And they are ordered by updated_at descending (most recent first)
    And the most recent conversation is auto-selected

  # REQ-CONV-04
  Scenario: Switching conversations loads correct messages
    Given the user has 2 conversations with different message histories
    And the user is viewing conversation A
    When the user selects conversation B from the dropdown
    Then the chat panel displays conversation B's messages
    And the input area is ready for new messages to conversation B

  # REQ-CONV-05
  Scenario: Starting a new conversation
    Given the user is viewing an existing conversation
    When the user clicks "New Chat" in the dropdown
    Then a new conversation is created with title "New Chat"
    And the chat panel shows the Welcome screen (empty messages)
    And the dropdown shows the new conversation at the top

  # REQ-CONV-06
  Scenario: Newer conversation indicator
    Given the user is viewing an older conversation (not the most recent)
    And a newer conversation exists (with more recent updated_at)
    Then the dropdown shows an up arrow indicator
    When the user clicks the up arrow
    Then the most recent conversation is selected

  # REQ-CONV-07
  Scenario: Deleting a conversation
    Given the user has 2 conversations
    When the user deletes conversation A
    Then conversation A is removed from the conversations table
    And conversation A's checkpoints are cleaned up from langgraph_checkpoints
    And conversation A's writes are cleaned up from langgraph_writes
    And the dropdown no longer shows conversation A
    And if conversation A was selected, the most recent remaining conversation is selected

  # REQ-CONV-08
  Scenario: Delete the last conversation
    Given the user has exactly 1 conversation
    When the user deletes it
    Then a new empty conversation is auto-created
    And the chat panel shows the Welcome screen

  # REQ-CONV-09
  Scenario: Streaming updates updated_at
    Given a conversation exists
    When a graph:stream response completes
    Then the conversation's updated_at is set to the current timestamp
