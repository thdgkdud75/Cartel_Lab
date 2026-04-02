export interface RecommendationBlock {
  problem_sentence: string;
  problem_points: string[];
  improvement_points: string[];
  before_example: string;
  after_example: string;
}

export function parseRecommendationBlocks(text: string): RecommendationBlock[] {
  const cleaned = (text || "").trim();
  if (!cleaned) return [];

  return cleaned
    .split(/[-]{8,}/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const sectionNames = ["문제 문장", "문제점", "개선 방향", "수정 예시"];
      const positions: { start: number; contentStart: number; name: string }[] = [];

      for (const name of sectionNames) {
        const match = raw.match(new RegExp(`(^|\\n)${name}\\n`));
        if (match && match.index !== undefined) {
          positions.push({ start: match.index, contentStart: match.index + match[0].length, name });
        }
      }
      positions.sort((a, b) => a.start - b.start);

      if (!positions.length) {
        return { problem_sentence: raw, problem_points: [], improvement_points: [], before_example: "", after_example: "" };
      }

      const parsed: RecommendationBlock = { problem_sentence: "", problem_points: [], improvement_points: [], before_example: "", after_example: "" };
      positions.forEach(({ contentStart, name }, i) => {
        const end = positions[i + 1]?.start ?? raw.length;
        const content = raw.slice(contentStart, end).trim();
        if (name === "문제 문장") {
          parsed.problem_sentence = content;
        } else if (name === "문제점") {
          parsed.problem_points = content.split("\n").map((line) => line.replace(/^[\s-]+/, "")).filter(Boolean);
        } else if (name === "개선 방향") {
          parsed.improvement_points = content.split("\n").map((line) => line.replace(/^[\s-]+/, "")).filter(Boolean);
        } else if (name === "수정 예시") {
          const beforeMatch = content.match(/Before\n([\s\S]+?)(?:\n\nAfter\n|\nAfter\n|$)/);
          const afterMatch = content.match(/After\n([\s\S]+)$/);
          if (beforeMatch) parsed.before_example = beforeMatch[1].trim();
          if (afterMatch) parsed.after_example = afterMatch[1].trim();
        }
      });
      return parsed;
    });
}
