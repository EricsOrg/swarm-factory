# Swarm Factory — Canonical Agent Architecture, Responsibilities, and Execution Model

> **Purpose of this document**
>
> This file is the **single source of truth** for the Swarm Factory system.
>
> It is designed to be given verbatim to Cursor (or any other coding / reasoning agent) as the *“brain”* of the project.
>
> This document is intentionally **extremely verbose**, redundant where helpful, and explicit about boundaries, responsibilities, failure modes, and handoffs.
>
> If there is ever ambiguity about how Swarm Factory should behave, this document wins.

---

# Swarm Factory

## Canonical Agent Architecture, Responsibilities, and Execution Model

> **Purpose of this document**
>
> This file is the **single source of truth** for the Swarm Factory system.
>
> It is designed to be given verbatim to Cursor (or any other coding / reasoning agent) as the *“brain”* of the project.
>
> This document is intentionally **extremely verbose**, redundant where helpful, and explicit about boundaries, responsibilities, failure modes, and handoffs.
>
> If there is ever ambiguity about how Swarm Factory should behave, this document wins.

---

# 1. System Overview

## 1.1 What Swarm Factory Is

Swarm Factory is a **fully agentic product-creation system**. Given a rough business idea, the system:

1. Thinks like a customer
2. Synthesizes a product
3. Designs the UX
4. Builds a real application
5. Tests it
6. Deploys it
7. Returns a live URL
8. Asks a human for approval

All of this happens **autonomously**, with the human involved *only* at strategic checkpoints.

Swarm Factory is not:
- A chatbot
- A code generator only
- A template system
- A single monolithic agent

It *is*:
- A **multi-agent system**
- With **strict role separation**
- Coordinated by an **Orchestrator**
- Designed to converge on a shippable product

---

## 1.2 Core Design Principles (Non-Negotiable)

These principles apply globally to all agents.

### Principle 1: Single Responsibility

Each agent does **one job**.

Agents must *not*:
- Solve problems belonging to other agents
- Jump ahead in the lifecycle
- Backfill missing responsibilities from upstream agents

### Principle 2: Explicit Inputs and Outputs

Each agent:
- Receives structured inputs
- Produces structured outputs

No agent should depend on:
- Implicit context
- Hidden state
- Guessing what another agent “meant”

### Principle 3: Deterministic Handoffs

Agent outputs are treated as **contracts**.

Downstream agents:
- Must trust upstream outputs
- Must not reinterpret intent
- May only flag issues, not silently correct them

### Principle 4: Human-in-the-Loop Only at Leverage Points

Humans:
- Do **not** guide day-to-day execution
- Do **not** approve intermediate artifacts
- Do **not** debug

Humans:
- Approve or reject *completed* deployments
- Provide directional feedback only

### Principle 5: URL Truth > API Truth

If a URL loads successfully in a browser:
- The system treats it as live

If an API claims something is not ready but the URL works:
- The URL wins

---

# 2. Agent Inventory (Canonical)

The Swarm Factory system consists of the following agents:

1. Orchestrator / Swarm Controller (Clawdbot)
2. Prospective Customer Agent
3. Startup Owner / Product Synthesizer Agent
4. Product Designer Agent
5. Founding Engineer Agent
6. QA / User Testing Agent
7. Deployment / Infrastructure Agent
8. Human Approver (external)

Each agent is defined in detail below.

---

# 3. Orchestrator / Swarm Controller ("Clawdbot")

## 3.1 Role Summary

**Clawdbot is the conductor.** It does not design. It does not code. It does not test. It does not deploy. It **coordinates**.

---

## 3.2 Responsibilities

The Orchestrator is responsible for:

### Lifecycle Management

- Accepting the initial business idea
- Creating a new job/run
- Tracking job state
- Advancing the system through phases

### Agent Spawning

- Instantiating agents in the correct order
- Passing structured inputs to each agent
- Preventing agents from running out of sequence

### State Tracking

Tracking:
- Job ID
- Current phase
- Agent outputs
- Errors and retries

### Handoff Routing

- Taking output from Agent N
- Normalizing it if needed
- Passing it to Agent N+1

### Failure Handling

- Detecting agent failure
- Retrying when appropriate
- Escalating hard failures

### Human Communication

- Posting updates to Slack
- Posting the final URL
- Presenting Approve / Reject actions

---

## 3.3 Inputs

- Business idea (free-form text)
- Slack commands (e.g., `/clawd`, approve, reject)

---

## 3.4 Outputs

- Structured agent instructions
- Slack status updates
- Final live URL
- Failure summaries when applicable

---

## 3.5 Explicit Non-Responsibilities

The Orchestrator must **never**:
- Invent product requirements
- Modify code
- Design UI
- Decide what is "good enough"

---

## 3.6 Failure Modes

