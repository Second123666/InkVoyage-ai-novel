import type {
  WorldVisualizationPayload,
} from "@ai-novel/shared/types/world";
import {
  EDGE_RELATION_LABELS,
  FACTION_TYPE_ALIASES,
  MAX_FACTION_EDGES,
  MAX_FACTION_NODES,
  MAX_POWER_ITEMS,
  MAX_TIMELINE_ITEMS,
  makeId,
  normalizeAliasKey,
  normalizeNodeLabel,
  normalizeTextField,
  parseListFromText,
  splitIntoSentences,
  uniqueStrings,
  type FactionNodeType,
  type VisualizationSource,
} from "./worldVisualization.shared";

// worldVisualization 势力图:节点/边推断、自由文本势力抽取、力量层级与时间线。
// 拆分自原 worldVisualization.ts,行为不变(RF-1)。
export function inferFactionNodeType(label: string): FactionNodeType {
  const normalized = normalizeAliasKey(label);
  const alias = FACTION_TYPE_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  if (/(国家|政府|政权|王朝|王国|帝国|联邦|共和国|朝廷|官府|军阀)/.test(label)) {
    return "state";
  }
  if (/(公司|集团|企业|部门|机构|中介|物业|学校|医院|机关|家庭联盟|共同体|社群|圈|圈层|军|军队|部队|军团|旅|团|司令部|地下党|组织|协会|会|盟|帮|派|社|教团)/.test(label)) {
    return "organization";
  }
  if (/(族|族群|民族|裔)/.test(label)) {
    return "race";
  }
  if (/(势力|阵营|集团|同盟|联盟)/.test(label)) {
    return "faction";
  }
  if (/(state|kingdom|empire|republic|federation|government)/i.test(label)) {
    return "state";
  }
  if (/(army|organization|guild|party|group)/i.test(label)) {
    return "organization";
  }
  if (/(race|tribe|clan)/i.test(label)) {
    return "race";
  }
  return "faction";
}

export function normalizeNodeType(raw: unknown, label: string): FactionNodeType {
  if (typeof raw === "string") {
    const alias = FACTION_TYPE_ALIASES[normalizeAliasKey(raw)];
    if (alias) {
      return alias;
    }
    if (/(公司|企业|部门|机构|社群|圈层|家庭共同体|社区组织|中介机构|机关|生活社群|兴趣联盟|地缘势力)/.test(raw)) {
      return "organization";
    }
    if (/(临时联盟|人物|角色|情感|关系线)/.test(raw)) {
      return "other";
    }
  }
  return inferFactionNodeType(label);
}

function normalizeEdgeRelation(raw: unknown, sentence?: string): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value) {
    if (EDGE_RELATION_LABELS.includes(value as (typeof EDGE_RELATION_LABELS)[number])) {
      return value;
    }
    const normalized = normalizeAliasKey(value);
    if (/(alliance|ally|同盟|联合|联手)/.test(normalized)) {
      return "同盟";
    }
    if (/(cooperate|合作|协作|配合)/.test(normalized)) {
      return "合作";
    }
    if (/(support|援助|支援)/.test(normalized)) {
      return "支援";
    }
    if (/(conflict|对抗|敌对|交战|围剿|镇压)/.test(normalized)) {
      return "对抗";
    }
    if (/(trade|交易|贸易)/.test(normalized)) {
      return "贸易";
    }
    if (/(subordinate|统属|隶属|管辖|控制)/.test(normalized)) {
      return "统属";
    }
    if (/(rival|竞争|争夺)/.test(normalized)) {
      return "竞争";
    }
  }
  if (!sentence) {
    return "关联";
  }
  if (/同盟|联合|联手|结盟/.test(sentence)) {
    return "同盟";
  }
  if (/合作|协作|配合|联合抗敌|共同/.test(sentence)) {
    return "合作";
  }
  if (/支援|援助|接应|策应/.test(sentence)) {
    return "支援";
  }
  if (/敌对|对抗|冲突|围剿|镇压|交战|打击|进攻|压迫/.test(sentence)) {
    return "对抗";
  }
  if (/隶属|统辖|控制|管辖|附属/.test(sentence)) {
    return "统属";
  }
  if (/贸易|交易|输送|通商/.test(sentence)) {
    return "贸易";
  }
  if (/竞争|争夺|角力/.test(sentence)) {
    return "竞争";
  }
  return "关联";
}


export function normalizeGraphNodes(
  nodes: Array<{ id?: string; label?: string; type?: string }>,
  prefix: string,
): Array<{ id: string; label: string; type: string }> {
  const seenLabels = new Set<string>();
  const result: Array<{ id: string; label: string; type: string }> = [];
  for (const node of nodes) {
    const label = normalizeNodeLabel(node.label);
    if (!label || seenLabels.has(label)) {
      continue;
    }
    seenLabels.add(label);
    result.push({
      id: node.id?.trim() || makeId(prefix, result.length),
      label,
      type: normalizeNodeType(node.type, label),
    });
  }
  return result;
}

