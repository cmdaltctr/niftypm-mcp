# Reverse Sync Workflow (NiftyPM -> JSON)

When you need to build or refresh a local JSON source-of-truth from a live NiftyPM project, use this workflow. It is the complement to Rule 5 (JSON-First Planning): Rule 5 covers JSON -> NiftyPM (populating a new project); this covers NiftyPM -> JSON (syncing a live project into local truth).

## When to use

- Initial build of `NiftyPM/<portfolio>/<project>.json` from a live project
- Re-syncing after the NiftyPM app is updated (new tasks, moved milestones, relabelled items)
- Verifying local JSON still matches live state (check `last_synced` for staleness)

## Step 1: Fetch all data via niftypm-mcp

Call these **in parallel** for a single project (replace `PROJECT_ID`):

| Call | Purpose |
|------|---------|
| `niftypm_list_labels(project_id, limit=100)` | All labels (workspace-scoped) |
| `niftypm_list_taskgroups(project_id, limit=100)` | All task lists |
| `niftypm_list_milestones(project_id, limit=100)` | Regular milestones |
| `niftypm_list_milestones(project_id, is_list=true, limit=100)` | List-type milestones (filtered by default!) |
| `niftypm_list_tasks(project_id, limit=100)` | All tasks |
| `niftypm_list_members(project_id)` | Project members |

**Critical**: call `list_milestones` twice - once without `is_list` and once with `is_list=true`. The API filters list-type milestones unless you explicitly request them. Missing this call drops milestones like "M0: Project Overview" (which has `is_list: true`) from the JSON.

If `list_tasks` returns 100 items and `hasMore: true`, paginate with `offset` until `hasMore: false`.

## Step 2: Assemble the bundle file

Combine the responses into a single JSON bundle. The script expects this shape:

```json
{
  "project": {
    "id": "hvKcn0yt1V",
    "nice_id": "NMQ",
    "name": "NeurMantiq",
    "description": "...",
    "portfolio": "ISPF",
    "portfolio_id": "jMiWCyVBed",
    "repo": null
  },
  "labels":     [ ... items from list_labels ... ],
  "taskgroups": [ ... items from list_taskgroups ... ],
  "milestones": [ ... merge list_milestones + list_milestones(is_list=true), dedup by id ... ],
  "tasks":      [ ... items from list_tasks ... ],
  "members":    [ ... items from list_members ... ]
}
```

Save to `/tmp/<nice_id>-bundle.json`.

**Merging milestones**: the two `list_milestones` calls return different subsets. Concatenate both arrays; the script deduplicates by `id` and skips any milestone named "Untitled List" (a default NiftyPM artefact that should be cleaned up in the app).

**Project metadata**: populate `portfolio` and `portfolio_id` from the matching `niftypm_list_subteams()` entry. Populate `repo` only if the project description references one.

## Step 3: Run reverse-sync.py

```bash
python3 ~/.config/opencode/skills/s-niftypm/scripts/reverse-sync.py \
    --bundle /tmp/NMQ-bundle.json \
    --output NiftyPM/ISPF/NeurMantiq.json
```

The script:
- Resolves label IDs -> names
- Resolves taskgroup IDs -> names (sorted by display order)
- Resolves milestone IDs -> names (skipping "Untitled List")
- Resolves dependency task IDs -> nice_ids
- Sets `meta.last_synced` to current UTC timestamp
- Writes schema-compliant JSON with a `_validation_checklist`

## Step 4: Verify

Check the output JSON:

- `meta.last_synced` is set to a recent timestamp
- `tasks` count matches what `list_tasks` returned
- `tasks[].task_list` is never `null` (every task must belong to a list)
- `tasks[].milestone` is `null` only for retrospective done-records (acceptable)
- Spot-check 2-3 dependencies resolved to `nice_id` strings (e.g. `"NMQ-18"`), not raw IDs
- `_validation_checklist` shows expected counts

## Known gaps

- **Subtask names are `[]`**: `list_tasks` does not return subtask children inline. To populate `subtasks[]` arrays, call `niftypm_get_item_children(item_key=<parent_id>)` for each task with `total_subtasks > 0` and extract child names. The `total_subtasks` count is preserved so you know which tasks need enrichment.
- **"Untitled List" milestones**: skipped automatically by the script. Clean these up in the NiftyPM app via `niftypm_update_milestone` (rename) or `niftypm_delete_milestone` (remove).

## Sync discipline

Once the JSON exists locally, it is the source of truth for AI work. When the NiftyPM app is updated, re-run this workflow to refresh the JSON. The `last_synced` timestamp lets agents detect staleness. Never edit the JSON by hand to reflect app changes - always re-sync from live.
