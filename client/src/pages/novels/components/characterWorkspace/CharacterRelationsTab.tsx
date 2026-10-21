import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import type { Character } from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { getCharacterRelations } from "@/api/novel";
import { getCharacterDynamicsOverview } from "@/api/novelCharacterDynamics";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import CharacterDiagnosticsSection from "../CharacterDiagnosticsSection";
import CharacterRelationshipGraphPanel from "./CharacterRelationshipGraphPanel";
import {
  buildRelationshipGraphModel,
  type RelationshipGraphMode,
} from "./characterRelationshipGraphModel";

interface CharacterRelationsTabProps {
  novelId: string;
  characters: Character[];
  selectedCharacter?: Character;
  selectedCharacterId: string;
  onSelectedCharacterChange: (id: string) => void;
  llmProvider?: LLMProvider;
  llmModel?: string;
}

export default function CharacterRelationsTab(props: CharacterRelationsTabProps) {
  const {
    novelId,
    characters,
    selectedCharacter,
    selectedCharacterId,
    onSelectedCharacterChange,
    llmProvider,
    llmModel,
  } = props;
  const [graphMode, setGraphMode] = useState<RelationshipGraphMode>("all");

  const relationsQuery = useQuery({
    queryKey: queryKeys.novels.characterRelations(novelId),
    queryFn: () => getCharacterRelations(novelId),
    enabled: Boolean(novelId),
  });

  const dynamicsQuery = useQuery({
    queryKey: queryKeys.novels.characterDynamicsOverview(novelId),
    queryFn: () => getCharacterDynamicsOverview(novelId),
    enabled: Boolean(novelId),
  });

  const graphModel = useMemo(
    () => buildRelationshipGraphModel({
      characters,
      staticRelations: relationsQuery.data?.data ?? [],
      dynamicRelations: dynamicsQuery.data?.data?.relations ?? [],
      selectedCharacterId,
      mode: graphMode,
    }),
    [characters, dynamicsQuery.data?.data?.relations, graphMode, relationsQuery.data?.data, selectedCharacterId],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs leading-5 text-muted-foreground">
          这里只梳理角色之间的关系;想看 角色×势力×地点 的全貌时,打开故事世界图谱。
        </div>
        <Button asChild type="button" variant="outline" size="sm" className="shrink-0">
          <Link to={`/novels/${novelId}/story-graph`}>
            <Network className="mr-1.5 h-4 w-4" />
            故事世界图谱
          </Link>
        </Button>
      </div>
      <CharacterRelationshipGraphPanel
        model={graphModel}
        mode={graphMode}
        onModeChange={setGraphMode}
        selectedCharacterId={selectedCharacterId}
        onSelectedCharacterChange={onSelectedCharacterChange}
        isLoading={relationsQuery.isLoading || dynamicsQuery.isLoading}
      />

      <CharacterDiagnosticsSection
        novelId={novelId}
        characters={characters}
        selectedCharacter={selectedCharacter}
        onSelectedCharacterChange={onSelectedCharacterChange}
        llmProvider={llmProvider}
        llmModel={llmModel}
        defaultOpen={false}
      />
    </div>
  );
}
