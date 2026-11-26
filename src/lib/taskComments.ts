// Comentários das tarefas: quem pode ser citado com @, o que está sendo digitado depois do @ e onde estão as
// citações num texto (para destacar na tela e para o banco saber quem avisar).

export const MAX_COMMENT_LENGTH = 2000;
// Mesmo limite do banco (project_task_comments_mentions_check).
const MAX_MENTIONS = 30;
const MAX_SUGGESTIONS = 6;

export type Mentionable = { id: string; full_name: string };

export type TaskComment = {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  mentions: string[];
  created_at: string;
  edited_at: string | null;
};

// Sem acento e em minúsculas, para "@joao" achar "João".
function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

const isWordChar = (char: string | undefined) => Boolean(char && /[\p{L}\p{N}_]/u.test(char));

// O "@..." que termina no cursor, se houver. Um @ grudado numa palavra (e-mail) não conta.
export function getMentionQuery(text: string, caret: number) {
  const match = /@([^\s@]{0,40})$/u.exec(text.slice(0, caret));
  if (!match || isWordChar(text[match.index - 1])) return null;
  return { start: match.index, query: match[1] };
}

// Pessoas cujo nome tem uma palavra começando pelo que foi digitado.
export function filterMentionable<T extends Mentionable>(people: T[], query: string) {
  const wanted = fold(query);
  return people.filter((person) => fold(person.full_name).split(/\s+/).some((_, index, words) => words.slice(index).join(" ").startsWith(wanted))).slice(0, MAX_SUGGESTIONS);
}

// Troca o "@..." digitado pelo nome completo e deixa o cursor depois dele.
export function insertMention(text: string, start: number, caret: number, name: string) {
  const mention = `@${name} `;
  const rest = text.slice(caret).replace(/^ /, "");
  return { text: text.slice(0, start) + mention + rest, caret: start + mention.length };
}

export type CommentSegment = { text: string; personId: string | null };

// Divide o texto em trechos comuns e citações. Com nomes que começam igual ("Ana" e "Ana Souza") vale o mais longo.
export function splitMentions(text: string, people: Mentionable[]): CommentSegment[] {
  const byLength = people.filter((person) => person.full_name).sort((a, b) => b.full_name.length - a.full_name.length);
  const segments: CommentSegment[] = [];
  let plainStart = 0;

  for (let at = text.indexOf("@"); at !== -1; at = text.indexOf("@", at + 1)) {
    if (at < plainStart || isWordChar(text[at - 1])) continue;
    const person = byLength.find((candidate) => {
      const end = at + 1 + candidate.full_name.length;
      return text.slice(at + 1, end).toLocaleLowerCase() === candidate.full_name.toLocaleLowerCase() && !isWordChar(text[end]);
    });
    if (!person) continue;
    const end = at + 1 + person.full_name.length;
    if (at > plainStart) segments.push({ text: text.slice(plainStart, at), personId: null });
    segments.push({ text: text.slice(at, end), personId: person.id });
    plainStart = end;
  }

  if (plainStart < text.length) segments.push({ text: text.slice(plainStart), personId: null });
  return segments;
}

export function extractMentions(text: string, people: Mentionable[]) {
  const ids = splitMentions(text, people).flatMap((segment) => (segment.personId ? [segment.personId] : []));
  return [...new Set(ids)].slice(0, MAX_MENTIONS);
}
