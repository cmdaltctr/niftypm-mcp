// ─── Tool Inventory ───────────────────────────────────────────────

const CORE_DOMAINS = ["files","labels","documents","milestones","messages","taskGroups","tasks","subTeams"];
const EXTENDED_DOMAINS = ["projects","folders","members","webhooks","time","fields","apps","chat","invite","templates","users","auth"];

const TOOL_DOMAINS = [
  {
    id: "files", label: "Files", envKey: "ENABLE_FILES", group: "core",
    tools: [
      { name: "niftypm_upload_files",          desc: "Upload one or more files" },
      { name: "niftypm_list_files",            desc: "List files in a project or task" },
      { name: "niftypm_get_file",              desc: "Get a specific file by ID" },
      { name: "niftypm_delete_file",           desc: "Delete a file" },
      { name: "niftypm_update_file",           desc: "Update file metadata" },
      { name: "niftypm_copy_file",             desc: "Copy a file to another project" },
      { name: "niftypm_add_file_labels",       desc: "Add labels to a file" },
      { name: "niftypm_remove_file_labels",    desc: "Remove labels from a file" },
    ]
  },
  {
    id: "labels", label: "Labels / Tags", envKey: "ENABLE_LABELS", group: "core",
    tools: [
      { name: "niftypm_list_labels",     desc: "List labels, optionally filtered by project" },
      { name: "niftypm_get_label",       desc: "Get a label by ID" },
      { name: "niftypm_create_label",    desc: "Create a new label" },
      { name: "niftypm_update_label",    desc: "Update an existing label" },
      { name: "niftypm_delete_label",    desc: "Delete a label" },
    ]
  },
  {
    id: "documents", label: "Documents", envKey: "ENABLE_DOCUMENTS", group: "core",
    tools: [
      { name: "niftypm_list_documents",             desc: "List documents in a project" },
      { name: "niftypm_get_document",               desc: "Get a specific document by ID" },
      { name: "niftypm_create_document",            desc: "Create a new document in a project" },
      { name: "niftypm_update_document",            desc: "Update an existing document" },
      { name: "niftypm_delete_document",            desc: "Delete a document" },
      { name: "niftypm_move_document",              desc: "Move a document to another project" },
      { name: "niftypm_create_personal_document",   desc: "Create a personal document" },
      { name: "niftypm_get_personal_documents",     desc: "List personal documents" },
      { name: "niftypm_add_document_members",       desc: "Add members to a document" },
      { name: "niftypm_remove_document_members",    desc: "Remove members from a document" },
      { name: "niftypm_change_document",            desc: "Create a new version of a document" },
      { name: "niftypm_add_document_labels",        desc: "Add labels to a document" },
      { name: "niftypm_remove_document_labels",     desc: "Remove labels from a document" },
    ]
  },
  {
    id: "milestones", label: "Milestones", envKey: "ENABLE_MILESTONES", group: "core",
    tools: [
      { name: "niftypm_list_milestones",      desc: "List milestones in a project" },
      { name: "niftypm_get_milestone",        desc: "Get a milestone by ID" },
      { name: "niftypm_create_milestone",     desc: "Create a new milestone" },
      { name: "niftypm_update_milestone",     desc: "Update an existing milestone" },
      { name: "niftypm_delete_milestone",     desc: "Delete a milestone" },
      { name: "niftypm_archive_milestone",    desc: "Archive a milestone" },
      { name: "niftypm_move_milestone",       desc: "Move a milestone to another project" },
      { name: "niftypm_tie_milestone_tasks",  desc: "Tie tasks to a milestone" },
      { name: "niftypm_untie_milestone_tasks", desc: "Untie tasks from a milestone" },
    ]
  },
  {
    id: "messages", label: "Messages", envKey: "ENABLE_MESSAGES", group: "core",
    tools: [
      { name: "niftypm_list_messages",      desc: "List messages in a chat, task, or document" },
      { name: "niftypm_get_message",        desc: "Get a message by ID" },
      { name: "niftypm_create_message",     desc: "Post a new message to a chat" },
      { name: "niftypm_update_message",     desc: "Edit an existing message" },
      { name: "niftypm_delete_message",     desc: "Delete a message" },
      { name: "niftypm_mark_message_seen",  desc: "Mark a message as seen" },
      { name: "niftypm_mark_message_heard", desc: "Mark a message as heard" },
    ]
  },
  {
    id: "taskGroups", label: "Task Groups", envKey: "ENABLE_TASK_GROUPS", group: "core",
    tools: [
      { name: "niftypm_list_taskgroups",            desc: "List task groups" },
      { name: "niftypm_get_taskgroup",              desc: "Get a task group by ID" },
      { name: "niftypm_create_taskgroup",           desc: "Create a new task group" },
      { name: "niftypm_update_taskgroup",           desc: "Update an existing task group" },
      { name: "niftypm_delete_taskgroup",           desc: "Delete a task group" },
      { name: "niftypm_move_taskgroup_tasks",       desc: "Move all tasks to another task group" },
      { name: "niftypm_assign_taskgroup_members",   desc: "Set assignees for all tasks in a group" },
      { name: "niftypm_unassign_taskgroup_members", desc: "Remove members from all tasks in a group" },
    ]
  },
  {
    id: "tasks", label: "Tasks", envKey: "ENABLE_TASKS", group: "core",
    tools: [
      { name: "niftypm_list_tasks",             desc: "List tasks with optional filters" },
      { name: "niftypm_get_task",               desc: "Get a task by ID" },
      { name: "niftypm_create_task",            desc: "Create a task or subtask" },
      { name: "niftypm_update_task",            desc: "Update an existing task" },
      { name: "niftypm_delete_task",            desc: "Delete a task" },
      { name: "niftypm_delete_tasks",           desc: "Delete multiple tasks" },
      { name: "niftypm_complete_task",          desc: "Mark a task as complete" },
      { name: "niftypm_archive_task",           desc: "Archive a task" },
      { name: "niftypm_get_personal_tasks",     desc: "List personal tasks" },
      { name: "niftypm_create_personal_task",   desc: "Create a personal task" },
      { name: "niftypm_link_task",              desc: "Link a task to another task" },
      { name: "niftypm_update_task_milestone",  desc: "Update the milestone for a task" },
      { name: "niftypm_move_task",              desc: "Move a task to a different task group" },
      { name: "niftypm_move_tasks",             desc: "Move multiple tasks" },
      { name: "niftypm_assign_task",            desc: "Assign a user to a task" },
      { name: "niftypm_unassign_task",          desc: "Remove a user from a task" },
      { name: "niftypm_add_task_labels",        desc: "Add labels to a task" },
      { name: "niftypm_remove_task_labels",     desc: "Remove labels from a task" },
      { name: "niftypm_add_task_field",         desc: "Add a custom field value to a task" },
      { name: "niftypm_get_task_fields",        desc: "Get all custom fields for a task" },
      { name: "niftypm_update_task_field",      desc: "Update a custom field value for a task" },
      { name: "niftypm_attach_task_document",   desc: "Attach a document to a task" },
      { name: "niftypm_clone_task",             desc: "Clone/Copy a task" },
    ]
  },
  {
    id: "subTeams", label: "Subteams / Portfolios", envKey: "ENABLE_SUBTEAMS", group: "core",
    tools: [
      { name: "niftypm_list_subteams",          desc: "List all subteams/portfolios" },
      { name: "niftypm_get_subteam",            desc: "Get a subteam by ID" },
      { name: "niftypm_create_subteam",         desc: "Create a new subteam" },
      { name: "niftypm_update_subteam",         desc: "Update an existing subteam" },
      { name: "niftypm_delete_subteam",         desc: "Delete a subteam" },
      { name: "niftypm_add_subteam_members",    desc: "Add members to a subteam" },
      { name: "niftypm_remove_subteam_members", desc: "Remove members from a subteam" },
      { name: "niftypm_leave_subteam",          desc: "Leave a subteam" },
    ]
  },
  {
    id: "projects", label: "Projects", envKey: "ENABLE_PROJECTS", group: "extended",
    tools: [
      { name: "niftypm_list_projects",        desc: "List all projects accessible to the user" },
      { name: "niftypm_create_project",       desc: "Create a new project" },
      { name: "niftypm_get_project",          desc: "Get a specific project by ID" },
      { name: "niftypm_update_project",       desc: "Update an existing project" },
      { name: "niftypm_delete_project",       desc: "Delete a project" },
      { name: "niftypm_invite_to_project",    desc: "Invite a user to a project" },
      { name: "niftypm_leave_project",        desc: "Leave a project" },
      { name: "niftypm_start_project",        desc: "Start a project (set status to active)" },
      { name: "niftypm_add_project_field",    desc: "Add a custom field to a project" },
      { name: "niftypm_get_project_fields",   desc: "Get all custom fields for a project" },
      { name: "niftypm_update_project_field", desc: "Update a custom field value for a project" },
    ]
  },
  {
    id: "folders", label: "Folders", envKey: "ENABLE_FOLDERS", group: "extended",
    tools: [
      { name: "niftypm_get_folder",            desc: "Get the root folder structure" },
      { name: "niftypm_create_folder",         desc: "Create a new folder" },
      { name: "niftypm_get_folder_by_id",      desc: "Get a specific folder by ID" },
      { name: "niftypm_get_folder_children",   desc: "Get children of a folder" },
      { name: "niftypm_update_folder",         desc: "Update a folder" },
      { name: "niftypm_delete_folder",         desc: "Delete a folder" },
    ]
  },
  {
    id: "members", label: "Members", envKey: "ENABLE_MEMBERS", group: "extended",
    tools: [
      { name: "niftypm_list_members",   desc: "List all team members" },
      { name: "niftypm_get_member",     desc: "Get a specific team member by ID" },
    ]
  },
  {
    id: "webhooks", label: "Webhooks", envKey: "ENABLE_WEBHOOKS", group: "extended",
    tools: [
      { name: "niftypm_list_webhooks",   desc: "List all webhooks for an app" },
      { name: "niftypm_create_webhook",  desc: "Create a new webhook" },
      { name: "niftypm_update_webhook",  desc: "Update an existing webhook" },
      { name: "niftypm_delete_webhook",  desc: "Delete a webhook" },
    ]
  },
  {
    id: "time", label: "Time Tracking", envKey: "ENABLE_TIME", group: "extended",
    tools: [
      { name: "niftypm_get_time_report",   desc: "Get time tracking report" },
      { name: "niftypm_get_time_duration", desc: "Get total time duration for tasks/projects" },
    ]
  },
  {
    id: "fields", label: "Custom Fields", envKey: "ENABLE_FIELDS", group: "extended",
    tools: [
      { name: "niftypm_list_custom_fields", desc: "List all custom field definitions" },
      { name: "niftypm_get_custom_field",   desc: "Get a specific custom field by ID" },
    ]
  },
  {
    id: "apps", label: "Apps", envKey: "ENABLE_APPS", group: "extended",
    tools: [
      { name: "niftypm_list_apps", desc: "List all installed applications" },
      { name: "niftypm_get_app",   desc: "Get a specific app by ID" },
    ]
  },
  {
    id: "chat", label: "Chat", envKey: "ENABLE_CHAT", group: "extended",
    tools: [
      { name: "niftypm_list_chats", desc: "List all chat conversations" },
      { name: "niftypm_get_chat",   desc: "Get a specific chat by ID" },
    ]
  },
  {
    id: "invite", label: "Invite Links", envKey: "ENABLE_INVITE", group: "extended",
    tools: [
      { name: "niftypm_list_invite_links", desc: "List all active invite links" },
    ]
  },
  {
    id: "templates", label: "Templates", envKey: "ENABLE_TEMPLATES", group: "extended",
    tools: [
      { name: "niftypm_list_templates", desc: "List all project templates" },
    ]
  },
  {
    id: "users", label: "Users", envKey: "ENABLE_USERS", group: "extended",
    tools: [
      { name: "niftypm_get_current_user", desc: "Get the currently authenticated user profile" },
    ]
  },
  {
    id: "auth", label: "Authentication", envKey: "ENABLE_AUTH", group: "extended",
    tools: [
      { name: "niftypm_refresh_token", desc: "Refresh the authentication token" },
    ]
  },
];

