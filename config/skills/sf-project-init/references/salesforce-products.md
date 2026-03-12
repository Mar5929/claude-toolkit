# Salesforce Products Reference

This reference provides structured information for each major Salesforce product, designed to guide the sf-project-init interview process. Each section covers key objects, common customizations, and targeted interview questions.

---

## Sales Cloud

### Key Objects

| Object | Purpose |
|---|---|
| Lead | Unqualified prospect — entry point for the sales pipeline |
| Account | Company or organization — central entity for B2B relationships |
| Contact | Individual person associated with an Account |
| Opportunity | Active deal — tracks value, stage, close date, and probability |
| Quote | Formal pricing proposal linked to an Opportunity |
| Product2 | Item or service the company sells |
| PricebookEntry | Product-price combination within a specific Pricebook |
| Pricebook2 | Collection of products with specific pricing (Standard, Partner, etc.) |
| Campaign | Marketing initiative used to track ROI and lead source |
| CampaignMember | Junction between Campaign and Lead/Contact |
| Task | Activity — call, email, to-do item linked to a record |
| Event | Calendar activity — meeting, demo, appointment |
| OpportunityContactRole | Links Contacts to Opportunities with specific roles |
| OpportunityLineItem | Product line item on an Opportunity |

### Common Customizations

- **Lead scoring and grading** — Custom fields or Einstein Lead Scoring to prioritize follow-up.
- **Custom opportunity stages** — Aligned to the client's sales methodology (MEDDIC, BANT, Sandler, etc.).
- **Approval processes** — Discount approvals, deal desk reviews, executive sign-off thresholds.
- **Territory management** — Enterprise Territory Management for geographic or named-account assignment.
- **Forecasting** — Collaborative Forecasting with custom forecast categories and quotas.
- **Lead assignment rules** — Round-robin, geographic, or product-based lead routing.
- **Path and guidance** — Stage-specific coaching tips on Opportunity and Lead paths.
- **CPQ integration** — Connecting Sales Cloud to Revenue Cloud/CPQ for complex quoting.
- **Email integration** — Einstein Activity Capture or Salesforce for Outlook/Gmail.
- **Reports and dashboards** — Pipeline coverage, conversion rates, sales velocity, win/loss analysis.

### Interview Questions

1. Walk me through your current sales process from lead to close. How many stages?
2. Where do your leads come from? (Web, referral, events, purchased lists, partner, inbound marketing)
3. What are your opportunity stages and exit criteria for each stage?
4. Do you have a defined sales methodology (MEDDIC, BANT, Sandler, Challenger)?
5. How do you handle quoting? Do you need CPQ, or is standard Quotes sufficient?
6. Do you use territory management? How are territories defined (geography, named accounts, industry)?
7. What approval processes exist today? (Discounts, deal desk, legal review)
8. How do you forecast? What forecast categories and cadence?
9. Do you need lead scoring? What criteria determine a qualified lead?
10. What integrations feed into or out of the sales process? (Marketing automation, ERP, contract management)

---

## Service Cloud

### Key Objects

| Object | Purpose |
|---|---|
| Case | Customer issue or request — core Service Cloud object |
| CaseComment | Internal or public comment on a Case |
| Entitlement | Defines support level a customer is entitled to |
| EntitlementProcess | Milestone-driven SLA process attached to entitlements |
| ServiceContract | Agreement defining support terms and entitlements |
| Knowledge__kav | Knowledge article — FAQ, troubleshooting guide, how-to |
| LiveChatTranscript | Record of a live chat session |
| MessagingSession | Record of a messaging interaction (SMS, WhatsApp, Facebook) |
| SocialPost | Social media interaction linked to a case |
| WorkOrder | Field service work to be performed |
| Asset | Product owned by the customer — tracked for support |

### Common Customizations

- **Case assignment rules** — Route cases by product, region, priority, language, or customer tier.
- **Escalation rules** — Auto-escalate unresolved cases based on age, priority, or SLA breach.
- **Entitlement processes** — Milestone tracking with SLA timers (first response, resolution time).
- **Knowledge base** — Article types, data categories, approval workflows, and channel-specific publishing.
- **Omni-Channel routing** — Skills-based or queue-based routing across chat, phone, email, messaging.
- **Chatbots (Einstein Bots)** — Deflect common inquiries, collect case info before agent handoff.
- **Email-to-Case** — Inbound email parsing, threading, and auto-case creation.
- **Service Console** — Customized console layout with split views, related lists, and utility bar components.
- **Macros** — One-click actions for common agent tasks (update status, send template email, log activity).
- **Customer satisfaction surveys** — Post-case CSAT collection via email or in-app.

