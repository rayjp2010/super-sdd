# Specification Delta

One file per capability at `specs/<capability-path>/spec.md`. Keep only the operation sections used
and delete the example block.

<!-- NEW CAPABILITIES ONLY: keep this section, 1-2 sentences, 50+ characters. The sync copies it
     verbatim into the new main spec. DELETE this section for a delta on an existing capability -
     that spec already has a Purpose and this one is ignored. -->

## Purpose

`<replace-me - what this capability is for, in one or two sentences>`

<!-- EXAMPLE START - DELETE THIS WHOLE BLOCK. Real sections go below EXAMPLE END.

## ADDED Requirements

### Requirement: Users can export account data
The system SHALL let an authenticated user export their account data as CSV.

#### Scenario: Successful export
- **WHEN** the user requests an export
- **THEN** the system returns a CSV file containing their account rows

## MODIFIED Requirements

### Requirement: Session expiry
(Header text copied EXACTLY from the durable spec, whitespace-insensitive. Body carries the full
updated requirement plus EVERY scenario the original had - anything omitted is lost at archive.)
Sessions SHALL expire after 30 minutes of inactivity.

#### Scenario: Idle session expires
- **WHEN** a session sees no request for 30 minutes
- **THEN** the next request is rejected as unauthenticated

## REMOVED Requirements

### Requirement: Legacy export
**Reason**: Replaced by the CSV export above.
**Migration**: Call `/api/v2/export` instead.

## RENAMED Requirements

- FROM: `### Requirement: Old name`
- TO: `### Requirement: New name`

EXAMPLE END - DELETE EVERYTHING BETWEEN THE MARKERS. -->

<!-- Real operation sections below this line. OpenSpec 1.11.0 reminders:
     - SHALL/MUST must be on the requirement's BODY line, not only in the header.
     - Every ADDED or MODIFIED requirement needs a non-fenced level-4 heading; use the canonical
       `#### Scenario: <name>` form.
     - This workflow requires REMOVED entries to include **Reason** and **Migration**. If removal
       empties the capability, set
       `retire_capabilities: true` in the change's `.openspec.yaml`. -->
