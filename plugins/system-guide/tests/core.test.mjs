import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  SystemGuideError,
  applyMeaningChange,
  checkGuide,
  disableGuide,
  inspectGuide,
  proposeMeaningChange,
  refreshGuide,
  setupGuide,
} from "../tools/system-guide.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../tools/system-guide.mjs");

function makeProject(name = "system guide project") {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "system-guide-test-"));
  const root = path.join(parent, name);
  fs.mkdirSync(root);
  return root;
}

function write(root, relative, content) {
  const file = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function read(root, relative) {
  return fs.readFileSync(path.join(root, ...relative.split("/")), "utf8");
}

function approval(root, preview, name = "Mike Rihm", date = "2026-09-10") {
  const relative = `.approvals/${preview.previewId}.json`;
  write(root, relative, `${JSON.stringify({
    version: 1,
    decision: "approved",
    previewId: preview.previewId,
    previewHash: preview.previewHash,
    approvedBy: name,
    approvedAt: date,
  }, null, 2)}\n`);
  return relative;
}

function approveMeaning(root, request) {
  const preview = proposeMeaningChange(root, { now: "2026-09-10T12:00:00Z", ...request });
  return { preview, result: applyMeaningChange(root, { previewId: preview.previewId, approvalRecordPath: approval(root, preview) }) };
}

test("ordinary code refresh builds a deterministic module and import map without function prose", () => {
  const root = makeProject();
  write(root, "src/math.ts", "export function add(a: number, b: number) { return a + b; }\n");
  write(root, "src/index.ts", "import { add } from './math';\nexport const total = add(2, 3);\n");
  write(root, "src/lazy.js", "export async function load(name) { return import(name); }\n");
  write(root, "src/private-key.js", "export const password = 'must-not-be-indexed';\n");

  const setup = setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  assert.equal(setup.state, "on");
  const refreshed = refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  assert.deepEqual(refreshed.counts, { modules: 3, objects: 0, fields: 0, processes: 0, relationships: 1 });
  assert.equal(refreshed.unsupported.dynamicCodeImports, 1);

  const modules = read(root, "knowledge/system/applications/generated/modules.md");
  assert.match(modules, /code:src\/index\.ts/);
  assert.match(modules, /src\/math\.ts/);
  assert.doesNotMatch(modules, /private-key|returns the sum|must-not-be-indexed/);
  const relationships = read(root, "knowledge/system/relationships/generated/source-map.md");
  assert.match(relationships, /imports/);
  assert.match(relationships, /inferred/);
  assert.match(relationships, /src\/index\.ts:1/);

  const before = fs.statSync(path.join(root, "knowledge/system/generated/build.json")).mtimeMs;
  const unchanged = refreshGuide(root, { now: "2026-09-11T12:00:00Z" });
  assert.equal(unchanged.outcome, "unchanged");
  assert.equal(unchanged.mode, "incremental");
  assert.deepEqual(unchanged.parsedSources, []);
  assert.equal(unchanged.refreshedAt, "2026-09-10T12:00:00Z");
  assert.equal(fs.statSync(path.join(root, "knowledge/system/generated/build.json")).mtimeMs, before);
  const full = refreshGuide(root, { now: "2026-09-12T12:00:00Z", full: true });
  assert.equal(full.outcome, "unchanged");
  assert.equal(full.mode, "full");
  assert.deepEqual(full.parsedSources, ["src"]);
});

test("literal dynamic imports are mapped honestly while non-literal targets remain unsupported", () => {
  const root = makeProject();
  write(root, "src/a.js", "export const a = 1;\n");
  write(root, "src/lazy.js", "export const known = () => import('./a.js');\nexport const unknown = (name) => import(name);\n");
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  const result = refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  assert.equal(result.unsupported.dynamicCodeImports, 1);
  const map = read(root, "knowledge/system/relationships/generated/source-map.md");
  assert.match(map, /dynamically imports/);
  assert.match(map, /literal dynamic import/);
  assert.match(map, /Non-literal dynamic imports/);
});

test("Salesforce metadata refresh maps objects, fields, flows, and direct evidence", () => {
  const root = makeProject("salesforce project");
  write(root, "force-app/main/default/objects/Order__c/Order__c.object-meta.xml", "<CustomObject><label>Order</label></CustomObject>\n");
  write(root, "force-app/main/default/objects/Order__c/fields/Account__c.field-meta.xml", "<CustomField><fullName>Account__c</fullName><type>Lookup</type><referenceTo>Account</referenceTo></CustomField>\n");
  write(root, "force-app/main/default/flows/Update_Order.flow-meta.xml", "<Flow><status>Active</status><processType>AutoLaunchedFlow</processType><object>Order__c</object><field>Account__c</field></Flow>\n");
  setupGuide(root, { sources: [{ path: "force-app/main/default", kind: "salesforce", completeness: "complete" }] });
  const result = refreshGuide(root, { now: "2026-09-10T13:00:00Z" });
  assert.deepEqual(result.counts, { modules: 0, objects: 1, fields: 1, processes: 1, relationships: 4 });

  assert.match(read(root, "knowledge/system/objects/generated/salesforce-objects.md"), /salesforce:object:Order__c/);
  assert.match(read(root, "knowledge/system/fields/generated/salesforce-fields.md"), /salesforce:field:Order__c\.Account__c/);
  assert.match(read(root, "knowledge/system/processes/generated/salesforce-processes.md"), /salesforce:flow:Update_Order/);
  const relationships = read(root, "knowledge/system/relationships/generated/source-map.md");
  assert.match(relationships, /contains field/);
  assert.match(relationships, /references/);
  assert.match(relationships, /mentions object/);
  assert.match(relationships, /direct/);
  assert.match(relationships, /\.field-meta\.xml/);
  assert.match(result.coverage[0].limits, /not a complete Metadata API parser/);
});

test("Salesforce record operations qualify writes without guessing between shared field names", () => {
  const root = makeProject("qualified Salesforce writes");
  for (const objectName of ["Order__c", "Case__c"]) {
    write(root, `force-app/main/default/objects/${objectName}/${objectName}.object-meta.xml`, `<CustomObject><label>${objectName}</label></CustomObject>\n`);
    write(root, `force-app/main/default/objects/${objectName}/fields/Status__c.field-meta.xml`, "<CustomField><fullName>Status__c</fullName><type>Text</type></CustomField>\n");
  }
  write(root, "force-app/main/default/flows/Update_Order.flow-meta.xml", "<Flow><recordUpdates><name>UpdateOrder</name><inputAssignments><field>Status__c</field><value><stringValue>Ready</stringValue></value></inputAssignments><object>Order__c</object></recordUpdates></Flow>\n");
  setupGuide(root, { sources: [{ path: "force-app/main/default", kind: "salesforce", completeness: "complete" }] });
  refreshGuide(root, { now: "2026-09-10T13:00:00Z" });
  const map = read(root, "knowledge/system/relationships/generated/source-map.md");
  assert.match(map, /writes field/);
  assert.match(map, /salesforce:field:Order__c\.Status__c/);
  assert.doesNotMatch(map, /writes field \| `salesforce:field:Case__c\.Status__c`/);
});

test("truncated Salesforce metadata fails before replacing the last successful guide", () => {
  const root = makeProject("truncated Salesforce capture");
  const field = write(root, "force-app/main/default/objects/Order__c/fields/Status__c.field-meta.xml", "<CustomField><fullName>Status__c</fullName><type>Text</type></CustomField>\n");
  setupGuide(root, { sources: [{ path: "force-app/main/default", kind: "salesforce", completeness: "complete" }] });
  refreshGuide(root, { now: "2026-09-10T13:00:00Z" });
  const beforeBuild = read(root, "knowledge/system/generated/build.json");
  const beforeFields = read(root, "knowledge/system/fields/generated/salesforce-fields.md");
  fs.writeFileSync(field, "<CustomField><fullName>Status__c</fullName>\n");
  assert.throws(() => refreshGuide(root, { now: "2026-09-11T13:00:00Z" }), (error) => error.code === "invalid_source");
  assert.equal(read(root, "knowledge/system/generated/build.json"), beforeBuild);
  assert.equal(read(root, "knowledge/system/fields/generated/salesforce-fields.md"), beforeFields);
});

test("approved meaning survives refresh byte for byte and stale source approval is refused", () => {
  const root = makeProject();
  write(root, "src/model.js", "export const model = 'Order';\n");
  write(root, "evidence/order.md", "The owner described the order total.\n");
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });

  approveMeaning(root, {
    action: "create",
    destination: "fields/meaning/order-total.md",
    targetId: "code:src/model.js",
    content: "# Order total\n\nThis is the amount the customer agrees to pay.",
    sourceRefs: ["evidence/order.md"],
    uncertainty: "Tax treatment is not covered.",
  });
  const meaningBefore = read(root, "knowledge/system/fields/meaning/order-total.md");
  const fieldIndex = read(root, "knowledge/system/fields/README.md");
  assert.match(fieldIndex, /\[Order total\]\(meaning\/order-total\.md\): This is the amount the customer agrees to pay\./);
  assert.match(read(root, "knowledge/system/tour.md"), /1 approved meaning pages/);
  write(root, "src/model.js", "export const model = 'Order';\nexport const version = 2;\n");
  refreshGuide(root, { now: "2026-09-11T12:00:00Z" });
  assert.equal(read(root, "knowledge/system/fields/meaning/order-total.md"), meaningBefore);
  assert.match(meaningBefore, /approved_by: "Mike Rihm"/);
  assert.match(meaningBefore, /approval_date: "2026-09-10"/);

  const stale = proposeMeaningChange(root, {
    action: "update",
    destination: "fields/meaning/order-total.md",
    targetId: "code:src/model.js",
    content: "# Order total\n\nUpdated meaning.",
    sourceRefs: ["evidence/order.md"],
    now: "2026-09-11T13:00:00Z",
  });
  write(root, "evidence/order.md", "The owner corrected the source.\n");
  assert.throws(
    () => applyMeaningChange(root, { previewId: stale.previewId, approvalRecordPath: approval(root, stale) }),
    (error) => error instanceof SystemGuideError && error.code === "stale_preview",
  );
  assert.equal(read(root, "knowledge/system/fields/meaning/order-total.md"), meaningBefore);
});

