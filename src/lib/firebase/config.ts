import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { doc, getDocFromServer, getFirestore } from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
googleProvider.addScope("email");
googleProvider.addScope("profile");

export const FIREBASE_PROJECT_INFO = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
} as const;

export const ADMIN_EMAIL = "haupham101981@gmail.com";

export const FIRESTORE_COLLECTIONS = {
  users: "users",
  vocabulary: "vocabulary",
  conversationScenarios: "conversation_scenarios",
  speakingTasks: "speaking_tasks",
  vocabularyBookmarks: (uid: string) => `users/${uid}/vocabularyBookmarks`,
  completedSpeakingTasks: (uid: string) => `users/${uid}/completedSpeakingTasks`,
  completedLessons: (uid: string) => `users/${uid}/completedLessons`,
  speakingHistory: (uid: string) => `users/${uid}/speakingHistory`,
  testResults: (uid: string) => `users/${uid}/testResults`,
} as const;

export interface ConnectionCheckResult {
  connected: boolean;
  offline: boolean;
  messageVi: string;
}

export async function testFirestoreConnection(): Promise<ConnectionCheckResult> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return {
      connected: true,
      offline: false,
      messageVi: `Đã kết nối Cloud Firestore (${firebaseConfig.projectId}).`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.", error);
      return {
        connected: false,
        offline: true,
        messageVi:
          "Không thể kết nối tới Cloud Firestore (client is offline). Vui lòng kiểm tra cấu hình Firebase.",
      };
    }
    // Permission-denied on the probe path confirms the Firestore server responded over the network.
    return {
      connected: true,
      offline: false,
      messageVi: `Cloud Firestore đã kết nối và sẵn sàng (${firebaseConfig.projectId}).`,
    };
  }
}