### Interview Questions

1. What support channels do you offer? (Phone, email, chat, social, self-service portal, SMS/messaging)
2. What are your SLA requirements? (First response time, resolution time, by priority/tier)
3. How should cases be routed? (Skills, queue, product, language, region, customer tier)
4. Do you need a knowledge base? Who creates articles? What approval process?
5. Do you need a self-service portal for customers? (Experience Cloud)
6. What escalation rules exist? When does a case escalate, and to whom?
7. Do you use entitlements and service contracts? How are support tiers defined?
8. Are you using or planning to use chatbots for case deflection?
9. Do agents need a Service Console? What information do they need at a glance?
10. How do you measure support quality? (CSAT, NPS, first contact resolution, average handle time)

---

## Experience Cloud

### Key Objects

| Object | Purpose |
|---|---|
| Site | The Experience Cloud site configuration |
| Network | Represents the community/site network |
| NetworkMember | User membership and profile within the site |
| TopicAssignment | Topic tagging for content and discussions |
| ContentDocument | Files and documents shared in the community |
| CollaborationGroup | Groups for community members |
| FeedItem | Chatter feed posts within the community |
| NavigationMenuItem | Site navigation structure |

### Common Customizations

- **Partner portals** — Deal registration, lead distribution, co-selling dashboards, MDF management.
- **Customer communities** — Case submission, knowledge browsing, account management, order history.
- **Employee portals** — HR self-service, IT help desk, internal knowledge base.
- **Custom themes and branding** — CSS overrides, custom Lightning components, branded templates.
- **Case deflection** — Knowledge search before case creation, suggested articles, chatbot integration.
- **Content management** — CMS workspaces, managed content, topics-based navigation.
- **Authentication** — SAML SSO, social login (Google, Facebook, Apple), self-registration, delegated admin.
- **Sharing and visibility** — Sharing sets, sharing groups, external account hierarchies, audience targeting.
- **Custom LWC pages** — Fully custom pages using Lightning Web Components for unique requirements.
- **Reputation and gamification** — Points, badges, and levels for community engagement.

### Interview Questions

1. What type of portal are you building? (Partner, customer, employee, hybrid)
2. Who are the users? How many? What license types? (Customer Community, Customer Community Plus, Partner Community)
3. What authentication method? (Username/password, SSO, social login, self-registration)
4. What branding and design requirements? (Custom domain, logos, color scheme, custom theme)
5. What self-service features do users need? (Case submission, knowledge, order history, account management)
6. Do you need content management? Who publishes content? What approval process?
7. What data should be visible to external users? What sharing model?
8. Are there partner-specific features needed? (Deal registration, lead distribution, MDF)
9. Do you need multi-language support? Which languages?
10. What integrations are needed in the portal? (Payment gateways, external data, maps)

---

## Marketing Cloud

### Key Objects / Components

| Component | Purpose |
|---|---|
| Contact | Central identity record in Marketing Cloud |
| Data Extension | Custom data table for segmentation and personalization |
| Journey | Automated multi-step customer journey (Journey Builder) |
| Email | Email message template with dynamic content |
| CloudPage | Hosted web page for landing pages, forms, preference centers |
| Content Block | Reusable content element for emails and pages |
| Automation | Scheduled or triggered data processing workflow (Automation Studio) |
| Audience / Segment | Filtered group of contacts for targeted messaging |
| MobileConnect | SMS messaging module |
| Sender Profile | From name and email address configuration |

### Common Customizations

- **Journey Builder flows** — Welcome series, re-engagement, abandoned cart, post-purchase nurture, event-triggered journeys.
- **Email templates** — Responsive HTML templates with dynamic content blocks, AMPscript personalization.
- **Audience segmentation** — SQL queries in Automation Studio, filtered data extensions, Einstein Engagement Scoring.
- **Marketing Cloud Connect** — Synchronized data extensions with Salesforce objects, triggered sends from Salesforce.
- **Tracking and analytics** — Open/click tracking, Google Analytics integration, custom tracking parameters.
- **Preference centers** — CloudPage-based subscription management, consent tracking.
- **Dynamic content** — AMPscript and SSJS for conditional content based on subscriber attributes.
- **Transactional messaging** — Order confirmations, password resets, shipping notifications via Transactional API.
- **SMS campaigns** — MobileConnect for text message marketing, two-way SMS, short codes.
- **Data hygiene** — Automation Studio workflows for deduplication, bounce management, unsubscribe processing.

### Interview Questions

