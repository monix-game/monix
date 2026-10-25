import { cosmetics } from '../../server/common/cosmetics/cosmetics';

export type ResolvedNameplate = {
  styleKey: string | null;
  backgroundKey: string | null;
};

/**
 * Resolve the nameplate style/background for a user.
 *
 * The magic jellybean effect overrides the text gradient with 'rainbow' but
 * deliberately keeps the equipped plate, so both keys are returned separately.
 */
export function resolveNameplate(
  cosmeticId: string | undefined | null,
  magicJellybeanActive: boolean = false
): ResolvedNameplate {
  const cosmetic = cosmeticId ? cosmetics.find(c => c.id === cosmeticId) : undefined;
  return {
    styleKey: magicJellybeanActive ? 'rainbow' : (cosmetic?.nameplateStyle ?? null),
    backgroundKey: cosmetic?.nameplateBackground ?? null,
  };
}
