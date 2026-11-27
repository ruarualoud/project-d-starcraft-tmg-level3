import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(process.argv[2]);
assert.ok(directory.startsWith(path.join(root, 'build/wave4-web') + path.sep));
const service = JSON.parse(await fs.readFile(path.join(directory, 'service.private.json'), 'utf8'));
assert.equal(service.liveEnabled, false); assert.equal(service.origin, 'http://127.0.0.1:5484');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'content/source-releases/wave4-20261127/abilities/ability-diff.json'), 'utf8'));
const results = await fs.readFile(path.join(directory, 'web-progress.public.json'), 'utf8').then(JSON.parse).catch(e => {
  if (e.code !== 'ENOENT') throw e; return [];
});
const api = service.origin + '/starcraft-tmg-level3/api/v1/rooms/';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function recoveryTicket(page, item, authorization) {
  return fetch(api + item.roomId + '/recovery-tickets', { method: 'POST',
    headers: { authorization, 'content-type': 'application/json' }, body: '{}' });
}
async function current(item) {
  const store = openWave3EngineeringStoreV1({ directory: path.join(directory, 'rooms', item.kind), filename: 'room.sqlite', readOnly: true });
  try { return await store.loadRoom(item.roomId); } finally { store.close(); }
}
async function legal(page) {
  await page.getByRole('button', { name: '行动', exact: true }).click();
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/legal-space') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Load LegalSpace', exact: true }).click(),
  ]);
  const value = await response.json();
  assert.equal(value.result.ok, true);
  return value.result.legalSpace;
}
async function operate(page, item, title, parameterized, expectedDefinition) {
  const before = await current(item);
  const card = page.getByText(new RegExp(escape(title))).first().locator('..');
  const [previewResponse] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/preview') && r.request().method() === 'POST'),
    (async () => {
      if (parameterized) {
        await card.getByRole('button', { name: '设置行动', exact: true }).click();
        const form = page.getByTestId('native-action-form');
        if (title === 'choose_melee_tough_armour') {
          await form.getByRole('button', { name: /^添加/ }).click();
          await form.getByRole('button', { name: /^(\d+|第\d+颗护甲骰)$/ }).first().click();
        }
        await form.getByRole('button', { name: '预览此行动', exact: true }).click();
      } else await card.getByRole('button', { name: '生成 Preview', exact: true }).click();
    })(),
  ]);
  const preview = await previewResponse.json();
  assert.equal(preview.result.ok, true, JSON.stringify(preview));
  if (parameterized) {
    assert.equal(preview.result.preview.core.confirmationPolicy.baseClass, 'explicit_human');
    assert.equal(preview.result.preview.core.confirmationPolicy.requiresExplicitHuman, true);
  }
  if (expectedDefinition) assert.ok(JSON.stringify(preview.result.preview.core.action).includes(expectedDefinition));
  assert.equal((await current(item)).envelope.stateHash, before.envelope.stateHash, 'Web Preview mutated state');
  await page.getByText('密封 Preview，等待真人确认', { exact: true }).waitFor();
  if (expectedDefinition && ['armory','observer','veil-of-shadows','brood-instinct'].includes(item.kind)) {
    await page.getByText('密封 Preview，等待真人确认', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(directory, item.kind + '-preview.png') });
  }
  const [applyResponse, replayResponse] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/apply') && r.request().method() === 'POST'),
    page.waitForResponse(r => r.url().endsWith('/replay') && r.request().method() === 'GET', { timeout: 60000 }),
    page.getByRole('button', { name: '确认并应用', exact: true }).click(),
  ]);
  const applied = await applyResponse.json();
  assert.equal(applied.result.ok, true, JSON.stringify(applied));
  const replayed = await replayResponse.json();
  assert.equal(replayed.result.matchesCurrent, true);
  const after = await current(item);
  assert.equal(after.stateRevision, before.stateRevision + 1);
  await page.getByText('verified revision: ' + after.stateRevision, { exact: true }).waitFor();
  return { actionType: preview.result.preview.core.action.actionType, revision: after.stateRevision, stateHash: after.envelope.stateHash };
}
try {
  for (const item of new Map(service.rooms.map(r => [r.roomId, r])).values()) {
    if (results.some(r => r.definitionId === item.definitionId)) continue;
    const contexts = await Promise.all(['player1', 'player2'].map(side => browser.newContext({
      viewport: item.kind === 'power_field' && side === 'player2' ? { width: 390, height: 844 } : { width: 1500, height: 1000 } })));
    const pages = Object.fromEntries(await Promise.all(contexts.map(async (context, i) => ['player' + (i + 1), await context.newPage()])));
    const credentials = JSON.parse(await fs.readFile(path.join(directory, 'rooms', item.kind, item.roomId + '.seats.private.json'), 'utf8'));
    const auth = {}, pageErrors = [];
    const flowFile = path.join(directory, item.kind + '-web-flow.public.json');
    let flow = await fs.readFile(flowFile, 'utf8').then(JSON.parse).catch(e => { if (e.code !== 'ENOENT') throw e; return null; });
    try {
      const before = await current(item);
      if (flow) {
        assert.equal(flow.definitionId, item.definitionId);
        assert.equal(flow.trace.at(-1).stateHash, before.envelope.stateHash, 'Unreviewed Web continuation');
      } else assert.equal(before.stateRevision, 0, 'Web acceptance must begin at its frozen native prefix');
      for (const side of ['player1', 'player2']) {
        const page = pages[side];
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('request', request => {
          if (request.url().startsWith(api) && request.headers().authorization) auth[side] = request.headers().authorization;
        });
        const issued = await recoveryTicket(page, item, 'Bearer ' + credentials[side].seatToken);
        const ticket = await issued.json(); assert.equal(ticket.result.ok, true, JSON.stringify(ticket));
        const recovering = page.waitForResponse(r => r.url().endsWith('/recovery-exchange') && r.request().method() === 'POST');
        await page.goto(service.origin + '/room/' + item.roomId + '#recovery=' + encodeURIComponent(ticket.result.recovery.recoveryToken));
        assert.equal((await (await recovering).json()).result.credential.seatKey, side);
        await page.getByTestId('battlefield-map-contract-v1').waitFor({ timeout: 60000 });
      }
      const owner = flow?.owner || before.envelope.state.activeSideKey;
      const other = owner === 'player1' ? 'player2' : 'player1';
      const name = inventory.definitions.find(r => r.definitionId === item.definitionId).definitionName;
      if (!flow) {
      const outsider = await fetch(api + item.roomId + '/legal-space', { method: 'POST',
        headers: { authorization: auth[other], 'content-type': 'application/json' }, body: '{}' });
      const otherMenu = (await outsider.json()).result;
      assert.ok(!otherMenu.ok || !otherMenu.legalSpace.parameterDomains.some(d => d.definitionId === item.definitionId), 'Opponent must not operate the card');
      const menu = await legal(pages[owner]);
      const domain = menu.parameterDomains.find(d => d.definitionId === item.definitionId || d.sourceDomain?.definitionId === item.definitionId);
      assert.ok(domain, 'Exact revision absent from Web LegalSpace');
      await pages[owner].getByText(new RegExp(escape(name))).first().waitFor();
      flow = { definitionId: item.definitionId, owner, initialStateHash: before.envelope.stateHash,
        trace: [await operate(pages[owner], item, name, true, item.definitionId)] };
      await atomicWrite(flowFile, JSON.stringify(flow, null, 2));
      }
      const trace = flow.trace;
      for (let step = 0; step < 8; step++) {
        const aggregate = await current(item), state = aggregate.envelope.state;
        if (['observer','overseer','veil-of-shadows'].includes(item.kind) && !state.pendingOfficialReactionWindow) break;
        if (state.log.flatMap(r => r.events || []).some(e => e.type === 'close_combat_attack' || e.type === 'ranged_attack')) break;
        const page = pages[state.activeSideKey];
        await page.bringToFront();
        await page.getByText('r' + aggregate.stateRevision, { exact: true }).waitFor({ timeout: 20000 });
        const space = await legal(page);
        if (space.finiteActions.length === 1) trace.push(await operate(page, item, space.finiteActions[0].action.actionType, false));
        else {
          assert.equal(space.parameterDomains.length, 1);
          const domain = space.parameterDomains[0];
          const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
          trace.push(await operate(page, item, domain.actionType, (schema.required || []).length > 0));
        }
        await atomicWrite(flowFile, JSON.stringify(flow, null, 2));
      }
      const after = await current(item), state = after.envelope.state;
      assert.ok(state.officialReactionHistory.some(r => r.definitionId === item.definitionId));
      const sourceKey = inventory.definitions.find(r => r.definitionId === item.definitionId).recordKey;
      assert.equal(Object.values(state.cardResources).flat().find(c => c.officialCardRecordKey === sourceKey).readiness, 'exhausted');
      assert.equal(state.pendingOfficialReactionWindow, undefined);
      if (!['observer','overseer','veil-of-shadows'].includes(item.kind)) {
        assert.ok(state.log.flatMap(r => r.events || []).some(e => e.type === 'close_combat_attack' || e.type === 'ranged_attack'));
        assert.ok(state.officialReactionResolutionHistory.every(r => r.consumedByHost));
      }
      for (const side of ['player1', 'player2']) {
        await pages[side].bringToFront();
        await pages[side].getByText('r' + after.stateRevision, { exact: true }).waitFor({ timeout: 20000 });
        const issued = await recoveryTicket(pages[side], item, auth[side]);
        const ticket = await issued.json(); assert.equal(ticket.result.ok, true);
        await pages[side].goto('about:blank');
        await pages[side].goto(service.origin + '/room/' + item.roomId + '#recovery=' + encodeURIComponent(ticket.result.recovery.recoveryToken));
        await pages[side].getByTestId('battlefield-map-contract-v1').waitFor();
        const read = await fetch(api + item.roomId, { headers: { authorization: auth[side] } });
        assert.equal((await read.json()).result.projection.viewer.seatKey, side);
      }
      const next = await legal(pages[state.activeSideKey]);
      assert.ok(next.finiteActions.length + next.parameterDomains.length > 0);
      const replay = await fetch(api + item.roomId + '/replay', { headers: { authorization: auth[owner] } });
      assert.equal((await replay.json()).result.matchesCurrent, true);
      assert.deepEqual(pageErrors, []);
      results.push({ definitionId: item.definitionId, roomId: item.roomId, kind: item.kind, abilityName: name,
        twoIsolatedBrowserSeats: true, opponentCannotChooseCard: true, previewReadOnly: true,
        trace, signedWebReceipts: after.stateRevision, stateHash: after.envelope.stateHash,
        seatRecoveryReentryVerified: true, automaticCounterpartyRevisionRefresh: true,
        nativePrefix: { roomId: item.sourceRoomId, stateHash: item.sourceStateHash,
          bindingHash: item.sourceBindingHash, signedReceipts: item.sourcePrefixReceipts },
        successorMenuAvailable: true, replayMatched: true,
        successorScope: ['observer','overseer'].includes(item.kind) ? 'native resolve_charge menu after revised distance roll'
          : item.kind === 'veil-of-shadows' ? 'native PLACE prefix then Web HEAL and movement menu' : 'Web native attack damage settled',
        mobileDefender: item.kind === 'power_field', fullMatchAdmission: false });
      await atomicWrite(path.join(directory, 'web-progress.public.json'), JSON.stringify(results, null, 2));
      console.log('passed Web ' + item.definitionId);
    } catch (error) {
      await pages.player1.screenshot({ path: path.join(directory, item.kind + '-failure-player1.png') }).catch(() => {});
      await pages.player2.screenshot({ path: path.join(directory, item.kind + '-failure-player2.png') }).catch(() => {});
      await atomicWrite(path.join(directory, item.kind + '-failure.private.txt'), String(error) + '\n' + await pages.player2.locator('body').innerText());
      throw new Error(String(error.message).split('\n')[0]);
    } finally { await Promise.all(contexts.map(c => c.close())); }
  }
  assert.equal(results.length, 11);
  const report = { schema: 'starcraft_tmg_wave4_timing_web_v1', status: 'passed', definitionsVerified: 11,
    inventoryHash: inventory.inventoryHash, results, scope: service.scope,
    fullWave4LobbyBuilderAdmission: false, sourceHeldDefinitions: 39, modelCalls: 0, trainingTruth: false, productionPromoted: false };
  await atomicWrite(path.join(directory, 'result.public.json'), JSON.stringify(report, null, 2) + '\n');
  await atomicWrite(path.join(root, 'docs/development/wave4/evidence/timing-web.public.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'passed', definitions: 11, signedWebReceipts: results.reduce((n,r) => n + r.signedWebReceipts, 0) }));
} finally { await browser.close(); }
