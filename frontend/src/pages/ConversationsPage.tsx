import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, queryKeys } from "../services/api";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useAuth } from "../contexts/AuthContext";
import type { Conversation, Member, Message } from "../types";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusPill } from "./OverviewPage";

const conversationSchema = z.object({ subject: z.string().trim().min(2), customerName: z.string().trim().min(1), customerEmail: z.string().email() });
type ConversationForm = z.infer<typeof conversationSchema>;

export function ConversationsPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations(organizationId!),
    queryFn: () => api<{ conversations: Conversation[] }>(`/organizations/${organizationId}/conversations`)
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(organizationId!),
    queryFn: () => api<{ members: Member[] }>(`/organizations/${organizationId}/members`)
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConversationForm>({
    resolver: zodResolver(conversationSchema),
    defaultValues: { subject: "", customerName: "", customerEmail: "" }
  });
  const create = useMutation({
    mutationFn: (values: ConversationForm) => api<{ conversation: Conversation }>(`/organizations/${organizationId}/conversations`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async ({ conversation }) => { reset(); setSelectedId(conversation._id); await queryClient.invalidateQueries({ queryKey: queryKeys.conversations(organizationId!) }); }
  });
  if (conversationsQuery.isLoading) return <LoadingState />;
  if (conversationsQuery.isError) return <ErrorState message={conversationsQuery.error.message} retry={() => void conversationsQuery.refetch()} />;
  const conversations = conversationsQuery.data?.conversations ?? [];
  const selected = conversations.find((conversation) => conversation._id === selectedId) ?? conversations[0];

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-teal-700">CUSTOMER MESSAGES</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Conversations</h1><p className="mt-2 text-sm text-muted">Live, organization-scoped threads for your support team.</p></div>
    <div className="grid min-h-[580px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-slate-100 lg:border-b-0 lg:border-r">{["Owner", "Admin", "Manager", "Member"].includes(membersQuery.data?.members.find((member) => member.userId === user?.uid)?.role ?? "") && <form className="space-y-2 border-b border-slate-100 p-4" onSubmit={handleSubmit((values) => create.mutate(values))}><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Start a conversation</p><input className="field" placeholder="Subject" {...register("subject")} /><input className="field" placeholder="Customer name" {...register("customerName")} /><input className="field" type="email" placeholder="Customer email" {...register("customerEmail")} />{Object.values(errors)[0]?.message && <p className="text-[11px] text-rose-600">{Object.values(errors)[0]?.message}</p>}{create.isError && <p className="text-[11px] text-rose-600">{create.error.message}</p>}<button className="w-full rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Create conversation</button></form>}
        <div className="max-h-[440px] overflow-y-auto">{conversations.map((conversation) => <button key={conversation._id} onClick={() => setSelectedId(conversation._id)} className={`w-full border-b border-slate-100 px-4 py-4 text-left transition ${selected?._id === conversation._id ? "bg-teal-50/70" : "hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{conversation.subject}</p><StatusPill status={conversation.status} /></div><p className="mt-1 text-xs text-muted">{conversation.customerName}</p></button>)}</div>
      </aside>
      {selected ? <ConversationThread organizationId={organizationId!} conversation={selected} currentUserId={user?.uid ?? ""} /> : <div className="grid place-items-center p-8"><EmptyState title="No conversations yet" message="Create a conversation to start supporting a customer." /></div>}
    </div>
  </div>;
}

function ConversationThread({ organizationId, conversation, currentUserId }: { organizationId: string; conversation: Conversation; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const messageQuery = useQuery({
    queryKey: ["messages", organizationId, conversation._id],
    queryFn: () => api<{ messages: Message[] }>(`/organizations/${organizationId}/conversations/${conversation._id}/messages`)
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(organizationId),
    queryFn: () => api<{ members: Member[] }>(`/organizations/${organizationId}/members`)
  });
  const send = useMutation({
    mutationFn: () => api<{ message: Message }>(`/organizations/${organizationId}/conversations/${conversation._id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: async () => { setBody(""); await queryClient.invalidateQueries({ queryKey: ["messages", organizationId, conversation._id] }); }
  });
  const update = useMutation({
    mutationFn: (values: { status?: string; assigneeId?: string | null }) =>
      api(`/organizations/${organizationId}/conversations/${conversation._id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.conversations(organizationId) }); }
  });
  const currentRole = membersQuery.data?.members.find((member) => member.userId === currentUserId)?.role;
  const canReply = currentRole === "Owner" || currentRole === "Admin" || currentRole === "Manager" ||
    currentRole === "Member" && (conversation.creatorId === currentUserId || conversation.assigneeId === currentUserId);
  return <section className="flex min-h-[580px] flex-col"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><p className="font-semibold">{conversation.subject}</p><p className="mt-1 text-xs text-muted">{conversation.customerName} · {conversation.customerEmail}</p></div><div className="flex gap-2">{currentRole === "Viewer" ? <StatusPill status={conversation.status} /> : <select aria-label="Conversation status" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" value={conversation.status} onChange={(event) => update.mutate({ status: event.target.value })}>{["Open", "In Progress", "Resolved", "Closed"].map((status) => <option key={status}>{status}</option>)}</select>}{["Owner", "Admin", "Manager"].includes(currentRole ?? "") && <select aria-label="Assign conversation" className="max-w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs" value={conversation.assigneeId ?? ""} onChange={(event) => update.mutate({ assigneeId: event.target.value || null })}><option value="">Unassigned</option>{membersQuery.data?.members.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.email || member.userId}</option>)}</select>}</div></header>{update.isError && <p role="alert" className="px-5 py-2 text-xs text-rose-600">{update.error.message}</p>}
    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-5">{messageQuery.isLoading ? <LoadingState label="Loading messages…" /> : messageQuery.isError ? <ErrorState message={messageQuery.error.message} retry={() => void messageQuery.refetch()} /> : messageQuery.data?.messages.length ? messageQuery.data.messages.map((message) => <div key={message._id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${message.senderId === currentUserId ? "ml-auto bg-teal-600 text-white" : "bg-white text-ink shadow-sm"}`}><p className="whitespace-pre-wrap">{message.body}</p><p className={`mt-2 text-[10px] ${message.senderId === currentUserId ? "text-teal-100" : "text-muted"}`}>{message.senderId === currentUserId ? "You" : message.senderId} · {new Date(message.createdAt).toLocaleString()}</p></div>) : <div className="grid h-full place-items-center"><div className="text-center text-muted"><MessageCircle className="mx-auto mb-3" size={25} /><p className="text-sm">No messages yet. Say hello.</p></div></div>}</div>
    {canReply ? <form className="flex gap-2 border-t border-slate-100 p-4" onSubmit={(event) => { event.preventDefault(); if (body.trim()) send.mutate(); }}><input className="field" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply…" maxLength={5000} /><button disabled={!body.trim() || send.isPending} className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-teal-600 text-white disabled:opacity-50" title="Send message"><Send size={16} /></button></form> : <p className="border-t border-slate-100 p-4 text-xs text-muted">You have read-only access to this conversation.</p>}{send.isError && <p className="px-4 pb-3 text-xs text-rose-600">{send.error.message}</p>}
  </section>;
}
