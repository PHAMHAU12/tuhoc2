# Security Specification — ENGLISH SPEAKING AI

## 1. Data Invariants
1. Every user document `/users/{userId}` can only be read, created, updated, or deleted by `request.auth.uid == userId`.
2. Every private subcollection record (`vocabularyBookmarks`, `completedSpeakingTasks`, `completedLessons`, `speakingHistory`, `testResults`) under `/users/{userId}/...` requires:
   - `request.auth != null && request.auth.uid == userId`
   - Parent `/users/{userId}` document exists (`exists(...)`) on single-document writes (Master Gate).
   - Incoming `uid` equals `request.auth.uid` and `userId`, and remains immutable on update.
3. Shared curriculum collections (`/vocabulary`, `/conversation_scenarios`, `/speaking_tasks`) contain no PII:
   - Only authenticated users can read (`get` / `list`), with `list` enforcing `resource.data.level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']`.
   - Only verified bootstrapped admin (`haupham101981@gmail.com` with `email_verified == true` or `/admins/{uid}`) can write, preserving exact original field allowlists and matching document IDs (`data.id == docId`).
4. All strings enforce `.size()` bounds; all document IDs enforce `^[a-zA-Z0-9_\-]+$`; all arrays enforce bounded `.size()` and element type checks; all timestamps enforce `request.time`.
5. No shadow/ghost fields allowed: `hasAll(...)` and `hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/users/userA` or `/vocabulary/v_a1_001`.
2. Authenticated User B reading `/users/userA`.
3. Authenticated non-admin learner writing to `/vocabulary/v_a1_001`, `/conversation_scenarios/s_a1_001`, or `/speaking_tasks/sp_a1_001`.
4. Admin creating `/vocabulary/v_a1_001` with mismatched `id: "v_a1_999"` or shadow field `extraFlag: true`.
5. Admin with `email_verified == false` attempting to write to `/speaking_tasks/sp_a1_001` (email spoofing).
6. Authenticated User A creating `/users/userA` with `uid: "userB"` (identity spoofing).
7. Authenticated User A updating `/users/userA` to change `uid` or `createdAt` (immutable field tampering).
8. Authenticated User A creating `/users/userA` with forged past `createdAt` timestamp instead of `request.time`.
9. Authenticated User A writing a 2,500-char `notes` string in `/users/userA/completedSpeakingTasks/sp_a1_001` (resource poisoning).
10. Authenticated User B listing `/users/userA/completedSpeakingTasks` or `/users/userA/speakingHistory`.
11. Authenticated User A creating `/users/userA/completedSpeakingTasks/bad$id` (invalid ID characters).
12. Authenticated User A creating `/users/userA/completedSpeakingTasks/sp_a1_001` when parent `/users/userA` does not exist (orphaned subcollection write).
