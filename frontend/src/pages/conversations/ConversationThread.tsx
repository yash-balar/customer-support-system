import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import type { Conversation } from "../../types";
import { ErrorState, LoadingState } from "../../components/States";
import { StatusPill } from "../../components/common/StatusPill";
import { hasPermission, PERMISSIONS } from "../../constants/authorization";
import {
  useConversationMessages,
  useCreateConversationMessage,
  useUpdateConversation,
} from "../../api/conversations/hook";
import { useMembers } from "../../api/team/hook";

export function ConversationThread({ organizationId, conversation, currentUserId }: { organizationId: string; conversation: Conversation; currentUserId: string }) {
  const [body, setBody] = useState("");
  const messageQuery = useConversationMessages(organizationId, conversation._id);
  const membersQuery = useMembers(organizationId);
  const send = useCreateConversationMessage(organizationId, conversation._id);
  const update = useUpdateConversation(organizationId, conversation._id);
  const currentRole = membersQuery.data?.members.find((member) => member.userId === currentUserId)?.role;
  const canReply = hasPermission(currentRole, PERMISSIONS.REPLY_TO_ANY_CONVERSATION) ||
    (hasPermission(currentRole, PERMISSIONS.REPLY_TO_OWN_CONVERSATION) &&
      (conversation.creatorId === currentUserId || conversation.assigneeId === currentUserId));
  return <section className="flex min-h-[580px] flex-col"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><p className="font-semibold">{conversation.subject}</p><p className="mt-1 text-xs text-muted">{conversation.customerName} · {conversation.customerEmail}</p></div><div className="flex gap-2">{!hasPermission(currentRole, PERMISSIONS.UPDATE_CONVERSATION) ? <StatusPill status={conversation.status} /> : <select aria-label="Conversation status" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" value={conversation.status} onChange={(event) => update.mutate({ status: event.target.value })}>{["Open", "In Progress", "Resolved", "Closed"].map((status) => <option key={status}>{status}</option>)}</select>}{hasPermission(currentRole, PERMISSIONS.ASSIGN_CONVERSATION) && <select aria-label="Assign conversation" className="max-w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs" value={conversation.assigneeId ?? ""} onChange={(event) => update.mutate({ assigneeId: event.target.value || null })}><option value="">Unassigned</option>{membersQuery.data?.members.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.email || member.userId}</option>)}</select>}</div></header>{update.isError && <p role="alert" className="px-5 py-2 text-xs text-rose-600">{update.error.message}</p>}
    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-5">{messageQuery.isLoading ? <LoadingState label="Loading messages…" /> : messageQuery.isError ? <ErrorState message={messageQuery.error.message} retry={() => void messageQuery.refetch()} /> : messageQuery.data?.messages.length ? messageQuery.data.messages.map((message) => <div key={message._id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.senderId === currentUserId ? "ml-auto bg-teal-600 text-white" : "bg-white text-ink shadow-sm"}`}><p className="whitespace-pre-wrap">{message.body}</p><p className={`mt-2 text-[10px] ${message.senderId === currentUserId ? "text-teal-100" : "text-muted"}`}>{message.senderId === currentUserId ? "You" : message.senderId} · {new Date(message.createdAt).toLocaleString()}</p></div>) : <div className="grid h-full place-items-center"><div className="text-center text-muted"><MessageCircle className="mx-auto mb-3" size={25} /><p className="text-sm">No messages yet. Say hello.</p></div></div>}</div>
    {canReply ? <form className="flex gap-2 border-t border-slate-100 p-4" onSubmit={(event) => { event.preventDefault(); if (body.trim()) send.mutate(body, { onSuccess: () => setBody("") }); }}><input className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply…" maxLength={5000} /><button disabled={!body.trim() || send.isPending} className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-teal-600 text-white disabled:opacity-50" title="Send message"><Send size={16} /></button></form> : <p className="border-t border-slate-100 p-4 text-xs text-muted">You have read-only access to this conversation.</p>}{send.isError && <p className="px-4 pb-3 text-xs text-rose-600">{send.error.message}</p>}
  </section>;
}
