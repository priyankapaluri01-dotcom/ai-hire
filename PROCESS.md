# PROCESS.md

## 1. Project Overview

Ask Your Hiring Data is a read-only natural-language analytics assistant for hiring data.

A user can ask questions such as:

- How many hires are in Engineering?
- What is the average time to fill for Product?
- Show hires by department.
- How many open jobs are there?

The system converts the natural-language question into a typed intermediate representation (QueryIR), validates it with Zod, applies server-side access control, and executes the validated query deterministically against the seeded hiring dataset.

The LLM proposes the query plan. It does not execute queries, access the dataset directly, or perform the final calculations.

---

## 2. Assumptions

### Dataset

The provided synthetic JSON dataset is treated as the complete source of truth.

The application does not connect to a production database or external hiring system.

### Demo users

For the demo:

- `RECRUITER` is represented by recruiter `R001`.
- `CHRO` is represented by `R004`.

In a production system these identities would come from authenticated user/session information rather than being selected directly by the UI.

### Access model

- Recruiters can access jobs and hires associated with their own requisitions.
- Recruiters cannot access organization-wide headcount data.
- CHRO has organization-wide access to the available hiring data.

Access control is enforced server-side before deterministic query execution.

### Product scope

The application is intentionally read-only.

The assessment does not require:

- multi-turn conversational memory
- voice interaction
- external company integrations
- production authentication
- production database infrastructure

---

## 3. Must Ship vs Deferred

### Must Ship

The following capabilities were prioritized:

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

The following were intentionally deferred:

- Production authentication and identity management
- Persistent conversation memory
- Production database/warehouse integration
- Live company integrations
- Advanced visualization customization
- Production observability and analytics
- Provider failover and advanced cost management
- Large-scale semantic modeling of hiring data

These can be added without changing the core QueryIR/executor architecture.

---

## 4. Design Notes

### Design Note 1 — Typed Intermediate Representation

The LLM does not generate SQL or arbitrary executable logic.

Instead, it produces a structured QueryIR containing fields such as:

- entity
- filters
- aggregation
- groupBy
- sort
- limit

The QueryIR is validated using Zod before it can reach the executor.

This creates a clear boundary between probabilistic LLM planning and deterministic application logic.

---

### Design Note 2 — Deterministic Execution

After validation, the QueryIR is executed by normal application code against the seeded dataset.

The executor is responsible for:

- filtering records
- grouping records
- calculating aggregations
- sorting results
- limiting results
- generating source/provenance information

The LLM never performs the final calculation.

This makes results reproducible and easier to test.

---

### Design Note 3 — Server-Side Access Control

Role information is converted into a server-side access scope before execution.

For recruiters, the executor restricts:

- jobs to the recruiter's own requisitions
- hires to hires associated with those requisitions

Recruiters are also prevented from querying headcount.

CHRO queries are allowed to operate across the organization.

The access rule is therefore enforced by application code rather than relying on the LLM prompt to behave securely.

---

### Design Note 4 — Grounded Responses

Query responses include source information describing the dataset, record IDs, and fields used by the query.

This allows an answer to be traced back to the underlying synthetic hiring records.

The application also avoids presenting unsupported questions as factual answers.

For questions outside the supported hiring-data scope, the planner can return an explicit refusal.

---

### Design Note 5 — Stable Prompt and Provider Boundary

The QueryIR prompt is registered with a stable ID and version.

The LLM provider is isolated behind a provider interface so that the application does not depend directly on a specific model implementation.

This allows the model/provider to be changed later without changing the deterministic query execution layer.

---

## 5. Validation and Error Handling

The API validates incoming requests using Zod before processing them.

The QueryIR is also validated before execution.

Invalid requests return an HTTP 400 response.

Unsupported questions can return a structured refusal rather than fabricated data.

Execution errors are handled by the API boundary and returned as structured error responses.

---

## 6. Evaluation Strategy

The project contains a 20-question evaluation set covering:

- simple counts
- grouped hiring analytics
- average time-to-fill
- minimum and maximum values
- headcount
- department-level analysis
- open jobs
- zero-result questions
- unsupported/out-of-scope questions

The evaluation runner validates the expected QueryIR/refusal structures and exercises the deterministic execution path.

The evaluation suite is intentionally provider-independent so that CI does not depend on live LLM availability or API quota.

The live LLM is responsible for producing the QueryIR during application usage, while the regression suite verifies the deterministic analytics behavior.

---

## 7. Running Tests and Evaluation

Install dependencies:

```bash
npm ci