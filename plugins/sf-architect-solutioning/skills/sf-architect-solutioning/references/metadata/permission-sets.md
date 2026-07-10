# Permission Sets Configuration Reference

Standard metadata configuration reference for Permission Sets, Permission Set Groups, Profiles, Custom Permissions, and Muting Permission Sets. Use these templates when designing security models in the sf-architect-solutioning skill.

> API version validated against: 62.0

---

## Layer 1: When to Use

### Decision Criteria

- **Permission Sets**: Grant additional access beyond the user's profile - always prefer over profiles for custom permissions
- **Permission Set Groups**: Bundle related permission sets together for role-based assignment (e.g., "Sales Manager" group = Sales_Read + Sales_Write + Reports_Access)
- **Profiles**: Only for login-based settings (IP ranges, login hours, page layout assignments) - avoid custom profiles, use Minimum Access profile + permission sets
- **Custom Permissions**: Feature flags / bypass toggles (e.g., Bypass_Validation_Rules for integrations)
- **Muting Permission Sets**: Remove specific permissions from a Permission Set Group without modifying the source permission sets

### Anti-Patterns

- Cloning profiles for access changes (use permission sets instead)
- One massive permission set per user role (break into feature-based sets)
- Object permissions without field-level security (grants all fields)
- Permission sets that grant both Read and Modify All Data (use only when absolutely necessary)
- Not using Permission Set Groups (administrative overhead managing individual assignments)

### Governor Limit Considerations

- Max 1000 permission sets per org
- Max 100 permission set groups per org
- Max 100 permission sets in a single group
- User can be assigned max 100 permission sets (directly + via groups)

### Well-Architected Alignment

- Minimum Access profile + permission sets model
- Feature-based permission sets (not role-based)
- Permission Set Groups for role-based bundling
- Naming convention: `{Feature}_{AccessLevel}` (e.g., `Territory_Management_Admin`)
- Document every permission set's purpose in the description

---

## Layer 2: Declarative Design Template

### Permission Set Design Template

| Attribute | Value |
|---|---|
| Label | {PERMISSION_SET_LABEL} |
| API Name | {Permission_Set_Name} |
| Description | {What access this grants and to whom} |
| License | Salesforce / Salesforce Platform / None (if no license needed) |
| Object Permissions | [List objects with CRUD levels] |
| Field Permissions | [List fields with Read/Edit] |
| Tab Settings | [Tabs made visible] |
| Apex Class Access | [Classes made accessible] |
| VF Page Access | [Pages made accessible] |
| Custom Permissions | [Custom permissions included] |
| Record Type Assignments | [Record types made available] |

### Permission Set Group Design Template

| Attribute | Value |
|---|---|
| Label | {GROUP_LABEL} |
| API Name | {Group_Name} |
| Description | {Role this group represents} |
| Permission Sets | [List of included permission set API names] |
| Muting Permission Set | {Muting set API name, if needed} |

---

## Layer 3: SFDX Source XML Templates

### Permission Set

Path: `force-app/main/default/permissionsets/{PermissionSetName}.permissionset-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Human-readable label shown in Setup -->
    <label>{PERMISSION_SET_LABEL}</label>

    <!-- Purpose and intended audience - always populate for documentation -->
    <description>{PERMISSION_SET_DESCRIPTION}</description>

    <!-- Set to true to require manual activation per user after assignment -->
    <hasActivationRequired>false</hasActivationRequired>

    <!-- Associated license: Salesforce, SalesforcePlatform, or omit for no license -->
    <license>{Salesforce|SalesforcePlatform}</license>

    <!-- Object-level CRUD permissions - one block per object -->
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>{OBJECT_API_NAME}</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>

    <!-- Field-level security - one block per field -->
    <fieldPermissions>
        <editable>true</editable>
        <field>{OBJECT_API_NAME}.{FIELD_API_NAME}</field>
        <readable>true</readable>
    </fieldPermissions>

    <!-- Tab visibility - controls whether tab appears in app launcher -->
    <tabSettings>
        <tab>{TAB_API_NAME}</tab>
        <visibility>Visible</visibility>
    </tabSettings>

    <!-- Custom permission - used for feature flags and bypass toggles -->
    <customPermissions>
        <enabled>true</enabled>
        <name>{CUSTOM_PERMISSION_NAME}</name>
    </customPermissions>

    <!-- Apex class access - required for VF controllers and REST endpoints -->
    <classAccesses>
        <apexClass>{CLASS_NAME}</apexClass>
        <enabled>true</enabled>
    </classAccesses>

    <!-- Visualforce page access - grants access to specific VF pages -->
    <pageAccesses>
        <apexPage>{PAGE_NAME}</apexPage>
        <enabled>true</enabled>
    </pageAccesses>

    <!-- Record type assignment - makes record types available to assigned users -->
    <recordTypeVisibilities>
        <recordType>{OBJECT}.{RECORD_TYPE_NAME}</recordType>
        <visible>true</visible>
    </recordTypeVisibilities>
</PermissionSet>
```

---

### Permission Set Group

Path: `force-app/main/default/permissionsetgroups/{GroupName}.permissionsetgroup-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSetGroup xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Human-readable label for the group -->
    <label>{GROUP_LABEL}</label>

    <!-- Describe the role or persona this group represents -->
    <description>{GROUP_DESCRIPTION}</description>

    <!-- Include each permission set as a separate block -->
    <permissionSets>
        <permissionSet>{PERMISSION_SET_API_NAME_1}</permissionSet>
    </permissionSets>
    <permissionSets>
        <permissionSet>{PERMISSION_SET_API_NAME_2}</permissionSet>
    </permissionSets>

    <!-- Optional: muting set to suppress specific permissions from the group -->
    <mutingPermissionSets>
        <mutingPermissionSet>{MUTING_SET_API_NAME}</mutingPermissionSet>
    </mutingPermissionSets>

    <!-- Status: Updated triggers recalculation, Outdated means pending recalc -->
    <status>Updated</status>
</PermissionSetGroup>
```

---

### Custom Permission

Path: `force-app/main/default/customPermissions/{PermissionName}.customPermission-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomPermission xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label displayed in Setup and permission set editors -->
    <label>{PERMISSION_LABEL}</label>

    <!-- Describe what this permission controls (e.g., "Bypasses validation rules for integration users") -->
    <description>{PERMISSION_DESCRIPTION}</description>

    <!-- Set to true only if this permission requires a specific license -->
    <isLicensed>false</isLicensed>
</CustomPermission>
```

---

### Muting Permission Set

Path: `force-app/main/default/mutingpermissionsets/{MutingSetName}.mutingpermissionset-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MutingPermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label for the muting set - prefix with "Mute_" for clarity -->
    <label>{MUTING_SET_LABEL}</label>

    <!-- Remove specific object permissions from the parent group -->
    <!-- Set the permissions you want to REVOKE to false -->
    <objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>{OBJECT_TO_RESTRICT}</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
</MutingPermissionSet>
```
