/** Code de langue (ex. `fr`, `en`). */
export type LangCode = string;

/** Expression JSONata écrite avec les clés lisibles (voir docs/FORMAT.md). */
export type Expression = string;

/** Texte multilingue : une entrée par langue du projet. */
export type LocalizedText = Record<LangCode, string>;

/** Variante d'un libellé, retenue si `when` est vraie. */
export interface LabelVariant {
  when: Expression;
  text: LocalizedText;
}

/** Libellé à variantes conditionnelles : première variante vraie, sinon `otherwise`. */
export interface VariantLabel {
  variants: LabelVariant[];
  otherwise: LocalizedText;
}

/** Libellé destiné à l'utilisateur final : interpolable (`{cle}`), éventuellement à variantes. */
export type Label = LocalizedText | VariantLabel;

export function isVariantLabel(label: Label): label is VariantLabel {
  return Array.isArray((label as VariantLabel).variants);
}

/** Toutes les traductions d'un libellé, variantes comprises. */
export function labelTexts(label: Label): LocalizedText[] {
  return isVariantLabel(label) ? [...label.variants.map((v) => v.text), label.otherwise] : [label];
}
