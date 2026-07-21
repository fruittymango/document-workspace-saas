INSERT INTO "document_status" ("status") VALUES ('draft'),  ('unassigned'), ('assigned'), ('awaiting_signature'), ('filed'), ('archived');

-- Seed: base permission for the billing screen (add more codes as you add screens)
INSERT INTO "permissions" ("code", "screen", "description") VALUES
    ('billing.view', 'billing', 'Can view billing/license info'),
    ('billing.manage', 'billing', 'Can purchase/change plans and view payment history'),
    ('dashboard.view', 'dashboard', 'Can view dashboard'),
    ('users.view', 'users', 'Can view users'),
    ('users.manage', 'users', 'Can add/update/delete users');

-- Seed: system roles
INSERT INTO "roles" ("code", "name", "is_system") VALUES
    ('owner', 'Owner', true),
    ('admin', 'Admin', true),
    ('member', 'Member', true);

-- Seed: plans roles
INSERT INTO "plans" ("code", "name", "description", "price_cents", "seat_limit", "document_limit") VALUES
    ('starter', 'Starter', 'For small practices getting organized.', 29, 3, 50),
    ('pro', 'Professional', 'For growing firms that need more room.', 99, 10, 500),
    ('ent', 'Enterprise', 'For large practices with unlimited scale.', 299, 0, 0);

-- Wire owner/admin to full billing access; members get none by default
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r, "permissions" p
WHERE r.code IN ('owner', 'admin') AND p.screen = 'billing';