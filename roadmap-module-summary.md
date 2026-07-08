# Roadmap Module Audit

## Scope
- `apps/server/src/modules/roadmap/service.ts`
- `apps/server/src/modules/roadmap/routes/roadmap_trpc.ts`
- `apps/server/src/modules/roadmap/ai-planner.ts`
- `apps/server/src/modules/roadmap/db/schema.ts`
- `apps/server/src/modules/roadmap/routes/readiness_trpc.ts`
- `apps/server/src/modules/roadmap/gamification.ts`
- Relevant migrations: `0001_plain_captain_flint.sql`, `0002_ambiguous_sasquatch.sql`, `0003_lively_loa.sql`
- Cross-module dependency: `apps/server/src/modules/roles/service.ts`

## API Surface

### tRPC routes
- `roadmap.generate` (mutation)
  - Input: `{ roleName: string }`
  - Behavior: resolves role by title, generates or returns existing active roadmap for current user
  - Returns: `{ totalSteps, roadmap }` or `{ message }`

- `roadmap.completeStep` (mutation)
  - Input: `{ stepId: string }`
  - Behavior: validates step ownership via joined `roadmaps`, marks step completed, updates user skill strength, and recalculates readiness for related role
  - Returns: completion payload with updated strength

- `roadmap.getActiveRoadmap` (query)
  - Input: `{ roleId: string }`
  - Behavior: returns the current active roadmap for the user and role with step skill data

- `roadmap.generateSkillInternalRoadmap` (mutation)
  - Input: `{ stepId: string, durationDays, dailyMinutes }`
  - Behavior: generates or reuses a cached AI plan for the step skill

- `readiness.generate` (mutation)
  - Input: `{ roleName: string }`
  - Behavior: evaluates user readiness and creates readiness report / gap results

- `readiness.getLatestReport`, `getGlobalLeaderboard`, `getRoleLeaderboard`
  - Behavior: query readiness reports, gap results, and compute leaderboard tiers

## Schema and Storage

### `roadmaps` table
- Columns: `id`, `user_id`, `role_id`, `title`, `description`, `is_active`, `created_at`, `updated_at`
- Comments:
  - `is_active` is used to keep one active roadmap per user+role
  - migration `0002_ambiguous_sasquatch.sql` adds a unique constraint on `user_id`, then `0003_lively_loa.sql` removes it and re-adds `is_active`
  - no explicit user+role unique index exists now, meaning multiple roadmaps are possible if `is_active` is mismanaged

### `roadmap_steps` table
- Columns: `id`, `roadmap_id`, `skill_id`, `title`, `description`, `status`, `order_index`, `cached_roadmap_id`, `completed_at`
- `order_index` is numeric and used for step ordering

### `cached_internal_roadmaps` table
- Stores AI-generated plans keyed by `skill_id`, `level`, `duration_days`, `daily_minutes`
- Unique index enforces cache deduplication

### `readiness_reports` and `skill_gap_results`
- `generateLearningRoadmapInternal` depends on the latest readiness report for the current user role
- `skill_gap_results.missing_skills` stores a JSON object with `missing` and `weak` arrays
- `evaluateUserForRoleInternal` writes these gap results and readiness report rows

## Business Logic

### Roadmap generation
- Requires an existing readiness report for the requested role
- If an active roadmap already exists for the user+role, it is returned as-is
- Otherwise, it deletes all previous roadmaps for that user+role and builds a new one
- Uses latest `skill_gap_results` for the role to gather required skills
- Computes a priority score for each gap skill based on:
  - role skill weight (`isCore` → 5 or 1)
  - user strength (0-100)
  - priority type: `missing` → high, `weak` → medium
- Builds a dependency graph among gap skills from `skill_dependencies`
- Topologically sorts skills with priority-based tie-breaking
- Creates a new `roadmaps` row and corresponding `roadmap_steps`

### Roadmap completion
- Validates ownership by joining `roadmap_steps` to `roadmaps` and matching `user_id`
- Sets step status to `completed`
- Ensures a skill row exists, inserting a generated skill placeholder if missing
- Increases or creates `user_skills` strength by 15 points, capped at 100
- Triggers `evaluateUserForRole` to recalculate readiness and gap state

### Internal AI roadmap generation
- Fetches the step and associated skill/roadmap
- Determines user level from current strength: beginner/intermediate/advanced
- Uses globally cached plans if available
- Calls a remote Hugging Face service to generate a plan
- Falls back to `generateSkillPlan` mock logic if the remote call fails
- Caches new generated plans for reuse
- Links cached plans to steps via `cachedRoadmapId`

## Cross-module dependencies

- `@/modules/roles/service.ts`
  - `generateLearningRoadmap` calls `evaluateUserForRole` to refresh readiness after step completion
  - `readiness.generate` calls `evaluateUserForRoleName`
- `@/db/schema` imports from `roles`, `skills`, `user`, and canary references to `skillDependencies`
- `@/modules/skills/db/schema` provides `userSkills`
- `@/modules/roadmap/gamification.ts` is used by readiness leaderboards

## Risks and Issues

### Security / authorization
- `roadmap.generateSkillInternalRoadmap` uses only `stepId` and does not verify that the step belongs to `ctx.session.user`
  - This allows any authenticated user to request an internal roadmap for another user’s step
  - Fix: validate `roadmap.userId === ctx.session.user.id` before generating or returning cached data

### Data quality
- `completeRoadmapStep` inserts a placeholder skill row when the step’s skill does not exist:
  - name: `generated-skill-${step.skillId}`
  - `hasNoDependencies: true`
  - This can create poor-quality or inconsistent skill metadata for downstream logic
- `generateLearningRoadmapInternal` may return `Unknown` for missing skill names if the `skill_gap_results` skill list contains names that do not resolve to a `skills` record
- The active-roadmap response contains duplicate arrays: both `steps` and `roadmap` are built from the same data

### Concurrency and caching
- `generateInternalRoadmapForStep` caches by skill/level/duration/daily minutes but does not guard against concurrent insert races
  - a duplicate insert conflict could occur if two requests generate the same cache row simultaneously

### Readiness / scoring mismatch
- `evaluateUserForRoleInternal` computes `finalScore` but inserts `overallReadinessScore` using `totalScore`
  - this likely means stored `overallReadinessScore` is inconsistent with the returned final readiness score
  - the discrepancy affects leaderboard and readiness output consistency, and may indirectly affect roadmap generation expectations

## Test coverage
- No roadmap-specific test files were found in the repository by searching for `roadmap` in `*test*`/`*spec*` files
- There is no explicit unit/integration coverage for:
  - roadmap generation logic and topological sorting
  - roadmap ownership enforcement in `generateSkillInternalRoadmap`
  - placeholder skill insertion in `completeRoadmapStep`
  - AI cache fallback behavior

## Recommendations
1. Add ownership validation for `generateSkillInternalRoadmap`
2. Replace placeholder skill insertion with a clearer failure mode or reconciling missing skill metadata
3. Consider adding a dedicated unique constraint on `(user_id, role_id, is_active)` for `roadmaps`
4. Normalize response shapes to avoid duplicate `steps`/`roadmap` arrays
5. Add tests for roadmap generation, completion, and internal roadmap caching/fallback
6. Review `overallReadinessScore` versus `finalScore` insertion in `roles/service.ts` for consistency

## Notes
- The roadmap module is tightly coupled to readiness/gap result generation and role skill definitions
- The AI planner is currently dependent on a third-party endpoint and may degrade to a local mock plan if unavailable
- Current implementation is mostly consistent, but the security issue and data-quality placeholder insertion are the most important fixes
