# Issue tracker: GitHub

Issues and specs live in https://github.com/kai-shoo/relict-metro-ui/issues.
Use the `gh` CLI from this repository.

## Conventions

- Create: `gh issue create --title "..." --body "..."`. Use a heredoc for multiline bodies.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
  Apply label and state filters as needed.
- Comment: `gh issue comment <number> --body "..."`.
- Labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: post an explanation with `gh issue comment`, then `gh issue close`.
  Comment separately even when the issue is already closed.
- Sub-issues: use `gh issue create --parent <parent>` or
  `gh issue edit <parent> --add-sub-issue <child>` with gh 2.94+.
  On older versions, use the GitHub sub-issues API with the child's database ID.
  If unavailable, put `Part of #<parent>` at the top of the child body.
- Blocking: use native GitHub issue dependencies with
  `gh issue create --blocked-by <n>,<n>` or
  `gh issue edit <child> --add-blocked-by <blocker>` with gh 2.94+.
  On older versions, POST to
  `repos/kai-shoo/relict-metro-ui/issues/<child>/dependencies/blocked_by`
  with `issue_id` set to the blocker's numeric database ID, not its issue number.
  If unavailable, put `Blocked by: #<n>, #<n>` at the top of the child body.
  An issue is unblocked when every blocker is closed.
- Count open blockers:
  `gh api repos/kai-shoo/relict-metro-ui/issues/<n> --jq .issue_dependencies_summary.blocked_by`.

Before the first issue creation in a session, verify
`gh repo view --json nameWithOwner` targets `kai-shoo/relict-metro-ui`.
If it does not, confirm the target with the user. Never publish to the
upstream skills repository unless the user owns it.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

- "Publish to the issue tracker": create a GitHub issue.
- "Fetch the relevant ticket": read the GitHub issue.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map` containing Notes,
  Decisions-so-far, and Fog.
- Child ticket: link it as a sub-issue of the map. If unavailable, add it
  to a task list in the map and put `Part of #<map>` in the child body.
  Use `wayfinder:<type>` labels: research, prototype, grilling, or task.
- Frontier: open children in map order, excluding tickets with open
  blockers or an assignee.
- Claim: `gh issue edit <n> --add-assignee @me`, the session's first write.
- Resolve: comment with the answer, close the ticket, then append a
  summary and link to the map's Decisions-so-far.
