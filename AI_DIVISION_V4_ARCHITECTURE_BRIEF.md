# AI Division v4 Architecture Brief

## Purpose

This brief defines the target architecture for AI Division once the current live shell has been stabilized enough to stop carrying every future ambition. v4 should not be another layer on top of the legacy runtime. It should be a cleaner application architecture built around explicit objects, workflow lineage, durable memory, and a credible intelligence layer.

## v4 product thesis

AI Division v4 should be an internal creative intelligence operating system for Silva Studios. It should unify:

- studio direction
- identity and continuity control
- prompt generation
- output review
- planning and campaign packaging
- system memory
- specialist intelligence

inside one coherent operating environment.

v4 should earn the “operating system” label through contracts and behavior, not through UI language.

## Design principles

### 1. One brain, not layered parallel brains

v4 must have explicit ownership boundaries. No late patch stack should be required to define product behavior.

### 2. Objects before pages

The architecture should be built around core entities and relationships, not around a collection of visually separate modules.

### 3. Workflow lineage is first-class

Every important artifact should be traceable to the work before and after it.

### 4. Intelligence must be operational

Agents, specialists, and modes must be tied to real system actions, review logic, or decision routing.

### 5. Continuity is a competitive advantage

Identity lock, continuity memory, and selective reference systems should be treated as core product infrastructure.

### 6. Premium means disciplined

The interface should feel quiet, sharp, and authoritative because the system beneath it is controlled, not because the shell is heavily decorated.

## Target product structure

## Primary surfaces

- Studio Pulse
- Create
- Review
- Plan
- Character System
- Assets & Continuity

These are the real operating pillars of the product.

## Supporting surfaces

- Cross-Character
- Location / Context Bank
- Caption support
- B-Roll support

These should support the main workflow, not behave like equal peers.

## System surfaces

- Settings
- Providers
- Analytics
- Dev / Admin

These belong behind a system boundary.

## Core object model

v4 should be built around explicit first-class contracts.

### Workspace

Represents the active studio context. Contains current session context, recent activity, priorities, and operating summaries.

### CharacterProfile

Represents a stable character identity, specialist role, continuity rules, reference sets, mode defaults, and review heuristics.

### IdentityLock

Represents canonical traits, protected visual rules, never-change constraints, and approved flex ranges.

### AssetSet

Represents face, body, environment, outfit, item, and signature reference groups tied to characters or contexts.

### ContinuityContext

Represents environments, objects, home references, transport, recurring lived details, and scene anchors used selectively.

### PromptRecord

Represents a prompt, its inputs, character context, references used, mode, and downstream links.

### OutputRecord

Represents a generated result tied to prompt, character, continuity inputs, review state, and provenance.

### ReviewEvent

Represents an evaluation of an output or prompt, including drift, strengths, failures, recommended changes, and approved patterns.

### PlannerItem

Represents a scheduled or proposed piece of work linked to campaign, character, asset needs, and prior review learning.

### Campaign

Represents a container for related creative work, review goals, planned outputs, and reusable creative direction.

### AgentTask

Represents a routed piece of analysis, review, recommendation, or coordination assigned to Studio Pulse or a specialist character.

### SystemMemory

Represents durable summaries, learned constraints, repeat failures, approved patterns, and recent operating context.

## Relationship model

The critical v4 relationships should be:

- CharacterProfile -> IdentityLock
- CharacterProfile -> AssetSet
- CharacterProfile -> ContinuityContext
- PromptRecord -> CharacterProfile
- PromptRecord -> AssetSet
- PromptRecord -> ContinuityContext
- OutputRecord -> PromptRecord
- ReviewEvent -> OutputRecord
- ReviewEvent -> CharacterProfile
- PlannerItem -> ReviewEvent
- PlannerItem -> Campaign
- AgentTask -> Workspace
- AgentTask -> CharacterProfile or Studio Pulse
- SystemMemory -> CharacterProfile, Campaign, and ReviewEvent summaries

## Target system architecture

## 1. App shell layer

Responsible for:

- navigation
- layout
- routing
- global workspace context
- surface orchestration

This layer should be thin. It should not contain domain logic.

## 2. Domain service layer

Responsible for:

