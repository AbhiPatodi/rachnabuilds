import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://rachnabuilds.com'

  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  })

  const staticRoutes = [
    { route: '',                    priority: 1.0, freq: 'weekly'  },
    { route: '/blog',               priority: 0.8, freq: 'weekly'  },
    { route: '/contact',            priority: 0.7, freq: 'monthly' },
    { route: '/free-audit',         priority: 0.9, freq: 'monthly' },
    { route: '/tools',              priority: 0.9, freq: 'monthly' },
    { route: '/tools/cro-checklist',priority: 0.8, freq: 'monthly' },
    { route: '/tools/pagespeed',    priority: 0.8, freq: 'monthly' },
  ].map(({ route, priority, freq }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: freq as 'weekly' | 'monthly',
    priority,
  }))

  const blogRoutes = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...blogRoutes]
}
