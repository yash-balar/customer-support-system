import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import type { TicketFormValues } from "../../pages/ticket/shared";
import { ticketsService } from "./service";

export function useTickets(organizationId: string, filters: string) {
  return useQuery({
    queryKey: queryKeys.tickets(organizationId, filters),
    queryFn: () => ticketsService.list(organizationId, filters),
  });
}

export function useTicket(organizationId: string, ticketId: string) {
  return useQuery({
    queryKey: queryKeys.ticket(organizationId, ticketId),
    queryFn: () => ticketsService.get(organizationId, ticketId),
  });
}

export function useCreateTicket(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TicketFormValues) =>
      ticketsService.create(organizationId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] }),
  });
}

export function useUpdateTicket(organizationId: string, ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<TicketFormValues>) =>
      ticketsService.update(organizationId, ticketId, values),
    onSuccess: async ({ ticket }) => {
      queryClient.setQueryData(queryKeys.ticket(organizationId, ticketId), {
        ticket,
      });
      await queryClient.invalidateQueries({
        queryKey: ["tickets", organizationId],
      });
    },
  });
}

export function useDeleteTicket(organizationId: string, ticketId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketIdOverride?: string) => {
      const resolvedTicketId = ticketIdOverride ?? ticketId;
      if (!resolvedTicketId) throw new Error("A ticket ID is required.");
      return ticketsService.remove(organizationId, resolvedTicketId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tickets", organizationId] }),
  });
}