test("partial snapshots preserve missing facts while complete snapshots remove source-deleted facts", () => {
  const root = makeProject();
  write(root, "src/a.js", "export const a = 1;\n");
  write(root, "src/b.js", "export const b = 2;\n");
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "partial" }] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  fs.unlinkSync(path.join(root, "src/b.js"));
  const partial = refreshGuide(root, { now: "2026-09-11T12:00:00Z" });
  assert.equal(partial.counts.modules, 2);
  assert.match(read(root, "knowledge/system/applications/generated/modules.md"), /not-seen-in-partial-refresh/);

  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  const complete = refreshGuide(root, { now: "2026-09-12T12:00:00Z" });
  assert.equal(complete.counts.modules, 1);
  assert.deepEqual(complete.parsedSources, ["src"]);
  assert.doesNotMatch(read(root, "knowledge/system/applications/generated/modules.md"), /src\/b\.js/);
});

test("a failed prepared refresh does not publish content or a successful timestamp", () => {
  const root = makeProject();
  write(root, "src/a.js", "export const a = 1;\n");
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  const beforeBuild = read(root, "knowledge/system/generated/build.json");
  const beforeModules = read(root, "knowledge/system/applications/generated/modules.md");
  write(root, "src/new.js", "export const newPart = true;\n");
  assert.throws(
    () => refreshGuide(root, { now: "2026-09-11T12:00:00Z", failAfterPrepare: true }),
    (error) => error instanceof SystemGuideError && error.code === "injected_failure",
  );
  assert.equal(read(root, "knowledge/system/generated/build.json"), beforeBuild);
  assert.equal(read(root, "knowledge/system/applications/generated/modules.md"), beforeModules);
  assert.equal(inspectGuide(root).lastRefresh, "2026-09-10T12:00:00Z");
  assert.equal(checkGuide(root).issues.some((issue) => issue.code === "source_changed"), true);
});

