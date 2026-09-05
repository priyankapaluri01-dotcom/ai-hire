# PROCESS.md

## 1. Project Overview

Ask Your Hiring Data is a read-only natural-language analytics assistant for hiring data.

A user can ask questions such as:

- How many hires are in Engineering?
- What is the average time to fill for Product?
- Show hires by department.
- How many open jobs are there?

The system converts the natural-language question into a typed QueryIR, validates it with Zod, applies server-side access control, and executes the validated query deterministically against the seeded hiring dataset.

The LLM proposes the query plan. It does not execute queries, access the dataset directly, or perform the final calculations.

---

## 2. Assumptions

### Dataset

The provided synthetic JSON dataset is treated as the complete source of truth.

The application does not connect to a production database, ATS, HRIS, or other external hiring system.

### Demo Users

For the demo:

- `RECRUITER` is represented by recruiter `R001`.
- `CHRO` is represented by `R004`.

In a production system, these identities would come from authenticated user/session information.

### Access Model

- Recruiters can access jobs associated with their own requisitions.
- Recruiters can access hires associated with their own requisitions.
- Recruiters cannot access organization-wide headcount data.
- CHRO has organization-wide access to the available hiring data.

Access control is enforced server-side before deterministic query execution.

### Product Scope

The application is intentionally read-only.

The following were considered outside the required assessment scope:

- Multi-turn conversational memory
- Voice interaction
- External company integrations
- Production authentication
- Production database infrastructure

---

## 3. Must Ship vs Deferred

### Must Ship

The following capabilities were prioritized because they directly address the assessment requirements:

- Seed-data loader
- Natural-language question handling
- LLM-based QueryIR generation
- Zod validation of QueryIR
- Deterministic query execution
- Server-side role-based access control
- Grounded source/provenance information
- Explicit refusal for unsupported questions
- Chart-ready response payload
- Minimal metric, bar, and pie chart rendering
- Automated evaluation dataset
- Regression tests
- CI quality checks
- Documentation for running the project

### Deferred

The following were intentionally deferred to keep the implementation focused:

- Production authentication and identity management
- Persistent conversation memory
- Production database/warehouse integration
- Live ATS/HRIS integrations
- Advanced visualization customization
- Production observability and analytics
- Provider failover and advanced cost management
- Large-scale semantic modeling of hiring data
- Browser-level end-to-end testing

These can be added later without changing the core QueryIR and deterministic executor architecture.

---

## 4. Design Notes

### Design Note 1 — Typed Intermediate Representation

The LLM does not generate SQL or arbitrary executable logic. Instead, it produces a structured QueryIR containing concepts such as entity, filters, aggregation, grouping, sorting, and result limits. The QueryIR is validated using Zod before it can reach the executor. This creates a clear boundary between probabilistic LLM planning and deterministic application logic.

### Design Note 2 — Deterministic Execution

After validation, the QueryIR is executed by normal application code against the seeded dataset. The executor is responsible for filtering records, grouping records, calculating aggregations, sorting results, limiting results, and generating source/provenance information. The LLM never performs the final calculation. This makes results reproducible and easier to test.

### Design Note 3 — Server-Side Access Control

Role information is converted into a server-side access scope before execution. For recruiters, the executor restricts jobs to the recruiter's own requisitions and restricts hires to hires associated with those requisitions. Recruiters are also prevented from querying headcount. CHRO queries are allowed to operate across the organization. The access rule is therefore enforced by application code rather than relying on the LLM prompt.

### Design Note 4 — Grounded Responses and Refusal

Query responses include source information describing the dataset, record IDs, and fields used by the query. This allows an answer to be traced back to the underlying synthetic hiring records. For questions outside the supported hiring-data scope, the planner can return a structured refusal instead of fabricating an answer. Valid in-domain questions that produce no matching records are treated differently from unsupported questions.

### Design Note 5 — Stable Prompt and Provider Boundary

The QueryIR planning prompt is maintained in a versioned prompt registry with a stable identifier. The LLM provider is isolated behind a provider interface so the application is not tightly coupled to a specific model implementation. This allows the provider or model to be changed later without changing the deterministic query execution layer.

---
## 5. Validation and Error Handling
The API validates the incoming request before processing the question.
The QueryIR is also validated using Zod before it reaches the executor.

The flow is:

Incoming Request → Request Validation → LLM Planning → QueryIR Validation → Access Control → Deterministic Execution

Invalid requests return a clear error instead of being processed.

Unsupported questions are refused instead of returning made-up information.

