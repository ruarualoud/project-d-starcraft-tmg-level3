import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { addWall } from './verify-wave3-spec-ops-suppression-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID as definitionId, OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID as weaponId, OFFICIAL_OVERWATCH_PROFILE_KEY as profileKey } from '../packages/rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
const output = 'build/ticket-28-terran-wave3-20261117-v1/auto-turret-overwatch/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const sourceCheckpoint = 'build/ticket-28-terran-wave3-20261117-v1/generated-structure/movement/authority.json';
const roomId = (id)=>'wave3-auto-turret-overwatch-' + id;
const releaseId = (id)=>roomId(id) + '-v1';
const repairRef = process.argv.find((arg)=>arg.startsWith('--repair-ref='))?.slice(13);
const read = async (ref)=>JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id)=>state.pieces.find((piece)=>piece.id === id);
const sha256 = (bytes)=>createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
    const ref = output + name;
    await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
    return ref;
}
async function cached(name) {
    try {
        return await read(output + name);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return null;
    }
}
function registry() {
    const store = createSqliteOfficialReleaseStoreV1({
        filename: path.join(directory, 'releases.sqlite')
    });
    return {
        resolver: createOfficialReleaseResolverV2({
            store,
            loadArtifact: read
        }),
        close: ()=>store.close()
    };
}
async function sourceProduct() {
    const product = registry();
    try {
        const manifest = await read(sourceRef);
        product.resolver.register(manifest);
        return await product.resolver.resolve({
            releaseId: manifest.releaseId,
            purpose: 'area_ability_component'
        });
    } finally{
        product.close();
    }
}
function runtimeFor(context, state) {
    return createOfficialCharacteristicStatusComponentRuntimeV2({
        context,
        spatialState: state,
        definitionIds: [],
        includeRanged: true,
        includePrecisionChoices: true,
        includeArmourChoices: true,
        weaponDefinitionIds: [
            weaponId
        ]
    });
}
function arrangeMarine(piece, x, y, direction = 1) {
    arrange(piece, x, y);
    piece.models.forEach((model, index)=>Object.assign(model, {
            xInches: x + direction * (index % 3) * (model.baseWidthInches + 0.02),
            yInches: y + Math.floor(index / 3) * (model.baseDepthInches + 0.02)
        }));
}
async function sceneFor(context, id) {
    const original = (await read(sourceCheckpoint)).state;
    const setup = createOfficialReleaseRosterStateV2({
        context,
        reactionDefinitionIds: [
            definitionId
        ],
        legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
        candidatesBySide: Object.fromEntries([
            'player1',
            'player2'
        ].map((sideKey)=>[
                sideKey,
                {
                    sideKey,
                    scaleId: 'Standard',
                    mineralBudget: 2000,
                    factionRecordKey: 'tactical_cards:terran_armed_forces',
                    tacticalCardRecordKeys: [],
                    units: (sideKey === 'player1' ? [
                        'marine-a',
                        'marine-b'
                    ] : [
                        'counter-marine'
                    ]).map((unitInstanceId)=>({
                            unitInstanceId,
                            recordKey: 'army_units:marine',
                            compositionKind: 'small',
                            upgrades: []
                        }))
                }
            ]))
    });
    const fields = [
        'board',
        'officialDeploymentGeometryBinding',
        'engagementScale',
        'armyBuildingEngagementScale',
        'officialMissionRuntimeDescriptor',
        'supplyLossLedger',
        'officialModelGapTransitPolicy',
        'officialMissionSupplyProfile'
    ];
    const state = {
        ...Object.fromEntries(fields.map((key)=>[
                key,
                structuredClone(original[key])
            ])),
        ...setup.state,
        round: 1,
        phase: 'assault',
        activeSideKey: 'player1',
        firstPlayerSideKey: 'player1',
        log: [],
        phaseFirstActorByRound: {
            '1:assault': {
                round: 1,
                phase: 'assault',
                chosenFirstActorSideKey: 'player1'
            }
        }
    };
    state.board.tokens = [];
    state.board.markers = [];
    state.board.effectMarkers = [];
    arrangeMarine(pieceOf(state, 'marine-a'), 10, 10);
    arrangeMarine(pieceOf(state, 'marine-b'), 10, 16);
    arrangeMarine(pieceOf(state, 'counter-marine'), 42, 28);
    for (const [unitId, x, y] of [
        [
            'turret-one',
            16,
            10
        ],
        [
            'turret-two',
            18,
            14
        ]
    ]){
        const turret = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:auto_turret', unitId);
        arrange(turret, x, y);
        state.pieces.push(turret);
    }
    state.players.player2.passedPhases.assault = id === 'use';
    const coherency = declareCoherency(state);
    return {
        state: refreshOfficialReleaseRosterDerivedStateV2({
            context,
            state
        }),
        scenario: {
            sourceCheckpoint,
            actualGeneratedPieceFactory: true,
            phasePositionsAndPassedFlagDeclared: true,
            partialLegalRosters: true,
            fullRound: false,
            fullMatch: false,
            coherency,
            modelCalls: 0
        }
    };
}
async function registerScene(context, id, scene) {
    const runtime = runtimeFor(context, scene.state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.93.0');
    const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
    const product = registry();
    try {
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({
            releaseId: releaseId(id),
            dataset: context.dataset,
            snapshot: context.snapshot,
            sourceRevision: await read(m.source.sourceRevisionRef),
            datasetRef: m.source.datasetRef,
            snapshotRef: m.source.snapshotRef,
            sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references,
            sourcePolicy: m.source.policy,
            components: {
                ...m.components,
                rulesRuntime: {
                    ref: runtimeRef,
                    version: runtime.descriptor.runtimeVersion,
                    integrity: {
                        field: 'runtimeHash',
                        value: runtime.descriptor.runtimeHash
                    }
                }
            }
        }));
        const resolved = await product.resolver.resolve({
            releaseId: releaseId(id),
            purpose: 'area_ability_component'
        });
        const authority = createWave3ComponentEngineeringAuthorityV1({
            context: resolved,
            ...scene
        });
        const old = await cached(id + '/authority.json');
        if (old) assert.deepEqual(old, authority);
        else await save(id + '/authority.json', authority);
    } finally{
        product.close();
    }
}
function openProduct() {
    const product = registry();
    return {
        ...product,
        async branch (id) {
            const authority = await read(output + id + '/authority.json');
            const context = await product.resolver.resolve({
                releaseId: releaseId(id),
                purpose: 'area_ability_component'
            });
            const runtime = runtimeFor(context, authority.state);
            assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
            const native = openWave3EngineeringRoomV1({
                directory: path.join(directory, id),
                filename: 'room.sqlite',
                rulesRuntime: bindOfficialReleaseRulesRuntimeV2({
                    context,
                    runtime
                })
            });
            return {
                id,
                authority,
                runtime,
                native,
                close: ()=>native.close()
            };
        }
    };
}
async function savePrefixes(branch) {
    const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
    const receipts = bundle.privateJournal.filter((row)=>row.payload.type === 'accepted_transition').map((row)=>row.payload.payload.receipt);
    for(let revision = 0; revision <= receipts.length; revision++){
        const ref = branch.id + '/checkpoint-r' + revision + '.json';
        if (await cached(ref)) continue;
        const replayed = branch.native.engine.replay({
            initialEnvelope: bundle.initialEnvelope,
            journal: receipts.slice(0, revision)
        });
        assert.equal(replayed.ok, true, JSON.stringify(replayed));
        await save(ref, {
            envelope: replayed.envelope
        });
    }
}
async function shootAndFinish(branch, credentials, pieceId, key) {
    await commitWave3RangedBatchV1({
        directory: path.join(directory, branch.id),
        native: branch.native,
        runtime: branch.runtime,
        roomId: roomId(branch.id),
        credentials,
        attackerSideKey: 'player1',
        attackerPieceId: pieceId,
        targetPieceId: 'turret-two',
        weaponName: 'C-14 rifle',
        operationKey: key + '-shot',
        selectPoolParameters: poolParameters
    });
    await branch.native.commit({
        roomId: roomId(branch.id),
        credential: credentials.player1,
        operationKey: key + '-finish',
        select: (row)=>row.actionType === 'finish_activation' && row.pieceId === pieceId,
        parameters: ()=>({})
    });
    await savePrefixes(branch);
}
async function replay(native, id, prefix) {
    const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
    const receipts = journal.privateJournal.filter((row)=>row.payload.type === 'accepted_transition').map((row)=>row.payload.payload.receipt);
    for(let revision = 0; revision <= current.stateRevision; revision++){
        const result = native.engine.replay({
            initialEnvelope: journal.initialEnvelope,
            journal: receipts.slice(0, revision)
        });
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
    }
    assert.deepEqual(await native.store.loadRoom(id), current);
    return {
        receipts: receipts.length,
        checkpoints: current.stateRevision + 1,
        exact: true
    };
}
async function legacy(product) {
    const results = [];
    for (const spec of [
        {
            id: 'structure-ranged',
            output: 'build/ticket-28-terran-wave3-20261117-v1/generated-structure/',
            branch: 'ranged',
            roomId: 'wave3-generated-structure-ranged',
            version: '3.90.0'
        },
        {
            id: 'timed-life',
            output: 'build/ticket-28-terran-wave3-20261117-v1/auto-turret-timed-life/',
            branch: 'native',
            roomId: 'wave3-auto-turret-timed-life',
            version: '3.92.0'
        }
    ]){
        const old = await cached('legacy/' + spec.id + '.json');
        if (old) {
            results.push(old);
            continue;
        }
        const prefix = spec.output + spec.branch + '/';
        const authority = await read(prefix + 'authority.json');
        const store = new DatabaseSync(path.join(root, spec.output, 'releases.sqlite'), {
            readOnly: true
        });
        let manifest;
        try {
            manifest = JSON.parse(store.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(authority.releaseId).manifest_json);
        } finally{
            store.close();
        }
        product.resolver.register(manifest);
        const context = await product.resolver.resolve({
            releaseId: manifest.releaseId,
            purpose: 'area_ability_component'
        });
        const options = spec.id === 'timed-life' ? {
            definitionIds: [
                'unit:holo_decoy/lethal-hologram-any-phase@1'
            ],
            includeMelee: true
        } : {
            definitionIds: []
        };
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({
            context,
            spatialState: authority.state,
            ...options,
            includeRanged: true,
            includePrecisionChoices: true,
            includeArmourChoices: true
        });
        assert.equal(runtime.descriptor.runtimeVersion, spec.version);
        assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
        const originalFile = path.join(root, prefix, 'room.sqlite'), originalHash = sha256(await fs.readFile(originalFile));
        const targetDir = path.join(directory, 'legacy', spec.id);
        await fs.mkdir(targetDir, {
            recursive: true
        });
        const target = path.join(targetDir, 'room.sqlite');
        try {
            await fs.access(target);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await fs.copyFile(originalFile, target);
        }
        const native = openWave3EngineeringRoomV1({
            directory: targetDir,
            filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({
                context,
                runtime
            })
        });
        try {
            await native.restoreDependencies(spec.roomId, authority);
            const result = {
                id: spec.id,
                runtimeVersion: spec.version,
                descriptorExact: true,
                ...await replay(native, spec.roomId, prefix + 'checkpoint-r'),
                originalDatabaseSha256: originalHash,
                modelCalls: 0
            };
            assert.equal(sha256(await fs.readFile(originalFile)), originalHash);
            await save('legacy/' + spec.id + '.json', result);
            results.push(result);
        } finally{
            native.close();
        }
    }
    return results;
}
async function main() {
    await fs.mkdir(directory, {
        recursive: true
    });
    const result = await runProductBoundaryCheck({
        directory: path.join(directory, 'verification'),
        identity: {
            factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
            factoryExport: 'createOfficialReleaseRosterStateV2',
            sourceRef,
            contractVersion: 'T28-W3-08-GaussCannon-Overwatch-ActivationEnd-v1'
        },
        steps: [
            {
                name: 'compile',
                repairRef,
                openProduct: sourceProduct,
                check: async (context)=>{
                    for (const id of [
                        'use',
                        'skip'
                    ])await registerScene(context, id, await sceneFor(context, id));
                    const state = (await read(output + 'use/authority.json')).state, runtime = runtimeFor(context, state), snapshot = JSON.stringify(state);
                    for (const id of [
                        definitionId,
                        weaponId
                    ])assert.equal(runtime.catalogue.definitions.find((row)=>row.definitionId === id).execution.status, 'executable_exact');
                    const profile = state.officialAttackProfileCatalogue.profilesByProfileKey[profileKey];
                    assert.equal(profile.range.normalRangeInches, 8);
                    assert.equal(profile.rateOfAttack, 6);
                    assert.equal(profile.hitThreshold, 3);
                    assert.equal(profile.damage, 1);
                    assert.equal(profile.surge, null);
                    assert(profile.effects.some((row)=>row.effectAtomId === 'attack-effect:pinpoint-v1'));
                    const query = runtime.query(state, {
                        queryKind: 'auto_turret_overwatch',
                        targetPieceId: 'marine-a'
                    });
                    assert.deepEqual(query.conditionalReactionSourceIds, [
                        'turret-one',
                        'turret-two'
                    ]);
                    const early = structuredClone(state);
                    early.phase = 'movement';
                    assert.deepEqual(runtime.query(early, {
                        queryKind: 'auto_turret_overwatch',
                        targetPieceId: 'marine-a'
                    }).conditionalReactionSourceIds, []);
                    const blocked = structuredClone(state);
                    addWall(blocked, 14);
                    assert.equal(runtime.query(blocked, {
                        queryKind: 'auto_turret_overwatch',
                        targetPieceId: 'marine-a'
                    }).conditionalShotAvailability.find((row)=>row.sourcePieceId === 'turret-one').legal, false);
                    const engaged = structuredClone(state);
                    arrangeMarine(pieceOf(engaged, 'counter-marine'), 8.74, 10, -1);
                    declareCoherency(engaged);
                    assert.equal(runtime.query(engaged, {
                        queryKind: 'auto_turret_overwatch',
                        targetPieceId: 'marine-a'
                    }).conditionalShotAvailability.find((row)=>row.sourcePieceId === 'turret-one').legal, true);
                    const bounds = [];
                    for (const delta of [
                        -0.01,
                        0.01
                    ]){
                        const edge = structuredClone(state), turret = pieceOf(edge, 'turret-one').models[0], marine = pieceOf(edge, 'marine-a');
                        arrangeMarine(marine, 16 + turret.baseWidthInches / 2 + marine.models[0].baseWidthInches / 2 + 8 + delta, 10);
                        const legal = runtime.query(edge, {
                            queryKind: 'auto_turret_overwatch',
                            targetPieceId: 'marine-a'
                        }).conditionalShotAvailability.find((row)=>row.sourcePieceId === 'turret-one').legal;
                        assert.equal(legal, delta < 0);
                        bounds.push({
                            delta,
                            legal
                        });
                    }
                    const ordinary = structuredClone(state);
                    ordinary.activeSideKey = 'player2';
                    ordinary.players.player2.passedPhases.assault = false;
                    assert(!runtime.ranged.enumerate(ordinary).parameterDomains.some((row)=>row.pieceId === 'turret-one'));
                    const forged = structuredClone(state);
                    forged.officialReactionFamilySourceBundle.routes[0].sourceText += 'x';
                    assert.throws(()=>runtimeFor(context, forged), /REACTION_SOURCE_MISMATCH/);
                    assert.equal(JSON.stringify(state), snapshot);
                    const ref = await save('compile.json', {
                        profile,
                        query,
                        bounds,
                        noLosRejected: true,
                        pinpointEngagedTargetSupported: true,
                        ordinaryStructureActionRejected: true,
                        forgedSourceRejected: true,
                        modelCalls: 0
                    });
                    return {
                        evidenceRef: ref,
                        checkpointRef: ref
                    };
                }
            },
            {
                name: 'consume',
                repairRef,
                openProduct,
                check: async (product)=>{
                    const results = [];
                    for (const id of [
                        'use',
                        'skip'
                    ]){
                        const branch = await product.branch(id);
                        try {
                            const credentials = await branch.native.create(roomId(id), branch.authority);
                            await savePrefixes(branch);
                            await shootAndFinish(branch, credentials, 'marine-a', 'first');
                            const current = await branch.native.store.loadRoom(roomId(id));
                            assert.equal(current.envelope.state.pendingOfficialAutoTurretOverwatch.stage, 'reaction');
                            assert.equal(current.envelope.state.activeSideKey, 'player2');
                            const query = branch.runtime.query(current.envelope.state, {
                                queryKind: 'auto_turret_overwatch'
                            });
                            assert(query.conditionalReactionSourceIds.includes('turret-one'));
                            assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), current);
                            assert.throws(()=>branch.runtime.lifecycle(current.envelope.state, {
                                    eventKind: 'cleanup_and_refresh'
                                }), /OVERWATCH_CONTINUATION_REQUIRED/);
                            results.push({
                                id,
                                revision: current.stateRevision,
                                query
                            });
                        } finally{
                            branch.close();
                        }
                    }
                    const ref = await save('consume.json', {
                        results,
                        parentSavedBeforeChoice: true,
                        modelCalls: 0
                    });
                    return {
                        evidenceRef: ref,
                        checkpointRef: ref
                    };
                }
            },
            {
                name: 'successor',
                repairRef,
                openProduct,
                check: async (product)=>{
                    const results = [];
                    for (const id of [
                        'use',
                        'skip'
                    ]){
                        const branch = await product.branch(id);
                        try {
                            const credentials = await branch.native.create(roomId(id), branch.authority);
                            const reaction = await branch.native.commit({
                                roomId: roomId(id),
                                credential: credentials.player2,
                                operationKey: 'reaction',
                                select: (row)=>id === 'skip' ? row.actionType === 'pass_reaction_family_window' : row.definitionId === definitionId && row.sourceInstanceId === 'turret-one',
                                parameters: ()=>id === 'skip' ? {} : {
                                        paymentCardInstanceIds: []
                                    }
                            });
                            assert.equal(reaction.preview.core.chanceTicket, null);
                            await savePrefixes(branch);
                            let shot = null;
                            if (id === 'use') {
                                const ready = await read(output + id + '/checkpoint-r' + (reaction.preview.core.expectedStateRevision + 1) + '.json');
                                assert.equal(ready.envelope.state.pendingOfficialAutoTurretOverwatch.stage, 'attack');
                                assert.deepEqual(branch.runtime.enumerate(ready.envelope.state).parameterDomains.map((row)=>row.pieceId), [
                                    'turret-one'
                                ]);
                                const forged = structuredClone(ready.envelope.state);
                                forged.pendingOfficialAutoTurretOverwatch.sourcePieceId = 'turret-two';
                                assert.throws(()=>branch.runtime.enumerate(forged), /OVERWATCH_PARENT_INVALID|OVERWATCH_ATTACK_GRANT_INVALID/);
                                shot = await commitWave3RangedBatchV1({
                                    directory: path.join(directory, id),
                                    native: branch.native,
                                    runtime: branch.runtime,
                                    roomId: roomId(id),
                                    credentials,
                                    attackerSideKey: 'player2',
                                    attackerPieceId: 'turret-one',
                                    targetPieceId: 'marine-a',
                                    weaponName: 'Gauss Cannon',
                                    operationKey: 'gauss',
                                    selectPoolParameters: poolParameters
                                });
                                await savePrefixes(branch);
                            }
                            let current = await branch.native.store.loadRoom(roomId(id));
                            const after = current.envelope.state;
                            assert(!after.pendingOfficialAutoTurretOverwatch);
                            assert(!after.selectedRosterActivationWindow);
                            assert.equal(after.activeSideKey, id === 'use' ? 'player1' : 'player2');
                            assert.deepEqual(pieceOf(after, 'turret-one').activatedPhases, pieceOf(branch.authority.state, 'turret-one').activatedPhases);
                            const nativeInitial = await read(output + id + '/checkpoint-r0.json');
                            assert.deepEqual(after.cardResources, nativeInitial.envelope.state.cardResources);
                            const history = (after.officialReactionHistory || []).filter((row)=>row.definitionId === definitionId);
                            assert.equal(history.length, id === 'use' ? 1 : 0);
                            if (id === 'use') {
                                const quotaQuery = branch.runtime.query(after, {
                                    queryKind: 'auto_turret_overwatch',
                                    targetPieceId: 'marine-b'
                                });
                                assert(quotaQuery.conditionalShotAvailability.find((row)=>row.sourcePieceId === 'turret-one').legal);
                                assert.deepEqual(quotaQuery.conditionalReactionSourceIds, []);
                                await save(id + '/quota-query.json', quotaQuery);
                            }
                            const ref = await save(id + '/successor.json', {
                                revision: current.stateRevision,
                                shotEvent: shot?.event || null,
                                outcome: after.officialAutoTurretOverwatchHistory.at(-1),
                                quotaEnforced: id === 'use',
                                currentActivationFlagsRestored: true,
                                resumedSideKey: after.activeSideKey,
                                zeroPayment: true,
                                modelCalls: 0
                            });
                            results.push({
                                id,
                                ref
                            });
                        } finally{
                            branch.close();
                        }
                    }
                    const ref = await save('successor.json', {
                        results,
                        modelCalls: 0
                    });
                    return {
                        evidenceRef: ref,
                        checkpointRef: ref
                    };
                }
            },
            {
                name: 'coldRecovery',
                repairRef,
                openProduct,
                check: async (product)=>{
                    const current = [];
                    for (const id of [
                        'use',
                        'skip'
                    ]){
                        const branch = await product.branch(id);
                        try {
                            await branch.native.restoreDependencies(roomId(id), branch.authority);
                            current.push({
                                id,
                                ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r')
                            });
                        } finally{
                            branch.close();
                        }
                    }
                    const old = await legacy(product);
                    const ref = await save('cold-recovery.json', {
                        current,
                        legacy: old,
                        modelCalls: 0
                    });
                    return {
                        evidenceRef: ref,
                        checkpointRef: ref
                    };
                }
            }
        ]
    });
    console.log(JSON.stringify({
        gate: 'auto-turret-overwatch',
        status: result.status,
        failures: result.failures.length
    }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { openProduct, sourceProduct, runtimeFor, registry };
