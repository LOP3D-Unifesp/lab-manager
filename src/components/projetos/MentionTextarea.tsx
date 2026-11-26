import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useT } from "../../i18n";
import { filterMentionable, getMentionQuery, insertMention, MAX_COMMENT_LENGTH, type Mentionable } from "../../lib/taskComments";
import { Avatar } from "../ui/Avatar";
import { inputClassName } from "../ui/formStyles";

type Person = Mentionable & { avatar_url?: string | null };

type MentionTextareaProps = {
  label: string;
  placeholder?: string;
  value: string;
  /** Quem aparece na lista ao digitar @. */
  people: Person[];
  autoFocus?: boolean;
  onChange: (value: string) => void;
  /** Ctrl+Enter (ou Cmd+Enter). */
  onSubmit: () => void;
};

// Caixa de texto que, ao digitar @, sugere pessoas. Setas escolhem, Enter ou Tab confirmam e Esc fecha só a lista.
export function MentionTextarea({ autoFocus, label, onChange, onSubmit, people, placeholder, value }: MentionTextareaProps) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  const query = focused ? getMentionQuery(value, caret) : null;
  const suggestions = query && query.start !== dismissedAt ? filterMentionable(people, query.query) : [];
  const open = suggestions.length > 0;
  const current = Math.min(active, suggestions.length - 1);

  // Ao abrir para editar, o cursor vai para o fim do texto (o navegador o deixaria no começo).
  useEffect(() => {
    const field = ref.current;
    if (autoFocus && field) field.setSelectionRange(field.value.length, field.value.length);
  }, [autoFocus]);

  function choose(person: Person) {
    if (!query) return;
    const next = insertMention(value, query.start, caret, person.full_name);
    onChange(next.text);
    setCaret(next.caret);
    // Nomes compostos continuam depois do espaço; a lista não reabre para a citação já feita.
    setDismissedAt(query.start);
    window.requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current + (event.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      choose(suggestions[current]);
    } else if (event.key === "Escape") {
      // Não deixa o Esc chegar à janela, que se fecharia junto.
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(query?.start ?? null);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
      <textarea
        ref={ref}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${current}` : undefined}
        autoFocus={autoFocus}
        className={`${inputClassName} min-h-20 w-full resize-y py-2`}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder={placeholder}
        value={value}
        onFocus={(event) => {
          setFocused(true);
          setCaret(event.target.selectionStart);
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart);
          setActive(0);
          // Apagar o @ esquecido faz a lista voltar a abrir num @ novo na mesma posição.
          if (dismissedAt !== null && event.target.value[dismissedAt] !== "@") setDismissedAt(null);
        }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul id={listId} role="listbox" aria-label={t("comments.mentionList")} className="grid gap-1 rounded-lg border border-border bg-surface p-1 shadow-md">
          {suggestions.map((person, index) => (
            <li
              key={person.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === current}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-base",
                index === current ? "bg-primary-soft text-primary-dark" : "text-text",
              ].join(" ")}
              // Clicar na sugestão não tira o foco da caixa de texto.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(person)}
            >
              <Avatar avatarUrl={person.avatar_url} name={person.full_name} className="h-7 w-7 shrink-0" />
              <span className="min-w-0 truncate">{person.full_name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
