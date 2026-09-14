import { spawnSync } from "node:child_process";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_TRAINING_EXPORT_ENVELOPE_VERSION =
  "starcraft_tmg_training_export_envelope_v1";
export const STARCRAFT_TMG_TRAINING_NDJSON_VERSION =
  "starcraft_tmg_training_ndjson_v1";
export const STARCRAFT_TMG_TRAINING_MUZERO_VERSION =
  "starcraft_tmg_sampled_muzero_v1";
export const STARCRAFT_TMG_TRAINING_RLDS_VERSION =
  "starcraft_tmg_rlds_compatible_v1";
export const STARCRAFT_TMG_TRAINING_PARQUET_VERSION =
  "starcraft_tmg_parquet_pyarrow_v1";

const MAX_PYTHON_BUFFER = 256 * 1024 * 1024;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function parts(trajectory) {
  const header = clone(trajectory);
  const steps = clone(header.steps);
  delete header.steps;
  return { header, steps };
}

function restore(header, steps, verify) {
  const trajectory = { ...clone(header), steps: clone(steps) };
  verify(trajectory);
  return trajectory;
}

function checkStepOrder(steps, episodeId) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("training export contains no steps");
  }
  steps.forEach((step, index) => {
    if (step.stepIndex !== index || step.episodeId !== episodeId) {
      throw new Error(`training export step ${index} order is invalid`);
    }
  });
}

function learnerRecord(step) {
  return {
    stepIndex: step.stepIndex,
    toPlay: step.toPlay,
    observation: {
      actorInput: clone(step.actorInput),
      recurrentState: clone(step.recurrentState),
    },
    action: clone(step.actionEncoding),
    behaviourPolicy: clone(step.actionEncoding.behaviourPolicy),
    searchPolicy: clone(step.actionEncoding.searchPolicy),
    reward: step.targets.scalarReward,
    rewardVector: clone(step.targets.rewardVector),
    valueTarget: step.targets.valueTarget,
    discount: step.discount,
    isFirst: step.isFirst,
    isLast: step.isLast,
    isTerminal: step.isTerminal,
    isTruncated: step.isTruncated,
    legalSpaceHash: step.actorInput.legalSpaceHash,
    parameterDomainId:
      step.actionEncoding.selectedParameterDomain?.domainId || null,
    parameterDomainHash:
      step.actionEncoding.selectedParameterDomainHash || null,
    originalStep: clone(step),
    eligibleForTraining: false,
    trainingTruth: false,
  };
}

function validateLearnerRecord(record, step, index) {
  const expected = learnerRecord(step);
  for (const key of [
    "stepIndex", "toPlay", "reward", "valueTarget", "discount", "isFirst",
    "isLast", "isTerminal", "isTruncated", "legalSpaceHash",
    "parameterDomainId", "parameterDomainHash", "eligibleForTraining",
    "trainingTruth",
  ]) {
    if (hashStarcraftTmgContract(record[key])
      !== hashStarcraftTmgContract(expected[key])) {
      throw new Error(`learner alias ${key} disagrees at step ${index}`);
    }
  }
  for (const key of [
    "observation", "action", "behaviourPolicy", "searchPolicy",
    "rewardVector",
  ]) {
    if (hashStarcraftTmgContract(record[key])
      !== hashStarcraftTmgContract(expected[key])) {
      throw new Error(`learner structured alias ${key} disagrees at step ${index}`);
    }
  }
}

