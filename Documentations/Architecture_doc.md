# CareerGPS Architecture Guide

> **Version:** 1.0
> **Architecture Style:** Modular Monolith + Feature-Based Architecture + Vertical Slice

---

# Table of Contents

* [Purpose](#purpose)
* [High-Level Architecture](#high-level-architecture)
* [Monorepo Structure](#monorepo-structure)
* [Backend Architecture](#backend-architecture)

  * [Backend Folder Structure](#backend-folder-structure)
  * [Feature-Based Organization](#feature-based-organization)
  * [Example Module](#example-module)
  * [Backend Responsibilities](#backend-responsibilities)

    * [Router](#router)
    * [Service](#service)
    * [Repository](#repository)
    * [Database](#database)
  * [Shared Folder](#shared-folder)
  * [What Belongs in Shared?](#what-belongs-in-shared)
  * [Authentication](#authentication)
  * [Communication Rules](#communication-rules)
  * [Dependency Flow](#dependency-flow)
  * [Events](#events)
* [Frontend Architecture](#frontend-architecture)

  * [Frontend Folder Structure](#frontend-folder-structure)
  * [Feature-Based Organization](#frontend-feature-based-organization)
  * [Example Feature](#example-feature)
  * [Frontend Responsibilities](#frontend-responsibilities)

    * [App](#app)
    * [Feature](#feature)
    * [Shared Components](#shared-components)
    * [Shared Hooks](#shared-hooks)
    * [Shared Utils](#shared-utils)
    * [Layouts](#layouts)
* [Architecture Principles](#architecture-principles)
* [Rules Every Developer Should Follow](#rules-every-developer-should-follow)
* [Benefits](#benefits)
* [Final Principle](#final-principle)

---

# Purpose

This document describes the architecture of CareerGPS and the conventions every developer should follow.

The goals of this architecture are:

* Keep business logic easy to find.
* Reduce coupling between features.
* Make the project easier to maintain as it grows.
* Make onboarding easy for new developers.
* Allow future scaling without major rewrites.

---

# High-Level Architecture

CareerGPS follows a **Modular Monolith** architecture.

The backend is organized into independent business modules.

The frontend is organized into independent feature modules.

Both follow the same philosophy:

> **Organize by business feature, not by file type.**

---

# Monorepo Structure

```text
CAREER_GPS/
│
├── apps/
│   ├── web/
│   └── server/
│
├── packages/
│   ├── config/
│   ├── env/
│   ├── shared/
│   └── ui/
│
└── docs/
```

---

# Backend Architecture

## Backend Folder Structure

```text
apps/server/src/

├── app.ts
├── index.ts

├── db/
│   ├── index.ts
│   ├── migrate.ts
│   └── schema.ts

├── modules/
│   ├── auth/
│   ├── profile/
│   ├── cv/
│   ├── ai/
│   ├── skills/
│   ├── jobs/
│   ├── recommendations/
│   └── notifications/

└── shared/
    ├── auth/
    ├── logger/
    ├── middleware/
    ├── queue/
    ├── storage/
    ├── validation/
    ├── errors/
    ├── utils/
    └── events/
```

---

## Feature-Based Organization

The backend is organized by business domain.

Instead of:

```text
routes/
services/
repositories/
schemas/
```

Everything related to one feature lives together.

Example:

```text
modules/

    cv/

    profile/

    jobs/

    auth/
```

This makes it much easier to understand and maintain the application.

---

## Example Module

```text
modules/

└── cv/

    ├── router.ts
    ├── rest.ts
    ├── service.ts
    ├── repository.ts
    ├── webhook.ts
    ├── timeout.job.ts
    ├── mapper.ts
    ├── schema.ts
    ├── types.ts
    ├── db/
    │   └── schema.ts
    └── index.ts
```

Everything related to CV management is inside one folder.

A developer never needs to search multiple directories to understand the feature.

---

# Backend Responsibilities

## Router

Responsible for:

* Receiving requests
* Validating input
* Calling services
* Returning responses

Routers should never contain business logic.

---

## Service

Services contain all business logic.

Examples:

* Upload CV
* Parse CV
* Match jobs
* Create profile
* Calculate skills

Services coordinate repositories and external services.

---

## Repository

Repositories are responsible only for persistence.

They should:

* Query data
* Insert data
* Update data
* Delete data

Repositories should never call external APIs or implement business rules.

---

## Database

Each module owns its own schema.

Example:

```text
modules/

    cv/

        db/

            schema.ts
```

The global schema simply exports all module schemas.

```ts
export * from "@/modules/auth/db/schema";
export * from "@/modules/profile/db/schema";
export * from "@/modules/cv/db/schema";
```

---

# Shared Folder

The shared folder contains reusable infrastructure.

```text
shared/

auth/
logger/
middleware/
queue/
storage/
validation/
utils/
errors/
events/
```

Shared should never contain business logic.

---

# What Belongs in Shared?

Examples:

* Logger
* Queue configuration
* Cloudinary client
* Middleware
* Error classes
* Utility functions
* Generic validation
* Event bus

Do NOT place:

* CV parser
* Skills algorithm
* Job matching
* Profile logic

inside shared.

---

# Authentication

Authentication has two different responsibilities.

Business logic:

```text
modules/auth
```

Infrastructure:

```text
shared/auth
```

Business auth manages users and sessions.

Shared auth provides middleware and permission helpers used by every module.

---

# Communication Rules

Modules communicate through:

* Services
* Public APIs
* Events

Never import another module's repository directly.

---

# Dependency Flow

```
Router

↓

Service

↓

Repository

↓

Database
```

Dependencies always point downward.

---

# Events

Long-running tasks should use events.

Example:

```
Upload CV

↓

CV Uploaded

↓

AI Parsing

↓

CV Parsed

↓

Skills Analysis

↓

Recommendations

↓

Notifications
```

This keeps modules independent and easier to scale.

---

# Frontend Architecture

The frontend follows the same philosophy as the backend.

Instead of organizing by technical folders like:

```text
components/
hooks/
pages/
api/
```

we organize by business feature.

This keeps every feature self-contained.

---

# Frontend Folder Structure

```text
apps/web/src/

├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   ├── trpc.ts
│   ├── query-client.ts
│   └── auth.ts
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── profile/
│   ├── cv/
│   ├── skills/
│   ├── jobs/
│   └── recommendations/
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── common/
│   ├── hooks/
│   ├── layouts/
│   ├── lib/
│   ├── utils/
│   ├── constants/
│   └── types/
│
├── assets/
├── styles/
└── main.tsx
```

---

# Frontend Feature-Based Organization

Each feature owns everything it needs.

Instead of spreading code across the project:

```text
components/
hooks/
pages/
api/
```

everything stays inside the feature.

This improves discoverability and reduces coupling.

---

# Example Feature

```text
features/

└── cv/

    ├── pages/
    │   ├── UploadPage.tsx
    │   └── ReviewPage.tsx
    │
    ├── components/
    │   ├── UploadDropzone.tsx
    │   ├── ParsingProgress.tsx
    │   └── SkillEditor.tsx
    │
    ├── hooks/
    │   ├── useUploadCV.ts
    │   ├── useCVStatus.ts
    │   └── useParsedCV.ts
    │
    ├── api/
    │   └── cv.ts
    │
    ├── validation.ts
    ├── types.ts
    └── index.ts
```

A developer working on CV functionality only needs to open one folder.

---

# Frontend Responsibilities

## App

The `app` folder contains application-wide configuration.

Examples:

* Router
* Providers
* Authentication initialization
* React Query configuration
* tRPC client

It should never contain business logic.

---

## Feature

A feature owns:

* Pages
* Components
* API hooks
* Business hooks
* Validation
* Types

Features should be independent from one another whenever possible.

---

## Shared Components

Reusable UI components belong here.

Examples:

```text
Button
Input
Modal
Dialog
Card
Badge
Spinner
```

These components are generic and can be reused across the application.

Feature-specific components stay inside the feature.

Examples:

```text
UploadDropzone
ResumePreview
SkillEditor
JobFilters
```

---

## Shared Hooks

Only reusable hooks belong here.

Examples:

```text
useDebounce()
useLocalStorage()
useMediaQuery()
useClickOutside()
```

Business hooks belong inside their feature.

Examples:

```text
useUploadCV()
useJobs()
useProfile()
```

---

## Shared Utils

Only generic helper functions belong here.

Examples:

```text
formatDate()
truncateText()
downloadFile()
```

Feature-specific utilities should stay inside the feature.

---

## Layouts

Layouts define the overall page structure.

Examples:

* Dashboard Layout
* Authentication Layout
* Marketing Layout

Layouts are shared because multiple pages can reuse them.

---

# Architecture Principles

When adding new code, ask yourself:

### Is this solving a business problem?

Place it inside a feature.

Examples:

* Profile
* CV
* Jobs
* Skills

---

### Is this reusable infrastructure?

Place it inside shared.

Examples:

* Logger
* Middleware
* Utilities
* Queue
* Shared UI

---

### Is this application configuration?

Place it inside the `app` folder.

Examples:

* Router
* Providers
* Query Client
* tRPC Client

---

# Rules Every Developer Should Follow

✅ Organize by feature, not by file type.

✅ Keep business logic close to the feature that owns it.

✅ Keep routers and controllers thin.

✅ Keep repositories database-only.

✅ Keep shared focused on reusable infrastructure.

✅ Keep application configuration inside the `app` folder.

✅ Don't expose a feature's internal implementation to other features.

✅ Prefer feature encapsulation over global folders.

---

# Benefits

* Easy onboarding for new developers
* Better scalability
* Easier navigation
* Smaller pull requests
* Better separation of concerns
* Easier testing
* Cleaner architecture
* Easier future migration to microservices if needed

---

# Final Principle

> **If deleting a feature makes a file inside `shared` useless, that file probably belongs inside the feature.**

The goal of this architecture is simple:

* Keep business logic close to the business feature.
* Keep infrastructure reusable.
* Keep modules independent.
* Make the codebase easy to understand, maintain, and scale.


