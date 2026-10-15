// API publique du module app/feedback : refus, informations, échecs, confirmations (EVO-025, docs/ERREURS.md).
export { refuse, inform, fail, confirm, bindFeedback, type Message, type Notice, type FeedbackTarget } from './feedback';