1. What is your monthly email volume? How many contacts in your database?
2. What types of journeys do you need? (Welcome, nurture, re-engagement, transactional, event-triggered)
3. What data needs to sync between Salesforce and Marketing Cloud? In which direction?
4. What personalization requirements do you have? (Dynamic content, product recommendations, send-time optimization)
5. Do you need SMS/MobileConnect? What volume? Short code or long code?
6. What is your segmentation strategy? How complex are your audience definitions?
7. Do you need landing pages (CloudPages)? Forms? Preference centers?
8. What tracking and analytics requirements do you have? (GA integration, custom KPIs)
9. Are you currently on Marketing Cloud Engagement, Account Engagement (Pardot), or neither?
10. What compliance requirements apply? (GDPR, CAN-SPAM, CCPA, consent management)

---

## Data Cloud

### Key Objects / Components

| Component | Purpose |
|---|---|
| DataStream | Ingestion pipeline from a source system into Data Cloud |
| DataLakeObject | Raw data storage within the data lake |
| Data Model Object (DMO) | Harmonized data mapped to the Salesforce data model |
| CalculatedInsight | Computed metric or aggregation derived from ingested data |
| Identity Resolution | Rules for matching and merging records into unified profiles |
| Segment | Audience definition based on unified profile attributes and behaviors |
| Activation Target | Destination for pushing segments (Marketing Cloud, Ads, Salesforce CRM, external) |
| Data Action | Event-triggered action based on data changes or segment membership |
| Data Graph | Unified view combining related objects for a single entity |

### Common Customizations

- **Data model mapping** — Mapping source fields to Data Cloud data model objects (Individual, Account, etc.).
- **Identity resolution rulesets** — Fuzzy matching on name/email/phone, deterministic matching on external IDs.
- **Calculated insights** — Lifetime value, engagement scores, recency/frequency/monetary metrics, churn risk.
- **Segmentation** — Behavioral segments (visited page, purchased product), attribute segments (region, tier).
- **Activation** — Push segments to Marketing Cloud journeys, Google/Meta Ads, Salesforce CRM records, webhooks.
- **Streaming ingestion** — Real-time data ingestion via Ingestion API for web/mobile event data.
- **Data transforms** — SQL-based transformations for data cleansing, enrichment, and aggregation.
- **Einstein Studio** — Bring-your-own-model (BYOM) for custom AI predictions on unified data.

### Interview Questions

1. What data sources need to be ingested? (CRM, web analytics, mobile app, POS, data warehouse, third-party)
2. What is the data volume? How frequently does it update? (Batch nightly, streaming real-time)
3. How do you identify a single customer across systems? What identifiers exist? (Email, phone, customer ID, cookie)
4. What identity resolution rules are needed? (Exact match, fuzzy match, hierarchical)
5. What calculated insights or metrics do you need? (LTV, engagement score, churn risk, RFM)
6. Who are the activation targets? (Marketing Cloud, advertising platforms, CRM, external systems)
7. Do you need real-time segmentation and activation, or is batch sufficient?
8. What data privacy and consent requirements apply? (GDPR, CCPA, consent objects)
9. Are you using Data Cloud with Marketing Cloud, Sales Cloud, Service Cloud, or all?
10. What existing data infrastructure do you have? (Snowflake, BigQuery, Redshift, custom warehouse)

---

## Revenue Cloud / CPQ

### Key Objects

| Object | Purpose |
|---|---|
| SBQQ__Quote__c | Quote record — the central CPQ object |
| SBQQ__QuoteLine__c | Individual line item on a quote |
| SBQQ__Product__c / Product2 | Product definition with CPQ-specific configuration |
| SBQQ__PriceRule__c | Automated pricing logic applied during quoting |
| SBQQ__DiscountSchedule__c | Volume or term-based discount tiers |
| SBQQ__ProductOption__c | Defines products within a bundle |
| SBQQ__Subscription__c | Tracks subscription terms for renewal management |
| Order | Fulfilled order created from a quote |
| OrderItem | Line item on an order |
| Contract | Agreement governing the business relationship |
| SBQQ__ContractedPrice__c | Negotiated pricing carried forward to renewals |

### Common Customizations

- **Product bundles** — Parent-child product configurations with required, optional, and exclusive options.
- **Pricing rules** — Conditional price adjustments based on quantity, customer tier, contract terms, or product combinations.
- **Discount schedules** — Volume discounts (tiered or slab), term discounts (longer commitment = lower price).
- **Approval chains** — Multi-step approval based on discount percentage, deal size, non-standard terms.
- **Quote templates** — Branded PDF quote documents with dynamic sections, terms and conditions.
- **Contract lifecycle** — Quote-to-contract automation, contract amendments, renewal quoting.
- **Renewal automation** — Auto-generate renewal opportunities and quotes X days before contract end.
- **Guided selling** — Product recommendation flows based on customer needs assessment.
- **Multi-currency and multi-language** — Quotes in the customer's currency and language.
- **Advanced approval** — Salesforce Advanced Approvals for parallel, conditional, and delegated approval routing.

