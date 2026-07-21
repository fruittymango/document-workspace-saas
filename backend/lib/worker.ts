import "dotenv/config";
import { Client } from "pg";

async function run() {
  const client = new Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  await client.connect();

  const appPass = process.env.PROD_APP_PASSWORD;
  const migPass = process.env.PROD_MIGRATION_PASSWORD;
  const sysPass = process.env.PROD_SYSTEM_PASSWORD;

  if (!appPass || !migPass || !sysPass) {
    console.error("Missing required role passwords in environment variables.");
    process.exit(1);
  }

  const escapedAppPass = client.escapeLiteral(appPass);
  const escapedMigPass = client.escapeLiteral(migPass);
  const escapedSysPass = client.escapeLiteral(sysPass);

  const monolithicSqlScript = `
    BEGIN;

    -- 1. Create Personas
    CREATE ROLE prod_app_user WITH LOGIN PASSWORD ${escapedAppPass};
    CREATE ROLE prod_migration_user WITH LOGIN PASSWORD ${escapedMigPass};
    CREATE ROLE prod_system_jobs WITH LOGIN PASSWORD ${escapedSysPass};

    -- 2. Scoping & Privileges
    GRANT USAGE ON SCHEMA public TO prod_app_user, prod_migration_user, prod_system_jobs;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO prod_app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prod_app_user;
    GRANT ALL PRIVILEGES ON SCHEMA public TO prod_migration_user;
    
    -- 3. Bypass RLS for System Tasks
    ALTER ROLE prod_system_jobs BYPASSRLS;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO prod_system_jobs;

    -- 4. Future Proofing Default Hooks
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prod_app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_migration_user;

    COMMIT;
  `;

  try {
    console.log(
      "🚀 Executing entire persona setup in a single database transaction...",
    );

    await client.query(monolithicSqlScript);

    console.log("✅ Database production personas created successfully.");
  } catch (err) {
    console.error(
      "❌ Persona setup failed. Single transaction rolled back automatically by DB engine:",
      err,
    );
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
