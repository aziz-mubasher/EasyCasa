import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Table } from '../components/ui';

const RowSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  province: z.string(),
  credentials: z.string().nullable().optional(),
  contact: z.string(),
  active: z.boolean(),
});

const CATEGORIES = [
  'notaio',
  'geometra',
  'ape_certifier',
  'photographer',
  'virtual_tour',
] as const;

const EMPTY_FORM = {
  category: 'notaio',
  name: '',
  province: '',
  credentials: '',
  contact: '',
  active: true,
};

export function PartnerDirectoryAdmin() {
  const api = useApi();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = useQuery({
    queryKey: ['partner-directory'],
    queryFn: async () =>
      z.array(RowSchema).parse(await api.listPartnerDirectory()),
  });

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  const create = useMutation({
    mutationFn: () => api.createPartnerDirectory(form),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ['partner-directory'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const update = useMutation({
    mutationFn: (id: string) => api.updatePartnerDirectory(id, form),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ['partner-directory'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePartnerDirectory(id),
    onSuccess: () => {
      if (editingId) resetForm();
      void qc.invalidateQueries({ queryKey: ['partner-directory'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (list.isLoading) return <p className="muted">Loading partner directory…</p>;
  if (list.isError) {
    return <p className="error">Failed to load (partner_directory capability).</p>;
  }

  const rows = list.data ?? [];

  return (
    <section>
      <h1>Partner directory</h1>
      <p className="muted">
        Neutral informational list (T28/T29). Label every public surface: «Elenco
        informativo — nessuna commissione». No fees, no conversion tracking. Monetised
        variants wait for G3 row 9.
      </p>
      {err ? <p className="error">{err}</p> : null}

      <form
        className="stack"
        style={{ marginBottom: 24, maxWidth: 480 }}
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          if (editingId) update.mutate(editingId);
          else create.mutate();
        }}
      >
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Province
          <input
            value={form.province}
            onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
            required
          />
        </label>
        <label>
          Credentials
          <input
            value={form.credentials}
            onChange={(e) => setForm((f) => ({ ...f, credentials: e.target.value }))}
          />
        </label>
        <label>
          Contact (no UTM / referral params)
          <input
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            required
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />{' '}
          Active
        </label>
        <div className="stack stack--row">
          <button
            type="submit"
            className="btn"
            disabled={create.isPending || update.isPending}
          >
            {editingId ? 'Save changes' : 'Add'}
          </button>
          {editingId ? (
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <Table
        columns={['Name', 'Category', 'Province', 'Contact', 'Active', '']}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>{r.category}</td>
            <td>{r.province}</td>
            <td className="mono">{r.contact}</td>
            <td>{r.active ? 'yes' : 'no'}</td>
            <td>
              <div className="stack stack--row">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setErr(null);
                    setEditingId(r.id);
                    setForm({
                      category: r.category,
                      name: r.name,
                      province: r.province,
                      credentials: r.credentials ?? '',
                      contact: r.contact,
                      active: r.active,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(r.id)}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
