type SerializedDate = {
  __beanJarSerializedType: "Date";
  iso: string;
};

function isSerializedDate(value: unknown): value is SerializedDate {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SerializedDate).__beanJarSerializedType === "Date" &&
    typeof (value as SerializedDate).iso === "string"
  );
}

export function encodeUserValue<T>(value: T): T {
  if (value instanceof Date) {
    return {
      __beanJarSerializedType: "Date",
      iso: value.toISOString(),
    } as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => encodeUserValue(item)) as T;
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, encodeUserValue(nestedValue)])
    ) as T;
  }

  return value;
}

export function decodeUserValue<T>(value: T): T {
  if (isSerializedDate(value)) {
    return new Date(value.iso) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => decodeUserValue(item)) as T;
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        decodeUserValue(nestedValue),
      ])
    ) as T;
  }

  return value;
}
