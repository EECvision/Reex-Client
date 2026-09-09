export const parseValue = (value: unknown, type?: string) => {
  if (value instanceof File || typeof value !== "string") {
    return value;
  }
  const t = (type || "").toLowerCase();

  if (
    t.includes("number") ||
    t.includes("int") ||
    t.includes("float") ||
    t.includes("double")
  ) {
    const num = Number(value);
    return !isNaN(num) ? num : value;
  }
  
  if (t.includes("bool")) {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  
  const isArrayType = t.includes("array") || t.includes("[]") || t.includes("list");
  const isObjectType = t.includes("object") || t.includes("map") || t.includes("dict");

  if (isArrayType || isObjectType) {
    try {
      const parsed = JSON.parse(value);
      if (isArrayType && !Array.isArray(parsed)) {
        return [parsed];
      }
      return parsed;
    } catch {
      if (isArrayType && value.trim() !== "") {
        if (value.includes(",")) {
            return value.split(",").map((s: string) => s.trim());
        }
        return [value];
      }
      return value;
    }
  }

  // If type is empty/unknown, loosely parse JSON structures for backward compatibility
  if (!t) {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }
  
  return value;
};
