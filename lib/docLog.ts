// Shared helper to log document activity
import { prisma } from '@/lib/prisma';

export type DocAction = 'added' | 'url_changed' | 'note_edited' | 'deleted';
export type ActorType = 'admin' | 'client';

export async function logDocAction({
  projectId,
  documentId,
  action,
  actorType,
  docTitle,
  meta,
}: {
  projectId: string;
  documentId: string;
  action: DocAction;
  actorType: ActorType;
  docTitle?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.projectDocumentLog.create({
      data: { projectId, documentId, action, actorType, docTitle: docTitle ?? null, meta: meta ?? undefined },
    });
  } catch {
    // non-critical — never let logging break the main flow
  }
}
