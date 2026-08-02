# Acceptance Notes — Export

## Edge Cases

- **Filename with special characters**: Company names like "AT&T" or titles with slashes are sanitized to valid filenames.
- **User cancels save dialog**: No file written, no error shown — just a no-op.
- **Very long company + title**: Filename truncated to a reasonable length by the OS save dialog.
- **Export while document is generating**: Export button is available but reads whatever content is currently in the database. If generation is in progress, the exported PDF may contain partial content.

## Non-Functional

- **PDF rendering**: Uses Electron's built-in `printToPDF` which renders via Chromium. Consistent output regardless of OS.
- **Content source**: All export reads from SQLite (`adapted_resumes.content` or `cover_letters.content`). Never from markdown files on disk.
- **Clipboard**: Plain text markdown — pasteable into any application.

## Dependencies

- Electron `printToPDF` and `shell.openExternal`.
- `adapted_resumes` or `cover_letters` table must have a row for PDF export to be enabled.
- `jobs.apply_url` must exist for the "Open Apply URL" feature.
