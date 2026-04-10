import { formatCurrency } from "@/lib/utils";
import type { OrderDetail } from "@/lib/types";

export function OrderPrintSheet({ order }: { order: OrderDetail | null }) {
  if (!order) return null;

  return (
    <div className="print-sheet hidden print:block">
      <div className="text-center text-[14px] font-bold">Casa do Sheik</div>
      <div className="my-2 border-t border-dashed border-black" />
      <div>Pedido: #{String(order.number).padStart(4, "0")}</div>
      <div>Tipo: {order.type.toUpperCase()}</div>
      <div>Data: {order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : "-"}</div>
      <div className="my-2 border-t border-dashed border-black" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-2">
          <div>
            {item.qty}x {item.name}
          </div>
          {item.note ? <div>Obs: {item.note}</div> : null}
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <div>TOTAL: {formatCurrency(order.total)}</div>
      <div>Pagamento: {order.payment || "-"}</div>
      {order.changeFor ? <div>Troco para: {formatCurrency(order.changeFor)}</div> : null}
      {order.kind === "delivery" && order.address ? (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <div>Cliente: {order.customer}</div>
          <div>Telefone: {order.phone || "-"}</div>
          <div>
            Endereco: {order.address.rua}, {order.address.numero}
          </div>
          <div>Bairro: {order.address.bairro}</div>
          {order.address.referencia ? <div>Ref: {order.address.referencia}</div> : null}
        </>
      ) : null}
      {order.notes ? (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <div>Obs geral: {order.notes}</div>
        </>
      ) : null}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="text-center">Obrigado pela preferencia!</div>
    </div>
  );
}
