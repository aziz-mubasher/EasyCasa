import { isCrmMarketing, type CrmRole } from '@easycasa/shared';

import type {
  CrmActivity,
  CrmContact,
  CrmContact360,
  CrmTask,
} from './domain/ports';

/** Column-level redaction for crm-marketing (no phone, no free-text notes). */
export function serializeContact(contact: CrmContact, roles: readonly CrmRole[]): CrmContact {
  if (!isCrmMarketing(roles)) return contact;
  return {
    ...contact,
    phone: null,
    notesSummary: null,
  };
}

export function serializeActivity(activity: CrmActivity, roles: readonly CrmRole[]): CrmActivity {
  if (!isCrmMarketing(roles)) return activity;
  if (activity.type === 'note' || activity.type === 'call' || activity.type === 'email') {
    return { ...activity, body: '[redacted]' };
  }
  return activity;
}

export function serializeTask(task: CrmTask, roles: readonly CrmRole[]): CrmTask {
  void roles;
  return task;
}

export function serializeContact360(bundle: CrmContact360, roles: readonly CrmRole[]): CrmContact360 {
  return {
    ...bundle,
    contact: serializeContact(bundle.contact, roles),
    recentActivities: bundle.recentActivities.map((a) => serializeActivity(a, roles)),
    openTasks: bundle.openTasks.map((t) => serializeTask(t, roles)),
  };
}
