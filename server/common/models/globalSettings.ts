export interface IFeatureFlags {
  resourcesMarket: boolean;
  fishingAquarium: boolean;
  pets: boolean;
  social: boolean;
}

export interface IGlobalSettings {
  features: IFeatureFlags;
}

export const DEFAULT_GLOBAL_SETTINGS: IGlobalSettings = {
  features: {
    resourcesMarket: true,
    fishingAquarium: true,
    pets: true,
    social: true,
  },
};

export function convertToGlobalSettings(settings: Partial<IGlobalSettings>): IGlobalSettings {
  return {
    features: {
      resourcesMarket:
        settings.features?.resourcesMarket ?? DEFAULT_GLOBAL_SETTINGS.features.resourcesMarket,
      fishingAquarium:
        settings.features?.fishingAquarium ?? DEFAULT_GLOBAL_SETTINGS.features.fishingAquarium,
      pets: settings.features?.pets ?? DEFAULT_GLOBAL_SETTINGS.features.pets,
      social: settings.features?.social ?? DEFAULT_GLOBAL_SETTINGS.features.social,
    },
  };
}

type GlobalSettingsPayload = Partial<IGlobalSettings> & {
  settings?: Partial<IGlobalSettings>;
};

function isGlobalSettingsPayload(value: unknown): value is GlobalSettingsPayload {
  return typeof value === 'object' && value !== null;
}

export function globalSettingsFromDoc(doc: unknown): IGlobalSettings {
  if (!isGlobalSettingsPayload(doc)) return DEFAULT_GLOBAL_SETTINGS;

  const payload = doc.settings && isGlobalSettingsPayload(doc.settings) ? doc.settings : doc;
  return convertToGlobalSettings(payload);
}

export function globalSettingsToDoc(settings: IGlobalSettings): IGlobalSettings {
  return {
    features: {
      resourcesMarket: settings.features.resourcesMarket,
      fishingAquarium: settings.features.fishingAquarium,
      pets: settings.features.pets,
      social: settings.features.social,
    },
  };
}
