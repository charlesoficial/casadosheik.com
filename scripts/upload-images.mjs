// scripts/upload-images.mjs
// Faz upload das imagens de RESTAURANTE.SQL/produtos.sql/ para o bucket 'produtos'
// e atualiza o campo foto_url na tabela produtos do Supabase.
//
// Uso: node scripts/upload-images.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Configuracao -------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "produtos";
const IMAGES_DIR = join(__dirname, "..", "RESTAURANTE.SQL", "produtos.sql");

// Mapeamento: nome-do-arquivo.png -> nome exato do produto no banco
// Arquivos com sufixo -historico sao descartados (versoes antigas).
const FILE_TO_PRODUCT = {
  "arroz-sirio.png":                            "Arroz Sirio",
  "babaghanouch.png":                           "Babaghanouch",
  "batata-frita-500g.png":                      "Batata Frita 500g",
  "coalhada-seca.png":                          "Coalhada Seca",
  "coca-cola-1-5l.png":                         "Coca-Cola 1,5L",
  "coca-cola-2l.png":                           "Coca-Cola 2L",
  "coca-cola-600ml.png":                        "Coca-Cola 600ml",
  "combo-09-esfihas.png":                       "Combo 09 Esfihas",
  "combo-de-pastas-individual.png":             "Combo de Pastas Individual",
  "combo-esfihas-e-kibes.png":                  "Combo Esfihas e Kibes",
  "combo-vegetariano.png":                      "Combo Vegetariano",
  "esfiha-carne-com-mucarela.png":              "Esfiha Carne com Mucarela",
  "esfiha-coalhada-seca-com-zaatar.png":        "Esfiha Coalhada Seca com Zaatar",
  "esfiha-coalhada-seca.png":                   "Esfiha Coalhada Seca",
  "esfiha-de-carne.png":                        "Esfiha de Carne",
  "esfiha-de-mahammara-com-queijo.png":         "Esfiha de Mahammara com Queijo",
  "esfiha-de-mahammara.png":                    "Esfiha de Mahammara",
  "esfiha-de-zaatar-com-queijo.png":            "Esfiha de Zaatar com Queijo",
  "esfiha-mucarela.png":                        "Esfiha Mucarela",
  "esfiha-queijo-branco.png":                   "Esfiha Queijo Branco",
  "falafel.png":                                "Falafel",
  "fatteh-de-falafel.png":                      "Fatteh de Falafel",
  "fatteh-shawarma.png":                        "Fatteh Shawarma",
  "guarana-600ml.png":                          "Guarana 600ml",
  "heineken-600ml.png":                         "Heineken 600ml",
  "heineken-long-neck.png":                     "Heineken Long Neck",
  "hommus-tahine.png":                          "Hommus Tahine",
  "kibe-cru.png":                               "Kibe Cru",
  "kibe-recheado-com-mussarela.png":            "Kibe Recheado com Mussarela",
  "mafufo-folha-de-uva.png":                    "Mafufo Folha de Uva",
  "mafufo.png":                                 "Mafufo",
  "mineiro-2l.png":                             "Mineiro 2L",
  "pao-arabe-original-casa-do-sheik.png":       "Pao Arabe Original Casa do Sheik",
  "peixe-frito.png":                            "Peixe Frito",
  "prato-falafel.png":                          "Prato Falafel",
  "prato-kafta-arabe.png":                      "Prato Kafta Arabe",
  "quibe-de-carne.png":                         "Quibe de Carne",
  "sahn-kibe-cru.png":                          "Sahn Kibe Cru",
  "salada-fattoush.png":                        "Salada Fattoush",
  "shawarma-box.png":                           "Shawarma Box",
  "shawarma-de-carne.png":                      "Shawarma de Carne",
  "shawarma-de-falafel-vegetariano.png":        "Shawarma de Falafel (Vegetariano)",
  "shawarma-do-sheik-frango-especial.png":      "Shawarma do Sheik (Frango Especial)",
  "shawarma-kababe-de-kafta.png":               "Shawarma Kababe de Kafta",
  "shawarma-misto.png":                         "Shawarma Misto",
  "tabule.png":                                 "Tabule",
};

// -------------------------------------------------------------------------

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidos.");
  console.error("   Rode com: node --env-file=.env.local scripts/upload-images.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Erro ao criar bucket: ${error.message}`);
    console.log(`🪣  Bucket '${BUCKET}' criado.`);
  } else {
    console.log(`🪣  Bucket '${BUCKET}' ja existe.`);
  }
}

async function uploadImage(filePath, fileName) {
  const fileBuffer = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, fileBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw new Error(`Upload falhou (${fileName}): ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

async function updateProductUrl(productName, publicUrl) {
  const { error, count } = await supabase
    .from("produtos")
    .update({ foto_url: publicUrl })
    .eq("nome", productName)
    .is("deleted_at", null);

  if (error) throw new Error(`Update falhou (${productName}): ${error.message}`);
  return count;
}

async function main() {
  console.log("\n🚀 Iniciando upload de imagens para Supabase Storage...\n");
  console.log(`   URL:    ${SUPABASE_URL}`);
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   Pasta:  ${IMAGES_DIR}\n`);

  await ensureBucket();

  const files = readdirSync(IMAGES_DIR).filter(
    (f) => extname(f).toLowerCase() === ".png" && !f.includes("-historico")
  );

  console.log(`📁 ${files.length} imagens encontradas (sem historico)\n`);

  let uploaded = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    const productName = FILE_TO_PRODUCT[file];
    if (!productName) {
      console.log(`⏭️  ${file} — sem mapeamento, ignorado`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`⬆️  ${file.padEnd(50)} → `);
      const publicUrl = await uploadImage(join(IMAGES_DIR, file), file);
      uploaded++;

      await updateProductUrl(productName, publicUrl);
      updated++;
      console.log(`✅ ${productName}`);
    } catch (err) {
      console.log(`❌ ERRO`);
      errors.push({ file, error: err.message });
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Imagens enviadas:      ${uploaded}`);
  console.log(`   📝 Produtos atualizados:  ${updated}`);
  console.log(`   ⏭️  Ignorados:             ${skipped}`);

  if (errors.length > 0) {
    console.log(`\n❌ Erros (${errors.length}):`);
    errors.forEach(({ file, error }) => console.log(`   ${file}: ${error}`));
  } else {
    console.log(`\n🎉 Tudo concluido sem erros!`);
  }
}

main().catch((err) => {
  console.error("\n💥 Erro fatal:", err.message);
  process.exit(1);
});
