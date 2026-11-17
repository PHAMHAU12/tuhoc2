import { applicationDefault, cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DATASET_PATH = path.resolve(
  ROOT_DIR,
  "public/assets/aistudio/english_speaking_ai_starter_dataset_a8275b28.json"
);
const FIREBASE_CONFIG_PATH = path.resolve(ROOT_DIR, "firebase-applet-config.json");

const VALID_CEFR = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

interface StarterDataset {
  metadata: Record<string, unknown>;
  vocabulary: Array<Record<string, unknown> & { id: string; level: string }>;
  conversation_scenarios: Array<Record<string, unknown> & { id: string; level: string }>;
  speaking_tasks: Array<Record<string, unknown> & { id: string; level: string }>;
}

function validateItems(
  collectionName: string,
  items: Array<Record<string, unknown> & { id: string; level: string }>,
  requiredKeys: string[]
) {
  const seenIds = new Set<string>();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string" || !VALID_ID_REGEX.test(item.id)) {
      throw new Error(`[${collectionName}] Invalid document id: ${String(item.id)}`);
    }
    if (seenIds.has(item.id)) {
      throw new Error(`[${collectionName}] Duplicate document id in dataset: ${item.id}`);
    }
    seenIds.add(item.id);

    if (!VALID_CEFR.has(String(item.level))) {
      throw new Error(`[${collectionName}/${item.id}] Invalid CEFR level: ${String(item.level)}`);
    }

    for (const key of requiredKeys) {
      if (!(key in item)) {
        throw new Error(`[${collectionName}/${item.id}] Missing required field: ${key}`);
      }
    }
  }
}

function loadAdminCredential() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as ServiceAccount;
    return cert(parsed);
  }
  return applicationDefault();
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset file not found: ${DATASET_PATH}`);
  }
  if (!fs.existsSync(FIREBASE_CONFIG_PATH)) {
    throw new Error(`Firebase applet config not found: ${FIREBASE_CONFIG_PATH}`);
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8")) as StarterDataset;
  const firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, "utf8")) as {
    projectId: string;
    firestoreDatabaseId: string;
  };

  validateItems("vocabulary", dataset.vocabulary ?? [], [
    "id",
    "level",
    "topic",
    "word",
    "ipa",
    "part_of_speech",
    "meaning_vi",
    "example_en",
    "example_vi",
  ]);
  validateItems("conversation_scenarios", dataset.conversation_scenarios ?? [], [
    "id",
    "level",
    "topic",
    "context_vi",
    "roles",
    "dialogue",
    "useful_phrases",
    "ai_coaching_instruction_vi",
  ]);
  validateItems("speaking_tasks", dataset.speaking_tasks ?? [], [
    "id",
    "level",
    "topic",
    "prompt_en",
    "prompt_vi",
    "instructions_vi",
    "guiding_questions",
    "self_assessment",
  ]);

  console.log("Dataset validation passed:");
  console.log(`- vocabulary: ${dataset.vocabulary.length} documents`);
  console.log(`- conversation_scenarios: ${dataset.conversation_scenarios.length} documents`);
  console.log(`- speaking_tasks: ${dataset.speaking_tasks.length} documents`);

  if (isDryRun) {
    console.log("Dry-run complete. No writes performed.");
    return;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: loadAdminCredential(),
      projectId: firebaseConfig.projectId,
    });
  }

  const db = getFirestore(firebaseConfig.firestoreDatabaseId);

  const upsertCollection = async (
    collectionName: string,
    items: Array<Record<string, unknown> & { id: string }>
  ) => {
    const batch = db.batch();
    for (const item of items) {
      const docRef = db.collection(collectionName).doc(item.id);
      batch.set(docRef, { ...item });
    }
    await batch.commit();
  };

  console.log(
    `Importing into Firestore project=${firebaseConfig.projectId}, database=${firebaseConfig.firestoreDatabaseId}...`
  );

  await upsertCollection("vocabulary", dataset.vocabulary);
  await upsertCollection("conversation_scenarios", dataset.conversation_scenarios);
  await upsertCollection("speaking_tasks", dataset.speaking_tasks);

  // Verify records directly from Firestore
  const [vocabSnap, scenariosSnap, tasksSnap] = await Promise.all([
    db.collection("vocabulary").get(),
    db.collection("conversation_scenarios").get(),
    db.collection("speaking_tasks").get(),
  ]);

  console.log("Firestore verification results:");
  console.log(`- vocabulary verified count: ${vocabSnap.size}`);
  console.log(`- conversation_scenarios verified count: ${scenariosSnap.size}`);
  console.log(`- speaking_tasks verified count: ${tasksSnap.size}`);

  if (
    vocabSnap.size < dataset.vocabulary.length ||
    scenariosSnap.size < dataset.conversation_scenarios.length ||
    tasksSnap.size < dataset.speaking_tasks.length
  ) {
    throw new Error("Firestore verification count mismatch after import.");
  }

  console.log("Starter dataset imported and verified successfully with zero duplicates.");
}

main().catch((err) => {
  console.error(
    "Import failed:",
    err instanceof Error ? err.message : String(err)
  );
  console.error(
    "Ensure GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON points to a service account with Firestore permissions for project nodal-diorama-hn2tx, or run the authenticated Admin Import in Profile & Settings."
  );
  process.exit(1);
});
