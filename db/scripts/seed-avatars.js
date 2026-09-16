// One-time local dev utility: loads the real headshot photos already
// committed under assets/ into UserProfiles.avatar for the matching seed
// users. Not run automatically - db/data/*.csv (the normal seed mechanism)
// has no avatar/avatarMimeType column, and most of these seed personas
// (karim, ines, mehdi, amira, leila) have no mocked-auth login, so the
// app's own self-service upload (PUT /odata/v4/people/MyProfile('id')/avatar)
// can't be used for them - only sami/nadia could ever reach it that way.
// Writing the column directly is the only path for the rest, so this
// script does it uniformly for all matched users.
//
// Usage (from the project root, with `cds watch` NOT required to be
// running - this connects to the db directly):
//   node db/scripts/seed-avatars.js

import cds from '@sap/cds';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', '..', 'assets');

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// userID -> filename in assets/. Only matched, unambiguous names included -
// "images (1).jpg" isn't attributable to a specific seed user, left out.
const AVATAR_FILES = {
  sami:  'sami ben youssef profil.jpg',
  nadia: 'nadia-profile-converted.png',
  karim: 'karim trabelsi.jpg',
  ines:  'ines chaabane.jpg',
  mehdi: 'mehdi cherif.jpg',
  amira: 'amira sassi.jpg',
  leila: 'leila mansouri.jpg',
};

function mimeFor(filename) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return MIME_BY_EXT[ext] || null;
}

async function run() {
  cds.model = await cds.load('*');
  const db = await cds.connect.to('db');
  const UserProfiles = db.entities.UserProfiles;

  let updated = 0, skipped = 0;
  for (const [userID, filename] of Object.entries(AVATAR_FILES)) {
    const filePath = join(ASSETS_DIR, filename);
    if (!existsSync(filePath)) {
      console.log(`  skip ${userID}: file not found (${filePath})`);
      skipped++;
      continue;
    }
    const mimeType = mimeFor(filename);
    if (!mimeType) {
      console.log(`  skip ${userID}: unrecognized file type (${filename})`);
      skipped++;
      continue;
    }
    const bytes = readFileSync(filePath);
    const result = await UPDATE(UserProfiles)
      .set({ avatar: bytes, avatarMimeType: mimeType })
      .where({ userID });

    if (result === 0) {
      console.log(`  skip ${userID}: no matching UserProfiles row (not seeded?)`);
      skipped++;
    } else {
      console.log(`  ok   ${userID} <- ${filename} (${mimeType}, ${bytes.length} bytes)`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
  await db.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
