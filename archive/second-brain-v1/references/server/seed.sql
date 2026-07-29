-- Per-project seed. Run ONCE per new project, after schema.sql, in that
-- project's own Neon database. Replace the three placeholders first:
--   <PROJECT_ID>            lowercase, hyphens allowed, matches the /mcp/<id>
--                           endpoint and the DATABASE_URL_<ID> secret
--                           (e.g. dragonfly, anchor)
--   <PROJECT_NAME>          a human-readable name (e.g. DragonFly Salesforce org merge)
--   <OWNER_GITHUB_LOGIN>    the GitHub login that gets admin access (e.g. Mar5929)

insert into projects (id, name)
values ('<PROJECT_ID>', '<PROJECT_NAME>')
on conflict (id) do nothing;

-- Owner access. Add one row per person you designate; delete a row to revoke.
insert into grants (project_id, github_login, role)
values ('<PROJECT_ID>', '<OWNER_GITHUB_LOGIN>', 'admin')
on conflict (project_id, github_login) do nothing;

-- Starter digest so get_digest returns something before the first import.
insert into digests (project_id, markdown)
values ('<PROJECT_ID>', '# <PROJECT_NAME> - Brain Digest

_Empty store: no curated memory has been imported yet._
')
on conflict (project_id) do nothing;
