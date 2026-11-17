import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { CefrLevel } from "../../types/learning";
import { auth, googleProvider } from "./config";
import { formatFirebaseAuthErrorVi } from "./errors";
import { firestoreService } from "./firestoreService";

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  targetCefr: CefrLevel;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface GoogleAuthOptions {
  targetCefr?: CefrLevel;
  preferRedirect?: boolean;
}

const PENDING_TARGET_CEFR_KEY = "english_speaking_pending_target_cefr";

export const authService = {
  subscribeAuthState(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async signInWithEmail(payload: SignInPayload): Promise<User> {
    if (!payload.email.trim() || !payload.password) {
      throw new Error("Vui lòng nhập đầy đủ email và mật khẩu.");
    }
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        payload.email.trim(),
        payload.password
      );
      try {
        await firestoreService.ensureUserProfile(credential.user);
      } catch (firestoreErr) {
        console.warn("Lưu ý: Không thể đồng bộ hồ sơ Firestore ngay lập tức:", firestoreErr);
      }
      return credential.user;
    } catch (error) {
      throw new Error(formatFirebaseAuthErrorVi(error));
    }
  },

  async registerWithEmail(payload: RegisterPayload): Promise<User> {
    const cleanName = payload.fullName.trim();
    const cleanEmail = payload.email.trim();
    if (!cleanName || !cleanEmail || payload.password.length < 6) {
      throw new Error(
        "Vui lòng nhập họ tên, email hợp lệ và mật khẩu tối thiểu 6 ký tự."
      );
    }
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        payload.password
      );
      await updateProfile(credential.user, { displayName: cleanName });
      try {
        await firestoreService.ensureUserProfile(credential.user, {
          fullName: cleanName,
          targetCefr: payload.targetCefr,
        });
      } catch (firestoreErr) {
        console.warn("Lưu ý: Không thể khởi tạo hồ sơ Firestore ngay lập tức:", firestoreErr);
      }
      return credential.user;
    } catch (error) {
      throw new Error(formatFirebaseAuthErrorVi(error));
    }
  },

  async signInWithGoogle(options?: GoogleAuthOptions): Promise<User> {
    if (options?.preferRedirect) {
      await this.signInWithGoogleRedirect(options);
      // Returns a non-terminating promise while redirecting
      return new Promise<User>(() => {});
    }

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      try {
        await firestoreService.ensureUserProfile(credential.user, {
          targetCefr: options?.targetCefr,
        });
      } catch (firestoreErr) {
        console.warn("Lưu ý: Hồ sơ Firestore chưa thể ghi ngay lúc đăng nhập Google:", firestoreErr);
      }
      return credential.user;
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";

      // Fallback to redirect if popup is blocked
      if (code === "auth/popup-blocked") {
        console.info("Popup bị chặn, tự động chuyển sang phương thức Redirect...");
        await this.signInWithGoogleRedirect(options);
        return new Promise<User>(() => {});
      }

      throw new Error(formatFirebaseAuthErrorVi(error));
    }
  },

  async signInWithGoogleRedirect(options?: GoogleAuthOptions): Promise<void> {
    if (options?.targetCefr && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(PENDING_TARGET_CEFR_KEY, options.targetCefr);
      } catch {
        // Ignore session storage errors
      }
    }
    await signInWithRedirect(auth, googleProvider);
  },

  async handleGoogleRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      if (!result?.user) {
        return null;
      }

      let pendingTargetCefr: CefrLevel | undefined;
      if (typeof window !== "undefined") {
        try {
          const savedCefr = window.sessionStorage.getItem(PENDING_TARGET_CEFR_KEY);
          if (savedCefr) {
            pendingTargetCefr = savedCefr as CefrLevel;
            window.sessionStorage.removeItem(PENDING_TARGET_CEFR_KEY);
          }
        } catch {
          // Ignore session storage errors
        }
      }

      try {
        await firestoreService.ensureUserProfile(result.user, {
          targetCefr: pendingTargetCefr,
        });
      } catch (firestoreErr) {
        console.warn("Lưu ý: Không thể ghi hồ sơ Firestore sau khi redirect Google:", firestoreErr);
      }

      return result.user;
    } catch (error) {
      throw new Error(formatFirebaseAuthErrorVi(error));
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },
};