## 6. Groundedness Strategy
Every result includes source information from the underlying dataset.
Each source contains:

Dataset
Record ID
Relevant fields
Sources are created from the actual records used in the query, after access control and filtering are applied.
The LLM is not responsible for creating or inventing source references.

## 7. Evaluation Strategy
The project includes a 20-question evaluation set covering different types of hiring questions.
It includes:

Simple counts
Grouped hiring data
Average time-to-fill
Minimum and maximum values
Headcount
Department-level analysis
Open jobs
Zero-result questions
Unsupported questions
Refusal cases
The evaluation cases are stored in tests/eval/hiring-eval.json.
The evaluation runner is tests/eval/eval-runner.test.ts.

The evaluation is provider-independent, so CI does not depend on the live LLM or API availability.

## 8. Running Tests and Evaluation
Install dependencies:
npm ci

Run lint:

npm run lint

Run TypeScript type checking:

npx tsc --noEmit

Run tests and the evaluation suite:

npm test

Run the production build:

npm run build

The tests cover:

QueryIR validation
Deterministic query execution
Access control
Evaluation cases
The evaluation suite runs as part of npm test and CI.
## 9. CI Quality Gate
The project uses GitHub Actions for continuous integration.
The workflow is located at .github/workflows/ci.yml.

It runs on every:

Push
Pull request
The workflow checks:
Dependencies
ESLint
TypeScript
Tests
Evaluation suite
This helps catch issues before changes are merged.
## 10. What I Intentionally Did Not Test
The automated tests mainly focus on the deterministic parts of the application.
I did not test:

Live Gemini response quality
Gemini API availability
Production authentication
Real multi-tenant infrastructure
External ATS or HRIS integrations
Production database performance
Multi-turn conversation memory
Browser-level end-to-end testing
Production-scale load
Production monitoring
Provider failover
The evaluation suite also does not make live LLM calls because model availability and API limits could make CI unreliable.
## 11. What I Would Do Differently With Two More Weeks
With two more weeks, I would focus on making the prototype more production-ready.
Real Authentication and RBAC
Replace the demo users with real authentication and proper tenant-aware access control.
Database-Backed Analytics
Move the local JSON data into a proper database while keeping the same QueryIR and deterministic execution approach.
Better Hiring Metrics
Create a small semantic layer for metrics like hires, open jobs, headcount, and time-to-fill so they are defined consistently.
AI Monitoring
Add monitoring for model latency, token usage, failed query plans, refusals, and invalid QueryIR responses.
Better LLM Reliability
Add retries and provider fallback for temporary API failures and rate limits.
More Evaluation Cases
Add more difficult questions, especially around permissions, ambiguous questions, empty results, invalid QueryIRs, groundedness, and refusal behavior.
End-to-End Testing
Add browser tests for the complete flow from asking a question to displaying the result, sources, and chart.
## 12. Intentional Scope Tradeoffs
The biggest design decision was keeping the execution deterministic.
Instead of letting the LLM generate SQL or execute arbitrary logic, it only proposes a typed QueryIR. The application validates that QueryIR and performs the actual calculations.

This makes the system easier to test, secure, and reason about.

I also kept the evaluation suite independent of the live LLM so that CI remains reliable even when the model provider has rate limits or temporary availability issues.

The demo uses fixed users because production authentication was outside the scope of this assessment.

The hiring data also stays as local JSON because the focus of the project is the analytics assistant rather than production data infrastructure.

## 13. Intentional Gaps
Some parts were intentionally kept out of scope for this version:
Synthetic local dataset
Fixed demo users
No persistent conversation memory
No external ATS/HRIS integrations
No production database
No production authentication
No production monitoring
No provider failover
No browser-level end-to-end tests
CI does not make live LLM calls
These were deferred so I could focus on the core requirements: typed QueryIR, validation, deterministic execution, access control, grounded answers, refusals, charts, evaluation, and CI.
## 14. Final Submission Checklist
Before submission, the repository should contain:
Public GitHub repository
README.md with setup instructions
.env.example
PROCESS.md
.github/workflows/ci.yml
Seeded hiring dataset
QueryIR schema
Deterministic executor
Server-side access control
Grounded source information
Refusal handling
Chart-ready responses
Evaluation suite
Unit and regression tests
Passing CI
The application is deployed at:
https://ai-hire-ashy.vercel.app

The real GEMINI_API_KEY is not committed to the repository. It is provided through environment variables locally and through Vercel for the deployed application.

