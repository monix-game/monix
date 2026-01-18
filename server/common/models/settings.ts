/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface ISettings {
  privacy_mode: boolean;
}

export const DEFAULT_SETTINGS: ISettings = {
  privacy_mode: false,
};

export function convertToSettings(s: Partial<ISettings>): ISettings {
  return {
    privacy_mode: s.privacy_mode ?? DEFAULT_SETTINGS.privacy_mode,
  };
}

export function settingsToDoc(s: ISettings): ISettings {
  return {
    privacy_mode: s.privacy_mode,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function settingsFromDoc(doc: any): ISettings {
  return {
    privacy_mode: doc.privacy_mode || false,
  };
}