test("meaning deletion refuses unresolved inbound links and atomically applies explicit repairs", () => {
  const root = makeProject();
  write(root, "evidence/source.md", "Owner-provided evidence.\n");
  setupGuide(root);
  approveMeaning(root, {
    action: "create", destination: "fields/meaning/old-field.md", targetId: "domain:old-field",
    content: "# Old field\n\nThis used to explain the field.", sourceRefs: ["evidence/source.md"],
  });
  approveMeaning(root, {
    action: "create", destination: "processes/meaning/process.md", targetId: "domain:process",
    content: "# Process\n\nSee [the old field](../../fields/meaning/old-field.md \"Field details\").", sourceRefs: ["evidence/source.md"],
  });
  const blocked = proposeMeaningChange(root, {
    action: "delete", destination: "fields/meaning/old-field.md", targetId: "domain:old-field",
    sourceRefs: ["evidence/source.md"], reason: "The field no longer exists in the complete source.", now: "2026-09-11T12:00:00Z",
  });
  assert.deepEqual(blocked.unresolvedInbound, ["processes/meaning/process.md"]);
  assert.match(blocked.beforeText, /This used to explain the field/);
  assert.equal(blocked.applyReady, false);
  assert.throws(
    () => applyMeaningChange(root, { previewId: blocked.previewId, approvalRecordPath: approval(root, blocked) }),
    (error) => error.code === "unresolved_references",
  );

  const fixed = proposeMeaningChange(root, {
    action: "delete", destination: "fields/meaning/old-field.md", targetId: "domain:old-field",
    sourceRefs: ["evidence/source.md"], reason: "The field no longer exists in the complete source.", now: "2026-09-11T13:00:00Z",
    linkRepairs: [{
      path: "processes/meaning/process.md",
      find: "See [the old field](../../fields/meaning/old-field.md \"Field details\").",
      replace: "The former field reference was removed with owner approval.",
    }],
  });
  assert.equal(fixed.applyReady, true);
  const result = applyMeaningChange(root, { previewId: fixed.previewId, approvalRecordPath: approval(root, fixed) });
  assert.equal(result.outcome, "deleted");
  assert.deepEqual(result.repaired, ["processes/meaning/process.md"]);
  assert.equal(fs.existsSync(path.join(root, "knowledge/system/fields/meaning/old-field.md")), false);
  assert.doesNotMatch(read(root, "knowledge/system/processes/meaning/process.md"), /old-field\.md/);
  assert.doesNotMatch(read(root, "knowledge/system/fields/README.md"), /old-field\.md/);
});

