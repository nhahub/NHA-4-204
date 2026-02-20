# Database Schema

This project uses **Supabase (PostgreSQL)** as the database.

## Tables Overview

### Core Tables

#### `users`

Stores user profiles.

- `id` (uuid, PK)
- `email` (text)
- `name` (text)
- `created_at` (timestamp)

#### `roles`

Career roles users can target.

- `id` (uuid, PK)
- `name` (text) — e.g., "Frontend", "Backend", "Java Developer"
- `description` (text)

#### `skills`

All available skills in the system.

- `id` (uuid, PK)
- `name` (text) — e.g., "JavaScript", "React", "Node.js"
- `category` (text) — e.g., "Frontend", "Backend", "Database"

---

### Skill Mapping Tables

#### `role_skills`

Required skills for each role (with importance weight).

- `id` (uuid, PK)
- `role_id` (uuid, FK → roles)
- `skill_id` (uuid, FK → skills)
- `weight` (integer) — importance of this skill for the role (1-10)

#### `user_skills`

User's current skill strengths.

- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `skill_id` (uuid, FK → skills)
- `strength_score` (integer, 0-100) — how proficient the user is

---

### Project Tables

#### `projects`

User's projects (from GitHub or manual entry).

- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `title` (text)
- `description` (text)
- `source` (text) — "github" or "manual"
- `complexity_score` (integer, 0-100)
- `created_at` (timestamp)

**Unique Constraint**: `(user_id, title)` — prevents duplicate projects per user.

#### `project_skills`

Skills used in each project.

- `id` (uuid, PK)
- `project_id` (uuid, FK → projects)
- `skill_id` (uuid, FK → skills)

**Unique Constraint**: `(project_id, skill_id)` — prevents duplicate skill mappings.

---

### GitHub Integration

#### `github_stats`

Aggregated GitHub metrics per user.

- `id` (uuid, PK)
- `user_id` (uuid, FK → users, UNIQUE)
- `username` (text) — GitHub username
- `repos_count` (integer)
- `total_stars` (integer)
- `activity_score` (integer, 0-100)
- `last_synced` (timestamp)

**Unique Constraint**: `user_id` — one GitHub profile per user.

---

### Readiness & Gap Analysis

#### `readiness_reports`

Job readiness calculation results.

- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `role_id` (uuid, FK → roles)
- `skill_match_score` (float, 0-100)
- `project_score` (float, 0-100)
- `github_score` (float, 0-100)
- `total_score` (float, 0-100)
- `created_at` (timestamp)

#### `skill_gap_results`

Individual skill gaps for a readiness report.

- `id` (uuid, PK)
- `report_id` (uuid, FK → readiness_reports)
- `skill_id` (uuid, FK → skills)
- `gap_type` (text) — "missing", "weak", "strong"
- `strength_score` (integer, 0-100) — user's current score

---

### Learning Roadmap

#### `roadmaps`

Auto-generated learning path for a user + role.

- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `role_id` (uuid, FK → roles)
- `readiness_report_id` (uuid, FK → readiness_reports)
- `total_steps` (integer)
- `created_at` (timestamp)

#### `roadmap_steps`

Individual steps in a roadmap (skills to learn, in priority order).

- `id` (uuid, PK)
- `roadmap_id` (uuid, FK → roadmaps)
- `skill_id` (uuid, FK → skills)
- `order_index` (integer) — step number (1, 2, 3, ...)
- `status` (text) — "pending", "in_progress", "completed"

---

## Key Relationships

```text
users
  ├── user_skills (1:many)
  ├── projects (1:many)
  ├── github_stats (1:1)
  ├── readiness_reports (1:many)
  └── roadmaps (1:many)

roles
  ├── role_skills (1:many)
  ├── readiness_reports (1:many)
  └── roadmaps (1:many)

skills
  ├── role_skills (1:many)
  ├── user_skills (1:many)
  ├── project_skills (1:many)
  ├── skill_gap_results (1:many)
  └── roadmap_steps (1:many)

projects
  └── project_skills (1:many)

readiness_reports
  ├── skill_gap_results (1:many)
  └── roadmaps (1:1)

roadmaps
  └── roadmap_steps (1:many)
```

---

## How to Update This Schema

1. **In Supabase Dashboard**: Make changes to tables/columns
2. **Export SQL**:
   - Go to SQL Editor → Run: `pg_dump ... > schema.sql`
   - Or use Supabase CLI: `supabase db dump -f schema.sql`
3. **Update this file** with any new tables/columns

---

## Seeding Data

Required seed data for the system to work:

### Roles

```sql
INSERT INTO roles (name, description) VALUES
  ('Frontend', 'Frontend web development with React/Vue/Angular'),
  ('Backend', 'Backend API development with Node.js/Python/Java'),
  ('Java Developer', 'Enterprise Java development with Spring/Jakarta EE');
```

### Skills (Examples)

```sql
INSERT INTO skills (name, category) VALUES
  ('JavaScript', 'Frontend'),
  ('React', 'Frontend'),
  ('Node.js', 'Backend'),
  ('PostgreSQL', 'Database'),
  ('Java', 'Backend');
```

### Role Skills (Examples)

```sql
-- Frontend role needs JavaScript (weight 10) and React (weight 9)
INSERT INTO role_skills (role_id, skill_id, weight) VALUES
  ((SELECT id FROM roles WHERE name='Frontend'), (SELECT id FROM skills WHERE name='JavaScript'), 10),
  ((SELECT id FROM roles WHERE name='Frontend'), (SELECT id FROM skills WHERE name='React'), 9);
```