// ─── Shared State ──────────────────────────────────────────────────

const state = { domains: {}, disabledTools: new Set() };

function initState() { for (const d of TOOL_DOMAINS) state.domains[d.id] = { enabled: true }; }
function domainEnabled(id) { return state.domains[id]?.enabled ?? true; }
function toolDisabled(name, id) { return !domainEnabled(id) || state.disabledTools.has(name); }
function updateDomain(id, enabled) { state.domains[id] = { enabled }; renderAll(); }
function toggleTool(name) { state.disabledTools.has(name) ? state.disabledTools.delete(name) : state.disabledTools.add(name); renderAll(); }

// ─── DOM Builders ──────────────────────────────────────────────────

function buildSwitch(checked, onChange) {
  const label = document.createElement("label");
  label.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox"; input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  const span = document.createElement("span");
  span.className = "slider";
  label.appendChild(input); label.appendChild(span);
  return label;
}

function buildToggleRow(domain) {
  const row = document.createElement("div");
  row.className = "toggle-row";
  const label = document.createElement("span");
  label.className = "toggle-label";
  label.textContent = domain.label;
  const count = document.createElement("span");
  count.className = "toggle-count";
  count.textContent = ` (${domain.tools.length} tools)`;
  label.appendChild(count);
  row.appendChild(label);
  row.appendChild(buildSwitch(domainEnabled(domain.id), (v) => updateDomain(domain.id, v)));
  return row;
}