test("deletion apply rechecks inbound references created after preview", () => {
  const root = makeProject();
  write(root, "evidence/source.md", "Owner-provided evidence.\n");
  setupGuide(root);
  approveMeaning(root, {
    action: "create", destination: "fields/meaning/target.md", targetId: "domain:target",
    content: "# Target\n\nMeaning to remove.", sourceRefs: ["evidence/source.md"],
  });
  const preview = proposeMeaningChange(root, {
    action: "delete", destination: "fields/meaning/target.md", targetId: "domain:target",
    sourceRefs: ["evidence/source.md"], reason: "No longer useful.", now: "2026-09-11T12:00:00Z",
  });
  assert.equal(preview.applyReady, true);
  approveMeaning(root, {
    action: "create", destination: "processes/meaning/new-link.md", targetId: "domain:new-link",
    content: "# New link\n\nSee [target][old].\n\n[old]: ../../fields/meaning/target.md", sourceRefs: ["evidence/source.md"],
  });
  assert.throws(
    () => applyMeaningChange(root, { previewId: preview.previewId, approvalRecordPath: approval(root, preview) }),
    (error) => error.code === "unresolved_references",
  );
  assert.equal(fs.existsSync(path.join(root, "knowledge/system/fields/meaning/target.md")), true);
});

