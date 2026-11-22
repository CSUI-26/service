import { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ContentRequestDetail,
  ContentRequestSummary,
  FeedbackThreadDetail,
  FeedbackThreadSummary,
  ImageField,
  RequestAuthor,
  RequestStatus,
} from '@zenith/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { ImageUploadEditor, type ImageUploadValue } from '@/components/patterns/ImageUploadEditor';
import {
  ADMIN_CONTENT_TYPE_LABELS,
  ADMIN_STATUS_LABELS,
  MEMBER_CONTENT_TYPE_LABELS,
  MEMBER_STATUS_LABELS,
  contentRequestsApi,
  formatEpochTimestamp,
  statusBadgeVariant,
} from '@/features/content-requests/api';
import {
  ADMIN_FEEDBACK_CATEGORY_LABELS,
  MEMBER_FEEDBACK_CATEGORY_LABELS,
  feedbackApi,
} from '@/features/feedback/api';

interface ThreadMessageView {
  id: number;
  authorNpm: string;
  authorRole: 'user' | 'admin';
  author?: RequestAuthor;
  body: string;
  image?: ImageField | null;
  createdAt: number;
  updatedAt: number;
}

interface ThreadDetailView {
  id: number;
  authorNpm: string;
  author?: RequestAuthor;
  primaryBadge: string;
  title: string;
  description: string;
  status: RequestStatus;
  image?: ImageField | null;
  teamName?: string;
  year?: number;
  externalUrl?: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  messages: ThreadMessageView[];
  raw: ContentRequestDetail | FeedbackThreadDetail;
}

function toView(
  domain: 'content-request' | 'feedback',
  item: ContentRequestDetail | FeedbackThreadDetail,
  isMember: boolean,
): ThreadDetailView {
  if (domain === 'content-request') {
    const req = item as ContentRequestDetail;
    const typeLabels = isMember ? MEMBER_CONTENT_TYPE_LABELS : ADMIN_CONTENT_TYPE_LABELS;
    return {
      id: req.id,
      authorNpm: req.authorNpm,
      author: req.author,
      primaryBadge: typeLabels[req.contentType],
      title: req.title,
      description: req.description,
      status: req.status,
      image: req.image,
      teamName: req.metadata?.teamName,
      year: req.metadata?.year,
      externalUrl: req.metadata?.externalUrl,
      messageCount: req.messageCount,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      messages: req.messages,
      raw: req,
    };
  }

  const fb = item as FeedbackThreadDetail;
  const catLabels = isMember ? MEMBER_FEEDBACK_CATEGORY_LABELS : ADMIN_FEEDBACK_CATEGORY_LABELS;
  return {
    id: fb.id,
    authorNpm: fb.authorNpm,
    author: fb.author,
    primaryBadge: catLabels[fb.category],
    title: fb.title,
    description: fb.description,
    status: fb.status,
    image: fb.image,
    externalUrl: fb.externalUrl,
    messageCount: fb.messageCount,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
    messages: fb.messages,
    raw: fb,
  };
}

export type ThreadConversationDialogProps =
  | {
      domain: 'content-request';
      threadId: number | null;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mode: 'member' | 'admin';
      currentUserNpm: string;
      isAdmin: boolean;
      onEditThread: (item: ContentRequestSummary) => void;
      onThreadChanged: () => void;
    }
  | {
      domain: 'feedback';
      threadId: number | null;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mode: 'member' | 'admin';
      currentUserNpm: string;
      isAdmin: boolean;
      onEditThread: (item: FeedbackThreadSummary) => void;
      onThreadChanged: () => void;
    };