### Interview Questions

1. How complex is your product catalog? How many products/SKUs?
2. What is your pricing model? (Flat, tiered, volume, subscription, usage-based, hybrid)
3. Do you sell product bundles? How are they configured?
4. What discount rules exist? Who can approve discounts? At what thresholds?
5. What does your approval workflow look like? (Linear, parallel, conditional, delegated)
6. Do you need contract management? Amendments? Renewals?
7. What does the quote document need to look like? (Sections, terms, branding, e-signature)
8. Do you need multi-currency support? Which currencies?
9. How do quotes convert to orders? Is there an ERP integration?
10. Do you need guided selling or product recommendations?
11. What is the renewal process? Auto-renew, manual quote, hybrid?

---

## Industries / OmniStudio

### Key Objects / Components

| Component | Purpose |
|---|---|
| OmniScript | Guided, multi-step digital process (wizard-like UI) |
| FlexCard | Dynamic, data-aware UI card component |
| DataRaptor | Data transformation and extraction tool (read/write/transform/turbo) |
| Integration Procedure | Server-side orchestration — chain DataRaptors, Apex, and HTTP calls |
| OmniProcess | Configuration record for an OmniScript or Integration Procedure |
| Document Generation | Template-based document creation (proposals, contracts, letters) |
| Decision Matrix | Lookup table for business rules and branching logic |
| Expression Set | Reusable calculation and evaluation logic |

### Industry-Specific Data Models

| Industry | Key Objects |
|---|---|
| Financial Services | FinancialAccount, FinancialGoal, Claim, InsurancePolicy, ActionPlan |
| Health Cloud | CarePlan, CareProgram, Patient, EhrCondition, MedicationRequest |
| Communications | ServiceAccount, Premises, ServicePoint, OrderItem (TMF-based) |
| Manufacturing | SalesAgreement, Rebate, VisitPlan, RetailStore |
| Public Sector | License, Permit, Inspection, RegulatoryCode, BusinessMilestone |
| Nonprofit | Grant, Donation, ProgramEngagement, Benefit, FundingAward |
| Education | Application, StudentRecord, CourseOffering, EducationHistory |

### Common Customizations

- **OmniScripts** — Customer onboarding, claims intake, loan application, service request, change of address.
- **DataRaptors** — Extract CRM data for display in OmniScripts, transform data between formats, write data back.
- **Integration Procedures** — Orchestrate multi-step backend processes: validate, enrich, call external APIs, write results.
- **FlexCards** — Customer 360 views, contextual action cards, embedded dashboards, related record summaries.
- **Decision Matrices** — Eligibility rules, pricing lookups, product qualification, risk assessment tables.
- **Document Generation** — Policy documents, proposals, compliance letters, onboarding packets.
- **Industry data model activation** — Enable and extend industry-specific objects and fields.

### Interview Questions

1. Which industry vertical are you in? (FSC, Health, Communications, Manufacturing, Public Sector, etc.)
2. Are you currently using OmniStudio components? Which ones?
3. What guided processes do you need? (Onboarding, intake, claims, applications)
4. Do you have existing Integration Procedures? What external systems do they connect to?
5. What data transformations are needed? (Source format to Salesforce format, multi-system aggregation)
6. Do you need dynamic UI cards (FlexCards)? For which user roles and use cases?
7. Are you using the industry-specific data model, or custom objects?
8. What document generation requirements do you have? (Templates, merge fields, output formats)
9. Do you need decision tables or expression sets for business rules?
10. What is the migration path from legacy systems to the industry data model?

---

## MuleSoft

### Key Concepts

| Concept | Purpose |
|---|---|
| Anypoint Platform | Central management console for APIs, integrations, and connectors |
| CloudHub | Cloud-hosted runtime for deploying Mule applications |
| Runtime Fabric | Self-managed container-based runtime (on-prem or private cloud) |
| API Manager | Governance, policies, SLA tiers, and analytics for published APIs |
| Exchange | Reusable asset catalog — APIs, connectors, templates, fragments |
| DataWeave | MuleSoft's data transformation language (JSON, XML, CSV, etc.) |
| Anypoint Connector | Pre-built connector for a specific system (Salesforce, SAP, Workday, etc.) |
| API-Led Connectivity | Three-tier architecture: System, Process, and Experience APIs |

