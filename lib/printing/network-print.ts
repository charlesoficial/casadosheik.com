import net from "node:net";

// Envia o payload ESC/POS diretamente para impressoras de rede que aceitam TCP bruto,
// normalmente na porta 9100. Esse fluxo roda no servidor para nao depender do navegador.
export async function sendNetworkPrint(payload: {
  host: string;
  port?: number | null;
  content: string;
  timeoutMs?: number;
}) {
  const host = payload.host.trim();
  const port = payload.port ?? 9100;
  const timeoutMs = payload.timeoutMs ?? 5000;

  if (!host) {
    throw new Error("IP da impressora nao configurado.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Porta da impressora de rede invalida.");
  }

  await new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      // ESC/POS e sensivel ao encoding. Enviar em latin1 preserva bytes e
      // reduz tickets corrompidos em impressoras termicas de rede.
      socket.write(Buffer.from(payload.content, "latin1"), (writeError) => {
        if (writeError) {
          finish(writeError);
          return;
        }
        socket.end();
      });
    });

    socket.once("timeout", () => finish(new Error("Tempo esgotado ao conectar na impressora de rede.")));
    socket.once("error", (error) => finish(error));
    socket.once("close", (hadError) => {
      if (!hadError) {
        finish();
      }
    });

    socket.connect(port, host);
  });
}
