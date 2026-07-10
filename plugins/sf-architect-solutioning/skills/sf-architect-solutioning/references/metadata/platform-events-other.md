# Platform Events & Named Credentials Configuration Reference

Salesforce metadata templates for Platform Events and Named Credentials. Use these when designing event-driven architectures and external service integrations in the sf-architect-solutioning skill.

> API version validated against: 62.0 - verify with Context7 before generation.

---

## Layer 1: When to Use

### Platform Events - Decision Criteria

- Loosely coupled communication between systems or org components
- Near-real-time event-driven architecture
- Decoupling publishers from subscribers (multiple systems can react to the same event)
- Replacing polling patterns with push-based notifications
- Cross-org or Salesforce-to-external system communication via Pub/Sub API
- Apex trigger on event for reliable processing with replay

### Platform Events - Anti-Patterns

- Using platform events for synchronous request-reply patterns (use callouts instead)
- Publishing high-volume events without considering daily limit (max 250K standard, higher with add-on)
- Not implementing replay/retry for subscribers (events can be missed)
- Using platform events when a simple record-triggered flow would work
- Publishing events in a loop (bulkify - publish `List<Event__e>`)

### Named Credentials - Decision Criteria

- Store and manage authentication for external service callouts
- Avoid hardcoded credentials in Apex code
- Support OAuth 2.0, JWT, Password, AWS Signature, Custom auth
- Named Credentials + External Credentials (new model) for flexible auth management
- Per-user or per-org authentication contexts

### Named Credentials - Anti-Patterns

- Hardcoding endpoints and credentials in Apex (security risk, not deployable)
- Using Legacy Named Credentials for new implementations (use External Credentials model)
- Not using Permission Sets to control External Credential access
- Missing error handling for authentication failures

### Governor Limit Considerations

| Limit | Value |
|---|---|
| Platform Events published per 24 hours | 250,000 (standard), higher with add-on |
| Event payload size | 1 MB per event |
| Apex triggers on events | Same governor limits as regular triggers |
| CometD subscribers | Limited per org edition |
| Callouts per transaction | 100 |
| Callout timeout | 120 seconds per callout |
| Total callout time per transaction | 120 seconds cumulative |

### Well-Architected Alignment

- Use **Platform Events for event-driven decoupling** - prefer over polling or tightly coupled integrations.
- Use **Named Credentials for ALL external authentication** - never hardcode endpoints or credentials in Apex.
- Use **External Credentials + Named Credentials (new model)** for modern auth - Legacy Named Credentials are deprecated for new development.
- **Document event schema and subscriber contracts** - publishers and subscribers should agree on field structure and semantics.
- **Include replay ID handling in subscribers** - ensures events are not missed during downtime or failures.
- Use **Publish After Commit** unless immediate publication is required - prevents events from firing on rolled-back transactions.

---

## Layer 2: Declarative Design Templates

### Platform Event Design Template

Copy this table into the solution plan for each platform event.

