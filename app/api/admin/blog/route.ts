import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      publishedAt: true,
      tags: true,
      createdAt: true,
    },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, slug, excerpt, content, coverImage, tags, isPublished } = body;

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug, and content are required' }, { status: 400 });
  }

  try {
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        coverImage: coverImage || null,
        tags: Array.isArray(tags) ? tags : [],
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
