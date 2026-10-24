import type { WorldReferenceMode } from "@ai-novel/shared/types/worldWizard";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../../core/promptTypes";
import {
  type WorldAxiomSuggestionPromptInput,
  type WorldConsistencyPromptInput,
  type WorldDeepeningQuestionsPromptInput,
  type WorldImportExtractionPromptInput,
  type WorldInspirationConceptCardLocalizationPromptInput,
  type WorldInspirationConceptCardPromptInput,
  type WorldLayerGenerationPromptInput,
  type WorldLayerLocalizationPromptInput,
  type NovelThemeWorldGenerationPromptInput,
  type WorldPropertyOptionsPromptInput,
  type WorldReferenceInspirationPromptInput,
  type WorldStructureBackfillPromptInput,
  type WorldStructureSectionPromptInput,
  type WorldVisualizationPromptInput,
} from "../world.promptTypes";
import {
  worldAxiomSuggestionSchema,
  worldConceptCardSchema,
  worldConsistencyIssuesSchema,
  worldDeepeningQuestionsSchema,
  worldImportExtractionSchema,
  worldLooseObjectSchema,
  novelThemeWorldGenerationSchema,
  worldPropertyOptionsPayloadSchema,
} from "../world.promptSchemas";
import { worldReferenceInspirationPayloadSchema } from "../../../../services/world/worldReferenceSchema";
import { worldStructuredDataSchema, worldStructureSectionOutputSchema } from "../../../../services/world/worldSchemas";
import { worldVisualizationDraftSchema } from "../../../../services/world/worldVisualizationSchema";
import { buildStructureSectionInstructions } from "../../../../services/world/worldServiceShared";
import { buildReferenceModeLabel } from "./worldPromptHelpers";

// 世界属性选项与深挖问题提示词资产(拆分自 world.prompts.ts,RF-1)。
export const worldPropertyOptionsPrompt: PromptAsset<
  WorldPropertyOptionsPromptInput,
  z.infer<typeof worldPropertyOptionsPayloadSchema>