export function normalizeGraphEdges(
  edges: Array<{ source?: string; target?: string; relation?: string }>,
  nodes: Array<{ id: string; label: string }>,
  fallbackEdges: Array<{ source: string; target: string; relation: string }>,
): Array<{ source: string; target: string; relation: string }> {
  const idMap = new Map(nodes.map((node) => [node.id, node.id]));
  const labelMap = new Map(nodes.map((node) => [node.label, node.id]));
  const seen = new Set<string>();
  const result: Array<{ source: string; target: string; relation: string }> = [];

  for (const edge of edges) {
    const sourceKey = typeof edge.source === "string" ? edge.source.trim() : "";
    const targetKey = typeof edge.target === "string" ? edge.target.trim() : "";
    const source = idMap.get(sourceKey) ?? labelMap.get(sourceKey);
    const target = idMap.get(targetKey) ?? labelMap.get(targetKey);
    if (!source || !target || source === target) {
      continue;
    }
    const pairKey = [source, target].sort().join("|");
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    result.push({
      source,
      target,
      relation: normalizeEdgeRelation(edge.relation),
    });
  }

  if (result.length > 0) {
    return result.slice(0, MAX_FACTION_EDGES);
  }
  return fallbackEdges.slice(0, MAX_FACTION_EDGES);
}


function extractNamedEntities(
  source: string,
  matcher: RegExp,
  exclusions: Set<string>,
): string[] {
  const results: string[] = [];
  for (const match of source.matchAll(matcher)) {
    const value = match[0]?.trim();
    if (!value || exclusions.has(value)) {
      continue;
    }
    results.push(value);
  }
  return results;
}

export function buildFactionLabels(world: VisualizationSource): string[] {
  const combined = [
    world.factions ?? "",
    world.politics ?? "",
    world.races ?? "",
    world.conflicts ?? "",
  ].filter(Boolean).join("\n");
  const exclusions = new Set([
    "核心冲突",
    "主要势力",
    "势力关系",
    "政治结构",
    "组织势力",
    "阵营关系",
    "社会结构",
  ]);
  const fromLists = parseListFromText(combined, []);
  const namedEntities = extractNamedEntities(
    combined,
    /[\u4E00-\u9FFF]{2,16}(?:政府|政权|王朝|王国|帝国|联邦|共和国|军|军队|部队|军团|旅|团|会|盟|帮|派|组织|教团|族|族群|民族)/g,
    exclusions,
  );
  return uniqueStrings([...fromLists, ...namedEntities]).slice(0, MAX_FACTION_NODES);
}

export function buildFactionEdges(
  nodes: Array<{ id: string; label: string; type: string }>,
  world: VisualizationSource,
): Array<{ source: string; target: string; relation: string }> {
  const sentences = splitIntoSentences([
    world.politics ?? "",
    world.factions ?? "",
    world.conflicts ?? "",
    world.background ?? "",
  ].filter(Boolean).join("。"));
  const relationCounter = new Map<string, Map<string, number>>();

  for (const sentence of sentences) {
    const mentioned = nodes.filter((node) => sentence.includes(node.label));
    if (mentioned.length < 2) {
      continue;
    }
    const relation = normalizeEdgeRelation("", sentence);
    for (let i = 0; i < mentioned.length; i += 1) {
      for (let j = i + 1; j < mentioned.length; j += 1) {
        const left = mentioned[i];
        const right = mentioned[j];
        const key = [left.id, right.id].sort().join("|");
        const bucket = relationCounter.get(key) ?? new Map<string, number>();
        bucket.set(relation, (bucket.get(relation) ?? 0) + 1);
        relationCounter.set(key, bucket);
      }
    }
  }

  const edges = Array.from(relationCounter.entries())
    .map(([key, bucket]) => {
      const [source, target] = key.split("|");
      const relation = Array.from(bucket.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "关联";
      return { source, target, relation };
    })
    .slice(0, MAX_FACTION_EDGES);

  if (edges.length > 0) {
    return edges;
  }
  if (nodes.length <= 1) {
    return [];
  }
  const defaultRelation = world.conflicts?.trim() ? "对抗" : "关联";
  return nodes.slice(1).map((node) => ({
    source: nodes[0].id,
    target: node.id,
    relation: defaultRelation,
  }));
}


export function buildPowerTree(world: VisualizationSource): WorldVisualizationPayload["powerTree"] {
  return parseListFromText(world.magicSystem ?? world.technology ?? "", ["力量层级未明确"])
    .slice(0, MAX_POWER_ITEMS)
    .map((description, index) => ({
      level: `L${index + 1}`,
      description,
    }));
}


export function buildTimeline(world: VisualizationSource): WorldVisualizationPayload["timeline"] {
  return parseListFromText(world.history ?? "", ["当前历史脉络尚未明确"])
    .slice(0, MAX_TIMELINE_ITEMS)
    .map((event, index) => {
      const yearMatch = event.match(/\d{2,4}(?:年)?|民国\d+年|昭和\d+年|stage\s*\d+/i);
      return {
        year: yearMatch?.[0] ?? `阶段${index + 1}`,
        event,
      };
    });
}
