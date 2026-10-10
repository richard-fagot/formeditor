// API publique du module registry : seul point de connaissance de la liste des plugins.
import type { GraphNode, NodeKind, Question, QuestionType } from '../core/model';
import type { NodeKindPlugin, QuestionTypePlugin } from '../plugin-api';
import { textType } from '../plugins/question-types/text';
import { booleanType } from '../plugins/question-types/boolean';
import { questionKind } from '../plugins/node-kinds/question';
import { infoKind } from '../plugins/node-kinds/info';
import { summaryKind } from '../plugins/node-kinds/summary';
import { endKind } from '../plugins/node-kinds/end';
import { blockKind } from '../plugins/node-kinds/block';
import { exitKind } from '../plugins/node-kinds/exit';

/** Types de questions disponibles, dans l'ordre d'affichage. */
export const QUESTION_TYPE_PLUGINS = [textType, booleanType] as unknown as QuestionTypePlugin<Question>[];

export const NODE_KIND_PLUGINS = [questionKind, infoKind, summaryKind, endKind, blockKind, exitKind] as unknown as NodeKindPlugin<GraphNode>[];

export function questionType(type: QuestionType): QuestionTypePlugin<Question> | undefined {
  return QUESTION_TYPE_PLUGINS.find((p) => p.type === type);
}

export function nodeKind(kind: NodeKind): NodeKindPlugin<GraphNode> {
  return NODE_KIND_PLUGINS.find((p) => p.kind === kind)!;
}

/** Type proposé par défaut pour une nouvelle question. */
export const DEFAULT_QUESTION_TYPE: QuestionType = 'text';
