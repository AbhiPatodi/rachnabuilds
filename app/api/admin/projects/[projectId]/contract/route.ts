// GET    — fetch contract (creates draft if none)
// PATCH  — update content or status
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

const DEFAULT_TEMPLATE = `# Service Agreement

**Prepared by:** Rachna Jain — Rachna Builds
**Client:** {CLIENT_NAME}
**Project:** {PROJECT_NAME}
**Date:** {DATE}

---

## 1. Scope of Work

[Describe exactly what will be delivered — design, development, pages, features, integrations]

## 2. Deliverables

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## 3. Timeline

| Milestone | Due Date |
|-----------|----------|
| Kickoff   |          |
| Design Review |      |
| Development |        |
| Launch    |          |

## 4. Investment

**Total Fee:** ₹ ____
**Payment Schedule:**
- 50% upfront: ₹ ____
- 50% on delivery: ₹ ____

## 5. Revisions

Includes up to ___ rounds of revisions. Additional revisions billed at ₹ ____/hour.

## 6. Client Responsibilities

The client agrees to provide timely feedback, content, and access to required platforms within 5 business days of each request.

## 7. Intellectual Property

Upon receipt of full payment, all rights to the final deliverables transfer to the client.

## 8. Confidentiality

Both parties agree to keep all project details, pricing, and communications confidential.

## 9. Governing Law

This agreement is governed by Indian law.

---

By signing below, both parties agree to the terms outlined in this agreement.`;

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  let contract = await prisma.projectContract.findUnique({ where: { projectId } });
  if (!contract) {
    // Auto-create the draft with project/client info for template
    const project = await prisma.clientProject.findUnique({
      where: { id: projectId },
      include: { client: true },
    });
    const content = DEFAULT_TEMPLATE
      .replace('{CLIENT_NAME}', project?.client?.name ?? '')
      .replace('{PROJECT_NAME}', project?.name ?? '')
      .replace('{DATE}', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    contract = await prisma.projectContract.create({
      data: { projectId, content },
    });
  }
  return NextResponse.json(contract);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  const body = await req.json();
  const { content, status } = body;

  const data: Record<string, unknown> = {};
  if (content !== undefined) data.content = content;
  if (status !== undefined) {
    data.status = status;
    if (status === 'sent') data.sentAt = new Date();
  }

  const contract = await prisma.projectContract.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
  return NextResponse.json(contract);
}