test("refresh and check flag meaning whose evidence changed or complete-source target disappeared", () => {
  const root = makeProject();
  write(root, "src/model.js", "export const model = true;\n");
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  approveMeaning(root, {
    action: "create", destination: "applications/meaning/model.md", targetId: "code:src/model.js",
    content: "# Model\n\nThe model coordinates the order state.", sourceRefs: ["src/model.js"],
  });
  write(root, "src/model.js", "export const changed = true;\n");
  let checked = checkGuide(root);
  assert.equal(checked.issues.some((issue) => issue.code === "meaning_source_changed"), true);
  fs.unlinkSync(path.join(root, "src/model.js"));
  refreshGuide(root, { now: "2026-09-11T12:00:00Z", full: true });
  checked = checkGuide(root);
  assert.equal(checked.issues.some((issue) => issue.code === "meaning_target_missing"), true);
  assert.equal(checked.issues.some((issue) => issue.code === "meaning_source_missing"), true);
  assert.match(read(root, "knowledge/system/applications/generated/meaning-index.md"), /target missing from complete captured sources/);
  assert.match(read(root, "knowledge/system/README.md"), /Meaning needing review/);
  assert.equal(fs.existsSync(path.join(root, "knowledge/system/applications/meaning/model.md")), true);
});

test("meaning can cite an attributed owner statement or external authority without claiming local verification", () => {
  const root = makeProject();
  setupGuide(root);
  const { preview } = approveMeaning(root, {
    action: "create", destination: "business/meaning/order-purpose.md", targetId: "domain:order-purpose",
    content: "# Order purpose\n\nAn order records the customer's agreement.",
    sourceRefs: [
      { kind: "owner-statement", attributedTo: "Mike Rihm", date: "2026-09-10", statement: "Orders are the customer agreement." },
      { kind: "external", url: "https://example.com/order-policy", title: "Order policy", capturedAt: "2026-09-10" },
    ],
  });
  assert.equal(preview.sourceRefs[0].verification, "caller-attributed");
  assert.equal(preview.sourceRefs[1].verification, "not-verified-by-tool");
  const saved = read(root, "knowledge/system/business/meaning/order-purpose.md");
  assert.match(saved, /owner-statement/);
  assert.match(saved, /https:\/\/example\.com\/order-policy/);
  assert.deepEqual(checkGuide(root).issues, []);
});

