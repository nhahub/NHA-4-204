# CareerGPS — Frontend API Contract

**Version:** 2.0.0  
**Last Updated:** 2026-07-05  
**Status:** Current — reflects live backend implementation

> All tRPC procedures use the prefix pattern `trpc.<router>.<procedure>`.  
> All tRPC procedures require a valid session cookie unless marked **Public**.  
> The one REST endpoint requires the same session cookie for authentication.

---

# Table of Contents

- [Transport & Authentication](#transport--authentication)
- [Type Reference](#type-reference)
  - [ParsedCVData](#parsedcvdata)
  - [GamificationTier](#gamificationtier)
  - [RoadmapNode](#roadmapnode)
  - [CurriculumResource](#curriculumresource)
- [REST Endpoints](#rest-endpoints)
  - [POST /api/cv/parse](#post-apicvparse)
- [auth — Authentication](#auth--authentication)
  - [auth.createUser](#authcreateuser)
- [cv — CV Management](#cv--cv-management)
  - [cv.getStatus](#cvgetstatus)
  - [cv.getLatestCV](#cvgetlatestcv)
  - [cv.getCV](#cvgetcv)
  - [cv.getAllCVs](#cvgetallcvs)
  - [cv.getParsedData](#cvgetparseddata)
  - [cv.deleteCV](#cvdeletecv)
- [skills — Skills Management](#skills--skills-management)
  - [skills.create](#skillscreate)
  - [skills.addUserSkill](#skillsadduserskill)
  - [skills.updateUserSkill](#skillsupdateuserskill)
  - [skills.getUserSkills](#skillsgetuserskills)
  - [skills.getAllSkills](#skillsgetallskills)
  - [skills.addManualSkill](#skillsaddmanualskill)
- [roles — Role Management](#roles--role-management)
  - [roles.create](#rolescreate)
  - [roles.addSkill](#rolesaddskill)
  - [roles.getAllRoles](#rolesgetallroles)
  - [roles.getRoleById](#rolesgetrolebyid)
  - [roles.setUserRole](#rolessetuserrole)
- [github — GitHub Integration](#github--github-integration)
  - [github.syncProjects](#githubsyncprojects)
  - [github.getStats](#githubgetstats)
  - [github.getProjects](#githubgetprojects)
  - [github.addManualProject](#githubaddmanualproject)
- [readiness — Readiness Evaluation](#readiness--readiness-evaluation)
  - [readiness.generate](#readinessgenerate)
  - [readiness.getLatestReport](#readinessgetlatestreport)
  - [readiness.getGlobalLeaderboard](#readinessgetgloballeaderboard)
  - [readiness.getRoleLeaderboard](#readinessgetroleleaderboard)
- [roadmap — Learning Roadmap](#roadmap--learning-roadmap)
  - [roadmap.generate](#roadmapgenerate)
  - [roadmap.getActiveRoadmap](#roadmapgetactiveroadmap)
  - [roadmap.getUserRoadmaps](#roadmapgetuserroadmaps)
  - [roadmap.completeNode](#roadmapcompletenode)
  - [roadmap.deleteUserRoadmap](#roadmapdeleteuseerroadmap)
- [user — User Settings](#user--user-settings)
  - [user.setAvailability](#usersetavailability)
- [CV Status Lifecycle](#cv-status-lifecycle)
- [Recommended Frontend Flows](#recommended-frontend-flows)
- [Error Code Reference](#error-code-reference)

---

# Transport & Authentication

| Concern | Detail |
| --- | --- |
| tRPC base URL | `POST /api/trpc/<router>.<procedure>` |
| REST base URL | `POST /api/cv/parse` |
| Auth mechanism | Session cookie (managed by `better-auth`) |
| Queries | HTTP GET via tRPC |
| Mutations | HTTP POST via tRPC |

---

# Type Reference

## ParsedCVData

```ts
interface ParsedCVData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;

  skills: {
    technical: { name: string; level: string | null }[];
    nonTechnical: { name: string; level: string | null }[];
  };

  experience: {
    company: string | null;
    title: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }[];

  projects: {
    name: string | null;
    description: string | null;
    technologies: string[];
    url: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];

  education: {
    institution: string;
    degree: string | null;
    field: string | null;
    major: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];

  certifications: {
    name: string | null;
    issuer: string | null;
    date: string | null;
  }[];

  languages: string[];

  links: {
    github: string | null;
    linkedin: string | null;
    portfolio: string | null;
  };
}
```

## GamificationTier

```ts
type GamificationTier = "Bronze" | "Silver" | "Gold" | "Diamond" | "Master";
```

Tier thresholds are based on a combined rank score: `(finalScore × 0.7) + (activityScore × 0.3)`.

| Combined Score | Tier |
| --- | --- |
| ≥ 90 | Master |
| ≥ 75 | Diamond |
| ≥ 55 | Gold |
| ≥ 35 | Silver |
| < 35 | Bronze |

## CurriculumResource

```ts
interface CurriculumResource {
  id: string;
  title: string;
  type: "Documentation" | "Articles" | "YouTube" | "Online Course" | "Interactive Practice" | "Official Reference";
  url: string;
  displayOrder: number;
}
```

## RoadmapNode

```ts
interface RoadmapNode {
  id: string;
  roadmapId: string;
  skillId: string;
  status: "pending" | "completed";
  orderIndex: number;
  completedAt: string | null;
  skill: {
    id: string;
    name: string;
  };
  curriculumNode: {
    id: string;
    title: string;
    description: string;
    resources: CurriculumResource[];
  };
}
```

---

# REST Endpoints

## POST /api/cv/parse

Uploads a PDF CV, stores it in Cloudinary, triggers AI parsing, and returns the parsed result synchronously.

> **Content-Type:** `multipart/form-data`

### Request

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | File (PDF) | ✅ | The CV file. Must be a valid PDF. |

### Response — Success (status `completed`)

```ts
{
  cvId: string;
  status: "completed";
  skills: {
    technical: { name: string; level: string | null }[];
    nonTechnical: { name: string; level: string | null }[];
  };
}
```

### Response — Parse Failed (status `failed`)

```ts
{
  cvId: string;
  status: "failed";
  errorMessage: string | null;
}
```

### HTTP Error Responses

| HTTP Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ error: "No file uploaded" }` | No file in request |
| `400` | `{ success: false, message: "Invalid PDF file." }` | File is not a valid PDF |
| `401` | `{ error: "Unauthorized" }` | Missing or invalid session |
| `500` | `{ error: "Failed to upload CV" }` | Storage or DB error |

---

# auth — Authentication

## auth.createUser

**Type:** Mutation  
**Auth:** Public (no session required)

Creates or upserts a user record. Called automatically after OAuth sign-in.

### Input

```ts
{
  id: string;      // Provider user ID
  name: string;
  email: string;   // Must be valid email format
}
```

### Response

```ts
{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `INTERNAL_SERVER_ERROR` | Failed to create or update user record |

---

# cv — CV Management

## CV Status Lifecycle

```text
pending → parsing → completed
                  ↘ failed
```

| Status | Description |
| --- | --- |
| `pending` | CV uploaded, waiting for AI processing |
| `parsing` | AI is currently processing the CV |
| `completed` | Processing complete, parsed data is available |
| `failed` | Processing failed, `errorMessage` contains reason |

---

## cv.getStatus

**Type:** Query  
**Auth:** Protected

Returns the current processing status of a specific CV.

### Input

```ts
{ cvId: string } // UUID
```

### Response

```ts
{
  status: "pending" | "parsing" | "completed" | "failed";
  errorMessage: string | null;
}
```

### Notes

- Only returns data for CVs that belong to the authenticated user.

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | CV does not exist or belongs to another user |

---

## cv.getLatestCV

**Type:** Query  
**Auth:** Protected

Returns the most recently uploaded CV for the authenticated user (metadata only).

### Input

None.

### Response

```ts
{
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  status: "pending" | "parsing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | User has not uploaded any CV |

---

## cv.getCV

**Type:** Query  
**Auth:** Protected

Returns a specific CV by ID (metadata only).

### Input

```ts
{ cvId: string } // UUID
```

### Response

```ts
{
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  status: "pending" | "parsing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | CV does not exist or belongs to another user |

---

## cv.getAllCVs

**Type:** Query  
**Auth:** Protected

Returns all CVs uploaded by the authenticated user, ordered by most recent first.

### Input

None.

### Response

```ts
Array<{
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  status: "pending" | "parsing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}>
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | User has no uploaded CVs |

---

## cv.getParsedData

**Type:** Query  
**Auth:** Protected

Returns the AI-parsed structured data for a specific CV.

### Input

```ts
{ cvId: string } // UUID
```

### Response

```ts
{
  parsedData: ParsedCVData;
}
```

### Notes

- Must only be called after `status === "completed"`.
- If parsing has not completed yet, returns `PRECONDITION_FAILED`.

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | CV does not exist |
| `FORBIDDEN` | CV belongs to another user |
| `PRECONDITION_FAILED` | CV has not been fully processed yet |

---

## cv.deleteCV

**Type:** Mutation  
**Auth:** Protected

Permanently deletes a CV — removes the file from Cloudinary and deletes the database record.

### Input

```ts
{ cvId: string } // UUID
```

### Response

```ts
{ success: true }
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | CV does not exist |
| `FORBIDDEN` | CV belongs to another user |
| `INTERNAL_SERVER_ERROR` | Failed to delete file from storage or database |

---

# skills — Skills Management

## skills.create

**Type:** Mutation  
**Auth:** Protected

Creates a new skill (admin-level operation). Validates dependency IDs and prevents circular dependency graphs.

### Input

```ts
{
  name: string;
  hasNoDependencies: boolean;
  dependencyIds?: string[]; // UUIDs of prerequisite skills
}
```

### Business Rules

- If `hasNoDependencies = true`, `dependencyIds` must be empty.
- If `hasNoDependencies = false`, `dependencyIds` must contain at least one entry.
- All dependency IDs must reference existing skills.
- Circular dependencies are detected and rejected.

### Response

```ts
{
  id: string;
  name: string;
  hasNoDependencies: boolean;
  createdAt: Date;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | Conflicting `hasNoDependencies` flag, missing dependencies, self-dependency, or circular dependency |
| `INTERNAL_SERVER_ERROR` | Skill insert failed |

---

## skills.addUserSkill

**Type:** Mutation  
**Auth:** Protected

Associates a skill with the authenticated user and sets a strength score. Creates or updates the association.

### Input

```ts
{
  skillId: string;        // UUID
  strengthScore: number;  // 0–100, automatically clamped
}
```

### Response

```ts
{
  userId: string;
  skillId: string;
  skillName: string;
  strengthScore: number; // 0–100
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | User not found or skill not found |
| `INTERNAL_SERVER_ERROR` | Failed to save user skill |

---

## skills.updateUserSkill

**Type:** Mutation  
**Auth:** Protected

Updates the strength score for an existing user skill.

### Input

```ts
{
  skillId: string;        // UUID
  strengthScore: number;  // 0–100, automatically clamped
}
```

### Response

```ts
{
  userId: string;
  skillId: string;
  strengthScore: number;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | User does not have this skill |

---

## skills.getUserSkills

**Type:** Query  
**Auth:** Protected

Returns all skills associated with the authenticated user.

### Input

None.

### Response

```ts
Array<{
  userId: string;
  skillId: string;
  skillName: string;
  strengthScore: number; // 0–100
}>
```

---

## skills.getAllSkills

**Type:** Query  
**Auth:** Protected

Returns all skills in the system, ordered alphabetically by name.

### Input

None.

### Response

```ts
Array<{
  id: string;
  name: string;
  hasNoDependencies: boolean;
  createdAt: Date;
}>
```

---

## skills.addManualSkill

**Type:** Mutation  
**Auth:** Protected

Finds or creates a skill by name, then adds it to the authenticated user's skill list at a specified proficiency level.

### Input

```ts
{
  skillName: string;
  level: "beginner" | "intermediate" | "expert";
}
```

### Level → Strength Score Mapping

| Level | Strength Score |
| --- | --- |
| `beginner` | 20 |
| `intermediate` | 55 |
| `expert` | 85 |

### Response

```ts
{
  userId: string;
  skillId: string;
  skillName: string;
  strengthScore: number;
}
```

---

# roles — Role Management

## roles.create

**Type:** Mutation  
**Auth:** Protected

Creates a new role. If a role with the same title already exists, it is returned unchanged (upsert).

### Input

```ts
{
  title: string; // min length 1
}
```

### Response

```ts
{
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `INTERNAL_SERVER_ERROR` | Failed to create role |

---

## roles.addSkill

**Type:** Mutation  
**Auth:** Protected

Assigns a skill to a role. Marks whether the skill is a core requirement. Creates or updates the assignment.

### Input

```ts
{
  roleId: string;  // UUID
  skillId: string; // UUID
  isCore: boolean; // default: false
}
```

### Notes

- Core skills (`isCore: true`) are required for a user to score above 49.
- Missing a core skill caps the user's final readiness score to ≤ 49.

### Response

```ts
{
  roleId: string;
  skillId: string;
  isCore: boolean;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | Role not found or skill not found |
| `INTERNAL_SERVER_ERROR` | Failed to assign skill |

---

## roles.getAllRoles

**Type:** Query  
**Auth:** Protected

Returns all roles in the system, ordered alphabetically by title.

### Input

None.

### Response

```ts
Array<{
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
}>
```

---

## roles.getRoleById

**Type:** Query  
**Auth:** Protected

Returns a role with its full list of required skills.

### Input

```ts
{ roleId: string } // UUID
```

### Response

```ts
{
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  skills: Array<{
    roleId: string;
    skillId: string;
    isCore: boolean;
    skill: {
      id: string;
      name: string;
    };
  }>;
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | Role does not exist |

---

## roles.setUserRole

**Type:** Mutation  
**Auth:** Protected

Sets the authenticated user's target role. Used to associate the user with a career goal.

### Input

```ts
{ roleId: string } // UUID
```

### Response

Returns the updated user object.

```ts
{
  id: string;
  name: string;
  email: string;
  roleId: string;
  // ...other user fields
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `INTERNAL_SERVER_ERROR` | Failed to update user role |

---

# github — GitHub Integration

## github.syncProjects

**Type:** Mutation  
**Auth:** Protected

Fetches the user's public GitHub repositories, analyzes them for skills and complexity, and saves the results. Also updates the user's GitHub activity stats.

### Input

```ts
{ username: string }
```

### Notes

- This is a long-running operation. The UI should indicate loading state.
- Existing GitHub projects are upserted (not duplicated).

### Response

Returns the result from the GitHub sync service (includes updated projects and stats).

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | GitHub username not found or API error |

---

## github.getStats

**Type:** Query  
**Auth:** Protected

Returns the cached GitHub activity statistics for the authenticated user.

### Input

None.

### Response

```ts
{
  userId: string;
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  activityScore: number; // 0–100
  updatedAt: Date;
} | undefined
```

Returns `undefined` if GitHub has not been synced yet.

---

## github.getProjects

**Type:** Query  
**Auth:** Protected

Returns all projects (GitHub-synced and manual) for the authenticated user, ordered by complexity score descending.

### Input

None.

### Response

```ts
Array<{
  id: string;
  userId: string;
  title: string;
  description: string;
  source: "github" | "manual";
  complexityScore: number;
  createdAt: Date;
}>
```

---

## github.addManualProject

**Type:** Mutation  
**Auth:** Protected

Manually adds a project to the user's portfolio. Upserts on `(userId, title)`.

### Input

```ts
{
  title: string;                                        // min length 1
  description?: string;
  complexityLevel: "simple" | "moderate" | "complex";
}
```

### Complexity Level → Score Mapping

| Level | Score |
| --- | --- |
| `simple` | 5 |
| `moderate` | 15 |
| `complex` | 30 |

### Response

Returns the inserted or updated project record.

---

# readiness — Readiness Evaluation

## readiness.generate

**Type:** Mutation  
**Auth:** Protected

Runs the full career readiness evaluation for the authenticated user against a named role. Computes a readiness score, skill gaps, and persists the results to the database.

### Input

```ts
{ roleName: string }
```

### Score Formula

```
totalScore = (skillMatchScore × 0.6) + (projectScore × 0.25) + (githubScore × 0.15) + bonusScore
finalScore = clamp(totalScore, 0, 100)

// If any core skill is completely missing:
finalScore = clamp(finalScore, 0, 49)
```

### Response

```ts
{
  finalScore: number;        // 0–100
  skillMatchScore: number;
  hasMissingCoreSkill: boolean;
  feedback: string;
  gaps: {
    missing: string[];       // skill names completely absent
    weak: string[];          // skill names below threshold
  };
}
```

---

## readiness.getLatestReport

**Type:** Query  
**Auth:** Protected

Returns the most recent readiness report and skill gap result for a specific role.

### Input

```ts
{ roleId: string } // UUID
```

### Response

```ts
{
  report: {
    id: string;
    userId: string;
    roleId: string;
    skillMatchScore: number;
    generalGithubScore: number;
    overallReadinessScore: number;
    feedback: string;
    createdAt: Date;
  } | undefined;

  gaps: {
    id: string;
    userId: string;
    roleId: string;
    missingSkills: {
      missing: string[];
      weak: string[];
    };
    matchScore: number;
    createdAt: Date;
  } | undefined;
}
```

---

## readiness.getGlobalLeaderboard

**Type:** Query  
**Auth:** Protected

Returns the top N users globally ranked by their highest readiness score across all roles.

### Input

```ts
{ limit: number } // default: 10
```

### Response

```ts
Array<{
  userId: string;
  name: string;
  image: string | null;
  roleId: string;
  finalScore: number;
  activityScore: number;
  tier: GamificationTier;
}>
```

---

## readiness.getRoleLeaderboard

**Type:** Query  
**Auth:** Protected

Returns the top N users ranked by readiness score for a specific role.

### Input

```ts
{
  roleId: string; // UUID
  limit: number;  // default: 10
}
```

### Response

```ts
Array<{
  userId: string;
  name: string;
  image: string | null;
  roleId: string;
  finalScore: number;
  activityScore: number;
  tier: GamificationTier;
}>
```

---

# roadmap — Learning Roadmap

## roadmap.generate

**Type:** Mutation  
**Auth:** Protected

Generates a personalized learning roadmap for the authenticated user based on their skill gaps and the target role's curriculum.

### Prerequisites

- A readiness report must exist for the user and the role (`readiness.generate` must have been called first).
- Skill gaps must be present. If no gaps exist, returns an informational message.

### Input

```ts
{ roleName: string }
```

### Business Rules

- If an active roadmap already exists for this role, it is returned as-is (no duplicate generation).
- Skills are sorted topologically by their dependency graph and weighted by priority.
- Nodes can be skipped based on the user's current strength score for a skill (`strength × 0.6` determines skip fraction).
- The last node of each skill is never skipped.
- Each node represents approximately 60 minutes of learning.

### Response — Roadmap Generated

```ts
{
  roadmapId: string;
  totalNodes: number;
  skillsMissingCurriculum: string[]; // Skills with no curriculum nodes seeded
  nodes: Array<{
    step: number;
    nodeId: string;
    skillId: string;
    skillName: string;
    curriculumTitle: string;
    curriculumDescription: string;
    priority: "high" | "medium";
    resources: CurriculumResource[];
  }>;
}
```

### Response — No Gaps

```ts
{ message: "No skill gaps found. You're ready." }
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `BAD_REQUEST` | Role not found, or no readiness report found for this role |
| `INTERNAL_SERVER_ERROR` | Failed to create roadmap record |

---

## roadmap.getActiveRoadmap

**Type:** Query  
**Auth:** Protected

Returns the active roadmap for the authenticated user for a given role, including full node details with curriculum resources.

### Input

```ts
{ roleId: string } // UUID
```

### Response

```ts
{
  id: string;
  userId: string;
  roleId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: RoadmapNode[];
} | undefined
```

Returns `undefined` if no active roadmap exists for this role.

---

## roadmap.getUserRoadmaps

**Type:** Query  
**Auth:** Protected

Returns all roadmaps (active and inactive) for the authenticated user.

### Input

None.

### Response

```ts
Array<{
  id: string;
  userId: string;
  roleId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: RoadmapNode[];
}>
```

---

## roadmap.completeNode

**Type:** Mutation  
**Auth:** Protected

Marks a roadmap node as completed.

### Input

```ts
{ nodeId: string } // UUID
```

### Business Rules

- The node must belong to the authenticated user's roadmap.
- Earlier nodes within the same skill must be completed first (sequential locking within a skill).
- If the node is the last in its skill, the user's `strengthScore` for that skill is increased by 15 points.
- On skill completion, a new readiness report is automatically generated.

### Response — Node Completed

```ts
{
  nodeId: string;
  status: "completed";
  skillId: string;
  skillFullyCompleted: boolean;
  previousStrength: number;
  newStrength: number;
}
```

### Response — Already Completed

```ts
{ alreadyCompleted: true }
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | Node does not exist or belongs to another user |
| `BAD_REQUEST` | An earlier node in the same skill is not yet completed |

---

## roadmap.deleteUserRoadmap

**Type:** Mutation  
**Auth:** Protected

Permanently deletes a roadmap and all its nodes.

### Input

```ts
{ roadmapId: string } // UUID
```

### Response

```ts
{ success: true }
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | Roadmap does not exist or belongs to another user |

---

# user — User Settings

## user.setAvailability

**Type:** Mutation  
**Auth:** Protected

Sets the user's available learning time per week. Used by the roadmap system to estimate completion timelines.

### Input

```ts
{
  availableDaysPerWeek: number;
  availableHoursPerDay: number;
}
```

### Response

Returns the updated user object.

```ts
{
  id: string;
  name: string;
  email: string;
  availableDaysPerWeek: number;
  availableHoursPerDay: number;
  // ...other user fields
}
```

### Possible Errors

| Error Code | Description |
| --- | --- |
| `NOT_FOUND` | User not found |

---

# Recommended Frontend Flows

## CV Upload & Parsing Flow

```
1. POST /api/cv/parse  (multipart/form-data, file=<pdf>)
   → returns { cvId, status, skills? }
   
   If status === "completed": display extracted skills
   If status === "failed": display errorMessage
```

> The upload endpoint is synchronous — it waits for AI parsing to finish.  
> No polling is required. The response contains the final result.

---

## Readiness Evaluation Flow

```
1. roles.getAllRoles         → let user pick a role
2. roles.setUserRole         → save selection
3. github.syncProjects       → (optional) sync GitHub for better scoring
4. readiness.generate        → compute readiness score
5. readiness.getLatestReport → display score, gaps, feedback
```

---

## Roadmap Generation Flow

```
1. readiness.generate        → must exist first
2. roadmap.generate          → generates personalized roadmap
3. roadmap.getActiveRoadmap  → fetch with full node + resource details
4. roadmap.completeNode      → mark nodes complete as user progresses
```

---

## Leaderboard Flow

```
1. readiness.getGlobalLeaderboard  → top users across all roles
   OR
   readiness.getRoleLeaderboard    → top users for a specific role
```

---

# Error Code Reference

| tRPC Code | HTTP Equivalent | Meaning |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | Invalid input or business rule violation |
| `UNAUTHORIZED` | 401 | User is not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not authorized to access the resource |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `PRECONDITION_FAILED` | 412 | Action cannot be performed in the current state |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server-side failure |
