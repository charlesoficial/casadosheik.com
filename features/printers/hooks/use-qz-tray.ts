"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QzPrinterSearchResult = string | string[];

type QzTrayApi = {
  websocket?: {
    isActive: () => boolean;
    connect: () => Promise<void>;
  };
  printers?: {
    find: (query?: string) => Promise<QzPrinterSearchResult>;
  };
  configs?: {
    create: (printer: string) => unknown;
  };
  print?: (config: unknown, data: string[]) => Promise<void>;
  security?: {
    setCertificatePromise?: (promiseFactory: () => Promise<string>) => void;
    setSignaturePromise?: (promiseFactory: (request: string) => Promise<string>) => void;
    setSignatureAlgorithm?: (algorithm: string) => void;
  };
};

type QzSecurityMode = "signed" | "unsigned" | "unavailable";

type QzStatusResponse = {
  certificateConfigured: boolean;
  signingConfigured: boolean;
  certificateSource: string | null;
  privateKeySource: string | null;
};

let qzModulePromise: Promise<QzTrayApi | null> | null = null;
let qzSecurityConfigured = false;
let qzSecurityMode: QzSecurityMode = "unavailable";
let qzSecurityMessage = "QZ Tray indisponivel no navegador.";

async function loadQzModule() {
  if (typeof window === "undefined") return null;

  if (!qzModulePromise) {
    qzModulePromise = import("qz-tray")
      .then((module) => ((module as { default?: QzTrayApi }).default ?? (module as QzTrayApi)))
      .catch(() => null);
  }

  return qzModulePromise;
}

async function configureQzSecurity(qz: QzTrayApi) {
  if (qzSecurityConfigured) {
    return { mode: qzSecurityMode, message: qzSecurityMessage };
  }

  qzSecurityConfigured = true;

  try {
    const response = await fetch("/api/admin/printers/qz/status", { cache: "no-store" });
    if (!response.ok) {
      qzSecurityMode = "unsigned";
      qzSecurityMessage = "Conexao local pronta, mas sem assinatura automatica configurada.";
      return { mode: qzSecurityMode, message: qzSecurityMessage };
    }

    const status = (await response.json()) as QzStatusResponse;
    if (status.signingConfigured && qz.security?.setCertificatePromise && qz.security?.setSignaturePromise) {
      qz.security.setCertificatePromise(async () => {
        const certificateResponse = await fetch("/api/admin/printers/qz/certificate", { cache: "no-store" });
        if (!certificateResponse.ok) {
          throw new Error("Certificado do QZ Tray indisponivel.");
        }

        return certificateResponse.text();
      });

      qz.security.setSignatureAlgorithm?.("SHA512");
      qz.security.setSignaturePromise(async (requestToSign: string) => {
        const signatureResponse = await fetch("/api/admin/printers/qz/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: requestToSign })
        });
        const payload = (await signatureResponse.json().catch(() => ({}))) as { signature?: string; error?: string };

        if (!signatureResponse.ok || !payload.signature) {
          throw new Error(payload.error || "Nao foi possivel assinar a solicitacao do QZ Tray.");
        }

        return payload.signature;
      });

      qzSecurityMode = "signed";
      qzSecurityMessage = "QZ Tray pronto com certificado e assinatura automatica.";
      return { mode: qzSecurityMode, message: qzSecurityMessage };
    }

    qzSecurityMode = "unsigned";
    qzSecurityMessage = status.certificateConfigured
      ? "QZ Tray conectado sem chave privada configurada. O navegador ainda pode pedir confirmacao manual."
      : "QZ Tray conectado em modo rapido. Para eliminar avisos, adicione certificado e chave de assinatura.";
    return { mode: qzSecurityMode, message: qzSecurityMessage };
  } catch {
    qzSecurityMode = "unsigned";
    qzSecurityMessage = "QZ Tray conectado sem assinatura automatica. O operador pode precisar confiar manualmente na conexao.";
    return { mode: qzSecurityMode, message: qzSecurityMessage };
  }
}

function normalizePrinterResult(result: QzPrinterSearchResult) {
  if (Array.isArray(result)) {
    return result.filter((printerName): printerName is string => typeof printerName === "string" && printerName.length > 0);
  }

  return typeof result === "string" && result.length > 0 ? [result] : [];
}

export function useQzTray() {
  const [connected, setConnected] = useState(false);
  const [available, setAvailable] = useState(false);
  const [installedPrinters, setInstalledPrinters] = useState<string[]>([]);
  const [securityMode, setSecurityMode] = useState<QzSecurityMode>("unavailable");
  const [statusMessage, setStatusMessage] = useState("QZ Tray ainda nao foi detectado.");

  const connect = useCallback(async () => {
    const qz = await loadQzModule();
    if (!qz?.websocket) {
      setAvailable(false);
      setConnected(false);
      setSecurityMode("unavailable");
      setStatusMessage("QZ Tray nao foi encontrado neste navegador.");
      return false;
    }

    setAvailable(true);
    const security = await configureQzSecurity(qz);
    setSecurityMode(security.mode);
    setStatusMessage(security.message);

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const isConnected = qz.websocket.isActive();
    setConnected(isConnected);
    return isConnected;
  }, []);

  const refreshInstalledPrinters = useCallback(async () => {
    const qz = await loadQzModule();
    if (!qz?.printers?.find) {
      setInstalledPrinters([]);
      return [];
    }

    const isReady = await connect();
    if (!isReady) {
      setInstalledPrinters([]);
      return [];
    }

    const foundPrinters = normalizePrinterResult(await qz.printers.find());
    setInstalledPrinters(foundPrinters);
    return foundPrinters;
  }, [connect]);

  const print = useCallback(
    async (printerName: string, lines: string[]) => {
      const qz = await loadQzModule();
      if (!qz?.configs || !qz?.print) {
        throw new Error("QZ Tray nao disponivel no navegador.");
      }

      const isReady = await connect();
      if (!isReady) {
        throw new Error("Nao foi possivel conectar ao QZ Tray.");
      }

      const config = qz.configs.create(printerName);
      await qz.print(config, lines);
    },
    [connect]
  );

  useEffect(() => {
    void loadQzModule().then((qz) => {
      const detected = Boolean(qz?.websocket);
      setAvailable(detected);
      setConnected(Boolean(qz?.websocket?.isActive?.()));
      if (!detected) {
        setSecurityMode("unavailable");
        setStatusMessage("QZ Tray nao foi encontrado neste navegador.");
      }
    });
  }, []);

  return useMemo(
    () => ({
      available,
      connected,
      installedPrinters,
      securityMode,
      statusMessage,
      connect,
      refreshInstalledPrinters,
      print
    }),
    [available, connect, connected, installedPrinters, print, refreshInstalledPrinters, securityMode, statusMessage]
  );
}
