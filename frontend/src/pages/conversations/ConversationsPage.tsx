import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { StatusPill } from "../../components/common/StatusPill";
import { ConversationThread } from "./ConversationThread";
import { hasPermission, PERMISSIONS } from "../../constants/authorization";
import { useConversations, useCreateConversation } from "../../api/conversations/hook";
import { useMembers } from "../../api/team/hook";

const conversationSchema = z.object({ subject: z.string().trim().min(2), customerName: z.string().trim().min(1), customerEmail: z.string().email() });
type ConversationForm = z.infer<typeof conversationSchema>;

export function ConversationsPage() {
  const { organizationId } = useWorkspace();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversationsQuery = useConversations(organizationId!);
  const membersQuery = useMembers(organizationId!);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConversationForm>({
    resolver: zodResolver(conversationSchema),
    defaultValues: { subject: "", customerName: "", customerEmail: "" }
  });
  const create = useCreateConversation(organizationId!);
  if (conversationsQuery.isLoading) return <LoadingState />;
  if (conversationsQuery.isError) return <ErrorState message={conversationsQuery.error.message} retry={() => void conversationsQuery.refetch()} />;
  const conversations = conversationsQuery.data?.conversations ?? [];
  const selected = conversations.find((conversation) => conversation._id === selectedId) ?? conversations[0];

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-teal-700">CUSTOMER MESSAGES</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Conversations</h1><p className="mt-2 text-sm text-muted">Live, organization-scoped threads for your support team.</p></div>
    <div className="grid min-h-[580px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-slate-100 lg:border-b-0 lg:border-r">{hasPermission(membersQuery.data?.members.find((member) => member.userId === user?.uid)?.role, PERMISSIONS.CREATE_CONVERSATION) && <form className="space-y-2 border-b border-slate-100 p-4" onSubmit={handleSubmit((values) => create.mutate(values, { onSuccess: ({ conversation }) => { reset(); setSelectedId(conversation._id); } }))}><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Start a conversation</p><input className="field" placeholder="Subject" {...register("subject")} /><input className="field" placeholder="Customer name" {...register("customerName")} /><input className="field" type="email" placeholder="Customer email" {...register("customerEmail")} />{Object.values(errors)[0]?.message && <p className="text-[11px] text-rose-600">{Object.values(errors)[0]?.message}</p>}{create.isError && <p className="text-[11px] text-rose-600">{create.error.message}</p>}<button className="w-full rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Create conversation</button></form>}
        <div className="max-h-[440px] overflow-y-auto">{conversations.map((conversation) => <button key={conversation._id} onClick={() => setSelectedId(conversation._id)} className={`w-full border-b border-slate-100 px-4 py-4 text-left transition ${selected?._id === conversation._id ? "bg-teal-50/70" : "hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{conversation.subject}</p><StatusPill status={conversation.status} /></div><p className="mt-1 text-xs text-muted">{conversation.customerName}</p></button>)}</div>
      </aside>
      {selected ? <ConversationThread organizationId={organizationId!} conversation={selected} currentUserId={user?.uid ?? ""} /> : <div className="grid place-items-center p-8"><EmptyState title="No conversations yet" message="Create a conversation to start supporting a customer." /></div>}
    </div>
  </div>;
}
