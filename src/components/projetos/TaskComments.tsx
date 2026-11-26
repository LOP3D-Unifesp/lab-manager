import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { getLocale, useT } from "../../i18n";
import { useCurrentProfile } from "../../lib/currentUser";
import type { PublicProfile } from "../../lib/domain";
import { getTaskErrorMessage, type ProjectMember } from "../../lib/projects";
import { supabase } from "../../lib/supabaseClient";
import { createTaskComment, deleteTaskComment, listProfiles, listTaskComments, updateTaskComment } from "../../lib/supabaseRepository";
import { extractMentions, groupThreads, splitMentions, type TaskComment } from "../../lib/taskComments";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { MentionTextarea } from "./MentionTextarea";

export type TaskCommentsHandle = {
  /** Envia o que ficou digitado (usado pelo Salvar da tarefa). O projeto e os membros podem ter acabado de mudar. */
  flush: (projectId: string, members: ProjectMember[]) => Promise<void>;
};

type TaskCommentsProps = {
  taskId: string;
  projectId: string;
  members: ProjectMember[];
  /** Há texto digitado que ainda não foi enviado. */
  onPendingChange: (pending: boolean) => void;
  /** Um comentário foi criado, alterado ou apagado. */
  onChanged: () => void;
  /** Quantos comentários há, para o nome da aba. */
  onCountChange: (count: number) => void;
};

// Quem pode ser citado: os membros do projeto e os coordenadores (são quem enxerga a tarefa).
function getMentionable(profiles: PublicProfile[], members: ProjectMember[]) {
  return profiles.filter((person) => person.role === "coordinator" || members.some((member) => member.profile_id === person.id));
}

const buttonClass = "min-h-10 px-4 py-2 text-base";
const linkClass = "text-sm font-semibold text-muted underline hover:text-text";

