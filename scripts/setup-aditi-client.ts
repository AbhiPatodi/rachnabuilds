/**
 * One-time setup script: Create Aditi (Savoury Protein Spreads) client + project + prototype
 * Run: npx tsx scripts/setup-aditi-client.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Load env manually
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
for (const line of envLocal.split('\n')) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const prisma = new PrismaClient();

const CLIENT_SLUG   = 'aditi-protein-2026';
const CLIENT_PASS   = 'aditi2026';
const PROJECT_ID    = 'cp_aditi_p1';
const CLIENT_ID     = 'cl_aditi2026';
const ZIP_PATH      = '/Users/abhipatodi/Downloads/savoury-protein-prototype.zip';

async function main() {
  console.log('🚀 Setting up Aditi client portal...\n');

  // ── 1. Create client ────────────────────────────────────────────────────────
  const existingClient = await prisma.client.findFirst({ where: { slug: CLIENT_SLUG } });
  let clientId: string;

  if (existingClient) {
    console.log(`⚠️  Client with slug "${CLIENT_SLUG}" already exists — using it`);
    clientId = existingClient.id;
  } else {
    const passwordHash = await bcrypt.hash(CLIENT_PASS, 10);
    const client = await prisma.client.create({
      data: {
        id: CLIENT_ID,
        name: 'Aditi',
        email: null,
        phone: '+91 70565 76076',
        slug: CLIENT_SLUG,
        passwordHash,
        isActive: true,
        clientProfile: { portalPassword: CLIENT_PASS },
      },
    });
    clientId = client.id;
    console.log(`✅ Client created: ${client.name} (${client.slug}) — id: ${client.id}`);
  }

  // ── 2. Create project ───────────────────────────────────────────────────────
  const existingProject = await prisma.clientProject.findFirst({ where: { id: PROJECT_ID } });
  let projectId: string;

  if (existingProject) {
    console.log(`⚠️  Project already exists — using id: ${existingProject.id}`);
    projectId = existingProject.id;
  } else {
    const project = await prisma.clientProject.create({
      data: {
        id: PROJECT_ID,
        clientId,
        name: 'Savoury Protein Spreads — Shopify Store',
        clientType: 'new_build',
        platform: 'shopify',
        status: 'active',
        displayOrder: 0,
      },
    });
    projectId = project.id;
    console.log(`✅ Project created: ${project.name} — id: ${project.id}`);

    // ── 3. Create sections ────────────────────────────────────────────────────
    await prisma.projectSection.createMany({
      data: [
        {
          id: crypto.randomBytes(12).toString('hex'),
          projectId,
          sectionType: 'proposal',
          title: 'Project Proposal',
          content: { items: [] },
          displayOrder: 0,
        },
        {
          id: crypto.randomBytes(12).toString('hex'),
          projectId,
          sectionType: 'project_status',
          title: 'Project Status',
          content: { items: [] },
          displayOrder: 1,
        },
      ],
    });
    console.log('✅ Sections created: Proposal, Project Status');

    // ── 4. Create document checklist (Shopify new build template) ─────────────
    const docs = [
      { title: 'Logo Files',               notes: 'SVG or high-resolution PNG with transparent background' },
      { title: 'Brand Colours',             notes: 'Exact hex colour codes for your brand palette' },
      { title: 'Brand Fonts',               notes: 'Font names or files if you have a specific typeface in mind' },
      { title: 'Product Photography',       notes: 'Min 3 photos per flavour — lifestyle shot, white background, ingredient close-up' },
      { title: 'Brand Story / About Text',  notes: 'A short paragraph about your brand — who you are and why you started this' },
      { title: 'Flavour Details',           notes: '4 flavour names · Protein per serve · Calories per serve · Ingredient list per flavour · Price per jar' },
      { title: 'Shipping & Returns Policy', notes: 'Your policy text — we will format and upload it' },
      { title: 'Instagram Handle',          notes: 'So we can embed your feed on the homepage' },
      { title: 'Founder Photo',             notes: '1 clear photo of you for the Our Story / Founder section' },
    ];
    await prisma.projectDocument.createMany({
      data: docs.map(d => ({
        id: crypto.randomBytes(12).toString('hex'),
        projectId,
        docType: 'client_required',
        title: d.title,
        url: '',
        notes: d.notes,
      })),
    });
    console.log(`✅ ${docs.length} document checklist items created`);
  }

  // ── 5. Upload prototype to Vercel Blob ─────────────────────────────────────
  console.log('\n📦 Uploading prototype to Vercel Blob...');

  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const zip = await JSZip.loadAsync(zipBuffer);

  const entries = Object.keys(zip.files);
  let prefix = '';
  const firstDir = entries.find(e => zip.files[e].dir);
  if (firstDir && entries.every(e => e === firstDir || e.startsWith(firstDir))) {
    prefix = firstDir;
  }

  const MIME: Record<string, string> = {
    html: 'text/html; charset=utf-8', css: 'text/css', js: 'application/javascript',
    json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
  };
  const getMime = (f: string) => MIME[f.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

  let fileCount = 0;
  let entryFile = 'index.html';
  const uploadedFiles: string[] = [];

  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const relativePath = prefix ? zipPath.slice(prefix.length) : zipPath;
    if (!relativePath) continue;

    const content = await zipEntry.async('nodebuffer');
    const blobPath = `prototypes/${projectId}/${relativePath}`;

    await put(blobPath, content, {
      access: 'public',
      contentType: getMime(relativePath),
      addRandomSuffix: false,
      allowOverwrite: true,
    } as Parameters<typeof put>[2]);

    uploadedFiles.push(relativePath);
    fileCount++;
    process.stdout.write(`  ↑ ${relativePath}\n`);
  }

  const rootHtml = uploadedFiles.filter(f => !f.includes('/') && f.endsWith('.html'));
  if (rootHtml.includes('index.html')) entryFile = 'index.html';
  else if (rootHtml.length > 0) entryFile = rootHtml[0];

  console.log(`\n✅ ${fileCount} files uploaded. Entry: ${entryFile}`);

  // ── 6. Create prototype document record ───────────────────────────────────
  const existingProto = await prisma.projectDocument.findFirst({
    where: { projectId, docType: 'prototype' },
  });

  if (existingProto) {
    // Update existing
    await prisma.projectDocument.update({
      where: { id: existingProto.id },
      data: {
        url: `prototype::${projectId}::${entryFile}`,
        notes: `${fileCount} files · Entry: ${entryFile}`,
        title: 'Design Prototype — Neo-Brutalist Preview',
      },
    });
    console.log('✅ Prototype document record updated');
  } else {
    await prisma.projectDocument.create({
      data: {
        projectId,
        docType: 'prototype',
        title: 'Design Prototype — Neo-Brutalist Preview',
        url: `prototype::${projectId}::${entryFile}`,
        notes: `${fileCount} files · Entry: ${entryFile}`,
      },
    });
    console.log('✅ Prototype document record created');
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Done! Portal is ready:');
  console.log(`   URL:      https://rachnabuilds.com/portal/${CLIENT_SLUG}/${PROJECT_ID}`);
  console.log(`   Password: ${CLIENT_PASS}`);
  console.log(`   Phone:    +91 70565 76076`);
  console.log(`\n   Admin:    https://rachnabuilds.com/admin/projects/${PROJECT_ID}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