- characters
- identity lock
- assets
- continuity
- prompts
- outputs
- reviews
- planning
- campaigns
- workspace summaries

This layer is where business rules live.

## 3. Intelligence orchestration layer

Responsible for:

- Studio Pulse reasoning
- specialist routing
- mode interpretation
- next-action recommendations
- review escalation
- memory summarization

This layer should consume domain facts, not invent product truth from UI state.

## 4. Persistence layer

Responsible for:

- first-class storage of core objects
- lineage retrieval
- event logging
- memory summaries
- import/export and backup flows

This layer must have a clearly defined source of truth.

## 5. Integration layer

Responsible for:

- model/provider calls
- media storage
- background processing
- external sync pathways where needed

This layer should remain replaceable and explicitly bounded.

## Target data flow

### Creation flow

1. Operator enters Studio Pulse or Create.
2. Character context and identity lock are loaded.
3. Relevant continuity and asset context is suggested selectively.
4. PromptRecord is created or revised.
5. OutputRecord is produced from the prompt.
6. Output is sent to Review.
7. ReviewEvent captures findings.
8. PlannerItem or Campaign links are created when appropriate.
9. SystemMemory updates summaries and future guidance.

### Direction flow

1. Operator asks Studio Pulse a question.
2. Studio Pulse resolves workspace, character, review, and planning context.
3. It routes reasoning to Studio Pulse or a specialist role.
4. It returns a decision, warning, or next action grounded in domain facts.

### Consistency flow

1. CharacterProfile and IdentityLock define non-negotiables.
2. AssetSet and ContinuityContext provide selective supporting references.
3. ReviewEvents identify drift or approved patterns.
4. SystemMemory raises future warnings or recommendations.

## Intelligence design

## Studio Pulse

Studio Pulse should be the lead operating intelligence. It should:

- summarize current work state
- identify review debt
- flag continuity weakness
- route specialist involvement
- recommend next actions
- surface tradeoffs clearly

## Specialist characters

Characters should not function as mascots. Each one should have:

- a role
- a decision lane
- review authority
- escalation triggers
- preferred output style
- memory context

### Example operating lanes

- Leah: taste, trend, creative direction
- Claudia: structure, delivery, operational clarity
- Grok: systems, technical logic, automation structure
- Vanya: tone, social energy, people resonance
- Aisha: executive creative authority and brand control

## Modes

Modes should become policy modifiers, not flavor labels. They should affect:

- prompt style
- review strictness
- recommendation bias
- escalation behavior
- output acceptance thresholds

## What v4 should not carry forward

- patch-stacked runtime ownership
- module sprawl without object relationships
- decorative system pages with weak operational backing
- shallow mode behavior
- isolated outputs with no lineage
- admin/system surfaces competing with primary workflow
- duplicated truths across local runtime and backend

## Migration strategy

### Step 1: Stabilize v3 object assumptions

Before v4 build starts, v3 should already have rough definitions for:

- prompt
- output
- review
- planner item
- character
- identity lock
- asset set

### Step 2: Build v4 contracts first

Define API and storage contracts before designing final screens.

### Step 3: Build Studio Pulse and Character System as the first true v4 pillars

These are the highest-leverage architectural anchors.

### Step 4: Build Review and lineage before broad module expansion

Review is what turns the product into a compounding system.

### Step 5: Migrate supporting surfaces only when they have real object relationships

Location banks, caption support, and continuity support should be rebuilt only after the core contracts are stable.

## Readiness gates for starting v4 build

v4 should not start as a broad build effort until these are true:

1. v3 has a stable definition of primary versus support versus system surfaces.
2. The core object model is agreed.
3. Source-of-truth policy is agreed.
4. ReviewEvent and lineage design are agreed.
5. Studio Pulse’s role is defined as an operating layer, not a chat layer.
6. Character specialist roles are explicit.

## Recommended v4 success standard

v4 succeeds if an operator can:

- understand the product’s job immediately
- move from direction to creation to review to planning without losing context
- trust character consistency across time
- see why the system recommends a next action
- recover prior learning instead of starting from zero
- use Studio Pulse as an actual operating brain

## Final standard

v4 should feel like one disciplined studio intelligence system with clear objects, real memory, and believable specialist logic. If it still feels like a collection of impressive modules, the architecture has failed.
