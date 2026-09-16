#!/usr/bin/env node

process.env.STARCRAFT_TMG_EVIDENCE_TICKET = "24";
process.env.STARCRAFT_TMG_EVIDENCE_SLICE = "258";
process.env.STARCRAFT_TMG_EVIDENCE_PROFILE = "ticket24-slice258";

await import("./run-ticket-23-slice-247-human-agent-web-v1.mjs");
