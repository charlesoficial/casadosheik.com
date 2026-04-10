import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "administrador@gmail.com";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "administrador";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias para o bootstrap.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const file = fs.readFileSync(envPath, "utf8");
  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existingUser = listData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        display_name: "Administrador"
      },
      app_metadata: {
        role: "admin"
      }
    });

    if (updateError) {
      throw updateError;
    }

    console.log(`Usuario admin atualizado com sucesso: ${email}`);
    return;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "admin",
      display_name: "Administrador"
    },
    app_metadata: {
      role: "admin"
    }
  });

  if (createError) {
    throw createError;
  }

  console.log(`Usuario admin criado com sucesso: ${email}`);
}

main().catch((error) => {
  console.error("Falha ao executar bootstrap do admin.");
  console.error(error.message || error);
  process.exit(1);
});
