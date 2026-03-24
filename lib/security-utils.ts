export function stripHtmlTags(input: string): string {
  let result = "";
  let insideTag = false;

  for (const character of input) {
    if (character === "<") {
      insideTag = true;
      continue;
    }

    if (character === ">") {
      insideTag = false;
      continue;
    }

    if (!insideTag) {
      result += character;
    }
  }

  return result.trim();
}

function decodeSqlInput(input: string): string {
  try {
    return decodeURIComponent(input).split("+").join(" ");
  } catch {
    return input.split("+").join(" ");
  }
}

export function containsPotentialSqlInjection(input: string): boolean {
  const normalized = decodeSqlInput(input).toLowerCase();

  if (normalized.includes("--")) {
    return true;
  }

  if (
    normalized.includes("' union") ||
    normalized.includes('" union') ||
    normalized.includes("'union") ||
    normalized.includes('"union')
  ) {
    return true;
  }

  if (
    normalized.includes("' or ") ||
    normalized.includes('" or ') ||
    normalized.includes("'or") ||
    normalized.includes('"or')
  ) {
    return true;
  }

  if (normalized.includes("';") || normalized.includes('";')) {
    return true;
  }

  return normalized.includes("exec xp") || normalized.includes("exec sp");
}