test("a target absent from only partial coverage is unconfirmed rather than disproved", () => {
  const root = makeProject();
  fs.mkdirSync(path.join(root, "src"));
  setupGuide(root, { sources: [{ path: "src", kind: "code", completeness: "partial" }] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  approveMeaning(root, {
    action: "create", destination: "applications/meaning/outside-snapshot.md", targetId: "code:src/outside-snapshot.js",
    content: "# Outside snapshot\n\nThe owner says this part exists outside the limited capture.",
    sourceRefs: [{ kind: "owner-statement", attributedTo: "Mike Rihm", date: "2026-09-10", statement: "The capture is limited and omits this part." }],
  });
  const index = read(root, "knowledge/system/applications/generated/meaning-index.md");
  assert.match(index, /target not confirmed by the partial captured sources/);
  assert.doesNotMatch(index, /missing from complete/);
  assert.equal(checkGuide(root).issues.some((issue) => issue.code === "meaning_target_unconfirmed"), true);
});

test("an absent Salesforce target stays unconfirmed when any configured org snapshot is partial", () => {
  const root = makeProject();
  fs.mkdirSync(path.join(root, "snapshots/blue"), { recursive: true });
  fs.mkdirSync(path.join(root, "snapshots/red"), { recursive: true });
  setupGuide(root, { sources: [
    { path: "snapshots/blue", kind: "salesforce", completeness: "complete" },
    { path: "snapshots/red", kind: "salesforce", completeness: "partial" },
  ] });
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  approveMeaning(root, {
    action: "create", destination: "objects/meaning/red-object.md", targetId: "salesforce:object:Red_Only__c",
    content: "# Red object\n\nThe owner says this belongs to the partially captured org.",
    sourceRefs: [{ kind: "owner-statement", attributedTo: "Mike Rihm", date: "2026-09-10", statement: "Red is only a partial capture." }],
  });
  const index = read(root, "knowledge/system/objects/generated/meaning-index.md");
  assert.match(index, /target not confirmed by the partial captured sources/);
  assert.doesNotMatch(index, /missing from complete/);
});

test("setup creates valid empty navigation and labels unapproved adopted meaning for review", () => {
  const root = makeProject();
  setupGuide(root);
  assert.equal(fs.existsSync(path.join(root, "knowledge/system/generated/build.json")), true);
  for (const area of ["business", "data-model", "objects", "fields", "processes", "relationships", "applications"]) {
    assert.equal(fs.existsSync(path.join(root, `knowledge/system/${area}/generated/meaning-index.md`)), true);
  }
  assert.equal(checkGuide(root).ok, true);
  write(root, "knowledge/system/fields/meaning/manual-note.md", "# Manual note\n\nText with no approval record.\n");
  refreshGuide(root, { now: "2026-09-10T12:00:00Z" });
  const index = read(root, "knowledge/system/fields/generated/meaning-index.md");
  assert.match(index, /approval or metadata missing/);
  assert.doesNotMatch(index, /# Approved/);
  assert.equal(read(root, "knowledge/system/fields/meaning/manual-note.md"), "# Manual note\n\nText with no approval record.\n");
});

test("adoption, safe paths, symlinks, and disable preserve owner content", (t) => {
  const root = makeProject();
  write(root, "existing-guide/README.md", "# Davis system knowledge\n\nOwner text.\n");
  assert.throws(() => setupGuide(root, { guidePath: "existing-guide" }), (error) => error.code === "adoption_required");
  const adopted = setupGuide(root, { guidePath: "existing-guide", adopt: true });
  assert.equal(adopted.outcome, "adopted");
  assert.equal(read(root, "existing-guide/README.md"), "# Davis system knowledge\n\nOwner text.\n");
  assert.throws(() => setupGuide(root, { guidePath: "../outside" }), (error) => error.code === "unsafe_path");
  for (const reserved of [".git/guide", ".claude/guide", ".codex/guide", ".agents/guide", "node_modules/guide"]) {
    assert.throws(() => setupGuide(root, { guidePath: reserved }), (error) => error.code === "unsafe_path");
  }
  assert.throws(() => setupGuide(root, { sources: [{ path: "C:/outside", kind: "code", completeness: "complete" }] }), (error) => error.code === "unsafe_path");

  write(root, "src/a.js", "export const a = 1;\n");
  setupGuide(root, { guidePath: "existing-guide", sources: [{ path: "src", kind: "code", completeness: "complete" }] });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "system-guide-outside-"));
  try {
    fs.symlinkSync(outside, path.join(root, "src/linked"), "junction");
    assert.throws(() => refreshGuide(root), (error) => error.code === "unsafe_symlink");
  } catch (error) {
    if (error.code === "EPERM") t.diagnostic("Symlink creation is unavailable on this Windows host");
    else if (!(error instanceof assert.AssertionError)) throw error;
    else throw error;
  }
  const disabled = disableGuide(root);
  assert.equal(disabled.contentPreserved, true);
  assert.equal(inspectGuide(root).state, "off");
  assert.equal(read(root, "existing-guide/README.md"), "# Davis system knowledge\n\nOwner text.\n");
});

test("CLI status is machine-readable and check uses health exit status", () => {
  const root = makeProject("cli project");
  write(root, "src/a.js", "export const a = 1;\n");
  let result = spawnSync(process.execPath, [cli, "status", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).state, "off");
  result = spawnSync(process.execPath, [cli, "setup", "--root", root, "--source", "code:complete:src", "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  result = spawnSync(process.execPath, [cli, "refresh", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  write(root, "src/b.js", "export const b = 2;\n");
  result = spawnSync(process.execPath, [cli, "status", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).state, "on");
  result = spawnSync(process.execPath, [cli, "check", "--root", root, "--jsonjson"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  result = spawnSync(process.execPath, [cli, "check", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).issues[0].code, "source_changed");
});

test("cheap status reports a corrupt build record as needs repair without scanning sources", () => {
  const root = makeProject();
  setupGuide(root, { sources: [{ path: "missing-source", kind: "code", completeness: "complete" }] });
  write(root, "knowledge/system/generated/build.json", "not json\n");
  const inspected = inspectGuide(root);
  assert.equal(inspected.state, "needs-repair");
  assert.equal(inspected.problems.some((entry) => entry.code === "invalid_build_record"), true);
});
