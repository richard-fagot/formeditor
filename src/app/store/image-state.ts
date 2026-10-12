// État de l'export d'image du logigramme (EVO-004), regroupé hors de `store.ts`.

/** Options de l'export d'image : périmètre (tout le logigramme ou la sélection), titre en en-tête. */
export interface ImageOptions {
  scope: 'all' | 'selection';
  title: boolean;
}

export interface ImageState {
  /** Derniers choix du dialogue (préférence de l'outil, sauvegardée avec la session). */
  imageOptions: ImageOptions;
  /** Dialogue d'options de l'export d'image ouvert. */
  imageDialog: boolean;
  /** Demande d'export de l'image du logigramme affiché (compteur) ; exécutée par `ui/diagram`. */
  imageRequest: number;
  /** Export d'image en cours (indicateur). */
  imageBusy: boolean;
}

export const initialImageState = (): ImageState => ({
  imageOptions: { scope: 'all', title: true },
  imageDialog: false,
  imageRequest: 0,
  imageBusy: false,
});