> = {
  id: "world.property_options.generate",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: worldPropertyOptionsPayloadSchema,
  render: (input) => {
    const isReferenceMode = Boolean(input.referenceMode);

    return [
      new SystemMessage(
        isReferenceMode
          ? [
              "你是参考作品架空改造规划师。",
              "你的任务不是重写一套无关的新世界，而是基于参考作品的世界锚点、保留要求和改造边界，提炼出“正式生成世界前必须先决定”的关键世界决策项。",
              "",
              "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
              "输出结构必须严格为：",
              "{",
              '  "options": [',
              "    {",
              '      "id": "可选",',
              '      "name": "属性名称",',
              '      "description": "40-90字，说明这个属性决定什么，以及为什么值得在生成前就做选择",',
              '      "targetLayer": "foundation|power|society|culture|history|conflict",',
              '      "reason": "一句话说明它为什么值得优先决策",',
              '      "choices": [',
              "        {",
              '          "id": "choice-a",',
              '          "label": "方向 A",',
              '          "summary": "说明这个方向如何改造原作世界"',
              "        }",
              "      ]",
              "    }",
              "  ]",
              "}",
              "",
              "全局硬规则：",
              "1. options 数量必须与要求数量完全一致。",
              "2. 所有文本必须使用简体中文。",
              "3. targetLayer 只能是：foundation、power、society、culture、history、conflict。",
              "4. 每个 option 都必须包含 2-4 个 choices。",
              "5. choices 必须是互斥分支，而不是同义改写、强弱版本或描述角度变化。",
              "6. 不要生成角色动机、感情推进、具体桥段、单章冲突这类故事层选项。",
              "7. 只能围绕“世界层”或“世界-故事接口层”做决策设计。",
              "",
              "决策项要求：",
              "1. 每个 option 都必须是真正会改变后续世界构建方向的前置决策，而不是伪选项。",
              "2. name 必须简洁、清楚、可直接给用户点选，不要写成长句。",
              "3. description 必须说明“这个属性决定什么”以及“为什么要现在先决定”，不能空泛。",
              "4. reason 必须一句话点明它为何属于优先决策项，不能重复 description。",
              "",
              "choices 设计规则：",
              "1. 每个 choice 都必须代表一条清晰可分叉的架空改造路线。",
              "2. choices 之间要体现真正不同的世界走法，例如现实保留程度、秩序显隐方式、压迫结构来源、规则公开程度、地点系统组织方式等。",
              "3. 不要输出只是措辞不同的近义分支。",
              "4. summary 必须说明“这一分支会如何改造原作世界”，并点出边界与代价感。",
              "",
              "参考改造原则：",
              "1. 决策项必须围绕参考作品的世界基底展开，而不是借壳起一套无关新世界。",
              "2. 优先保留真正定义原作气质的底层结构，再在可改造边界内做分叉设计。",
              "3. 如果某个方向会让原作核心气质失真，应在该 choice.summary 中体现这种边界。",
              "4. 优先考虑现实基底、城市规则、社会压迫结构、地点系统、势力网络、公开与隐秘边界这类真正影响世界的核心轴。",
              "",
              "质量要求：",
              "1. options 之间尽量覆盖不同 targetLayer，不要全部挤在同一层。",
              "2. 每个 option 都应让用户一眼明白“我到底在决定哪个世界轴”。",
              "3. 输出结果应直接服务于下一步世界生成，而不是停留在概念讨论层。",
              input.retryStrict
                ? "4. 本次必须严格返回 JSON；如果不确定，也要先给出结构化 options，不得省略。"
                : "",
            ].filter(Boolean).join("\n")
          : [
              "你是小说世界生成器的前置决策规划师。",
              "你的任务是在正式生成世界之前，先提炼出一组真正值得用户先做决定的“关键世界属性选项”。",
              "这些选项不是装饰性问题，而是会直接影响后续世界构建方向的前置决策轴。",
              "",
              "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
              "输出结构必须严格为：",
              "{",
              '  "options": [',
              "    {",
              '      "id": "可选",',
              '      "name": "属性名称",',
              '      "description": "40-90字，说明这个属性决定什么，以及为什么值得在生成前就做选择",',
              '      "targetLayer": "foundation|power|society|culture|history|conflict",',
              '      "reason": "一句话说明它为什么值得优先决策"',
              "    }",
              "  ]",
              "}",
              "",
              "全局硬规则：",
              "1. options 数量必须与要求数量完全一致。",
              "2. 所有文本必须使用简体中文。",
              "3. targetLayer 只能是：foundation、power、society、culture、history、conflict。",
              "4. 不要生成“世界名称”“世界简介”“整体风格”这类过于宽泛或无实际选择价值的伪选项。",
              "",
              "属性设计要求：",
              "1. 每个 option 都必须是具体、可选择、会影响后续世界搭建方向的关键属性。",
              "2. name 必须简洁明确，让用户一眼知道自己在决定什么。",
              "3. description 必须说明：这个属性具体控制世界的哪一部分，以及为什么值得在生成前优先确定。",
              "4. reason 必须一句话点明它为何属于优先决策项，不能和 description 同义重复。",
              "",
              "生成原则：",
              "1. 这些选项应延续“先选属性、再补细节”的思路，优先抓真正影响世界成型方向的分歧点。",
              "2. 属性之间尽量独立，但组合后应能自然拼成一套连贯世界。",
              "3. 优先考虑基础层、力量层、社会层、文化层、历史层、冲突层，不要全部堆在一个层面。",
              "4. 可以参考经典网文世界搭建逻辑，但不要落入陈词滥调，要保留辨识度。",
              "5. 必须结合世界类型、模板说明、概念摘要、核心意象、关键词、基调和用户原始灵感综合判断。",
              "",
              "质量要求：",
              "1. 每个属性都应让用户看完后能自然做选择，而不是还要再解释一遍。",
              "2. 不要输出空泛大词，例如“世界复杂度”“设定深度”“故事张力”。",
              "3. 输出结果应直接服务下一步世界生成，而不是停留在灵感讨论层。",
              input.retryStrict
                ? "4. 本次必须严格返回 JSON；如果不确定，也要先给出结构化 options，不得省略。"
                : "",
            ].filter(Boolean).join("\n")
      ),
      new HumanMessage(
        isReferenceMode
          ? [
              `参考方式：${buildReferenceModeLabel(input.referenceMode)}`,
              input.referenceAnchors && input.referenceAnchors.length > 0
                ? `原作世界锚点：\n${input.referenceAnchors.map((item) => `- ${item.label}：${item.content}`).join("\n")}`
                : "",
              input.preserveElements && input.preserveElements.length > 0
                ? `必须保留：${input.preserveElements.join("、")}`
                : "",
              input.allowedChanges && input.allowedChanges.length > 0
                ? `允许改造：${input.allowedChanges.join("、")}`
                : "",
              input.forbiddenElements && input.forbiddenElements.length > 0
                ? `禁止偏离：${input.forbiddenElements.join("、")}`
                : "",
              `请生成 ${input.optionsCount} 个“架空改造前必须先决定”的关键世界决策项。`,
              "补充要求：",
              "1. 每个决策项都必须是世界层或世界-故事接口层的改造轴。",
              "2. 每个决策项都必须给出 2-4 个互斥分支 choices，让用户能真正做路线选择。",
              "3. choices 之间必须体现不同架空方向，而不是描述角度变化。",
              "4. 不要偏离原作世界基底去重新发明无关新世界。",
            ].filter(Boolean).join("\n")
          : [
              `世界类型：${input.worldType}`,
              `模板：${input.templateName}`,
              `模板说明：${input.templateDescription}`,
              input.classicElements.length > 0 ? `可参考的经典元素：${input.classicElements.join("、")}` : "",
              input.pitfalls.length > 0 ? `需要避开的常见坑点：${input.pitfalls.join("、")}` : "",
              `世界概念摘要：${input.conceptSummary}`,
              input.coreImagery.length > 0 ? `核心意象：${input.coreImagery.join("、")}` : "",
              input.keywords.length > 0 ? `关键词：${input.keywords.join("、")}` : "",
              input.tone.trim() ? `整体基调：${input.tone.trim()}` : "",
              input.sourcePrompt.trim() ? `用户原始灵感：${input.sourcePrompt.trim()}` : "",
              input.ragContext?.trim() ? `可参考素材：${input.ragContext.trim()}` : "",
              `请生成 ${input.optionsCount} 个“适合在正式生成世界前先做决定”的关键世界属性选项。`,
              "补充要求：",
              "1. 优先覆盖真正重要的世界分歧点，而不是宽泛项。",
              "2. 属性之间尽量分布到不同层级，组合后能形成完整世界。",
              "3. 每个属性都要让用户一眼明白自己在决定什么。",
            ].filter(Boolean).join("\n")
      ),
    ];
  },
};

