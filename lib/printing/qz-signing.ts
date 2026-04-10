import { createSign } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const defaultCertificatePath = path.join(process.cwd(), "public", "qz", "digital-certificate.txt");

async function readOptionalFile(filePath?: string | null) {
  if (!filePath) return null;

  try {
    await access(filePath);
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

// O certificado publico pode ficar em env, em caminho privado do servidor ou em public/qz
// para facilitar a configuracao inicial do restaurante.
export async function getQzCertificate() {
  return (
    process.env.QZ_TRAY_CERTIFICATE?.trim() ||
    (await readOptionalFile(process.env.QZ_TRAY_CERTIFICATE_PATH)) ||
    (await readOptionalFile(defaultCertificatePath))
  );
}

async function getQzPrivateKey() {
  return process.env.QZ_TRAY_PRIVATE_KEY?.trim() || (await readOptionalFile(process.env.QZ_TRAY_PRIVATE_KEY_PATH));
}

// A assinatura precisa ficar 100% no servidor. Nunca mova a chave privada para o cliente.
export async function signQzPayload(payload: string) {
  const privateKey = await getQzPrivateKey();
  if (!privateKey) return null;

  const signer = createSign("RSA-SHA512");
  signer.update(payload, "utf8");
  signer.end();

  return signer.sign(privateKey, "base64");
}

export async function getQzSigningStatus() {
  const certificate = await getQzCertificate();
  const privateKey = await getQzPrivateKey();

  return {
    certificateConfigured: Boolean(certificate),
    signingConfigured: Boolean(certificate && privateKey),
    certificateSource: process.env.QZ_TRAY_CERTIFICATE
      ? "env"
      : process.env.QZ_TRAY_CERTIFICATE_PATH
        ? "file"
        : "public/qz/digital-certificate.txt",
    privateKeySource: process.env.QZ_TRAY_PRIVATE_KEY
      ? "env"
      : process.env.QZ_TRAY_PRIVATE_KEY_PATH
        ? "file"
        : null
  };
}
