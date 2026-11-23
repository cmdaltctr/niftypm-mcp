# expand-mcp-to-cover-all-openapi-endpoints

Expand the NiftyPM MCP server to cover all OpenAPI endpoints across all domains (apps, authentication, chat, documents, fields, files, folders, invite, labels, members, messages, milestones, projects, subtasks, tasks, taskgroups, templates, time, users, webhooks)

## Why
The current NiftyPM MCP server only exposes 44 tools covering 8 domains, while the OpenAPI specification defines 117 operations across ~20 domains. This leaves 73 operations (62%) unimplemented, making the MCP incomplete for comprehensive NiftyPM integration. Expanding the MCP to cover all endpoints will:
1. Provide complete API coverage for AI agents
2. Eliminate the need for direct API calls for missing operations
3. Enable more powerful AI workflows with comprehensive tools
4. Maintain consistent tool naming and parameter handling across all domains
