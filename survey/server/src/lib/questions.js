const VALID_TYPES = new Set(['likert5', 'single_choice', 'multi_choice', 'text']);

const TYPE_ALIASES = {
  likert: 'likert5',
  likert5: 'likert5',
  scale: 'likert5',
  rating: 'likert5',
  single: 'single_choice',
  singlechoice: 'single_choice',
  choice: 'single_choice',
  multiplechoice: 'single_choice',
  multi: 'multi_choice',
  multichoice: 'multi_choice',
  checkbox: 'multi_choice',
  select: 'single_choice',
  text: 'text',
  open: 'text',
  openended: 'text',
  freetext: 'text',
};

export function normalizeType(raw) {
  if (!raw) return 'likert5';
  const key = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return TYPE_ALIASES[key] || (VALID_TYPES.has(raw.trim()) ? raw.trim() : 'likert5');
}

// Each non-blank line: "Prompt text | type | option1, option2, option3 | optional"
// Only `prompt` is required; the rest are optional and can be omitted.
export function parseBulkQuestions(text) {
  const lines = String(text || '').split(/\r?\n/);
  const questions = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split('|').map((p) => p.trim());
    const prompt = parts[0];
    if (!prompt) {
      errors.push(`Line ${idx + 1}: empty prompt, skipped.`);
      return;
    }

    const type = normalizeType(parts[1]);
    let options = null;
    if (parts[2]) {
      options = parts[2].split(',').map((o) => o.trim()).filter(Boolean);
    }
    if ((type === 'single_choice' || type === 'multi_choice') && (!options || options.length < 2)) {
      errors.push(`Line ${idx + 1}: "${prompt}" needs at least two comma-separated options for a choice question.`);
      return;
    }

    const optionalFlag = parts.some((p) => p.toLowerCase() === 'optional');
    questions.push({ prompt, type, options, required: !optionalFlag });
  });

  return { questions, errors };
}
