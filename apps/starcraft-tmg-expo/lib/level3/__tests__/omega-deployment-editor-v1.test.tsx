import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import combatMovementForms from "./fixtures/wave3-combat-movement-forms.json";
import combatEvents from "./fixtures/wave3-combat-movement-event-samples.json";
import { describeNativeActionFormV1, compileNativeActionFormValuesV1 } from "../../../../../packages/client-domain/native-action-form-v1.mjs";
import combatMovementPreviews from "./fixtures/sealed-combat-movement-previews.json";
import movementPreviews from "./fixtures/creep-movement-previews-v261.json";
import {projectStarcraftTmgBattlefieldPresentationV1} from "@/lib/level3/battlefield-presentation-v1";
import creepCases from "./fixtures/creep-displacement-signed-v222.json";
import capture from "./fixtures/omega-deployment-editor-v261.json";
import { AuthoritativeBattleWorkspace } from "@/components/battlefield/authoritative-battle-workspace";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let width = 1440;
let locale: "zh" | "en" = "zh";
let client: any;
vi.mock("react-native-web", () => ({
  Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", TextInput: "TextInput", View: "View",
  StyleSheet: { create: (styles: unknown) => styles }, useWindowDimensions: () => ({width, height: 820}),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", ClipPath: "ClipPath", Defs: "Defs", Ellipse: "Ellipse", G: "G",
  Line: "Line", Polygon: "Polygon", Polyline: "Polyline", Rect: "Rect", Image: "SvgImage", Text: "SvgText",
}));
vi.mock("expo-image", () => ({Image: "ExpoImage"}));
vi.mock("expo-audio", () => ({useAudioPlayer: () => ({}), setAudioModeAsync: vi.fn()}));
vi.mock("expo-document-picker", () => ({getDocumentAsync: vi.fn()}));
vi.mock("@/lib/i18n", () => ({useI18n: () => ({lang: locale})}));
vi.mock("@/lib/level3/client-domain-provider", () => ({useLevel3ClientDomain: () => client}));
vi.mock("@/lib/level3/battlefield-media-assets-v1", () => ({
  STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE: null, starcraftTmgBattlefieldMapSourceV2: () => null,
  starcraftTmgBattlefieldMapOverlaySourceV1: () => null, starcraftTmgBattlefieldUnitMediaAssetsV1: () => null,
  randomStarcraftTmgPresentationMediaEntryV1: () => null,
}));

function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === "string" ? child : text(child)).join("");
}

function controls(renderer: ReactTestRenderer) {
  const buttons = () => renderer.root.findAll(n => (n.type as unknown) === "Pressable");
  const button = (label: string) => {
    const hits = buttons().filter(n => text(n) === label);
    expect(hits, label).toHaveLength(1);
    return hits[0];
  };
  const press = async (node: ReactTestInstance) => {
    expect(node.props.disabled).not.toBe(true);
    await act(async () => { await node.props.onPress(); });
  };
  const input = (label: string) => renderer.root.find(n => (n.type as unknown) === "TextInput"
    && n.props.accessibilityLabel === label);
  const edit = async (label: string, value: string) => {
    await act(async () => { input(label).props.onChangeText(value); });
  };
  const coordinate = async (x: string, y: string, label: string) => {
    await edit("战场 X 坐标，英寸", x);
    await edit("战场 Y 坐标，英寸", y);
    await press(button(label));
  };
  return { buttons, button, press, input, edit, coordinate };
}

