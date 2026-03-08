# Salesforce Implementation Reference

This reference covers Salesforce-specific interview questions, directory structure, deliverables, and workflows for the project-init skill.

---

## Salesforce-Specific Interview Questions

When the project type is identified as a Salesforce implementation, ask these additional questions during the interview rounds. Integrate them naturally into the existing rounds — don't dump them all at once.

### Org & Environment Setup

- What type of Salesforce org are you working with? (Sandbox, Scratch Org, Developer Edition, Production)
- Is there an existing org with data/configuration, or are you starting fresh?
- Will you be using SFDX CLI for deployments?
- Are there multiple environments (Dev → QA → UAT → Prod)? What's the promotion path?

### Scope & Solution Type

- What Salesforce clouds/products are involved? (Sales Cloud, Service Cloud, Experience Cloud, Marketing Cloud, CPQ, etc.)
- What types of customization will be needed?
  - Configuration (flows, validation rules, page layouts, permission sets)
  - Custom development (Apex, LWC, Visualforce, triggers)
  - Integrations (REST/SOAP APIs, middleware, external systems)
  - Data migration (from legacy systems, CSV imports, ETL)
- Are there any AppExchange packages or managed packages involved?

### Client Deliverables

The following deliverables use industry-standard Salesforce consulting formats. Ask the user which they need:

- **Business Requirements Document (BRD)** — captures business needs, processes, and stakeholder requirements
  - From the BRD, derive: Epics, Features, User Stories with acceptance criteria
- **Solution Design Document (SDD)** — technical architecture, data model, integration design, security model
- **Data Migration Plan** — source-to-target field mapping, transformation rules, validation approach
- **Test Plan** — unit testing, UAT scripts, regression testing approach
- **Architecture Diagrams** — ERD, integration architecture, data flow, process flow
  - Generate as **HTML-based interactive visualizations** for client-ready quality
  - Use D3.js, SVG, or similar for professional output that can be exported to PNG/PDF
- **Presentations** — status updates, design reviews, go-live readiness (use pptx skill)
- **Training Materials** — end-user guides, admin guides

Note: ERD diagrams for the Salesforce data model (objects, fields, relationships) should only be generated when the user explicitly requests them.

### Data Migration

- Will Data Loader be used for data migration?
- What are the source systems?
- Are there data transformation requirements?
- What's the data volume (approximate record counts)?
- Is there a data quality/cleansing step needed before migration?

---

## SFDX Project Directory Structure

When the project type is Salesforce, use this directory structure. The SFDX project structure lives alongside the documentation folder:

```
project-root/
├── CLAUDE.md                          # Claude's persistent memory
├── README.md                          # Project README (if enabled)
├── GETTING_STARTED.md                 # Session bootstrap (if enabled)
│
├── docs/                              # Living documentation
│   ├── BACKLOG.md                     # Phase-organized work items
│   ├── REQUIREMENTS.md                # Business requirements (BRD-derived)
│   ├── TECHNICAL_SPEC.md              # Solution design / technical spec
│   ├── DECISIONS.md                   # Architecture decision records
│   ├── CHANGELOG.md                   # Change history
│   ├── DATA_MODEL.md                  # Salesforce object model documentation
│   └── CODE_ATLAS.md                  # Codebase reference
│
├── deliverables/                      # Client-facing documents
│   ├── brd/                           # Business Requirements Documents
│   ├── sdd/                           # Solution Design Documents
│   ├── data-migration/                # Migration plans, field mappings
│   │   └── field-mappings/            # Source-to-target field mapping files
│   ├── test-plans/                    # Test plans and UAT scripts
│   ├── architecture/                  # Architecture diagrams (HTML visualizations)
│   ├── presentations/                 # Client presentations (.pptx)
│   └── training/                      # Training materials and guides
│
├── force-app/                         # SFDX source (default package)
│   └── main/
│       └── default/
│           ├── classes/               # Apex classes
│           ├── triggers/              # Apex triggers
│           ├── lwc/                   # Lightning Web Components
│           ├── aura/                  # Aura components (if needed)
│           ├── flows/                 # Flow definitions
│           ├── objects/               # Custom objects and fields
│           ├── permissionsets/        # Permission sets
│           ├── profiles/             # Profiles
│           ├── layouts/              # Page layouts
│           ├── tabs/                 # Custom tabs
│           └── staticresources/      # Static resources
│
├── scripts/                           # Utility scripts
│   ├── data/                          # Data loading scripts / Data Loader configs
│   └── deploy/                        # Deployment scripts
│
├── config/                            # SFDX configuration
│   └── project-scratch-def.json       # Scratch org definition (if using scratch orgs)
│
├── sfdx-project.json                  # SFDX project definition
└── .gitignore                         # Git ignore rules
```

---

## Salesforce Data Model Documentation

For Salesforce projects, `docs/DATA_MODEL.md` should document the Salesforce **object model** rather than SQL DDL. Adapt the structure:

- **Object Inventory** at the top: table with `Object API Name | Label | Type (Standard/Custom) | Description | Status (PLANNED/CREATED/MODIFIED)`
- **Object Definitions** grouped by functional area:
  - Each object gets a heading with a field table: `Field API Name | Label | Type | Required | Description`
  - Include validation rules, record types, and picklist values where applicable
- **Relationships** table: `Parent Object | Child Object | Relationship Type (Lookup/Master-Detail) | Field API Name`
- **ERD Diagram** (only when user requests): Mermaid erDiagram or HTML-based interactive visualization
- **Naming Conventions**: API name patterns, field prefixes, custom object suffix (__c)

---

## Salesforce-Specific Workflow Rules

These rules apply when the project type is Salesforce:

### Discovery & Requirements

- Guide the user through structured requirement gathering using Salesforce consulting methodology
- Produce a BRD with business processes, pain points, and desired outcomes
- Derive Epics → Features → User Stories from the BRD, each with acceptance criteria
- Document the Salesforce data model in `docs/DATA_MODEL.md` using Salesforce object notation
- Create architecture diagrams as HTML-based interactive visualizations in `deliverables/architecture/`

### Development Workflow

- Follow SFDX source-tracking workflow
- Apex classes should follow Salesforce best practices: bulkification, governor limits awareness, separation of concerns (trigger handler pattern)
- Write Apex unit tests for all custom code (aim for 85%+ coverage, as required by Salesforce)
- LWC components should follow Salesforce Lightning Design System (SLDS) conventions

### Client Deliverables

- Generate client-facing documents in professional formats (Word docs via docx skill, presentations via pptx skill)
- Architecture diagrams should be HTML-based interactive visualizations exportable to PNG/PDF
- All deliverables stored in `deliverables/` with clear subdirectory organization

### Data Migration

- Document source-to-target field mappings in `deliverables/data-migration/field-mappings/`
- Include transformation rules, default values, and validation queries
- Track migration status in the backlog

### Data Model Changes

- **Always confirm with the user before modifying the Salesforce object model** — this includes new objects, fields, relationships, validation rules, and record types
- Document all changes in `docs/DATA_MODEL.md` immediately
