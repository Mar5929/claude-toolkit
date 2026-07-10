# Page Layouts & Record Types Configuration Reference

> API version validated against: 62.0

---

## Layer 1: When to Use

### Decision Criteria

- **Page Layouts**: Control field arrangement, related lists, buttons, and sections visible on record pages. Use when different user groups need different field visibility on the same object.
- **Record Types**: Enable different business processes, picklist values, and page layouts for the same object. Use when one object serves multiple purposes (e.g., Account with Person vs Business record types).
- **Layout Assignments**: Map record types to profiles/permission sets to control which layout each user sees.
- **Lightning Record Pages** (not covered here -- use LWC): For dynamic page layouts with conditional visibility. Page Layouts are for classic field arrangement and related lists within Lightning Record Pages.

### Anti-Patterns

- Too many record types on one object (>5 becomes hard to manage)
- Record types just for picklist filtering -- consider dependent picklists first
- Page layouts with >100 fields visible -- overwhelming for users
- Not assigning layouts via profiles -- leaves users on default layout
- Editing managed package layouts directly -- create overrides instead

### Governor Limit Considerations

- No hard limit on page layouts per object, but keep manageable (<10 per object)
- Record types count toward metadata limits
- Layout assignment matrix: record types x profiles = assignment count

### Well-Architected Alignment

- Organize fields in logical sections with clear headers
- Required fields at the top
- Related lists relevant to the record type only
- Mobile-optimized field ordering (important fields first)
- Compact layouts defined for lookup dialogs and highlights panel

---

## Layer 2: Declarative Design Templates

### Record Type Design Template

| Attribute | Value |
|---|---|
| Object | `{OBJECT_API_NAME}` |
| Label | `{RECORD_TYPE_LABEL}` |
| API Name | `{RecordTypeName}` |
| Description | {When and why this record type is used} |
| Active | Yes / No |
| Business Process | {Sales Process / Support Process / Lead Process / None} |
| Picklist Filtering | [List picklist fields and their filtered values] |
| Page Layout | {Associated layout name} |

### Page Layout Design Template

| Attribute | Value |
|---|---|
| Object | `{OBJECT_API_NAME}` |
| Layout Name | `{Object}-{Purpose} Layout` |
| Sections | [Section names with field lists] |
| Related Lists | [Related list names with displayed columns] |
| Buttons | [Standard and custom buttons to include/exclude] |
| Mobile Cards | [Fields shown on mobile compact layout] |

### Layout Assignment Design Template

| Record Type | Profile | Page Layout |
|---|---|---|
| `{RecordType1}` | `{Profile1}` | `{Layout1}` |
| `{RecordType1}` | `{Profile2}` | `{Layout2}` |
| `{RecordType2}` | `{Profile1}` | `{Layout3}` |

---

## Layer 3: SFDX Source XML Templates

### Record Type

Path: `force-app/main/default/objects/{ObjectName__c}/recordTypes/{RecordTypeName}.recordType-meta.xml`

<!-- Core record type definition with picklist value filtering and compact layout assignment -->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<RecordType xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- API name of the record type -->
    <fullName>{RECORD_TYPE_NAME}</fullName>
    <!-- Set to false to deploy without activating -->
    <active>true</active>
    <!-- Business process (Sales Process, Support Process, Lead Process); omit if not applicable -->
    <businessProcess>{BUSINESS_PROCESS_NAME}</businessProcess>
    <!-- Compact layout shown in highlights panel and lookups -->
    <compactLayoutAssignment>{COMPACT_LAYOUT_NAME}</compactLayoutAssignment>
    <description>{RECORD_TYPE_DESCRIPTION}</description>
    <label>{RECORD_TYPE_LABEL}</label>
    <!-- Filter picklist values available for this record type -->
    <picklistValues>
        <picklist>{PICKLIST_FIELD_NAME}</picklist>
        <values>
            <fullName>{PICKLIST_VALUE_1}</fullName>
            <default>true</default>
        </values>
        <values>
            <fullName>{PICKLIST_VALUE_2}</fullName>
            <default>false</default>
        </values>
    </picklistValues>