describe("Wave3 deployment editor from the r0 player menu", () => {
  it.each([{width: 1440, index: 0}, {width: 390, index: 1}])(
    "exposes both real entry sources and edits a perimeter offset at width $width", async sample => {
      width = sample.width;
      const domain = capture.parameterDomains[sample.index];
      const entry = domain.constraints.entrySegments.find(s => s.kind === "unit_base_perimeter")!;
      const source = capture.sourceNames[entry.sourcePieceId as keyof typeof capture.sourceNames];
      const positions = domain.constraints.modelProfiles;
      const dispatch = vi.fn(async () => ({ok: true}));
      client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch,
        view: {phase: "ready", roomProjection: {room: {roomId: capture.roomId, stateRevision: capture.revision},
          viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces:
            Object.entries(capture.sourceNames).map(([id, name]) => ({id, name, models: []}))}},
          battleWorkbench: {stateRevision: capture.revision}, legalSpace: {legalSpaceHash: capture.legalSpaceHash,
            parameterDomains: [domain]} }};
      let renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AuthoritativeBattleWorkspace />); });
      const { buttons, button, press, input, edit, coordinate } = controls(renderer);
      try {
        await press(button("行动"));
        await press(button("编辑参数"));
        const ordinary = buttons().find(b => /^(上边|下边|左边|右边) · /.test(text(b)))!;
        expect(ordinary.props.accessibilityState.selected).toBe(true);
        const edgeLabel = text(ordinary);
        const midpoint = input("进场位置，英寸").props.value;
        const wormButton = buttons().find(b => text(b).includes(source + " · 底盘周界"))!;
        await press(wormButton);
        expect(input("进场位置，英寸").props.value).toBe("0");
        expect(text(renderer.root)).toContain("全军可用 7 · 本回合该入口剩余 2/2");
        expect(text(renderer.root)).toContain("单位人口 " + domain.constraints.supply.requestedSupply);
        expect(text(renderer.root)).toContain("0–9.896 英寸");
        await press(button(positions[0].modelId));
        await edit("进场位置，英寸", "0.");
        expect(input("进场位置，英寸").props.value).toBe("0.");
        await edit("进场位置，英寸", "0.125");
        await coordinate("9.25", "12.125", "添加路径点");
        await coordinate("10.5", "12", "添加路径点");
        expect(text(renderer.root)).toContain("waypoints: 2");
        if (positions.length > 1) {
          await press(button("放置模式"));
          await coordinate("12.3", "12", "放置下一模型");
        }
        expect(button("提交权威 Preview").props.disabled).toBe(false);
        await press(button(edgeLabel));
        expect(input("进场位置，英寸").props.value).toBe(midpoint);
        expect(text(renderer.root)).not.toContain("本回合该入口剩余");
        expect(button("提交权威 Preview").props.disabled).toBe(true);
        expect(dispatch).not.toHaveBeenCalled();
      } finally { await act(async () => {renderer.unmount();}); }
    });
});

describe("Creep displacement in the signed movement editor", () => {
  it.each(creepCases)("submits $source token and displays the signed outcome", async sample => {
    width = sample.source === "overlord" ? 390 : 1440;
    const { domain, expected } = sample;
    const dispatch = vi.fn(async (_intent: unknown) => ({ ok: true }));
    client = {
      connection: { visible: true, online: true, canRequestAuthoritativeIntent: true }, dispatch,
      view: { phase: "ready", roomProjection: { room: {roomId: sample.roomId, stateRevision: sample.revision},
        viewer: {capabilities: ["read_legal_space", "preview"]},
        state: {pieces: sample.pieces, board: {widthInches: 54, heightInches: 36, tokens: sample.tokens}}},
        battleWorkbench: {stateRevision: sample.revision}, legalSpace: {parameterDomains: [domain]} },
    };
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<AuthoritativeBattleWorkspace />); });
    const { button, press, coordinate } = controls(renderer);
    const preview = () => button("提交权威 Preview");
    const dest = expected.tokenDisplacements[0];
    const token = sample.tokens.find(row => row.tokenId === dest.tokenId)!;
    const label = `菌毯瘤 (${token.coordinate.x}, ${token.coordinate.y})`;
    const point = dest.coordinate;
    try {
      await press(button("行动"));
      await press(button("编辑参数"));
      await press(button(expected.leadingModelId));
      const waypoint = expected.path[0];
      const enterWaypoint = () => coordinate(String(waypoint.xMilliInches / 1000), String(waypoint.yMilliInches / 1000), "添加路径点");
      await enterWaypoint();
      const chooseDestination = async () => {
        await press(button(label));
        expect(preview().props.disabled).toBe(true);
        await coordinate(String(point.xMilliInches / 1000), String(point.yMilliInches / 1000), "设置标记落点");
      };
      await chooseDestination();
      if (sample.source === "queen") {
        await press(button("撤销路径点"));
        expect(preview().props.disabled).toBe(true);
        await enterWaypoint();
        await press(preview());
        expect(dispatch.mock.lastCall?.[0]).toMatchObject({type: "preview_parameterized"});
        expect((dispatch.mock.lastCall?.[0] as {parameters: object}).parameters).not.toHaveProperty("tokenDisplacements");
        await chooseDestination();
      }
      await press(preview());
      expect(dispatch.mock.lastCall?.[0]).toEqual({type: "preview_parameterized", domainId: domain.domainId, parameters: expected});
      client.view.pendingPreview = {previewId: "captured-preview", core: {action: {actionType: domain.actionType}, result: {events: sample.events}}};
      await act(async () => {renderer.update(<AuthoritativeBattleWorkspace />);});
      const rendered = text(renderer.root);
      const move = label + " · 移至 (" + point.xMilliInches / 1000 + ", " + point.yMilliInches / 1000 + ")";
      expect(rendered).toContain(move);
      const removed = label + " · 移除";
      if (sample.events.some(event => event.type === "creep_tumor_removed")) {
        expect(rendered.indexOf(removed)).toBeGreaterThan(rendered.indexOf(move));
      } else {
        expect(rendered).not.toContain(removed);
      }
    } finally { await act(async () => {renderer.unmount();}); }
  });
});

