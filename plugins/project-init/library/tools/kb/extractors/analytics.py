"""analytics.py — reports, report types and dashboards.

The measured gap: 80 dashboards in Red were components with zero edges, and
nothing recorded that a dashboard uses a report.

One thing to expect in these two snapshots. Neither Red nor Blue holds a single
Report file: the phase 1 registry counted 127 ReportType files, 82 Dashboard
files and no reports at all. So every dashboard reference to a report will fail
to resolve in phase 3, and the honest answer is `unresolved_not_in_snapshot`
rather than a missing edge. That is exactly the case the SPEC's edge-case table
covers, and it is why phase 2 emits the reference anyway instead of dropping it.

Report and dashboard field references use the legacy report token format
(`Account.Industry` written as `Account$Industry`), which is kept exactly as
written for phase 3 to translate.
"""

from __future__ import annotations

from .xmlutil import child_text, local, text_of, walk


def _report_token(raw: str):
    """Split the legacy report token Object$Field into its two halves.

    Returns (object, field) or (None, raw) when the string is not in that form.
    """
    if "$" not in raw:
        return None, raw
    obj, rest = raw.split("$", 1)
    return obj, rest


def extract_report(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    report_type = child_text(root, "reportType")
    ctx.component(report_type=report_type,
                  format=child_text(root, "format"),
                  name=child_text(root, "name"))
    if report_type:
        ctx.consume("reportType")
        ctx.reference(raw=report_type, relationship="reads", location="reportType",
                      target_type="ReportType")

    for elem, path in walk(root):
        name = local(elem)

        if name == "columns":
            field = child_text(elem, "field")
            if field:
                ctx.consume(path)
                _emit_field(ctx, field, f"{path}/field", "displays")

        elif name in ("groupingsDown", "groupingsAcross"):
            field = child_text(elem, "field")
            if field:
                ctx.consume(path)
                _emit_field(ctx, field, f"{path}/field", "groups_by")

        elif name == "criteriaItems":
            column = child_text(elem, "column")
            if column:
                ctx.consume(path)
                _emit_field(ctx, column, f"{path}/column", "filters_on")

        elif name in ("aggregates", "buckets"):
            source = child_text(elem, "sourceColumnName") or child_text(elem, "field")
            if source:
                ctx.consume(path)
                _emit_field(ctx, source, f"{path}", "summarizes")

        elif name == "timeFrameFilter":
            column = child_text(elem, "dateColumn")
            if column:
                ctx.consume(path)
                _emit_field(ctx, column, f"{path}/dateColumn", "filters_on")

        elif name == "crossFilters":
            primary = child_text(elem, "primaryTableColumn")
            related = child_text(elem, "relatedTable")
            if primary:
                _emit_field(ctx, primary, f"{path}/primaryTableColumn", "filters_on")
            if related:
                ctx.reference(raw=related, relationship="filters_on",
                              location=f"{path}/relatedTable",
                              target_type="CustomObject")

    if ctx._references == 0:
        ctx.reason("a report with no columns, groupings or filters in its file")


def _emit_field(ctx, raw, location, relationship) -> None:
    obj, field = _report_token(raw)
    ctx.reference(raw=raw, relationship=relationship, location=location,
                  target_type="CustomField", target_parent=obj or "",
                  report_token=(obj is not None) or None,
                  field_part=field if obj else None)


def extract_report_type(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    base = child_text(root, "baseObject") or ""
    ctx.component(base_object=base, label=child_text(root, "label"),
                  deployed=child_text(root, "deployed"))
    if base:
        ctx.consume("baseObject")
        ctx.reference(raw=base, relationship="reads", location="baseObject",
                      target_type="CustomObject")

    for elem, path in walk(root):
        name = local(elem)
        if name == "join":
            relationship_name = child_text(elem, "relationship")
            if relationship_name:
                ctx.reference(raw=relationship_name, relationship="reads",
                              location=f"{path}/relationship",
                              target_type="CustomField", target_parent=base,
                              confidence="medium",
                              note="a report type join names a relationship, not "
                                   "the object directly")
        elif name == "columns":
            field = child_text(elem, "field")
            table = child_text(elem, "table")
            if field:
                ctx.consume(path)
                ctx.reference(raw=field, relationship="displays",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=table or base)

    if ctx._references == 0:
        ctx.reason("a report type with no base object and no columns")


def extract_dashboard(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(dashboard_type=child_text(root, "dashboardType"),
                  title=child_text(root, "title"),
                  running_user=child_text(root, "runningUser"))

    for elem, path in walk(root):
        name = local(elem)

        if name == "components":
            report = child_text(elem, "report")
            if report:
                ctx.consume(f"{path}/report")
                ctx.reference(raw=report, relationship="reads",
                              location=f"{path}/report", target_type="Report",
                              chart_type=child_text(elem, "componentType"))
            for tag_name, relationship in (("groupingColumn", "groups_by"),
                                           ("sortBy", "sorts_by")):
                value = child_text(elem, tag_name)
                if value:
                    ctx.reference(raw=value, relationship=relationship,
                                  location=f"{path}/{tag_name}",
                                  target_type="CustomField")
            for measure, mpath in walk(elem, path):
                if local(measure) == "dashboardTableColumn":
                    column = child_text(measure, "column")
                    if column:
                        ctx.reference(raw=column, relationship="displays",
                                      location=f"{mpath}/column",
                                      target_type="CustomField")

        elif name == "dashboardFilters":
            for option, opath in walk(elem, path):
                if local(option) != "dashboardFilterOptions":
                    continue
                column = child_text(option, "operand")
                if column:
                    ctx.reference(raw=column, relationship="filters_on",
                                  location=f"{opath}/operand",
                                  target_type="CustomField")

        elif name == "runningUser" and text_of(elem):
            ctx.consume(path)
            ctx.reference(raw=text_of(elem), relationship="assigned_to",
                          location=path, target_type="User")

    if ctx._references == 0:
        ctx.reason("a dashboard whose components name no report")
