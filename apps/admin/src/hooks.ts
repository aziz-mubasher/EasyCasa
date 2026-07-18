import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  AdminCatalogItem,
  Assignment,
  Candidate,
  CredentialType,
  KycCase,
  Lease,
  LegalBasis,
  Professional,
  RequiredCredential,
} from '@easycasa/api-client';

import { useApi } from './api';

export function useOpenAssignments(): UseQueryResult<Assignment[]> {
  const api = useApi();
  return useQuery({ queryKey: ['assignments'], queryFn: () => api.listOpenAssignments() });
}

export function useCandidates(assignmentId: string | null): UseQueryResult<Candidate[]> {
  const api = useApi();
  return useQuery({
    queryKey: ['candidates', assignmentId],
    queryFn: () => api.candidates(assignmentId as string),
    enabled: assignmentId !== null,
  });
}

export function useProfessionals(): UseQueryResult<Professional[]> {
  const api = useApi();
  return useQuery({ queryKey: ['professionals'], queryFn: () => api.listProfessionals() });
}

export function useCatalog(): UseQueryResult<AdminCatalogItem[]> {
  const api = useApi();
  return useQuery({ queryKey: ['catalog'], queryFn: () => api.listCatalog() });
}

export function useKycCases(): UseQueryResult<KycCase[]> {
  const api = useApi();
  return useQuery({ queryKey: ['kyc'], queryFn: () => api.listKycCases() });
}

export function useLeases(): UseQueryResult<Lease[]> {
  const api = useApi();
  return useQuery({ queryKey: ['leases'], queryFn: () => api.listLeases() });
}

/* Mutations ------------------------------------------------------------ */

export function useAssign() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, professionalId }: { assignmentId: string; professionalId: string }) =>
      api.assign(assignmentId, professionalId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assignments'] });
      void qc.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}

export function useApprove() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api.approve(assignmentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useVerifyCredential() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { professionalId: string; type: CredentialType; status: 'VERIFIED' | 'REJECTED' }) =>
      api.verifyCredential(v.professionalId, { type: v.type, status: v.status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['professionals'] }),
  });
}

export function useSetLegalBasis() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { code: string; legalBasis: LegalBasis }) => api.setLegalBasis(v.code, v.legalBasis),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useSetRequiredCredential() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { code: string; requiredCredential: RequiredCredential }) =>
      api.setRequiredCredential(v.code, v.requiredCredential),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

export function useAdvanceKyc() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; event: 'VERIFY' | 'ESCALATE' | 'CLEAR' | 'REOPEN' }) =>
      api.advanceKyc(v.id, v.event),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['kyc'] }),
  });
}