describe("Marker displacement rule feedback", () => {
  it.each(["zh", "en"] as const)("explains the endpoint and distinct preview outcomes in %s", async lang => {
    locale = lang;
    const zh = lang === "zh";
    const sample = creepCases[0];
    const codes = [
      ["PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED", zh ? "为每个重叠的标记指定落点" : "each overlapping token"],
      ["PSIONIC_DISPLACEMENT_UNEXPECTED_TOKEN_CHOICE", zh ? "撤销标记落点" : "Undo the token destinations"],
      ["PSIONIC_DISPLACEMENT_COORDINATE_NOT_RULE_LEGAL", zh ? "这个落点不符合位移规则" : "Choose a legal position in base contact"],
      ["PSIONIC_DISPLACEMENT_NEAREST_PROOF_INCOMPLETE", zh ? "尚未证实该落点是最近的合法位置" : "have not established this is the closest legal position"],
    ];
    let reason = "";
    const dispatch = vi.fn(async () => ({ok: false, rejection: {code: "PREVIEW_REJECTED", details: {rulesReason: reason}}}));
    client = {connection:{visible:true, online:true, canRequestAuthoritativeIntent:true}, dispatch,
      view:{phase:"ready", roomProjection:{room:{roomId:sample.roomId, stateRevision:sample.revision},
        viewer:{capabilities:["read_legal_space","preview"]}, state:{pieces:sample.pieces, board:{tokens:sample.tokens}}},
        battleWorkbench:{stateRevision:sample.revision}, legalSpace:{parameterDomains:[sample.domain]}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button, edit} = controls(renderer);
      await press(button(zh ? "行动" : "Actions"));
      await press(button(zh ? "编辑参数" : "Edit parameters"));
      await press(button(sample.expected.leadingModelId));
      await edit(zh ? "战场 X 坐标，英寸" : "Battlefield X coordinate in inches", "26.6");
      await edit(zh ? "战场 Y 坐标，英寸" : "Battlefield Y coordinate in inches", "6.8");
      await press(button(zh ? "添加路径点" : "Add waypoint"));
      expect(text(renderer.root)).toContain(zh ? "领队终点重叠的标记" : "Tokens overlapped at the leader’s destination");
      for (const [code, message] of codes) {
        reason = code;
        await press(button(zh ? "提交权威 Preview" : "Request authoritative Preview"));
        expect(text(renderer.root)).toContain(message);
      }
    } finally {
      locale = "zh";
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
});

describe("Ordinary table-edge deployment distance", () => {
  it.each(["zh", "en"] as const)("explains where the Queen starts measuring in %s", async lang => {
    const domain = capture.parameterDomains.find(d => d.constraints.modelProfiles.length === 1)!;
    const zh = lang === "zh";
    locale = lang;
    const dispatch = vi.fn(async () => ({ok: false, rejection: {code: "PREVIEW_REJECTED",
      details: {rulesReason: "SELECTED_SPATIAL_PATH_EXCEEDS_SPEED"}}}));
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch,
      view: {phase: "ready", roomProjection: {room: {roomId: capture.roomId, stateRevision: capture.revision},
        viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces: []}},
        battleWorkbench: {stateRevision: capture.revision}, legalSpace: {parameterDomains: [domain]}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button, edit} = controls(renderer);
      await press(button(zh ? "行动" : "Actions"));
      await press(button(zh ? "编辑参数" : "Edit parameters"));
      await press(button(domain.constraints.modelProfiles[0].modelId));
      await edit(zh ? "进场位置，英寸" : "Entry position in inches", "16");
      await edit(zh ? "战场 X 坐标，英寸" : "Battlefield X coordinate in inches", "16");
      await edit(zh ? "战场 Y 坐标，英寸" : "Battlefield Y coordinate in inches", "4");
      await press(button(zh ? "添加路径点" : "Add waypoint"));
      await press(button(zh ? "提交权威 Preview" : "Request authoritative Preview"));
      expect(dispatch).toHaveBeenCalledOnce();
      expect(text(renderer.root)).toContain(zh ? "领队底盘在桌外贴边" : "outside and touching the table edge");
    } finally {
      locale = "zh";
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
});

describe("Sealed Wave3 movement previews", () => {
  it.each([
    {sample: movementPreviews[0], lang: "zh" as const},
    {sample: movementPreviews[1], lang: "zh" as const},
    {sample: movementPreviews[1], lang: "en" as const},
  ])("draws the signed $sample.source path and base in $lang", async ({sample, lang}) => {
    locale = lang;
    const pendingPreview = {previewId: "captured", core: sample.core};
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch: vi.fn(),
      view: {phase: "ready", roomProjection: {room: {roomId: sample.roomId, stateRevision: 0},
        viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces: [sample.piece], board: {widthInches: 54, heightInches: 36}}},
        battleWorkbench: {stateRevision: 0}, legalSpace: {parameterDomains: []}, pendingPreview}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button} = controls(renderer);
      await press(button(lang === "zh" ? "行动" : "Actions"));
      const expectedPath = sample.expected.points.map(p => p.xMilliInches + "," + p.yMilliInches).join(" ");
      expect(renderer.root.findAll(n => (n.type as unknown) === "Polyline" && n.props.points === expectedPath)).toHaveLength(1);
      const end = sample.expected.placements[0];
      expect(renderer.root.findAll(n => (n.type as unknown) === "Ellipse" && n.props.fill === "#22d3ee33"
        && n.props.cx === end.xMilliInches && n.props.cy === end.yMilliInches && n.props.rx === sample.expected.width / 2)).toHaveLength(1);
      const label = text(renderer.root);
      if (sample.source === "disengage") {
        expect(label).toContain(lang === "zh" ? "脱离时人口 1 对 1" : "Supply at disengagement: 1 vs 1");
        expect(label).toContain(lang === "zh" ? "脱离后不能射击。不能冲锋。" : "Disengagement prevents shooting. Charging is prohibited.");
      } else {
        expect(label).not.toContain("脱离时人口");
      }
    } finally {
      locale = "zh";
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
  it("does not borrow another unit’s nested spatial plan", () => {
    const {core, piece} = movementPreviews[1];
    const projection = projectStarcraftTmgBattlefieldPresentationV1({
      roomProjection: {state: {pieces: [piece]}},
      pendingPreview: {previewId: "mismatched", core: {...core, action: {...core.action, pieceId: "other-piece"}}},
    });
    expect(projection.previewPlacements).toHaveLength(0);
    expect(projection.preview?.disengageAssaultRestriction).toBeUndefined();
  });
});

describe("Sealed combat movement geometry", () => {
  it.each(combatMovementPreviews)("renders the confirmed formation and path for $source", async sample => {
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch: vi.fn(),
      view: {phase: "ready", roomProjection: {room: {roomId: sample.roomId, stateRevision: sample.revision},
        viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces: [sample.piece], board: {widthInches: 54, heightInches: 36}}},
        battleWorkbench: {stateRevision: sample.revision}, legalSpace: {parameterDomains: []},
        pendingPreview: {previewId: "captured", core: sample.core}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const glyphs = renderer.root.findAll(n => (n.type as unknown) === "Ellipse" && n.props.fill === "#22d3ee33");
      expect(glyphs.map(n => [n.props.cx,n.props.cy,n.props.rx])).toEqual(sample.expected.positions.map(p =>
        [p.xMilliInches, p.yMilliInches, Math.round(sample.piece.models.find(m => m.id === p.modelId)!.baseWidthInches * 1000) / 2]));
      const paths = renderer.root.findAll(n => (n.type as unknown) === "Polyline" && n.props.stroke === "#22d3ee");
      const line = sample.expected.points.map(p => p.xMilliInches + "," + p.yMilliInches).join(" ");
      expect(paths.map(n => n.props.points)).toEqual(line ? [line] : []);
    } finally {
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });

  it("does not draw a charge path from a proposal if Rules returned no movement", () => {
    const sample = combatMovementPreviews[0];
    const view = projectStarcraftTmgBattlefieldPresentationV1({
      roomProjection: {state: {pieces: [sample.piece]}},
      pendingPreview: {previewId: "no-movement", core: {action: {actionType: "resolve_charge", pieceId: sample.piece.id},
        proposal: sample.core.proposal}},
    });
    expect(view.previewPath).toHaveLength(0);
    expect(view.previewPlacements).toHaveLength(0);
  });
});

describe("Native combat movement input", () => {
  it("submits a post-roll path, then changes to a failure proof without retaining the path", async () => {
    const sample = combatMovementForms[0];
    const dispatch = vi.fn(async (_request: unknown) => ({ok: true}));
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch,
      view: {phase: "ready", roomProjection: {room: {roomId: sample.roomId, stateRevision: 3},
        viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces: [sample.piece]}},
        battleWorkbench: {stateRevision: 3}, legalSpace: {parameterDomains: [sample.domain]}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button, edit} = controls(renderer);
      await press(button("行动"));
      await press(button("设置行动"));
      await press(button("成功"));
      expect(button("预览此行动").props.disabled).toBe(true);
      await press(button("添加领队路径"));
      const point = sample.expected.path![0];
      await edit("横向位置（英寸）", String(point.xMilliInches / 1000));
      await edit("纵向位置（英寸）", String(point.yMilliInches / 1000));
      await press(button("预览此行动"));
      expect(dispatch).toHaveBeenLastCalledWith({type: "preview_parameterized", domainId: sample.domain.domainId,
        parameters: {outcome: "success", path: [{xMilliInches: point.xMilliInches,yMilliInches: point.yMilliInches}],placements: []}});
      await press(button("失败"));
      expect(button("预览此行动").props.disabled).toBe(true);
      await press(button("距离不足"));
      await press(button("预览此行动"));
      expect(dispatch).toHaveBeenLastCalledWith({type: "preview_parameterized", domainId: sample.domain.domainId,
        parameters: {outcome: "failure", failureProof: {kind: "distance_shortfall"}}});
    } finally {
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
  it.each(combatMovementForms.slice(1))("preserves the signed $source token destination and rejects a foreign handle", sample => {
    const form = describeNativeActionFormV1(sample.domain, {modelIds: sample.piece.models.map(m => m.id), tokenIds: sample.visibleTokenIds});
    const expected = sample.expected.tokenDisplacements!;
    const valid = compileNativeActionFormValuesV1(form, sample.expected);
    expect(valid.complete).toBe(true);
    expect(valid.parameters.tokenDisplacements).toEqual(expected);
    const invalid = compileNativeActionFormValuesV1(form, {...sample.expected,
      tokenDisplacements: [{...expected[0],tokenId: "absent-token"}]});
    expect(invalid.complete).toBe(false);
    expect(invalid.invalid).toContain("tokenDisplacements[0].tokenId");
  });
});

describe("Human relocation with a displaced marker", () => {
  it("submits the existing Blink landing and the chosen shade destination from the battlefield form", async () => {
    const sample = combatMovementForms[2];
    const dispatch = vi.fn(async (_request: unknown) => ({ok: true}));
    const roomProjection = {room: {roomId: sample.roomId, stateRevision: 0}, viewer: {capabilities: ["read_legal_space", "preview"]},
      state: {pieces: [sample.piece], board: {tokens: sample.tokens}}};
    const scene = projectStarcraftTmgBattlefieldPresentationV1({roomProjection});
    const modelName = scene.models.find(m => m.id === sample.expected.leadingModelId)!.label;
    const token = scene.tokens[0];
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch,
      view: {phase: "ready", roomProjection, battleWorkbench: {stateRevision: 0}, legalSpace: {parameterDomains: [sample.domain]}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button, buttons, edit} = controls(renderer);
      await press(button("行动"));
      await press(button("设置行动"));
      await press(button(modelName));
      await press(button("添加模型最终站位"));
      await press(buttons().filter(n => text(n) === modelName).at(-1)!);
      const landing = sample.expected.placements[0];
      await edit("横向位置（英寸）", String(landing.xMilliInches / 1000));
      await edit("纵向位置（英寸）", String(landing.yMilliInches / 1000));
      await press(button(sample.expected.paymentCardInstanceIds![0]));
      await press(button("设置标记落点（可选）"));
      await press(button("添加标记落点"));
      await press(button(token.label + " (" + token.xMilliInches / 1000 + ", " + token.yMilliInches / 1000 + ")"));
      const displacement = sample.expected.tokenDisplacements![0];
      for (const [label, coordinate] of [["横向位置（英寸）", displacement.coordinate.xMilliInches],
        ["纵向位置（英寸）", displacement.coordinate.yMilliInches]] as const) {
        const tokenCoordinate = renderer.root.find(n => n.props.name === "coordinate" && n.props.descriptor?.type === "object");
        const field = tokenCoordinate.find(n => (n.type as unknown) === "TextInput" && n.props.accessibilityLabel === label);
        await act(async () => {field.props.onChangeText(String(coordinate / 1000));});
      }
      await press(button("预览此行动"));
      expect(dispatch).toHaveBeenCalledWith({type: "preview_parameterized",domainId: sample.domain.domainId,parameters: {
        leadingModelId: sample.expected.leadingModelId, placements: [{modelId: landing.modelId,
          xMilliInches: landing.xMilliInches,yMilliInches: landing.yMilliInches}],
        paymentCardInstanceIds: sample.expected.paymentCardInstanceIds, tokenDisplacements: [displacement],
      }});
    } finally {
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
});


describe("Combat results in human confirmation", () => {
  it.each([
    {sample: combatEvents.charge, message: "冲锋成功 · 骰值 5"},
    {sample: combatEvents.closeRanks, message: "收拢队形，原近战攻击待结算。"},
    {sample: combatEvents.blink, message: "Blink · 直接放置"},
  ])("shows the signed result $message before confirmation", async ({sample, message}) => {
    client = {connection: {visible: true, online: true, canRequestAuthoritativeIntent: true}, dispatch: vi.fn(),
      view: {phase: "ready", roomProjection: {room: {roomId: sample.roomId, stateRevision: sample.revision},
        viewer: {capabilities: ["read_legal_space", "preview"]}, state: {pieces: []}},
        battleWorkbench: {stateRevision: sample.revision}, legalSpace: {parameterDomains: []},
        pendingPreview: {previewId: "captured", core: {action: {}, result: {events: sample.events}}}}};
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {renderer = create(<AuthoritativeBattleWorkspace />);});
      const {press, button} = controls(renderer);
      await press(button("行动"));
      expect(text(renderer.root)).toContain(message);
      expect(client.dispatch).not.toHaveBeenCalled();
    } finally {
      if (renderer) await act(async () => {renderer.unmount();});
    }
  });
});
