export const REACTION_PALETTE = [
  { emoji: '👍', label: 'Agree' },
  { emoji: '❤️', label: 'Love this' },
  { emoji: '🤔', label: 'Makes me think' },
  { emoji: '💡', label: 'Sparked an idea' },
  { emoji: '❓', label: 'Unclear / question' },
  { emoji: '⭐', label: 'Standout' },
] as const;

export type ReactionEmoji = typeof REACTION_PALETTE[number]['emoji'];

export function isValidReactionEmoji(value: string): value is ReactionEmoji {
  return REACTION_PALETTE.some((p) => p.emoji === value);
}

export const COMMENT_BODY_MAX = 2000;
