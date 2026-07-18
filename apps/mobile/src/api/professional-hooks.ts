import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ProAssignment, ProCredential, ProProfile } from '@easycasa/api-client';

import { useProApi } from './professional';

const keys = {
  profile: () => ['pro', 'profile'] as const,
  assignments: () => ['pro', 'assignments'] as const,
};

export function useMyProfile(): UseQueryResult<ProProfile> {
  const api = useProApi();
  return useQuery({ queryKey: keys.profile(), queryFn: () => api.getMyProfile() });
}

export function useMyAssignments(): UseQueryResult<ProAssignment[]> {
  const api = useProApi();
  return useQuery({ queryKey: keys.assignments(), queryFn: () => api.getMyAssignments() });
}

export function useStart() {
  const api = useProApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api.start(assignmentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.assignments() }),
  });
}

export function useDeliver() {
  const api = useProApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { assignmentId: string; deliverableUrl: string }) =>
      api.deliver(v.assignmentId, v.deliverableUrl),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.assignments() }),
  });
}

export function useSubmitCredential(professionalId: string) {
  const api = useProApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: ProCredential['type']; reference?: string; expiresAt?: string }) =>
      api.submitCredential(professionalId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.profile() }),
  });
}
