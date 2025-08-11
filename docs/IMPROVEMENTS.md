# IMPROVEMENTS.md — Centralized Idea List
_Last updated (AEST): (fill current AEST)_

**Status legend:** ✅ Implemented · 🟡 Pending · ⏳ Deferred · ❌ Rejected

## Index
- [Build QoS](#build-qos)
- [Repo Sync](#repo-sync)
- [UI Enhancements](#ui-enhancements)
- [CI/CD](#cicd)
- [Policy](#policy)
- [Other](#other)
- [Log](#log)

## Build QoS
- 🟡 (ID:QOS-001) Pin Node + Windows runner in all builders (20.19.4 / windows-2022).
- 🟡 (ID:QOS-002) Smoke checks before artifact upload.
- ⏳ (ID:QOS-003) Normalize artifact names to `CommentHQ-BundleMe-GUI-<ver>-portable.exe`.

## Repo Sync
- ✅ (ID:SYNC-001) SYNC-first pre-step before any repo action.
- 🟡 (ID:SYNC-002) Add public SNAP workflow that emits a JSON snapshot artifact.

## UI Enhancements
- ✅ (ID:UI-001) Visibility badges + AEST timestamps (status-only when IPC missing).
- ⏳ (ID:UI-002) IPC for in-GUI visibility toggles + auto-reprivate.

## CI/CD
- 🟡 (ID:CI-001) Cache npm via cache-dependency-path on GUI lockfile.
- 🟡 (ID:CI-002) Attach SHA-256 JSON alongside EXE artifacts.

## Policy
- ✅ (ID:POL-001) POLICY.md baseline established; SYNC.md included.
- ✅ (ID:POL-002) Centralized improvements list (this file).

## Other
- (add here)

## Log
- (AEST timestamp) — Policy baseline adopted; added FEEDBACK template and structured improvements list.
