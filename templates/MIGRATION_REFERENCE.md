# Migration Reference — <!-- PROJECT_NAME --> (<!-- Source --> → <!-- Target -->)

> **Purpose**: Rosetta Stone between the original and new codebases. Maps every module, component, data model, and pattern to its new equivalent.
> **Last Updated**: <!-- YYYY-MM-DD -->
> **Source Codebase**: <!-- Path or repo URL to the original project -->

---

## Table of Contents

1. [Service / Module Layer Mapping](#1-service--module-layer-mapping)
2. [UI Component Mapping](#2-ui-component-mapping)
3. [Data Model Mapping](#3-data-model-mapping)
4. [Pattern Translation Guide](#4-pattern-translation-guide)
5. [API Mapping](#5-api-mapping)
6. [Constants & Enums Reference](#6-constants--enums-reference)

---

## 1. Service / Module Layer Mapping

<!-- Map each original service/module to its new equivalent -->

### 1.1 <!-- OriginalModule --> → `<!-- new/module/path -->`

| Original | New | Change Notes |
|---|---|---|
| `<!-- OriginalClass/Function -->` | `<!-- new_function -->` | <!-- What changed and why --> |
| `<!-- OriginalClass/Function -->` | `<!-- new_function -->` | <!-- What changed --> |
| `<!-- OriginalClass/Function -->` | **REMOVED** | <!-- Why it was removed --> |

**Key Simplification**: <!-- Describe the main improvement or simplification -->

---

### 1.2 <!-- OriginalModule --> → `<!-- new/module/path -->`

| Original | New | Change Notes |
|---|---|---|
| `<!-- Item -->` | `<!-- Item -->` | <!-- Notes --> |

---

### New Modules (no original equivalent)

| New Module | Purpose |
|---|---|
| `<!-- module_path -->` | <!-- Purpose --> |
| `<!-- module_path -->` | <!-- Purpose --> |

---

## 2. UI Component Mapping

<!-- Map each original UI component to its new equivalent -->

### 2.1 <!-- OriginalComponent --> → `<!-- new/component/path -->`

| Original Feature | New Implementation |
|---|---|
| <!-- Original UI feature --> | <!-- New approach --> |
| <!-- Original data binding --> | <!-- New data fetching --> |
| <!-- Original interaction --> | <!-- New interaction --> |

---

### 2.2 <!-- OriginalComponent --> → `<!-- new/component/path -->`

| Original Feature | New Implementation |
|---|---|
| <!-- Feature --> | <!-- Implementation --> |

---

## 3. Data Model Mapping

### Object / Table Mapping

| Original Object/Table | New Table | Key Changes |
|---|---|---|
| `<!-- original_name -->` | `<!-- new_name -->` | <!-- What changed --> |
| `<!-- original_name -->` | `<!-- new_name -->` | <!-- What changed --> |
| (none) | `<!-- new_table -->` | NEW — <!-- why it was added --> |

### Field Type Translation

| Original Type | New Type | Notes |
|---|---|---|
| <!-- e.g., VARCHAR(255) --> | <!-- e.g., TEXT --> | <!-- Notes --> |
| <!-- e.g., ENUM --> | <!-- e.g., VARCHAR with app validation --> | <!-- Notes --> |

---

## 4. Pattern Translation Guide

<!-- Document recurring patterns that change between platforms -->

### 4.1 <!-- Pattern Name (e.g., Data Access) -->

```
# ORIGINAL PATTERN:
<!-- Show original code pattern or pseudocode -->

# NEW PATTERN:
<!-- Show new code pattern or pseudocode -->
```

---

### 4.2 <!-- Pattern Name (e.g., Authentication) -->

```
# ORIGINAL:
<!-- Original pattern -->

# NEW:
<!-- New pattern -->
```

---

### 4.3 <!-- Pattern Name (e.g., Background Processing) -->

```
# ORIGINAL:
<!-- Original pattern -->

# NEW:
<!-- New pattern -->
```

---

## 5. API Mapping

### Original → New Endpoint Map

| Original Method/Endpoint | HTTP | New Endpoint |
|---|---|---|
| `<!-- original_method -->` | <!-- GET/POST/PATCH/DELETE --> | `<!-- /api/v1/... -->` |
| `<!-- original_method -->` | <!-- Method --> | `<!-- /api/v1/... -->` |
| `<!-- original_method -->` | (internal) | Not exposed — internal service call |

### New Endpoints (no original equivalent)

| HTTP | Endpoint | Purpose |
|---|---|---|
| <!-- Method --> | `<!-- /api/v1/... -->` | <!-- Purpose --> |

---

## 6. Constants & Enums Reference

### Constants Carried Forward (same values)

| Constant | Original Location | Value | New Location |
|---|---|---|---|
| `<!-- CONST_NAME -->` | <!-- Location --> | `<!-- value -->` | `<!-- new_location -->` |

### Constants Removed

| Constant | Reason |
|---|---|
| `<!-- CONST_NAME -->` | <!-- Why it was removed --> |

### Enum / Picklist Values Carried Forward

<!-- List enums that remain identical between platforms -->

- `<!-- EnumName -->`: <!-- value1, value2, value3 -->

---

## 7. Key Differences Summary

<!-- High-level summary of platform differences that affect the migration -->

| Original Limitation / Pattern | New Solution |
|---|---|
| <!-- e.g., Timeout limit --> | <!-- e.g., No timeout — async processing --> |
| <!-- e.g., Platform-specific auth --> | <!-- e.g., JWT-based auth --> |
| <!-- e.g., Field size limit --> | <!-- e.g., Unlimited TEXT columns --> |

---

<!--
USAGE:
1. Fill in each section as you analyze the original codebase
2. Use this as a reference when implementing each feature in the new platform
3. Keep it updated as you discover additional patterns or edge cases
4. Cross-reference with BACKLOG.md items that implement the migration
-->
