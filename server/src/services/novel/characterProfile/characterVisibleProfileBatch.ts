import type {
  CharacterVisibleProfileBatchResult,
  CharacterVisibleProfileSuggestion,
} from "@ai-novel/shared/types/novelCharacter";

// INN-D3 批量吞吐:角色外显资料生成彼此独立,用有界并发替代逐个串行。
// 顺序仍需稳定:结果与跳过项按输入角色顺序返回,避免前端列表跳动。
export const VISIBLE_PROFILE_BATCH_CONCURRENCY = 3;

type SkippedCharacter = CharacterVisibleProfileBatchResult["skippedCharacters"][number];

export interface CharacterVisibleProfileBatchInput<TCharacter extends { id: string; name: string }> {
  characters: TCharacter[];
  needsProfile: (character: TCharacter) => boolean;
  generate: (character: TCharacter) => Promise<CharacterVisibleProfileSuggestion>;
  concurrency?: number;
}

type BatchSlot =
  | { result: CharacterVisibleProfileSuggestion; skipped?: never }
  | { skipped: SkippedCharacter; result?: never };

function normalizeConcurrency(value: number | undefined, total: number): number {
  const requested = typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : VISIBLE_PROFILE_BATCH_CONCURRENCY;
  return Math.max(1, Math.min(requested, Math.max(total, 1)));
}

export async function runCharacterVisibleProfileBatch<TCharacter extends { id: string; name: string }>(
  input: CharacterVisibleProfileBatchInput<TCharacter>,
): Promise<Pick<CharacterVisibleProfileBatchResult, "results" | "skippedCharacters">> {
  const slots: BatchSlot[] = new Array(input.characters.length);
  const pending: Array<{ character: TCharacter; index: number }> = [];

  input.characters.forEach((character, index) => {
    if (input.needsProfile(character)) {
      pending.push({ character, index });
      return;
    }
    slots[index] = {
      skipped: {
        characterId: character.id,
        characterName: character.name,
        reason: "外显资料已较完整",
      },
    };
  });

  let nextIndex = 0;
  const workerCount = Math.min(
    normalizeConcurrency(input.concurrency, pending.length),
    pending.length,
  );
  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= pending.length) {
        return;
      }
      const { character, index } = pending[current];
      try {
        slots[index] = { result: await input.generate(character) };
      } catch (error) {
        slots[index] = {
          skipped: {
            characterId: character.id,
            characterName: character.name,
            reason: error instanceof Error ? error.message : "外显资料生成失败",
          },
        };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    results: slots.flatMap((slot) => (slot?.result ? [slot.result] : [])),
    skippedCharacters: slots.flatMap((slot) => (slot?.skipped ? [slot.skipped] : [])),
  };
}
