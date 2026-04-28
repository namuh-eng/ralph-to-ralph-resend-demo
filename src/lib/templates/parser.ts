/**
 * Simple Mustache-style variable extractor.
 * Finds all unique {{variable}} patterns in a string.
 */
export function extractTemplateVariables(content: string): string[] {
  const regex = /{{\s*([a-zA-Z0-9_-]+)\s*}}/g;
  const variables = new Set<string>();
  let match: RegExpExecArray | null = regex.exec(content);

  while (match !== null) {
    if (match[1]) {
      variables.add(match[1]);
    }
    match = regex.exec(content);
  }

  return Array.from(variables);
}