// ─── Simple Tab ────────────────────────────────────────────────────

function renderSimpleTab() {
  const c = document.getElementById("simple-tab-content");
  c.innerHTML = "";
  const coreLabel = document.createElement("div");
  coreLabel.className = "category-label"; coreLabel.textContent = "Core";
  c.appendChild(coreLabel);
  for (const d of TOOL_DOMAINS) { if (d.group === "core") c.appendChild(buildToggleRow(d)); }
  const extLabel = document.createElement("div");
  extLabel.className = "category-label"; extLabel.textContent = "Extended";
  c.appendChild(extLabel);
  for (const d of TOOL_DOMAINS) { if (d.group === "extended") c.appendChild(buildToggleRow(d)); }
}

// ─── Advanced Tab ──────────────────────────────────────────────────

function renderAdvancedTab() {
  const c = document.getElementById("advanced-tab-content");
  c.innerHTML = "";
  for (const d of TOOL_DOMAINS) {
    const section = document.createElement("div");
    section.className = "domain-section";
    if (!domainEnabled(d.id)) section.classList.add("disabled");
    const header = document.createElement("div");
    header.className = "domain-header";
    const nameEl = document.createElement("span");
    nameEl.textContent = d.label;
    const countEl = document.createElement("span");
    countEl.className = "toggle-count";
    let activeCount = 0;
    for (const t of d.tools) { if (!toolDisabled(t.name, d.id)) activeCount++; }
    countEl.textContent = `${activeCount} / ${d.tools.length} enabled`;
    header.appendChild(nameEl); header.appendChild(countEl);
    header.appendChild(buildSwitch(domainEnabled(d.id), (v) => updateDomain(d.id, v)));
    section.appendChild(header);
    const table = document.createElement("table");
    table.className = "tool-table";
    for (const tool of d.tools) {
      const tr = document.createElement("tr");
      if (toolDisabled(tool.name, d.id)) tr.classList.add("disabled");
      const tdName = document.createElement("td"); tdName.className = "name"; tdName.textContent = tool.name;
      const tdDesc = document.createElement("td"); tdDesc.className = "desc"; tdDesc.textContent = tool.desc;
      const tdToggle = document.createElement("td"); tdToggle.className = "toggle";
      tdToggle.appendChild(buildSwitch(!toolDisabled(tool.name, d.id), (v) => toggleTool(tool.name)));
      tr.appendChild(tdName); tr.appendChild(tdDesc); tr.appendChild(tdToggle);
      table.appendChild(tr);
    }
    section.appendChild(table);
    c.appendChild(section);
  }
}

