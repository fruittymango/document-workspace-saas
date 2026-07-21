CREATE OR REPLACE FUNCTION get_user_for_auth(p_email TEXT) 
RETURNS TABLE ( 
  id UUID,
  tenant_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  password_hash TEXT, 
  license_id UUID,
  license_status license_status,
  tenant TEXT,
  role_code TEXT,
  role_name TEXT 
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$ 
BEGIN 
  RETURN QUERY 
  SELECT
    u.id,
    u.tenant_id,
    u.name,
    u.surname,
    u.email,
    u.password_hash,
    tl.id   AS license_id,
    tl.status AS license_status,
    t.name  AS tenant,
    r.code  AS role_code,
    r.name  AS role_name
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN tenant_licenses tl
  ON tl.tenant_id = u.tenant_id
  AND tl.status IN ('trialing', 'active', 'past_due')
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.email = p_email;
END; 
$$;

-- Strip access from everyone else
REVOKE ALL ON FUNCTION get_user_for_auth(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_for_auth(TEXT) TO prod_app_user;

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_tenant_isolation_policy ON "documents"
AS RESTRICTIVE
USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

CREATE OR REPLACE FUNCTION get_user_details(p_id UUID) 
RETURNS TABLE ( 
  id UUID,
  tenant_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  license_id UUID,
  license_status license_status,
  tenant TEXT,
  role_code TEXT,
  role_name TEXT   
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$ 
BEGIN 
  RETURN QUERY 
  SELECT
    u.id,
    u.tenant_id,
    u.name,
    u.surname,
    u.email,
    tl.id   AS license_id,
    tl.status AS license_status,
    t.name  AS tenant,
    r.code  AS role_code,
    r.name  AS role_name
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN tenant_licenses tl
  ON tl.tenant_id = u.tenant_id
  AND tl.status IN ('trialing', 'active', 'past_due')
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.id = p_id; 
END; 
$$;

-- Strip access from everyone else
REVOKE ALL ON FUNCTION get_user_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO prod_app_user;

CREATE OR REPLACE FUNCTION create_tenant_and_user(
  p_tenant_name TEXT,
  p_user_name TEXT,
  p_user_surname TEXT,
  p_user_email TEXT,
  p_user_password_hash TEXT
)
RETURNS TABLE (
  id            UUID,
  tenant_id     UUID,
  name          TEXT,
  surname       TEXT,
  email         TEXT,
  password_hash TEXT,
  created_at    TIMESTAMP,
  is_new        BOOLEAN,
  role_code     TEXT     
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing  users%ROWTYPE;
  v_tenant_id UUID;
  v_new_user  users%ROWTYPE;
  v_owner_role_id UUID;
BEGIN
  -- 1. Existing user by email → return as-is, no tenant/role created.
  SELECT * INTO v_existing FROM users u WHERE u.email = p_user_email;

  IF FOUND THEN
    RETURN QUERY
    SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
          v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE,
          r.code
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_existing.id
    LIMIT 1;
    RETURN;
  END IF;

  -- 2. Look up the system 'owner' role once, up front.
  --    If it's missing, fail loudly rather than silently creating an ownerless account.
  SELECT r.id INTO v_owner_role_id
  FROM roles r
  WHERE r.code = 'owner' AND r.tenant_id IS NULL;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'System role "owner" is not seeded';
  END IF;

  BEGIN
    INSERT INTO tenants (name) VALUES (p_tenant_name)
    RETURNING tenants.id INTO v_tenant_id;

    INSERT INTO users (tenant_id, name, surname, email, password_hash)
    VALUES (v_tenant_id, p_user_name, p_user_surname, p_user_email, p_user_password_hash)
    RETURNING * INTO v_new_user;

    INSERT INTO user_roles (user_id, role_id, tenant_id)
    VALUES (v_new_user.id, v_owner_role_id, v_tenant_id);

    EXCEPTION WHEN unique_violation THEN
      -- Race: someone else's request for this email won first.
      -- Savepoint rollback undoes the tenant + user + role_assignment above.
      -- SELECT * INTO v_existing FROM users u WHERE u.email = p_user_email;


      SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
            v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE,
            r.code
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = v_existing.id
      LIMIT 1;

      RETURN QUERY
      SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
            v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE, 'owner'::TEXT;
      RETURN;
  END;

  RETURN QUERY
  SELECT v_new_user.id, v_new_user.tenant_id, v_new_user.name, v_new_user.surname,
       v_new_user.email, v_new_user.password_hash, v_new_user.created_at, TRUE,
       'owner'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION create_tenant_and_user(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_tenant_and_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO prod_app_user;