/**
 * Setup Aditi client + upload prototype to Vercel Blob
 * Run: /Users/abhipatodi/.nvm/versions/node/v24.13.1/bin/node scripts/setup-aditi.mjs
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load env
const envLocal = readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
for (const line of envLocal.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}
const envMain = readFileSync(path.join(__dirname, '../.env'), 'utf8');
for (const line of envMain.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DB_URL     = process.env.DATABASE_URL.replace('channel_binding=require&', '');

const CLIENT_SLUG = 'aditi-protein-2026';
const CLIENT_PASS = 'aditi2026';
const CLIENT_ID   = 'cl_aditi2026';
const PROJECT_ID  = 'cp_aditi_p1';
const ZIP_PATH    = '/Users/abhipatodi/Downloads/savoury-protein-prototype.zip';

// ── bcrypt hash via psql crypt (simpler: use a pre-computed hash) ────────────
// bcrypt hash of 'aditi2026' with salt rounds 10 (pre-computed):
const PASSWORD_HASH = '$2a$10$XGiPmSl6aFDGHLB3/wO0/OI1C2GJN3MQoG8d8e6u5Sd8Rz7fNXXzK';

// ── DB via psql ───────────────────────────────────────────────────────────────
import { execSync } from 'child_process';
import crypto from 'crypto';

function psql(sql) {
  const result = execSync(`psql "${DB_URL}" -c "${sql.replace(/"/g, '\\"')}" --no-psqlrc -t -A 2>&1`).toString().trim();
  return result;
}

function psqlRaw(sql) {
  // Use heredoc to handle complex SQL with quotes
  const result = execSync(`psql "${DB_URL}" --no-psqlrc -t -A`, {
    input: sql,
    encoding: 'utf8',
  });
  return result.trim();
}

// ── Blob upload via REST API ───────────────────────────────────────────────────
import JSZip from '/Users/abhipatodi/Desktop/Claude Projects/rachna-nextjs/node_modules/jszip/dist/jszip.js';

const MIME = {
  html: 'text/html; charset=utf-8', css: 'text/css', js: 'application/javascript',
  json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
};
const getMime = (f) => MIME[f.split('.').pop()?.toLowerCase()] ?? 'application/octet-stream';

async function blobPut(blobPath, content, contentType) {
  const url = `https://blob.vercel-storage.com/${blobPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${BLOB_TOKEN}`,
      'Content-Type': contentType,
      'x-api-version': '7',
    },
    body: content,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Blob PUT failed: ${res.status} ${err}`);
  }
  return res.json();
}

async function main() {
  console.log('🚀 Setting up Aditi client portal...\n');

  // 1. Check if client exists
  const existingClient = psqlRaw(`SELECT id FROM clients WHERE slug = '${CLIENT_SLUG}' LIMIT 1;`);

  if (existingClient && existingClient !== '') {
    console.log(`⚠️  Client already exists with id: ${existingClient}`);
  } else {
    // Compute real bcrypt hash
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(CLIENT_PASS, 10);

    const nowISO = new Date().toISOString();
    psqlRaw(`
      INSERT INTO clients (id, name, email, phone, slug, "passwordHash", "isActive", "clientProfile", "createdAt", "updatedAt")
      VALUES (
        '${CLIENT_ID}',
        'Aditi',
        NULL,
        '+91 70565 76076',
        '${CLIENT_SLUG}',
        '${passwordHash}',
        true,
        '{"portalPassword":"${CLIENT_PASS}"}',
        '${nowISO}',
        '${nowISO}'
      );
    `);
    console.log(`✅ Client created: Aditi (${CLIENT_SLUG})`);
  }

  // Get actual client ID
  const clientId = psqlRaw(`SELECT id FROM clients WHERE slug = '${CLIENT_SLUG}' LIMIT 1;`).split('\n')[0].trim();
  console.log(`   Client ID: ${clientId}`);

  // 2. Check if project exists
  const existingProject = psqlRaw(`SELECT id FROM client_projects WHERE id = '${PROJECT_ID}' LIMIT 1;`);

  if (existingProject && existingProject !== '') {
    console.log(`⚠️  Project already exists: ${existingProject}`);
  } else {
    const nowISO = new Date().toISOString();
    psqlRaw(`
      INSERT INTO client_projects (id, "clientId", name, "clientType", platform, status, "displayOrder", "createdAt", "updatedAt")
      VALUES (
        '${PROJECT_ID}',
        '${clientId}',
        'Savoury Protein Spreads — Shopify Store',
        'new_build',
        'shopify',
        'active',
        0,
        '${nowISO}',
        '${nowISO}'
      );
    `);
    console.log(`✅ Project created: Savoury Protein Spreads — Shopify Store`);

    // 3. Sections
    const sections = [
      { type: 'proposal', title: 'Project Proposal', order: 0 },
      { type: 'project_status', title: 'Project Status', order: 1 },
    ];
    for (const s of sections) {
      const sid = crypto.randomBytes(12).toString('hex');
      psqlRaw(`
        INSERT INTO project_sections (id, "projectId", "sectionType", title, content, "displayOrder", "createdAt", "updatedAt")
        VALUES ('${sid}', '${PROJECT_ID}', '${s.type}', '${s.title}', '{"items":[]}', ${s.order}, '${nowISO}', '${nowISO}');
      `);
    }
    console.log('✅ Sections created: Proposal, Project Status');

    // 4. Document checklist
    const docs = [
      { title: 'Logo Files',               notes: 'SVG or high-resolution PNG with transparent background' },
      { title: 'Brand Colours',             notes: 'Exact hex colour codes — Deep Olive + Amber + Cream palette' },
      { title: 'Brand Fonts',               notes: 'Font names or files — we recommend Condensed Slab + Inter' },
      { title: 'Product Photography',       notes: 'Min 3 photos per flavour — lifestyle shot, white background, ingredient close-up' },
      { title: 'Flavour Details',           notes: '4 flavour names, protein per serve, calories per serve, ingredient list, price per jar' },
      { title: 'Brand Story / About Text',  notes: '1 short paragraph about why you started this brand' },
      { title: 'Founder Photo',             notes: '1 clear photo of you for the Founder Story section' },
      { title: 'Shipping & Returns Policy', notes: 'Your policy text — we will format and upload it' },
      { title: 'Instagram Handle',          notes: 'So we can embed your feed on the homepage (Instafeed)' },
    ];
    for (const d of docs) {
      const did = crypto.randomBytes(12).toString('hex');
      const safeNotes = d.notes.replace(/'/g, "''");
      const safeTitle = d.title.replace(/'/g, "''");
      psqlRaw(`
        INSERT INTO project_documents (id, "projectId", "docType", title, url, notes, "createdAt", "updatedAt")
        VALUES ('${did}', '${PROJECT_ID}', 'client_required', '${safeTitle}', '', '${safeNotes}', '${nowISO}', '${nowISO}');
      `);
    }
    console.log(`✅ ${docs.length} checklist items created`);
  }

  // 5. Upload prototype
  console.log('\n📦 Reading prototype ZIP...');
  const zipBuffer = readFileSync(ZIP_PATH);

  // JSZip is CommonJS so use require
  const JSZipLib = require('/Users/abhipatodi/Desktop/Claude Projects/rachna-nextjs/node_modules/jszip/');
  const zip = await JSZipLib.loadAsync(zipBuffer);

  const entries = Object.keys(zip.files);
  let prefix = '';
  const firstDir = entries.find(e => zip.files[e].dir);
  if (firstDir && entries.every(e => e === firstDir || e.startsWith(firstDir))) {
    prefix = firstDir;
  }

  let fileCount = 0;
  const uploadedFiles = [];

  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const relativePath = prefix ? zipPath.slice(prefix.length) : zipPath;
    if (!relativePath) continue;

    const content = await zipEntry.async('nodebuffer');
    const mimeType = getMime(relativePath);
    const blobPath = `prototypes/${PROJECT_ID}/${relativePath}`;

    const res = await fetch(`https://blob.vercel-storage.com`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
        'x-api-version': '7',
        'Content-Type': mimeType,
        'x-pathname': blobPath,
        'x-cache-control-max-age': '31536000',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
      },
      body: content,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ✗ Failed: ${relativePath} — ${res.status} ${err.slice(0,100)}`);
      continue;
    }

    uploadedFiles.push(relativePath);
    fileCount++;
    console.log(`  ↑ ${relativePath}`);
  }

  const rootHtml = uploadedFiles.filter(f => !f.includes('/') && f.endsWith('.html'));
  const entryFile = rootHtml.includes('index.html') ? 'index.html' : (rootHtml[0] ?? 'index.html');

  console.log(`\n✅ ${fileCount} files uploaded. Entry: ${entryFile}`);

  // 6. Create prototype doc record
  const nowISO = new Date().toISOString();
  const existingProto = psqlRaw(`SELECT id FROM project_documents WHERE "projectId" = '${PROJECT_ID}' AND "docType" = 'prototype' LIMIT 1;`);

  if (existingProto && existingProto !== '') {
    psqlRaw(`
      UPDATE project_documents
      SET url = 'prototype::${PROJECT_ID}::${entryFile}',
          notes = '${fileCount} files · Entry: ${entryFile}',
          title = 'Design Prototype — Neo-Brutalist Preview',
          "updatedAt" = '${nowISO}'
      WHERE id = '${existingProto.split('\n')[0].trim()}';
    `);
    console.log('✅ Prototype document record updated');
  } else {
    const did = crypto.randomBytes(12).toString('hex');
    psqlRaw(`
      INSERT INTO project_documents (id, "projectId", "docType", title, url, notes, "createdAt", "updatedAt")
      VALUES ('${did}', '${PROJECT_ID}', 'prototype', 'Design Prototype — Neo-Brutalist Preview', 'prototype::${PROJECT_ID}::${entryFile}', '${fileCount} files · Entry: ${entryFile}', '${nowISO}', '${nowISO}');
    `);
    console.log('✅ Prototype document record created');
  }

  console.log('\n🎉 Portal ready!');
  console.log(`   URL:      https://rachnabuilds.com/portal/${CLIENT_SLUG}/${PROJECT_ID}`);
  console.log(`   Password: ${CLIENT_PASS}`);
  console.log(`   Admin:    https://rachnabuilds.com/admin/projects/${PROJECT_ID}`);
}

main().catch(e => { console.error(e); process.exit(1); });
