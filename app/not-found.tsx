import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <Link href="/" className="text-sm text-primary hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