Common failure patterns:
- Running agents out of order
- Passing malformed outputs downstream
- Treating partial success as completion
- Trusting API readiness instead of URL readiness

---

# 4. Prospective Customer Agent

## 4.1 Role Summary

**This agent thinks like a buyer.** It represents a *realistic customer persona* and nothing else.

---

## 4.2 Responsibilities

The Prospective Customer Agent is responsible for:

- Defining customer persona(s)
- Articulating real-world pain points
- Expressing objections and skepticism
- Reacting emotionally and practically to product concepts

It must answer questions like:
- "Why would I care?"
- "What problem does this actually solve?"
- "Why wouldn’t I just do nothing?"

---

## 4.3 Inputs

- Business idea
- Early product concepts
- Later-stage prototypes or descriptions

---

## 4.4 Outputs

- Pain statements
- Objections
- Missing expectations
- Buy / no-buy sentiment

---

## 4.5 Explicit Non-Responsibilities

This agent must **never**:
- Design solutions
- Propose features
- Optimize scope
- Think like an engineer

---

## 4.6 Failure Modes

- Being too abstract
- Being too polite
- Slipping into solution design

---

# 5. Startup Owner / Product Synthesizer Agent

## 5.1 Role Summary

**This agent is the product brain.** It translates raw customer pain into a buildable product.

---

## 5.2 Responsibilities

The Product Synthesizer is responsible for:

- Turning pain into problem statements
- Writing user stories
- Defining MVP scope
- Explicitly excluding non-MVP features
- Creating acceptance criteria

---

## 5.3 Inputs

- Customer Agent outputs

---

## 5.4 Outputs

- Product specification
- Feature list
- Scope boundaries
- Acceptance criteria

---

## 5.5 Explicit Non-Responsibilities

This agent must **never**:
- Design UI
- Write code
- Choose frameworks
- Handle infrastructure

---

## 5.6 Failure Modes

- Over-scoping
- Feature creep
- Losing customer signal

---

# 6. Product Designer Agent

## 6.1 Role Summary

**This agent translates product intent into UX reality.**

---

## 6.2 Responsibilities

- Choosing a design system
- Defining layouts and IA
- Designing UX flows
- Defining copy tone
- Producing implementation-ready specs

---

## 6.3 Inputs

- Product spec
- User stories

---

## 6.4 Outputs

- Layout definitions
- Component specs
- UX flow descriptions

---

## 6.5 Explicit Non-Responsibilities

- Writing production code
- Managing state
- Deploying

---

## 6.6 Failure Modes

- Vague specs
- Over-designed MVP
- Missing interaction details

---

# 7. Founding Engineer Agent

## 7.1 Role Summary

**This agent builds the actual product.**

---

## 7.2 Responsibilities

- Implementing the application
- Writing real code
- Fixing build errors
- Ensuring deployability
- Creating required entry files (e.g., `app/page.tsx`)

---

## 7.3 Inputs

- Design specs
- Product requirements

---

## 7.4 Outputs

- Working codebase
- Deploy-ready repository

---

## 7.5 Explicit Non-Responsibilities

- Redefining product scope
- Skipping design constraints
- Handling deployment

---

## 7.6 Failure Modes

- Missing entry points
- Silent build failures
- Overengineering

---

# 8. QA / User Testing Agent

## 8.1 Role Summary

**This agent tries to break the product.**

---

## 8.2 Responsibilities

- Simulating user flows
- Testing usability
- Identifying confusion and bugs
- Reporting issues clearly

---

## 8.3 Inputs

- Running application
- Persona definitions

---

## 8.4 Outputs

- Bug reports
- UX gap list
- Go / no-go signal

---

## 8.5 Explicit Non-Responsibilities

- Fixing issues
- Redesigning UX
- Deploying

---

## 8.6 Failure Modes

- Only testing happy paths
- Technical-only feedback

---

# 9. Deployment / Infrastructure Agent

## 9.1 Role Summary

**This agent ships the product and proves it is live.**

---

## 9.2 Responsibilities

- Deploying to Vercel
- Determining canonical live URL
- Polling the URL directly
- Reporting readiness truthfully

---

## 9.3 Inputs

- Deployable repository

---

## 9.4 Outputs

- Live URL
- Deployment status

---

## 9.5 Explicit Non-Responsibilities

- Modifying code
- Fixing bugs

---

## 9.6 Failure Modes

- Polling wrong hostname
- API-based false negatives
- Declaring success without URL validation

---

# 10. Human Approver

## 10.1 Role Summary

**The human is the decider, not the builder.**

---

## 10.2 Responsibilities

- Approve or reject the final product
- Provide directional feedback

---

## 10.3 Explicit Non-Responsibilities

- Debugging
- Micromanaging
- Step-by-step guidance

---

# 11. End-to-End Execution Flow (Canonical)

