import { auth } from "./config";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFirebaseAuthErrorVi(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  const currentHost =
    typeof window !== "undefined" && window.location ? window.location.hostname : "localhost";

  const rawMessage = error instanceof Error ? error.message : String(error);

  // Fallback pattern matching for unwrapped or custom errors
  if (code === "auth/unauthorized-domain" || rawMessage.includes("unauthorized-domain")) {
    return `Tên miền hiện tại ("${currentHost}") chưa được cấp quyền trong Firebase Console. Vui lòng truy cập Firebase Console > Authentication > Settings > Authorized domains và thêm "${currentHost}" vào danh sách.`;
  }

  if (code === "auth/operation-not-allowed" || rawMessage.includes("operation-not-allowed")) {
    return "Phương thức đăng nhập này (Google hoặc Email) chưa được kích hoạt trong Firebase Console. Vui lòng vào Firebase Console > Authentication > Sign-in method và bật 'Google' hoặc 'Email/Password'.";
  }

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email hoặc mật khẩu không chính xác.";
    case "auth/invalid-email":
      return "Định dạng địa chỉ email không hợp lệ.";
    case "auth/email-already-in-use":
      return "Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng nhập.";
    case "auth/weak-password":
      return "Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.";
    case "auth/popup-closed-by-user":
      return "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.";
    case "auth/popup-blocked":
      return "Trình duyệt đang chặn cửa sổ bật lên (pop-up). Vui lòng cho phép pop-up cho trang này, hoặc sử dụng tính năng 'Đăng nhập qua chuyển hướng' (Redirect).";
    case "auth/cancelled-popup-request":
      return "Yêu cầu đăng nhập trước đó đã bị hủy do có thao tác mới.";
    case "auth/account-exists-with-different-credential":
      return "Email liên kết với tài khoản Google này đã được tạo bằng mật khẩu. Vui lòng chuyển sang tab Đăng nhập bằng Email & Mật khẩu.";
    case "auth/credential-already-in-use":
      return "Thông tin xác thực Google này đã được liên kết với một tài khoản khác.";
    case "auth/user-disabled":
      return "Tài khoản học viên này đã bị vô hiệu hóa hoặc tạm khóa.";
    case "auth/too-many-requests":
      return "Bạn đã thử quá nhiều lần trong thời gian ngắn. Vui lòng đợi ít phút rồi thử lại.";
    case "auth/network-request-failed":
      return "Lỗi kết nối mạng tới máy chủ xác thực Firebase/Google. Vui lòng kiểm tra lại kết nối Internet.";
    case "auth/timeout":
      return "Yêu cầu xác thực đã hết thời gian chờ (timeout). Vui lòng thử lại.";
    default:
      return error instanceof Error
        ? `Không thể xác thực: ${error.message}`
        : "Đã xảy ra lỗi xác thực Firebase.";
  }
}

export function formatFirestoreErrorVi(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Missing or insufficient permissions")) {
      return "Không đủ quyền truy cập dữ liệu riêng tư trên Cloud Firestore.";
    }
    if (error.message.includes("the client is offline")) {
      return "Không thể kết nối Cloud Firestore (máy khách đang ngoại tuyến).";
    }
    try {
      const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
      if (parsed.error) {
        if (parsed.error.includes("Missing or insufficient permissions")) {
          return "Quyền truy cập Cloud Firestore bị từ chối cho thao tác này.";
        }
        return `Lỗi Cloud Firestore: ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return error.message;
  }
  return "Đã xảy ra lỗi khi đồng bộ dữ liệu Cloud Firestore.";
}
