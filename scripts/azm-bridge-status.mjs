#!/usr/bin/env node
/**
 * Upsert an AZM → Cursor dispatch into the public status ledger Claude can poll.
 *
 * Usage:
 *   node scripts/azm-bridge-status.mjs upsert --kaizen "K EC 1.47" --lifecycle pr_open --pr 150 ...
 *   node scripts/azm-bridge-status.mjs show [--bridge task_89efec62 | --kaizen "K EC 1.47"]
 *   node scripts/azm-bridge-status.mjs claude-block [--bridge task_89efec62 | --kaizen "K EC 1.47"]
 *   node scripts/azm-bridge-status.mjs validate
 *
 * Lifecycle values: dispatched|running|pr_open|pr_ready|merged|blocked|failed|cancelled
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LEDGER_PATH = join(ROOT, 'docs/azm-deliverables/_bridge/status-ledger.json');
const POLL_URL =
  'https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json';

const LIFECYCLES = new Set([
  'dispatched',
  'running',
  'pr_open',
  'pr_ready',
  'merged',
  'blocked',
  'failed',
  'cancelled',
]);

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return { cmd, flags };
}

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      pollUrl: POLL_URL,
      tasks: [],
    };
  }
  const raw = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.tasks)) {
    die(`Invalid ledger at ${LEDGER_PATH}`);
  }
  return raw;
}

function saveLedger(ledger) {
  ledger.updatedAt = new Date().toISOString();
  ledger.pollUrl = POLL_URL;
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
}

function taskKey(t) {
  return (t.bridgeTaskId && `bridge:${t.bridgeTaskId}`) || `kaizen:${t.kaizenCode}`;
}

function findTask(ledger, { bridge, kaizen }) {
  if (bridge) {
    return ledger.tasks.find((t) => t.bridgeTaskId === bridge) ?? null;
  }
  if (kaizen) {
    return ledger.tasks.find((t) => t.kaizenCode === kaizen) ?? null;
  }
  return null;
}

function deliverableDir(kaizenCode) {
  // "K EC 1.47" → "K-EC-1.47"
  const slug = kaizenCode.trim().replace(/\s+/g, '-');
  return join(ROOT, 'docs/azm-deliverables', slug);
}

function writePerTaskStatus(task) {
  const dir = deliverableDir(task.kaizenCode);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'STATUS.json');
  writeFileSync(path, `${JSON.stringify(task, null, 2)}\n`, 'utf8');
  return path;
}

function validateTask(task) {
  const errors = [];
  if (!task.kaizenCode) errors.push('kaizenCode required');
  if (!task.title) errors.push('title required');
  if (!LIFECYCLES.has(task.lifecycle)) errors.push(`lifecycle must be one of ${[...LIFECYCLES].join('|')}`);
  if (task.venture !== 'EasyCasa') errors.push('venture must be EasyCasa');
  if (!task.updatedAt) errors.push('updatedAt required');
  if (!task.summary) errors.push('summary required');
  if ((task.lifecycle === 'pr_open' || task.lifecycle === 'pr_ready' || task.lifecycle === 'merged') && !task.prUrl) {
    errors.push(`lifecycle=${task.lifecycle} requires prUrl`);
  }
  return errors;
}

function validateLedger(ledger) {
  const errors = [];
  if (ledger.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(ledger.tasks)) errors.push('tasks must be an array');
  const seen = new Set();
  for (const t of ledger.tasks ?? []) {
    for (const e of validateTask(t)) errors.push(`${taskKey(t)}: ${e}`);
    const k = taskKey(t);
    if (seen.has(k)) errors.push(`duplicate key ${k}`);
    seen.add(k);
  }
  return errors;
}

function claudeBlock(task) {
  const lines = [
    '<!-- AZM_BRIDGE_STATUS_BEGIN -->',
    `bridgeTaskId: ${task.bridgeTaskId ?? 'null'}`,
    `kaizenCode: ${task.kaizenCode}`,
    `polishId: ${task.polishId ?? 'null'}`,
    `lifecycle: ${task.lifecycle}`,
    `agentStatus: ${task.agentStatus ?? 'null'}`,
    `prUrl: ${task.prUrl ?? 'null'}`,
    `prState: ${task.prState ?? 'null'}`,
    `agentUrl: ${task.agentUrl ?? 'null'}`,
    `summary: ${task.summary}`,
    `nextAction: ${task.nextAction ?? 'null'}`,
    `pollUrl: ${POLL_URL}`,
    '<!-- AZM_BRIDGE_STATUS_END -->',
  ];
  return lines.join('\n');
}

function upsert(flags) {
  const kaizen = flags.kaizen;
  if (!kaizen) die('upsert requires --kaizen "K EC …"');
  const lifecycle = flags.lifecycle;
  if (!lifecycle || !LIFECYCLES.has(lifecycle)) {
    die(`upsert requires --lifecycle (${[...LIFECYCLES].join('|')})`);
  }

  const ledger = loadLedger();
  const existing =
    findTask(ledger, { bridge: flags.bridge, kaizen }) ??
    findTask(ledger, { kaizen });

  const now = new Date().toISOString();
  const prNumber = flags.pr ? Number(flags.pr) : existing?.prNumber ?? null;
  const next = {
    bridgeTaskId: flags.bridge ?? existing?.bridgeTaskId ?? null,
    kaizenCode: kaizen,
    polishId: flags.polish ?? existing?.polishId ?? null,
    title: flags.title ?? existing?.title ?? kaizen,
    venture: 'EasyCasa',
    lifecycle,
    agentStatus: flags['agent-status'] ?? existing?.agentStatus ?? null,
    agentBcId: flags['agent-bc'] ?? existing?.agentBcId ?? null,
    agentUrl: flags['agent-url'] ?? existing?.agentUrl ?? null,
    branch: flags.branch ?? existing?.branch ?? null,
    prNumber: Number.isFinite(prNumber) ? prNumber : null,
    prUrl:
      flags['pr-url'] ??
      existing?.prUrl ??
      (prNumber ? `https://github.com/aziz-mubasher/EasyCasa/pull/${prNumber}` : null),
    prState: flags['pr-state'] ?? existing?.prState ?? null,
    dispatchedAt: flags['dispatched-at'] ?? existing?.dispatchedAt ?? now,
    updatedAt: now,
    summary: flags.summary ?? existing?.summary ?? `${kaizen}: ${lifecycle}`,
    nextAction: flags['next-action'] ?? existing?.nextAction ?? null,
    errors: flags.error
      ? [...(existing?.errors ?? []), String(flags.error)]
      : (existing?.errors ?? []),
  };

  const verr = validateTask(next);
  if (verr.length) die(`invalid task:\n- ${verr.join('\n- ')}`);

  if (existing) {
    const idx = ledger.tasks.indexOf(existing);
    ledger.tasks[idx] = next;
  } else {
    ledger.tasks.unshift(next);
  }

  saveLedger(ledger);
  const perTaskPath = writePerTaskStatus(next);
  console.log(`Updated ledger: ${LEDGER_PATH}`);
  console.log(`Updated per-task: ${perTaskPath}`);
  console.log('');
  console.log(claudeBlock(next));
}

function show(flags) {
  const ledger = loadLedger();
  if (!flags.bridge && !flags.kaizen) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }
  const task = findTask(ledger, flags);
  if (!task) die('task not found');
  console.log(JSON.stringify(task, null, 2));
}

function printClaude(flags) {
  const ledger = loadLedger();
  const task = findTask(ledger, flags);
  if (!task) die('task not found — pass --bridge or --kaizen');
  console.log(claudeBlock(task));
}

function validate() {
  const ledger = loadLedger();
  const errors = validateLedger(ledger);
  if (errors.length) {
    die(`validation failed:\n- ${errors.join('\n- ')}`);
  }
  console.log(`OK — ${ledger.tasks.length} task(s) in ledger`);
}

function help() {
  console.log(`azm-bridge-status — public feedback surface for Claude Desktop polls

Commands:
  upsert   Write/merge a task into docs/azm-deliverables/_bridge/status-ledger.json
  show     Print ledger or one task as JSON
  claude-block   Print the AZM_BRIDGE_STATUS block for chat/PR forwarding
  validate Validate ledger invariants

Examples:
  node scripts/azm-bridge-status.mjs upsert \\
    --bridge task_89efec62 --kaizen "K EC 1.47" --polish PP-4 \\
    --lifecycle pr_open --pr 150 --pr-state DRAFT \\
    --agent-status IDLE --agent-bc bc-51dcfe26-06b0-4887-bcbf-fdf0bde8f4d8 \\
    --summary "Draft PR #150 open; agent IDLE"

  node scripts/azm-bridge-status.mjs claude-block --bridge task_89efec62
  node scripts/azm-bridge-status.mjs validate

Claude poll URL (after merge to main):
  ${POLL_URL}
`);
}

const { cmd, flags } = parseArgs(process.argv.slice(2));
switch (cmd) {
  case 'upsert':
    upsert(flags);
    break;
  case 'show':
    show(flags);
    break;
  case 'claude-block':
    printClaude(flags);
    break;
  case 'validate':
    validate();
    break;
  case 'help':
  case undefined:
    help();
    break;
  default:
    die(`unknown command: ${cmd}\n\nRun: node scripts/azm-bridge-status.mjs help`);
}