function ThreadConversationDialogInner(props: ThreadConversationDialogProps) {
  const {
    domain,
    threadId,
    open,
    onOpenChange,
    mode,
    currentUserNpm,
    isAdmin,
    onThreadChanged,
  } = props;

  const isMember = mode === 'member';
  const statusLabels = isMember ? MEMBER_STATUS_LABELS : ADMIN_STATUS_LABELS;
  const locale = isMember ? 'id-ID' : 'en-US';

  const [thread, setThread] = useState<ThreadDetailView | null>(null);
  const [loading, setLoading] = useState(Boolean(open && threadId !== null));
  const [error, setError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState('');
  const [replyImage, setReplyImage] = useState<ImageUploadValue>({ url: '' });
  const [showReplyImage, setShowReplyImage] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingMsgBody, setEditingMsgBody] = useState('');
  const [savingMsg, setSavingMsg] = useState(false);

  const [deletingMsg, setDeletingMsg] = useState<ThreadMessageView | null>(null);
  const [deletingThreadConfirm, setDeletingThreadConfirm] = useState(false);
  const [updatingThread, setUpdatingThread] = useState(false);

  useEffect(() => {
    if (!open || threadId === null) return;
    let active = true;

    const request =
      domain === 'content-request'
        ? contentRequestsApi.get(threadId).then((res) => toView('content-request', res.data, isMember))
        : feedbackApi.get(threadId).then((res) => toView('feedback', res.data, isMember));

    request
      .then((view) => {
        if (active) setThread(view);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : isMember
                ? 'Gagal memuat detail thread.'
                : 'Failed to load thread details.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, threadId, domain, isMember]);

  const handleStatusChange = async (nextStatus: RequestStatus) => {
    if (!thread) return;
    setUpdatingThread(true);
    try {
      const updated =
        domain === 'content-request'
          ? toView(
              'content-request',
              (await contentRequestsApi.update(thread.id, { status: nextStatus })).data,
              isMember,
            )
          : toView(
              'feedback',
              (await feedbackApi.update(thread.id, { status: nextStatus })).data,
              isMember,
            );
      setThread(updated);
      onThreadChanged();
      toast.success(isMember ? 'Status thread diperbarui' : 'Thread status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update thread status');
    } finally {
      setUpdatingThread(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    setUpdatingThread(true);
    try {
      if (domain === 'content-request') {
        await contentRequestsApi.remove(thread.id);
      } else {
        await feedbackApi.remove(thread.id);
      }
      setDeletingThreadConfirm(false);
      onOpenChange(false);
      onThreadChanged();
      toast.success(isMember ? 'Thread dihapus' : 'Thread deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete thread');
    } finally {
      setUpdatingThread(false);
    }
  };

  const handleSendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!thread || !replyBody.trim()) return;
    setSendingReply(true);
    try {
      const payload = {
        body: replyBody.trim(),
        image: replyImage.url.trim() ? replyImage : null,
      };
      const createdMsg: ThreadMessageView =
        domain === 'content-request'
          ? (await contentRequestsApi.createMessage(thread.id, payload)).data
          : (await feedbackApi.createMessage(thread.id, payload)).data;

      setThread((prev) =>
        prev
          ? {
              ...prev,
              messageCount: prev.messageCount + 1,
              messages: [...prev.messages, createdMsg],
            }
          : prev,
      );
      setReplyBody('');
      setReplyImage({ url: '' });
      setShowReplyImage(false);
      onThreadChanged();
      toast.success(isMember ? 'Balasan terkirim' : 'Reply sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveMessageEdit = async (messageId: number) => {
    if (!thread || !editingMsgBody.trim()) return;
    setSavingMsg(true);
    try {
      const payload = { body: editingMsgBody.trim() };
      const updatedMsg: ThreadMessageView =
        domain === 'content-request'
          ? (await contentRequestsApi.updateMessage(thread.id, messageId, payload)).data
          : (await feedbackApi.updateMessage(thread.id, messageId, payload)).data;

      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === messageId ? updatedMsg : m)),
            }
          : prev,
      );
      setEditingMsgId(null);
      onThreadChanged();
      toast.success(isMember ? 'Pesan diperbarui' : 'Message updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update message');
    } finally {
      setSavingMsg(false);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (!thread || !deletingMsg) return;
    const targetId = deletingMsg.id;
    setSavingMsg(true);
    try {
      if (domain === 'content-request') {
        await contentRequestsApi.removeMessage(thread.id, targetId);
      } else {
        await feedbackApi.removeMessage(thread.id, targetId);
      }
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messageCount: Math.max(0, prev.messageCount - 1),
              messages: prev.messages.filter((m) => m.id !== targetId),
            }
          : prev,
      );
      setDeletingMsg(null);
      onThreadChanged();
      toast.success(isMember ? 'Pesan dihapus' : 'Message deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete message');
    } finally {
      setSavingMsg(false);
    }
  };

  const triggerEditThread = () => {
    if (!thread) return;
    if (props.domain === 'content-request') {
      props.onEditThread(thread.raw as ContentRequestDetail);
    } else {
      props.onEditThread(thread.raw as FeedbackThreadDetail);
    }
  };

  const canReply =
    Boolean(thread) &&
    (isAdmin || thread!.status === 'open' || thread!.status === 'in_progress');
  const canAuthorModifyThread =
    Boolean(thread) && (isAdmin || thread!.authorNpm === currentUserNpm);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88dvh] flex-col gap-4 overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2 pr-6">
              {thread ? (
                <>
                  <Badge variant="outline" className="font-mono tabular-nums">
                    #{thread.id}
                  </Badge>
                  <Badge variant="secondary">{thread.primaryBadge}</Badge>
                  <Badge variant={statusBadgeVariant(thread.status)}>
                    {statusLabels[thread.status]}
                  </Badge>
                </>
              ) : null}
            </div>
            <DialogTitle className="text-base font-bold leading-snug sm:text-lg">
              {thread ? thread.title : isMember ? 'Memuat diskusi...' : 'Loading thread...'}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {thread ? (
                <>
                  <span>
                    {thread.author?.name ?? thread.authorNpm}{' '}
                    <span className="font-mono">({thread.authorNpm})</span>
                  </span>
                  <span>{formatEpochTimestamp(thread.createdAt, locale)}</span>
                </>
              ) : (
                <span>
                  {isMember
                    ? 'Thread privat antara kamu dan admin Zenith.'
                    : 'Private member thread.'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {isMember ? 'Memuat percakapan...' : 'Loading messages...'}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : thread ? (
              <>
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {thread.description}
                  </p>

                  {thread.teamName || thread.year || thread.externalUrl ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                      {thread.teamName ? (
                        <span>
                          {isMember ? 'Tim: ' : 'Team: '}
                          <strong className="text-foreground">{thread.teamName}</strong>
                        </span>
                      ) : null}
                      {thread.year ? (
                        <span>
                          {isMember ? 'Tahun: ' : 'Year: '}
                          <span className="font-mono tabular-nums text-foreground">
                            {thread.year}
                          </span>
                        </span>
                      ) : null}
                      {thread.externalUrl ? (
                        <a
                          href={thread.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" aria-hidden="true" />
                          <span>{isMember ? 'Lihat Referensi' : 'Reference Link'}</span>
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {thread.image?.url ? (
                    <div className="overflow-hidden rounded-lg border border-border bg-background">
                      <img
                        src={thread.image.url}
                        alt={thread.title}
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {canAuthorModifyThread ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={triggerEditThread}
                            disabled={updatingThread}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            <span>{isMember ? 'Ubah Thread' : 'Edit'}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingThreadConfirm(true)}
                            disabled={updatingThread}
                          >
                            <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                            <span>{isMember ? 'Hapus' : 'Delete'}</span>
                          </Button>
                        </>
                      ) : null}
                      {!isAdmin &&
                      (thread.status === 'open' || thread.status === 'in_progress') ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleStatusChange('closed')}
                          disabled={updatingThread}
                        >
                          <Lock className="size-3.5" aria-hidden="true" />
                          <span>{isMember ? 'Tutup Thread' : 'Close Thread'}</span>
                        </Button>
                      ) : null}
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Select
                          value={thread.status}
                          onValueChange={(value) => handleStatusChange(value as RequestStatus)}
                          disabled={updatingThread}
                        >
                          <SelectTrigger className="h-8 w-36" aria-label="Thread status">
                            <SelectValue>{statusLabels[thread.status]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">{statusLabels.open}</SelectItem>
                            <SelectItem value="in_progress">{statusLabels.in_progress}</SelectItem>
                            <SelectItem value="resolved">{statusLabels.resolved}</SelectItem>
                            <SelectItem value="closed">{statusLabels.closed}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {isMember
                      ? `Balasan (${thread.messages.length})`
                      : `Replies (${thread.messages.length})`}
                  </h3>

                  {thread.messages.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      {isMember
                        ? 'Belum ada balasan. Tulis pesan tambahan pada kolom balasan jika perlu.'
                        : 'No replies yet.'}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {thread.messages.map((msg) => {
                        const isMsgOwnerOrAdmin = isAdmin || msg.authorNpm === currentUserNpm;
                        const isEditingThis = editingMsgId === msg.id;

                        return (
                          <div
                            key={msg.id}
                            className={
                              msg.authorRole === 'admin'
                                ? 'space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5'
                                : 'space-y-2 rounded-xl border border-border bg-card p-3.5'
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {msg.author?.nama_panggilan ||
                                    msg.author?.name ||
                                    msg.authorNpm}
                                </span>
                                {msg.authorRole === 'admin' ? (
                                  <Badge variant="default" className="h-5 gap-1 px-1.5 text-[10px]">
                                    <ShieldCheck className="size-3" aria-hidden="true" />
                                    Admin
                                  </Badge>
                                ) : null}
                                <span className="text-[11px] text-muted-foreground">
                                  {formatEpochTimestamp(msg.createdAt, locale)}
                                </span>
                              </div>

                              {isMsgOwnerOrAdmin && !isEditingThis ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    aria-label={isMember ? 'Edit pesan' : 'Edit message'}
                                    onClick={() => {
                                      setEditingMsgId(msg.id);
                                      setEditingMsgBody(msg.body);
                                    }}
                                  >
                                    <Pencil className="size-3.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-destructive hover:text-destructive"
                                    aria-label={isMember ? 'Hapus pesan' : 'Delete message'}
                                    onClick={() => setDeletingMsg(msg)}
                                  >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {isEditingThis ? (
                              <div className="space-y-2">
                                <Textarea
                                  rows={2}
                                  value={editingMsgBody}
                                  onChange={(e) => setEditingMsgBody(e.target.value)}
                                  aria-label={isMember ? 'Isi pesan' : 'Message body'}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingMsgId(null)}
                                    disabled={savingMsg}
                                  >
                                    <X className="size-3.5" aria-hidden="true" />
                                    {isMember ? 'Batal' : 'Cancel'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveMessageEdit(msg.id)}
                                    disabled={savingMsg || !editingMsgBody.trim()}
                                  >
                                    {savingMsg ? (
                                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                                    ) : (
                                      <Check className="size-3.5" aria-hidden="true" />
                                    )}
                                    {isMember ? 'Simpan' : 'Save'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground sm:text-sm">
                                  {msg.body}
                                </p>
                                {msg.image?.url ? (
                                  <div className="overflow-hidden rounded-lg border border-border bg-background">
                                    <img
                                      src={msg.image.url}
                                      alt="Message attachment"
                                      className="max-h-52 w-full object-contain"
                                    />
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {thread ? (
            <div className="shrink-0 border-t border-border pt-3">
              {canReply ? (
                <form onSubmit={handleSendReply} className="space-y-3">
                  {showReplyImage ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {isMember ? 'Lampirkan Gambar' : 'Attach Image'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowReplyImage(false);
                            setReplyImage({ url: '' });
                          }}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          {isMember ? 'Tutup' : 'Close'}
                        </Button>
                      </div>
                      <ImageUploadEditor
                        endpoint="/upload/request"
                        defaultAspect="16:9"
                        value={replyImage}
                        onChange={(next) => setReplyImage(next)}
                      />
                    </div>
                  ) : null}

                  <Textarea
                    rows={2}
                    placeholder={
                      isMember ? 'Tulis balasan untuk admin...' : 'Write a reply to the member...'
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    aria-label={isMember ? 'Tulis balasan' : 'Write a reply'}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReplyImage((v) => !v)}
                    >
                      <ImagePlus className="size-3.5" aria-hidden="true" />
                      <span>{isMember ? 'Lampirkan Foto' : 'Attach Image'}</span>
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendingReply || !replyBody.trim()}
                    >
                      {sendingReply ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{isMember ? 'Kirim Balasan' : 'Send Reply'}</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  {isMember
                    ? 'Thread ini sudah selesai atau ditutup. Kamu tetap bisa mengubah atau menghapus pesanmu.'
                    : 'Thread is closed.'}
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingThreadConfirm}
        onOpenChange={setDeletingThreadConfirm}
        title={isMember ? 'Hapus Thread Ini?' : 'Delete thread?'}
        description={
          isMember
            ? 'Semua pesan dan lampiran di thread ini akan dihapus permanen.'
            : 'All messages in this thread will be permanently deleted.'
        }
        confirmLabel={isMember ? 'Hapus' : 'Delete'}
        pending={updatingThread}
        onConfirm={handleDeleteThread}
      />

      <ConfirmDialog
        open={Boolean(deletingMsg)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingMsg(null);
        }}
        title={isMember ? 'Hapus Pesan?' : 'Delete message?'}
        description={
          isMember
            ? 'Pesan yang dihapus tidak bisa dikembalikan.'
            : 'This message will be permanently deleted.'
        }
        confirmLabel={isMember ? 'Hapus' : 'Delete'}
        pending={savingMsg}
        onConfirm={handleConfirmDeleteMessage}
      />
    </>
  );
}

export function ThreadConversationDialog(props: ThreadConversationDialogProps) {
  const dialogKey = `${props.open ? 'open' : 'closed'}-${props.domain}-${props.threadId ?? 'none'}`;
  return <ThreadConversationDialogInner key={dialogKey} {...props} />;
}