</RecordType>
```

---

### Page Layout

Path: `force-app/main/default/layouts/{ObjectName}-{LayoutName}.layout-meta.xml`

<!-- Full page layout with sections, related lists, button overrides, and compact layout fields -->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{OBJECT_NAME}-{LAYOUT_NAME} Layout</fullName>
    <!-- Layout sections define field groupings with column configuration -->
    <layoutSections>
        <customLabel>true</customLabel>
        <detailHeading>true</detailHeading>
        <editHeading>true</editHeading>
        <label>{SECTION_LABEL}</label>
        <!-- Style options: OneColumn, TwoColumnsTopToBottom, TwoColumnsLeftToRight -->
        <style>TwoColumnsLeftToRight</style>
        <layoutColumns>
            <!-- Behavior: Required, Edit, Readonly -->
            <layoutItems>
                <behavior>Required</behavior>
                <field>{FIELD_API_NAME}</field>
            </layoutItems>
            <layoutItems>
                <behavior>Edit</behavior>
                <field>{FIELD_API_NAME_2}</field>
            </layoutItems>
        </layoutColumns>
        <layoutColumns>
            <layoutItems>
                <behavior>Readonly</behavior>
                <field>{FIELD_API_NAME_3}</field>
            </layoutItems>
        </layoutColumns>
    </layoutSections>
    <!-- Related lists displayed at the bottom of the layout -->
    <relatedLists>
        <fields>{RELATED_FIELD_1}</fields>
        <fields>{RELATED_FIELD_2}</fields>
        <relatedList>{RELATED_OBJECT_RELATIONSHIP}</relatedList>
        <sortField>{SORT_FIELD}</sortField>
        <sortOrder>Desc</sortOrder>
    </relatedLists>
    <!-- Hide standard buttons not relevant to this layout -->
    <excludeButtons>
        <name>{BUTTON_TO_HIDE}</name>
    </excludeButtons>
    <!-- Compact layout fields for highlights panel and mobile -->
    <miniLayout>
        <fields>{COMPACT_FIELD_1}</fields>
        <fields>{COMPACT_FIELD_2}</fields>
        <fields>{COMPACT_FIELD_3}</fields>
        <fields>{COMPACT_FIELD_4}</fields>
    </miniLayout>
    <showEmailCheckbox>false</showEmailCheckbox>
    <showRunAssignmentRulesCheckbox>false</showRunAssignmentRulesCheckbox>
    <showSubmitAndAttachButton>false</showSubmitAndAttachButton>
</Layout>
```

---

### Compact Layout

Path: `force-app/main/default/objects/{ObjectName__c}/compactLayouts/{CompactLayoutName}.compactLayout-meta.xml`

<!-- Compact layouts control the highlights panel and mobile record summary; max 10 fields -->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CompactLayout xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- API name of the compact layout -->
    <fullName>{COMPACT_LAYOUT_NAME}</fullName>
    <!-- Up to 10 fields; first field becomes the title -->
    <fields>{FIELD_1}</fields>
    <fields>{FIELD_2}</fields>
    <fields>{FIELD_3}</fields>
    <fields>{FIELD_4}</fields>
    <label>{COMPACT_LAYOUT_LABEL}</label>
</CompactLayout>
```

---

### Profile Layout Assignment

Path: `force-app/main/default/profiles/{ProfileName}.profile-meta.xml` (partial)

<!-- Layout assignments live inside profile metadata; one entry per object/record-type combination -->

```xml
<!-- Snippet from profile metadata -- layoutAssignments section -->
<layoutAssignments>
    <!-- Layout used when creating records of this record type -->
    <layout>{OBJECT_NAME}-{LAYOUT_NAME} Layout</layout>
    <!-- Omit recordType to set the default layout for the object -->
    <recordType>{OBJECT_NAME}.{RECORD_TYPE_NAME}</recordType>
</layoutAssignments>
<!-- Default layout (no record type specified) -->
<layoutAssignments>
    <layout>{OBJECT_NAME}-{DEFAULT_LAYOUT_NAME} Layout</layout>
</layoutAssignments>
<!-- Record type visibility and default assignment for the profile -->
<recordTypeVisibilities>
    <default>true</default>
    <personAccountDefault>false</personAccountDefault>
    <recordType>{OBJECT_NAME}.{RECORD_TYPE_NAME}</recordType>
    <visible>true</visible>
</recordTypeVisibilities>
```