export const worldDeepeningQuestionsPrompt: PromptAsset<
  WorldDeepeningQuestionsPromptInput,
  z.infer<typeof worldDeepeningQuestionsSchema>
> = {
  id: "world.deepening.questions",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: worldDeepeningQuestionsSchema,
  render: (input) => [
    new SystemMessage([
      "你是世界观补全提问器。",
      "你的任务是基于当前世界设定，挑出最值得优先追问的 2-3 个关键补全问题，帮助后续世界生成继续往下走。",
      "",
      "只输出一个合法 JSON 数组，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "",
      "每个数组项必须严格使用以下结构：",
      "{",
      '  "priority":"required|recommended|optional",',
      '  "question":"...",',
      '  "quickOptions":["...", "...", "..."],',
      '  "targetLayer":"foundation|power|society|culture|history|conflict",',
      '  "targetField":"..."',
      "}",
      "",
      "全局硬规则：",
      "1. 只能输出 2-3 个问题，不得少于 2 个，不得多于 3 个。",
      "2. 所有文本必须使用简体中文。",
      "3. 只能基于输入中的世界名称、描述、已有数据和可用参考素材来提问，不得凭空发散到无关方向。",
      "4. 问题必须是“继续生成世界前最值得先问的缺口”，而不是泛泛聊天问题。",
      "",
      "问题设计要求：",
      "1. 每个问题都必须指向一个真正会影响后续世界搭建方向的关键缺口。",
      "2. 优先提问最能决定世界走向、规则形态、社会结构、冲突来源或历史底板的问题。",
      "3. 不要问太宽的问题，例如“你还想补充什么”“这个世界还有什么特点”。",
      "4. 不要问角色动机、具体剧情桥段、感情推进这类故事层问题，除非它直接影响世界层结构。",
      "",
      "priority 规则：",
      "1. required：缺了这个问题，后续世界生成容易跑偏或塌掉。",
      "2. recommended：补上会明显提升世界完整度与可写性，但短期缺失仍可继续。",
      "3. optional：属于锦上添花型补充，不是当前最硬缺口。",
      "",
      "question 规则：",
      "1. 必须写成用户一看就能回答的自然问题。",
      "2. 问法要具体、清楚，不要用抽象术语。",
      "3. 每个问题都应尽量只问一个核心点，不要把多个问题塞进一句话。",
      "",
      "quickOptions 规则：",
      "1. 必须提供 2-4 个简洁候选答案，全部使用简体中文。",
      "2. quickOptions 应该帮助用户快速选择方向，而不是重复 question。",
      "3. 不同选项之间必须体现真实分叉，不能只是同义改写。",
      "4. 选项要短、准、可直接点选，不要写成长句分析。",
      "",
      "targetLayer 规则：",
      "1. 只能从 foundation、power、society、culture、history、conflict 中选择。",
      "2. 必须准确对应这个问题主要作用于哪一层世界结构。",
      "",
      "targetField 规则：",
      "1. 必须写清这个问题要补的是哪个具体字段或决策点。",
      "2. targetField 要简洁稳定，适合后续系统消费，例如“规则公开程度”“力量来源”“社会控制方式”“历史断层原因”。",
      "",
      "选择优先级原则：",
      "1. 优先挑“最少提问、最大增益”的问题。",
      "2. 若已有 dataJson 已经较完整，就不要重复问已明确的信息。",
      "3. 若 ragContext 提供了强参考方向，可以优先追问那些会决定参考素材如何落地的关键分叉。",
      "4. 2-3 个问题之间尽量分布在不同层级，不要全部挤在同一层，除非某一层确实是当前最大缺口。",
      "",
      "质量要求：",
      "1. 输出的问题要让用户感觉“这几个问题确实问到了点子上”。",
      "2. 不要为了凑数量提价值很低的问题。",
      "3. 整体结果必须能直接用于下一步世界补全流程。",
    ].join("\n")),
    new HumanMessage([
      `世界名称：${input.worldName}`,
      `世界描述：${input.description || "无"}`,
      `当前数据：${input.dataJson}`,
      `可用参考素材：${input.ragContext || "无"}`,
    ].join("\n")),
  ],
};