export const TaskComments = forwardRef<TaskCommentsHandle, TaskCommentsProps>(function TaskComments(
  { members, onChanged, onCountChange, onPendingChange, projectId, taskId },
  ref,
) {
  const t = useT();
  const { currentProfile } = useCurrentProfile();
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  // Respostas abertas, pelo id do comentário inicial: cada conversa guarda o que foi digitado nela.
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<TaskComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(
    () =>
      listTaskComments(taskId)
        .then(setComments)
        .catch((failure) => {
          setComments((current) => current ?? []);
          setError(getTaskErrorMessage(failure));
        }),
    [taskId],
  );

  useEffect(() => {
    void reload();
    const client = supabase;
    if (!client) return;
    // Comentários de outras pessoas aparecem com a janela aberta.
    const channel = client
      .channel(`task_comments_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_task_comments" }, () => void reload())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [reload]);

  useEffect(() => {
    let active = true;
    listProfiles()
      .then((data) => active && setProfiles(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const count = comments?.length;
  useEffect(() => {
    if (count !== undefined) onCountChange(count);
  }, [count, onCountChange]);

  const mentionable = getMentionable(profiles, members);
  const suggestions = mentionable.filter((person) => person.id !== currentProfile?.id);
  const edited = editing ? comments?.find((comment) => comment.id === editing.id) : undefined;
  const editPending = Boolean(editing && edited && editing.body.trim() !== edited.body);
  const threads = groupThreads(comments ?? []);
  // Resposta digitada numa conversa que deixou de existir não conta.
  const openReplies = Object.entries(replies).filter(([rootId]) => threads.some((thread) => thread.root.id === rootId));
  const pending = Boolean(draft.trim()) || editPending || openReplies.some(([, body]) => body.trim());

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  // Citações já feitas continuam valendo na edição, mesmo que a pessoa tenha saído do projeto.
  function mentionsFor(body: string, people: PublicProfile[], previous: string[] = []) {
    return extractMentions(body, [...people, ...profiles.filter((person) => previous.includes(person.id) && !people.includes(person))]);
  }

  async function saveEdit(people: PublicProfile[]) {
    if (!editing || !edited) return;
    const body = editing.body.trim();
    if (body && body !== edited.body) {
      await updateTaskComment(editing.id, body, mentionsFor(body, people, edited.mentions));
      onChanged();
    }
    setEditing(null);
  }

  async function sendDraft(targetProjectId: string, people: PublicProfile[]) {
    const body = draft.trim();
    if (!body) return;
    await createTaskComment(taskId, targetProjectId, body, mentionsFor(body, people));
    setDraft("");
    onChanged();
  }

  function closeReply(rootId: string) {
    setReplies(({ [rootId]: _, ...others }) => others);
  }

  async function sendReply(rootId: string, targetProjectId: string, people: PublicProfile[]) {
    const body = replies[rootId]?.trim();
    if (!body) return;
    await createTaskComment(taskId, targetProjectId, body, mentionsFor(body, people), rootId);
    closeReply(rootId);
    onChanged();
  }

  useImperativeHandle(ref, () => ({
    async flush(targetProjectId, targetMembers) {
      const people = getMentionable(profiles, targetMembers);
      await saveEdit(people);
      for (const [rootId] of openReplies) await sendReply(rootId, targetProjectId, people);
      await sendDraft(targetProjectId, people);
    },
  }));

  async function run(action: () => Promise<void>) {
    if (busy) return;
    try {
      setBusy(true);
      setError("");
      await action();
      await reload();
    } catch (failure) {
      setError(getTaskErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const formatDate = (value: string) => new Intl.DateTimeFormat(getLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  function renderComment(comment: TaskComment, rootId: string, isReply: boolean) {
    const mine = comment.author_id === currentProfile?.id;
    const canDelete = mine || currentProfile?.role === "coordinator";
    const isEditing = editing?.id === comment.id;
    return (
      <div className="flex items-start gap-3">
        <Avatar avatarUrl={comment.author_avatar_url} name={comment.author_name} className={isReply ? "h-7 w-7 shrink-0" : "h-8 w-8 shrink-0"} />
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-1">
          <p className="text-sm text-muted">
            <span className="font-semibold text-text">{comment.author_name}</span> · {formatDate(comment.created_at)}
            {comment.edited_at ? ` · ${t("comments.edited")}` : ""}
          </p>
          {isEditing ? (
            <>
              <MentionTextarea
                autoFocus
                label={t("comments.editLabel")}
                people={suggestions}
                value={editing.body}
                onChange={(body) => setEditing({ id: comment.id, body })}
                onSubmit={() => void run(() => saveEdit(mentionable))}
              />
              <div className="flex flex-wrap gap-2">
                <Button className={buttonClass} disabled={busy || !editing.body.trim()} onClick={() => void run(() => saveEdit(mentionable))}>
                  {t("comments.saveEdit")}
                </Button>
                <Button className={buttonClass} variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 text-base text-text [overflow-wrap:anywhere]">
                {splitMentions(comment.body, profiles.filter((person) => comment.mentions.includes(person.id))).map((segment, index) =>
                  segment.personId ? (
                    <span key={index} className="rounded bg-primary-soft px-1 font-semibold text-primary-dark">
                      {segment.text}
                    </span>
                  ) : (
                    segment.text
                  ),
                )}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={linkClass}
                  aria-label={t("comments.replyTo", { name: comment.author_name })}
                  onClick={() => setReplies((current) => ({ [rootId]: "", ...current }))}
                >
                  {t("comments.reply")}
                </button>
                {mine ? (
                  <button type="button" className={linkClass} onClick={() => setEditing({ id: comment.id, body: comment.body })}>
                    {t("comments.edit")}
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className={linkClass} onClick={() => setDeleting(comment)}>
                    {t("comments.delete")}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <section aria-label={t("comments.title")} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {comments === null ? (
        <p className="text-base text-muted">{t("comments.loading")}</p>
      ) : comments.length === 0 ? (
        <p className="text-base text-muted">{t("comments.empty")}</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {threads.map(({ replies: answers, root }) => (
            <li key={root.id} className="grid grid-cols-[minmax(0,1fr)] gap-3">
              {renderComment(root, root.id, false)}
              {answers.length > 0 || root.id in replies ? (
                <div className="ml-4 grid grid-cols-[minmax(0,1fr)] gap-3 border-l-2 border-border pl-4">
                  {answers.map((reply) => (
                    <div key={reply.id}>{renderComment(reply, root.id, true)}</div>
                  ))}
                  {root.id in replies ? (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                      <MentionTextarea
                        autoFocus
                        label={t("comments.replyLabel", { name: root.author_name })}
                        placeholder={t("comments.replyPlaceholder")}
                        people={suggestions}
                        value={replies[root.id]}
                        onChange={(body) => setReplies((current) => ({ ...current, [root.id]: body }))}
                        onSubmit={() => void run(() => sendReply(root.id, projectId, mentionable))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className={buttonClass}
                          disabled={busy || !replies[root.id].trim()}
                          onClick={() => void run(() => sendReply(root.id, projectId, mentionable))}
                        >
                          {t("comments.replySend")}
                        </Button>
                        <Button className={buttonClass} variant="ghost" disabled={busy} onClick={() => closeReply(root.id)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{error}</p>
      ) : null}

      <MentionTextarea
        label={t("comments.add")}
        placeholder={t("comments.placeholder")}
        people={suggestions}
        value={draft}
        onChange={setDraft}
        onSubmit={() => void run(() => sendDraft(projectId, mentionable))}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("comments.hint")}</p>
        <Button className={buttonClass} disabled={busy || !draft.trim()} onClick={() => void run(() => sendDraft(projectId, mentionable))}>
          {busy ? t("comments.sending") : t("comments.send")}
        </Button>
      </div>

      {deleting ? (
        <ConfirmDialog
          title={t("comments.deleteTitle")}
          confirmLabel={t("comments.deleteConfirm")}
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const target = deleting;
            setDeleting(null);
            void run(async () => {
              await deleteTaskComment(target.id);
              onChanged();
            });
          }}
        >
          <p className="line-clamp-4 whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">{deleting.body}</p>
          {comments?.some((comment) => comment.parent_id === deleting.id) ? <p className="mt-2">{t("comments.deleteKeepsReplies")}</p> : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
});