export function createStarcraftTmgTrainingExportRuntimeV1(options = {}) {
  if (typeof options.trajectoryVerifier !== "function") {
    throw new TypeError("trajectoryVerifier is required");
  }
  const verify = options.trajectoryVerifier;
  const pythonRuntime = String(options.pythonRuntime
    || process.env.STARCRAFT_TMG_PYTHON_BIN || "python3");

  function requireTrajectory(trajectory) {
    verify(trajectory);
    return trajectory;
  }

  function exportNdjson(trajectory) {
    requireTrajectory(trajectory);
    const { header, steps } = parts(trajectory);
    const rows = [{
      schemaVersion: STARCRAFT_TMG_TRAINING_NDJSON_VERSION,
      recordType: "episode_header",
      episode: header,
      trainingTruth: false,
    }, ...steps.map((step) => ({
      schemaVersion: STARCRAFT_TMG_TRAINING_NDJSON_VERSION,
      recordType: "step",
      step,
      trainingTruth: false,
    })), {
      schemaVersion: STARCRAFT_TMG_TRAINING_NDJSON_VERSION,
      recordType: "episode_footer",
      episodeId: trajectory.episodeId,
      stepCount: steps.length,
      trajectoryHash: trajectory.contentIdentity.hash,
      trainingTruth: false,
    }];
    return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  }

  function importNdjson(bytes) {
    const rows = String(bytes || "").split(/\r?\n/).filter(Boolean)
      .map((line) => JSON.parse(line));
    const first = rows[0];
    const last = rows.at(-1);
    if (first?.schemaVersion !== STARCRAFT_TMG_TRAINING_NDJSON_VERSION
      || first.recordType !== "episode_header"
      || last?.schemaVersion !== STARCRAFT_TMG_TRAINING_NDJSON_VERSION
      || last.recordType !== "episode_footer") {
      throw new Error("NDJSON episode envelope is invalid");
    }
    const steps = rows.slice(1, -1).map((row, index) => {
      if (row.schemaVersion !== STARCRAFT_TMG_TRAINING_NDJSON_VERSION
        || row.recordType !== "step" || row.step?.stepIndex !== index) {
        throw new Error(`NDJSON step ${index} is invalid`);
      }
      return row.step;
    });
    checkStepOrder(steps, first.episode?.episodeId);
    if (last.episodeId !== first.episode.episodeId
      || last.stepCount !== steps.length
      || last.trajectoryHash !== first.episode.contentIdentity?.hash) {
      throw new Error("NDJSON footer does not bind its episode");
    }
    return restore(first.episode, steps, verify);
  }

  function exportMuzero(trajectory) {
    requireTrajectory(trajectory);
    const { header, steps } = parts(trajectory);
    return {
      schemaVersion: STARCRAFT_TMG_TRAINING_MUZERO_VERSION,
      interfaceKind: "player_view_recurrent_sampled_action",
      episode: header,
      records: steps.map(learnerRecord),
      stepCount: steps.length,
      trajectoryHash: trajectory.contentIdentity.hash,
      unsampledParameterizedActionsAreNotIllegal: true,
      behaviourProbabilityMayBeUnknown: true,
      eligibleForTraining: false,
      trainingTruth: false,
    };
  }

  function importMuzero(value) {
    if (value?.schemaVersion !== STARCRAFT_TMG_TRAINING_MUZERO_VERSION
      || value.trainingTruth !== false
      || !Array.isArray(value.records)) {
      throw new Error("Sampled-MuZero export is invalid");
    }
    const steps = value.records.map((record, index) => {
      if (!object(record.originalStep)) {
        throw new Error(`MuZero record ${index} lacks lossless extension`);
      }
      validateLearnerRecord(record, record.originalStep, index);
      return record.originalStep;
    });
    checkStepOrder(steps, value.episode?.episodeId);
    if (value.stepCount !== steps.length
      || value.trajectoryHash !== value.episode?.contentIdentity?.hash) {
      throw new Error("Sampled-MuZero episode binding is invalid");
    }
    return restore(value.episode, steps, verify);
  }

  function exportRlds(trajectory) {
    requireTrajectory(trajectory);
    const { header, steps } = parts(trajectory);
    return {
      schemaVersion: STARCRAFT_TMG_TRAINING_RLDS_VERSION,
      episodeMetadata: header,
      steps: steps.map((step) => {
        const record = learnerRecord(step);
        return {
          observation: record.observation,
          action: record.action,
          reward: record.reward,
          discount: record.discount,
          is_first: record.isFirst,
          is_last: record.isLast,
          is_terminal: record.isTerminal,
          is_truncated: record.isTruncated,
          _starcraftTmg: record,
        };
      }),
      trajectoryHash: trajectory.contentIdentity.hash,
      compatibility:
        "RLDS Episode/Step semantics without requiring TensorFlow",
      eligibleForTraining: false,
      trainingTruth: false,
    };
  }

  function importRlds(value) {
    if (value?.schemaVersion !== STARCRAFT_TMG_TRAINING_RLDS_VERSION
      || value.trainingTruth !== false || !Array.isArray(value.steps)) {
      throw new Error("RLDS-compatible export is invalid");
    }
    const steps = value.steps.map((row, index) => {
      const record = row?._starcraftTmg;
      if (!object(record?.originalStep)) {
        throw new Error(`RLDS step ${index} lacks lossless extension`);
      }
      validateLearnerRecord(record, record.originalStep, index);
      if (hashStarcraftTmgContract(row.observation)
          !== hashStarcraftTmgContract(record.observation)
        || hashStarcraftTmgContract(row.action)
          !== hashStarcraftTmgContract(record.action)
        || row.reward !== record.reward || row.discount !== record.discount
        || row.is_first !== record.isFirst || row.is_last !== record.isLast
        || row.is_terminal !== record.isTerminal
        || row.is_truncated !== record.isTruncated) {
        throw new Error(`RLDS aliases disagree at step ${index}`);
      }
      return record.originalStep;
    });
    checkStepOrder(steps, value.episodeMetadata?.episodeId);
    if (value.trajectoryHash
      !== value.episodeMetadata?.contentIdentity?.hash) {
      throw new Error("RLDS episode binding is invalid");
    }
    return restore(value.episodeMetadata, steps, verify);
  }

  function python(script, input) {
    const result = spawnSync(pythonRuntime, ["-c", script], {
      input,
      encoding: "utf8",
      maxBuffer: MAX_PYTHON_BUFFER,
      shell: false,
    });
    if (result.status !== 0) {
      throw new Error(String(result.stderr || result.error?.message
        || "PyArrow adapter failed").trim());
    }
    return result.stdout;
  }

  function parquetCapability() {
    try {
      const version = python(
        "import pyarrow; print(pyarrow.__version__)", "",
      ).trim();
      return {
        available: true,
        schemaVersion: STARCRAFT_TMG_TRAINING_PARQUET_VERSION,
        runtime: pythonRuntime,
        pyarrowVersion: version,
      };
    } catch (error) {
      return {
        available: false,
        schemaVersion: STARCRAFT_TMG_TRAINING_PARQUET_VERSION,
        runtime: pythonRuntime,
        reason: error.message,
      };
    }
  }

  function parquetRows(trajectory) {
    const { header, steps } = parts(trajectory);
    return steps.map((step, index) => ({
      schema_version: STARCRAFT_TMG_TRAINING_PARQUET_VERSION,
      episode_id: trajectory.episodeId,
      trajectory_hash: trajectory.contentIdentity.hash,
      step_index: step.stepIndex,
      to_play: step.toPlay,
      action_kind: step.actionEncoding.kind,
      action_type: step.actionEncoding.actionType,
      scalar_reward: step.targets.scalarReward,
      value_target: step.targets.valueTarget,
      discount: step.discount,
      is_first: step.isFirst,
      is_last: step.isLast,
      is_terminal: step.isTerminal,
      is_truncated: step.isTruncated,
      episode_json: index === 0 ? JSON.stringify(header) : null,
      step_json: JSON.stringify(step),
      training_truth: false,
    }));
  }

  function exportParquet(trajectory) {
    requireTrajectory(trajectory);
    const capability = parquetCapability();
    if (!capability.available) {
      throw new Error(`Parquet unavailable: ${capability.reason}`);
    }
    const script = [
      "import sys, json, base64",
      "import pyarrow as pa",
      "import pyarrow.parquet as pq",
      "rows=json.loads(sys.stdin.read())",
      "table=pa.Table.from_pylist(rows)",
      "sink=pa.BufferOutputStream()",
      "pq.write_table(table, sink, compression='zstd')",
      "sys.stdout.write(base64.b64encode(sink.getvalue().to_pybytes()).decode('ascii'))",
    ].join("\n");
    return Buffer.from(python(script,
      JSON.stringify(parquetRows(trajectory))).trim(), "base64");
  }

  function importParquet(bytes) {
    const capability = parquetCapability();
    if (!capability.available) {
      throw new Error(`Parquet unavailable: ${capability.reason}`);
    }
    const script = [
      "import sys, json, base64",
      "import pyarrow as pa",
      "import pyarrow.parquet as pq",
      "raw=base64.b64decode(sys.stdin.read())",
      "rows=pq.read_table(pa.BufferReader(raw)).to_pylist()",
      "sys.stdout.write(json.dumps(rows,separators=(',',':')))",
    ].join("\n");
    const rows = JSON.parse(python(script,
      Buffer.from(bytes).toString("base64")));
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Parquet export contains no rows");
    }
    rows.sort((left, right) => left.step_index - right.step_index);
    const steps = rows.map((row, index) => {
      if (row.schema_version !== STARCRAFT_TMG_TRAINING_PARQUET_VERSION
        || row.step_index !== index || row.training_truth !== false) {
        throw new Error(`Parquet row ${index} is invalid`);
      }
      const step = JSON.parse(row.step_json);
      if (row.episode_id !== step.episodeId || row.to_play !== step.toPlay
        || row.action_kind !== step.actionEncoding.kind
        || row.action_type !== step.actionEncoding.actionType
        || row.scalar_reward !== step.targets.scalarReward
        || row.value_target !== step.targets.valueTarget
        || row.discount !== step.discount) {
        throw new Error(`Parquet aliases disagree at step ${index}`);
      }
      return step;
    });
    const header = JSON.parse(rows[0].episode_json);
    if (rows.some((row) =>
      row.trajectory_hash !== header.contentIdentity.hash)) {
      throw new Error("Parquet trajectory identity is inconsistent");
    }
    checkStepOrder(steps, header.episodeId);
    return restore(header, steps, verify);
  }

  function exportEnvelope(trajectory) {
    requireTrajectory(trajectory);
    const capability = parquetCapability();
    return {
      schemaVersion: STARCRAFT_TMG_TRAINING_EXPORT_ENVELOPE_VERSION,
      episodeId: trajectory.episodeId,
      trajectoryHash: trajectory.contentIdentity.hash,
      requiredFormats: [
        STARCRAFT_TMG_TRAINING_NDJSON_VERSION,
        STARCRAFT_TMG_TRAINING_MUZERO_VERSION,
        STARCRAFT_TMG_TRAINING_RLDS_VERSION,
      ],
      optionalFormats: [{
        schemaVersion: STARCRAFT_TMG_TRAINING_PARQUET_VERSION,
        available: capability.available,
        adapter: capability.available ? "real_pyarrow" : "unavailable",
      }],
      stepCount: trajectory.steps.length,
      eligibleForTraining: false,
      trainingTruth: false,
    };
  }

  function verifyRoundTrip(original, imported) {
    requireTrajectory(original);
    requireTrajectory(imported);
    if (original.contentIdentity.hash !== imported.contentIdentity.hash
      || hashStarcraftTmgContract(original)
        !== hashStarcraftTmgContract(imported)) {
      throw new Error("training export/import round trip is not lossless");
    }
    return {
      trajectoryHash: original.contentIdentity.hash,
      stepCount: original.steps.length,
      exactCanonicalParity: true,
      playerViewPreserved: imported.steps.every((step) =>
        step.actorInput.informationPolicy === "acting_seat_viewer_v3"),
      eligibleForTraining: false,
      trainingTruth: false,
    };
  }

  return Object.freeze({
    exportEnvelope,
    exportMuzero,
    exportNdjson,
    exportParquet,
    exportRlds,
    importMuzero,
    importNdjson,
    importParquet,
    importRlds,
    parquetCapability,
    verifyRoundTrip,
  });
}

