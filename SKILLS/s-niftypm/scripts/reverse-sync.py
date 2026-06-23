#!/usr/bin/env python3
"""
reverse-sync.py - Build a local NiftyPM project plan JSON from live API data.

Reads a bundle file (assembled from niftypm-mcp responses) and produces a
schema-compliant JSON per s-niftypm/references/niftypm-project-plan-schema.md.

This is the complement to Rule 5 (JSON-First Planning). Rule 5 covers
JSON -> NiftyPM (populating a new project). This script covers
NiftyPM -> JSON (syncing a live project into local source-of-truth).

Usage:
    python3 reverse-sync.py \\
        --bundle /tmp/NMQ-bundle.json \\
        --output NiftyPM/ISPF/NeurMantiq.json

Bundle file shape (see references/reverse-sync-workflow.md for assembly):
    {
      "project":   { id, nice_id, name, description, portfolio, portfolio_id, repo },
      "labels":    [ ... from list_labels ... ],
      "taskgroups":[ ... from list_taskgroups ... ],
      "milestones":[ ... merge list_milestones + list_milestones(is_list=true) ... ],
      "tasks":     [ ... from list_tasks ... ],
      "members":   [ ... from list_members ... ]
    }
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime, timezone


def date_only(iso_str):
    """Extract YYYY-MM-DD from an ISO 8601 datetime string, or None."""
    if not iso_str or not isinstance(iso_str, str):
        return None
    return iso_str[:10] if len(iso_str) >= 10 else None


def build_label_map(labels):
    """ID -> (name, color)."""
    return {
        l["id"]: (l.get("name", ""), l.get("color", "#000000"))
        for l in labels
        if "id" in l
    }


def build_taskgroup_map(taskgroups):
    """ID -> (name, order)."""
    return {
        tg["id"]: (tg.get("name", ""), tg.get("order", 0))
        for tg in taskgroups
        if "id" in tg
    }


def build_milestone_map(milestones):
    """ID -> (name, due_date, description).

    Merges regular + list-type milestones (dedup by id).
    Skips 'Untitled List' default artefacts.
    """
    result = {}
    for ms in milestones:
        if "id" not in ms:
            continue
        name = ms.get("name", "")
        if name.strip().lower() == "untitled list":
            continue
        ms_id = ms["id"]
        if ms_id in result:
            continue
        due = date_only(ms.get("end")) or date_only(ms.get("start"))
        desc = ms.get("description") or ""
        result[ms_id] = (name, due, desc)
    return result


def build_project_json(bundle):
    """Transform a bundle into schema-compliant JSON."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    project = bundle.get("project", {})
    tasks_raw = bundle.get("tasks", [])
    label_map = build_label_map(bundle.get("labels", []))
    tg_map = build_taskgroup_map(bundle.get("taskgroups", []))
    ms_map = build_milestone_map(bundle.get("milestones", []))

    id_to_nice = {
        t["id"]: t["nice_id"]
        for t in tasks_raw
        if "id" in t and "nice_id" in t
    }

    used_label_ids = set()
    for t in tasks_raw:
        used_label_ids.update(t.get("labels") or [])

    out_tasks = []
    for t in tasks_raw:
        tg_id = t.get("task_group")
        ms_id = t.get("milestone")
        dep_id = t.get("dependency")
        label_ids = t.get("labels") or []

        tg_name = tg_map.get(tg_id, ("Unknown",))[0] if tg_id else None
        ms_name = ms_map.get(ms_id, (None,))[0] if ms_id else None
        dep_nice = id_to_nice.get(dep_id) if dep_id in id_to_nice else None

        out_tasks.append({
            "id": t.get("id"),
            "nice_id": t.get("nice_id"),
            "name": t.get("name", ""),
            "task_list": tg_name,
            "milestone": ms_name,
            "description": t.get("description") or "",
            "labels": [label_map[l][0] for l in label_ids if l in label_map],
            "story_points": t.get("story_points"),
            "due_date": date_only(t.get("due_date")),
            "start_date": date_only(t.get("start_date")),
            "dependency": dep_nice,
            "subtasks": [],
            "total_subtasks": t.get("total_subtasks", 0),
            "completed": t.get("completed", False),
            "completed_on": t.get("completed_on"),
            "assignees": t.get("assignees") or [],
            "archived": t.get("archived", False),
        })

    completed_count = sum(1 for t in out_tasks if t["completed"])
    no_milestone = sum(1 for t in out_tasks if t["milestone"] is None)
    no_task_list = sum(1 for t in out_tasks if t["task_list"] is None)
    used_labels_resolved = [l for l in used_label_ids if l in label_map]

    result = {
        "meta": {
            "created": now,
            "last_synced": now,
            "generated_by": "s-niftypm/scripts/reverse-sync.py",
            "project_nice_id": project.get("nice_id"),
            "niftypm_project_id": project.get("id"),
            "source": "Live NiftyPM API via niftypm-mcp",
            "notes": (
                "Subtask names not yet populated (requires get_item_children "
                "per parent task). All other fields resolved from live data."
            ),
        },
        "project": {
            "name": project.get("name", ""),
            "description": project.get("description", ""),
            "portfolio": project.get("portfolio", ""),
            "portfolio_id": project.get("portfolio_id"),
            "repo": project.get("repo"),
        },
        "labels": [
            {"name": label_map[lid][0], "color": label_map[lid][1], "id": lid}
            for lid in sorted(used_labels_resolved)
        ],
        "task_lists": [
            {"name": name, "id": tid, "order": order}
            for tid, (name, order) in sorted(tg_map.items(), key=lambda x: x[1][1] or 0)
        ],
        "milestones": [
            {"name": ms[0], "id": mid, "due": ms[1], "description": ms[2]}
            for mid, ms in ms_map.items()
        ],
        "tasks": out_tasks,
        "_validation_checklist": [
            f"Synced from live NiftyPM API on {now}",
            f"Tasks: {len(out_tasks)} total ({completed_count} completed)",
            f"Labels used: {len(used_labels_resolved)}",
            f"Tasks without milestone: {no_milestone} (null is honest for retrospective done-records)",
            f"Tasks without task_list: {no_task_list}",
            "Subtask names are a known gap - enrich via get_item_children in a follow-up pass",
            "All task IDs, nice_ids, dependencies, and milestone assignments resolved from live data",
        ],
    }
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Build a NiftyPM project plan JSON from a live API data bundle."
    )
    parser.add_argument(
        "--bundle", required=True,
        help="Path to bundle JSON file (assembled from niftypm-mcp responses)"
    )
    parser.add_argument(
        "--output", required=True,
        help="Path to output JSON file"
    )
    args = parser.parse_args()

    bundle_path = Path(args.bundle)
    output_path = Path(args.output)

    if not bundle_path.exists():
        print(f"ERROR: Bundle file not found: {bundle_path}", file=sys.stderr)
        sys.exit(1)

    with open(bundle_path, encoding="utf-8") as f:
        bundle = json.load(f)

    result = build_project_json(bundle)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    tasks = result["tasks"]
    completed = sum(1 for t in tasks if t["completed"])
    print(
        f"WROTE {output_path.name}: "
        f"{len(tasks)} tasks ({completed} completed), "
        f"{len(result['labels'])} labels, "
        f"{len(result['milestones'])} milestones, "
        f"{output_path.stat().st_size:,} bytes"
    )


if __name__ == "__main__":
    main()
