export interface Command {
  id: string;
  label: string;
  description?: string;
  category: string;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t.includes(q)) {
    return { matches: true, score: q.length / t.length + (t.startsWith(q) ? 0.5 : 0) };
  }

  let qi = 0;
  let score = 0;
  let consecutive = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return { matches: false, score: 0 };
  return { matches: true, score: score / (t.length * q.length) };
}

export function searchCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;

  const results: { command: Command; score: number }[] = [];

  for (const cmd of commands) {
    const labelMatch = fuzzyMatch(query, cmd.label);
    const descMatch = cmd.description ? fuzzyMatch(query, cmd.description) : { matches: false, score: 0 };
    const keywordMatches = (cmd.keywords || []).map(kw => fuzzyMatch(query, kw));
    const bestKeyword = keywordMatches.reduce((best, m) => m.score > best.score ? m : best, { matches: false, score: 0 });

    const bestScore = Math.max(labelMatch.score * 2, descMatch.score, bestKeyword.score);
    const anyMatch = labelMatch.matches || descMatch.matches || bestKeyword.matches;

    if (anyMatch) {
      results.push({ command: cmd, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score).map(r => r.command);
}