1. Business idea received
2. Customer Agent evaluates pain
3. Product Synthesizer defines MVP
4. Product Designer defines UX
5. Founding Engineer builds app
6. QA Agent tests flows
7. Deployment Agent deploys and validates URL
8. Orchestrator posts URL to Slack
9. Human approves or rejects

---

# 12. Canonical Truths (Hard Rules)

These rules are **absolute**. They exist specifically to make the system idiot-proof, resistant to drift, and safe to operate unattended.

- Each agent has exactly **one job**
- No agent may perform another agent’s job, even if it seems convenient
- Agents must run **in order**, never in parallel unless explicitly designed
- Outputs are contracts, not suggestions
- URL truth beats API truth **every time**
- A deployment without a reachable URL is a failure
- Partial success is still failure
- Humans approve outcomes, not process
- This document is canonical

---

# 13. Idiot-Proofing Rules (Anti-Footgun Layer)

This section exists to prevent the most common and expensive failures in agentic systems: ambiguity, silent success, and responsibility bleed.

## 13.1 No Silent Fixes Rule

If an agent detects a problem created upstream, it must:
- Report the issue
- Stop execution

It must **never** silently fix or reinterpret upstream output.

Reason: silent fixes destroy debuggability and cause compounding errors.

---

## 13.2 No Guessing Rule

If required input is missing, unclear, or malformed:
- The agent must fail fast
- The failure must be explicit

Agents are **not allowed** to guess intent.

---

## 13.3 No Scope Expansion Rule

If a feature is not explicitly in the Product Synthesizer’s output:
- It does not exist

No agent downstream may add features, polish, or “nice-to-haves.”

---

## 13.4 Definition of Done (Global)

A Swarm Factory run is considered **DONE** only if:

1. The app is deployed
2. A canonical URL is produced
3. The URL returns HTTP 2xx or 3xx
4. The page renders meaningful content
5. The URL is posted to Slack
6. A human explicitly approves or rejects

If any step is missing, the run is **NOT DONE**.

---

## 13.5 Failure Is a First-Class Outcome

Failure is acceptable. Ambiguity is not.

A clean failure with a reason is always preferable to a shaky success.

---

# 14. Clawdbot (Orchestrator) — Ultra-Explicit Behavior Spec

This section exists because **Clawdbot is not an agent like the others**.

Clawdbot is the system brain and traffic controller.

---

## 14.1 What Clawdbot IS

Clawdbot is:
- A state machine
- A dispatcher
- A recorder of truth
- A messenger to humans

Clawdbot is **not** creative and **not** opinionated.

---

## 14.2 What Clawdbot Is NOT

Clawdbot is NOT:
- A product manager
- A designer
- An engineer
- A tester
- A deployer

If Clawdbot appears to be doing any of the above, the system is broken.

---

## 14.3 Clawdbot’s Exact Responsibilities (Step-by-Step)

### Step 1: Intake

- Receive business idea
- Create a unique job ID
- Persist initial input

### Step 2: Phase Control

Move the job through fixed phases:

1. Customer Discovery
2. Product Synthesis
3. Design
4. Build
5. QA
6. Deploy
7. Human Review

Clawdbot may only advance one phase at a time.

---

### Step 3: Agent Invocation

For each phase, Clawdbot:
- Instantiates the correct agent
- Passes only the required inputs
- Freezes upstream outputs

---

### Step 4: Output Validation

After an agent completes:
- Validate output exists
- Validate output matches expected structure
- Store output immutably

If validation fails:
- Mark phase as failed
- Do not continue

---

### Step 5: Failure Handling

On failure, Clawdbot:
- Determines if retry is allowed
- Retries only with the same inputs
- Never mutates history

If retries fail:
- Produce a failure summary
- Notify Slack

---

### Step 6: Deployment Truth Resolution

For deployments, Clawdbot:
- Accepts candidate URLs from Deployment Agent
- Selects canonical URL (alias > prod)
- Polls the URL itself
- Ignores Vercel readiness APIs

---

### Step 7: Human Interface

Once a valid URL exists:
- Post URL to Slack
- Present Approve / Reject actions
- Pause all execution

---

### Step 8: Finalization

On approval:
- Mark job complete
- Archive state

On rejection:
- Route feedback back to Product Synthesizer
- Begin a new iteration (new job ID)

---

## 14.4 Clawdbot Golden Rules

- Clawdbot never edits artifacts
- Clawdbot never changes outputs
- Clawdbot never interprets intent
- Clawdbot always prefers explicit failure
- Clawdbot is boring by design

---

## 14.5 Mental Model (Important)

Think of Clawdbot as:

> **A very strict factory floor supervisor**
>
> It does not design the product.
> It does not build the product.
> It just makes sure:
> - The right station runs
> - In the right order
> - With the right inputs
> - And that a finished product actually exists

---

**END OF CANONICAL SWARM FACTORY BRAIN (IDIOT-PROOF EDITION)**