// ─── Tab Switching ─────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  const btn = document.getElementById(tab === "simple" ? "tab-simple" : "tab-advanced");
  const content = document.getElementById(tab === "simple" ? "simple-tab-content" : "advanced-tab-content");
  btn.classList.add("active"); content.classList.add("active");
}

function renderAll() { renderSimpleTab(); renderAdvancedTab(); }

// ─── .env Generation ───────────────────────────────────────────────

function getVal(id) { return document.getElementById(id).value.trim(); }

function generateEnvFile() {
  const lines = [];
  lines.push("# NiftyPM OAuth Credentials");
  lines.push(`NIFTYPM_CLIENT_ID=${getVal("client-id")}`);
  lines.push(`NIFTYPM_CLIENT_SECRET=${getVal("client-secret")}`);
  lines.push(`NIFTYPM_ACCESS_TOKEN=${getVal("access-token")}`);
  lines.push(`NIFTYPM_REFRESH_TOKEN=${getVal("refresh-token")}`);
  lines.push("");
  lines.push("# \u2500\u2500\u2500 Tool Configuration \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  lines.push("# Domains default to ON. Set to false to disable all tools in that domain.");
  lines.push("# Per-tool overrides below let you disable individual tools within an enabled domain.");
  lines.push("");
  lines.push("# Core (projects, tasks, docs)");
  for (const d of TOOL_DOMAINS) { if (d.group === "core") lines.push(`${d.envKey}=${domainEnabled(d.id)}`); }
  lines.push("");
  lines.push("# Extended (workspace \\& integration)");
  for (const d of TOOL_DOMAINS) { if (d.group === "extended") lines.push(`${d.envKey}=${domainEnabled(d.id)}`); }
  if (state.disabledTools.size > 0) {
    lines.push("");
    lines.push("# \u2500\u2500\u2500 Per-tool overrides \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    lines.push("# Only applies to domains that are enabled.");
    lines.push("# Tools listed here are removed even if their domain is ON.");
    const parts = [];
    for (const d of TOOL_DOMAINS) { for (const t of d.tools) { if (state.disabledTools.has(t.name)) parts.push(`${t.name} (${d.label})`); } }
    lines.push(`# Disabled: ${parts.join(", ")}`);
    lines.push(`DISABLED_TOOLS=${[...state.disabledTools].join(",")}`);
  }
  return lines.join("\n");
}

function downloadEnv() {
  const empty = [];
  if (!getVal("client-id")) empty.push("Client ID");
  if (!getVal("client-secret")) empty.push("Client Secret");
  if (!getVal("access-token")) empty.push("Access Token");
  if (!getVal("refresh-token")) empty.push("Refresh Token");
  const w = document.getElementById("warning");
  w.textContent = empty.length > 0 ? `\u26a0 Missing: ${empty.join(", ")}. Your .env may not work. You can still download.` : "";
  const blob = new Blob([generateEnvFile()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = ".env"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Initialisation ────────────────────────────────────────────────

function init() {
  initState();
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const isPw = input.type === "password";
      input.type = isPw ? "text" : "password";
      btn.textContent = isPw ? "Hide" : "Show";
    });
  });
  document.getElementById("tab-simple").addEventListener("click", () => switchTab("simple"));
  document.getElementById("tab-advanced").addEventListener("click", () => switchTab("advanced"));
  document.getElementById("download-btn").addEventListener("click", downloadEnv);
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
