type JSONValue = string | number | boolean | null | JSONObject | JSONValue[];

type JSONObject = { [key: string]: JSONValue | undefined };

export type ProviderOptionsMap = Record<string, JSONObject>;

export const DEFAULT_PROVIDER_OPTIONS: ProviderOptionsMap = {
  deepseek: {
    thinking: { type: 'adaptive' },
    reasoningEffort: 'medium',
  },
};

function deepMerge(target: ProviderOptionsMap, source: ProviderOptionsMap): ProviderOptionsMap {
  const result: ProviderOptionsMap = { ...target };

  for (const key of Object.keys(source)) {
    const existing = result[key];
    const incoming = source[key];

    if (
      existing &&
      incoming &&
      typeof existing === 'object' &&
      typeof incoming === 'object' &&
      !Array.isArray(existing) &&
      !Array.isArray(incoming)
    ) {
      result[key] = { ...existing, ...incoming } as JSONObject;
    } else {
      result[key] = incoming;
    }
  }

  return result;
}

export function resolveProviderOptions(rawOptions?: string): ProviderOptionsMap {
  let userOptions: ProviderOptionsMap = {};

  if (rawOptions) {
    try {
      userOptions = JSON.parse(rawOptions) as ProviderOptionsMap;
    } catch {
      console.warn(`[Issue Scout] Invalid AI_PROVIDER_OPTIONS JSON: ${rawOptions}. Using defaults.`);
      return { ...DEFAULT_PROVIDER_OPTIONS };
    }
  }

  return deepMerge({ ...DEFAULT_PROVIDER_OPTIONS }, userOptions);
}