### Common Customizations

- **System APIs** — Direct connectors to backend systems (Salesforce, SAP, databases, legacy SOAP services).
- **Process APIs** — Business logic orchestration combining multiple System APIs (e.g., order fulfillment, customer onboarding).
- **Experience APIs** — Consumer-facing APIs optimized for specific channels (mobile, web, partner).
- **Error handling patterns** — Global error handlers, retry policies, dead letter queues, circuit breakers.
- **API policies** — Rate limiting, JWT validation, IP whitelisting, CORS, client ID enforcement.
- **DataWeave transformations** — Complex mapping between source and target formats with functions, conditionals, and iterations.
- **Batch processing** — Large volume data synchronization with watermark-based incremental processing.
- **Event-driven architecture** — Anypoint MQ or external message brokers (Kafka, RabbitMQ) for async processing.
- **Monitoring and alerting** — Anypoint Monitoring dashboards, custom alerts, log aggregation.
- **CI/CD pipelines** — Maven-based build, MUnit testing, automated deployment to CloudHub/Runtime Fabric.

### Interview Questions

1. What is your current integration landscape? How many systems need to communicate?
2. Do you have an existing API strategy? (API-led, point-to-point, ESB, iPaaS)
3. Which systems need to integrate with Salesforce? (ERP, HRIS, data warehouse, legacy, SaaS)
4. What are the data volumes and frequency? (Real-time, near-real-time, batch, event-driven)
5. Where should runtimes be deployed? (CloudHub, Runtime Fabric, on-premises)
6. What error handling requirements exist? (Retry, dead letter, alerting, fallback)
7. What security requirements apply to APIs? (OAuth, JWT, mTLS, IP restrictions)
8. Do you need API governance? (Versioning, deprecation, SLA enforcement, consumer management)
9. What monitoring and alerting is needed? (Uptime, latency, error rates, business metrics)
10. What is the team's MuleSoft experience level? Do they need training or enablement?

---

## Tableau

### Key Concepts

| Concept | Purpose |
|---|---|
| Data Source | Connection to a database, file, or cloud service (live or extract) |
| Workbook | Container for worksheets and dashboards |
| Worksheet | Single visualization (chart, map, table) |
| Dashboard | Collection of worksheets arranged for presentation |
| Story | Narrative sequence of dashboards and worksheets |
| Tableau Server / Cloud | Hosted platform for sharing, collaboration, and governance |
| Tableau Prep | Data preparation and cleaning tool (flows) |
| CRM Analytics (TCRM) | Embedded analytics within Salesforce (formerly Einstein Analytics) |
| Dataset | CRM Analytics data container built from Salesforce objects or external data |
| Lens / Dashboard (TCRM) | CRM Analytics exploration and visualization tools |

### Common Customizations

- **Salesforce connector** — Live or extract connection to Salesforce objects for Tableau Desktop/Cloud.
- **Embedded dashboards** — Tableau views embedded in Salesforce Lightning pages via Tableau Viz Lightning component.
- **CRM Analytics datasets** — Dataflows and recipes that extract, transform, and load Salesforce data for in-platform analytics.
- **CRM Analytics dashboards** — Interactive dashboards embedded directly in Salesforce record pages and apps.
- **Predictive models** — Einstein Discovery (CRM Analytics) for no-code predictive modeling and recommendations.
- **Data blending** — Combining Salesforce data with external data sources (finance, operations, marketing) in Tableau.
- **Row-level security** — Implementing data access controls in Tableau that align with Salesforce sharing model.
- **Calculated fields** — Custom measures and dimensions for KPIs not directly available in source data.
- **Tableau Prep flows** — Data cleaning, reshaping, and enrichment before visualization.
- **Automated refresh** — Scheduled extract refreshes and subscription-based report distribution.

### Interview Questions

1. What analytics and reporting needs exist beyond standard Salesforce reports?
2. Are you using Tableau Desktop/Cloud, CRM Analytics (Einstein Analytics), or both?
3. What data sources need to be visualized? (Salesforce only, or combined with external data?)
4. Do you need embedded analytics within Salesforce? On which pages/objects?
5. What is the data refresh requirement? (Real-time, hourly, daily)
6. Who are the end users? What is their analytics literacy level?
7. Do you need predictive analytics or AI-driven insights? (Einstein Discovery)
8. What row-level security requirements exist? Must Tableau respect Salesforce sharing model?
9. Are there existing Tableau workbooks or CRM Analytics dashboards to migrate or enhance?
10. What KPIs and metrics are most important to the business?