| Attribute | Value |
|---|---|
| Label | {EVENT_LABEL} |
| API Name | {Event_Name__e} |
| Description | {What this event represents and when it's published} |
| Publish Behavior | Publish After Commit / Publish Immediately |
| Fields | [Custom fields on the event with types] |
| Publishers | [What publishes this event - Apex, Flow, API] |
| Subscribers | [What consumes this event - Apex trigger, Flow, external via Pub/Sub API] |

### Named Credential Design Template

Copy this table into the solution plan for each named credential.

| Attribute | Value |
|---|---|
| Label | {CREDENTIAL_LABEL} |
| API Name | {Credential_Name} |
| Endpoint URL | {BASE_URL} |
| External Credential | {External Credential name} |
| Authentication Protocol | OAuth 2.0 / JWT / Password / AWS Sig V4 / Custom |
| Generate Authorization Header | Yes / No |
| Allow Formulas in Headers | Yes / No |
| Permission Set | {Which permission set grants access} |

---

## Layer 3: SFDX Source XML Templates

All templates use the `{API_VERSION}` placeholder. Replace with the target API version (e.g., `62.0`) at generation time.

---

### Platform Event Definition

Path: `force-app/main/default/objects/{EventName__e}/{EventName__e}.object-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label shown in Setup and event references -->
    <label>{EVENT_LABEL}</label>
    <!-- Plural label for UI references -->
    <pluralLabel>{EVENT_PLURAL_LABEL}</pluralLabel>
    <!-- Description for admin/developer documentation -->
    <description>{EVENT_DESCRIPTION}</description>
    <!-- Deployment status: Deployed = active, InDevelopment = not yet live -->
    <deploymentStatus>Deployed</deploymentStatus>
    <!-- HighVolume = standard platform event type; StandardVolume for lower limits -->
    <eventType>HighVolume</eventType>
    <!-- PublishAfterCommit = fires only on successful transaction; PublishImmediately = fires regardless -->
    <publishBehavior>PublishAfterCommit</publishBehavior>
</CustomObject>
```

---

### Platform Event Field

Path: `force-app/main/default/objects/{EventName__e}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{FIELD_NAME__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Supported types: Text, Number, Checkbox, DateTime, LongTextArea -->
    <type>{Text|Number|Checkbox|DateTime|LongTextArea}</type>
    <!-- Length for Text fields (1-255) or LongTextArea (up to 131,072) -->
    <length>{LENGTH}</length>
    <!-- Required: true forces a value when publishing the event -->
    <required>{true|false}</required>
    <!-- Description for admin/developer documentation -->
    <description>{FIELD_DESCRIPTION}</description>
</CustomField>
```

---

### External Credential

Path: `force-app/main/default/externalCredentials/{ExtCredName}.externalCredential-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExternalCredential xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label shown in Setup under External Credentials -->
    <label>{EXTERNAL_CRED_LABEL}</label>
    <!-- Authentication protocol: OAuth, Custom, Jwt, Password, AwsSig4, NoAuthentication -->
    <authenticationProtocol>{OAuth|Custom|Jwt|Password|AwsSig4|NoAuthentication}</authenticationProtocol>
    <!-- Description for admin/developer documentation -->
    <description>{EXTERNAL_CRED_DESCRIPTION}</description>
    <!-- Parameters vary by protocol - ClientId shown as example for OAuth -->
    <externalCredentialParameters>
        <parameterName>ClientId</parameterName>
        <parameterType>AuthProviderUrl</parameterType>
        <parameterValue>{CLIENT_ID_OR_REFERENCE}</parameterValue>
    </externalCredentialParameters>
    <!-- Principal: NamedPrincipal = org-wide, PerUserPrincipal = per-user auth -->
    <principals>
        <principalName>{PRINCIPAL_NAME}</principalName>
        <principalType>NamedPrincipal</principalType>
        <sequenceNumber>1</sequenceNumber>
    </principals>
</ExternalCredential>
```

---

### Named Credential (New Model)

Path: `force-app/main/default/namedCredentials/{CredName}.namedCredential-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NamedCredential xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label shown in Setup under Named Credentials -->
    <label>{CREDENTIAL_LABEL}</label>
    <!-- Reference to the External Credential that handles authentication -->
    <externalCredential>{EXTERNAL_CREDENTIAL_NAME}</externalCredential>
    <!-- Allow merge fields in request body (e.g., {!$Credential.Password}) -->
    <allowMergeFieldsInBody>true</allowMergeFieldsInBody>
    <!-- Allow merge fields in request headers -->
    <allowMergeFieldsInHeader>true</allowMergeFieldsInHeader>
    <!-- Auto-generate the Authorization header from the External Credential -->
    <generateAuthorizationHeader>true</generateAuthorizationHeader>
    <!-- Base endpoint URL - callouts append the path to this URL -->
    <url>{BASE_ENDPOINT_URL}</url>
</NamedCredential>
```
