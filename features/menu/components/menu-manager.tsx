"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { uploadProductImage } from "@/lib/storage/upload";
import {
  DSBadge,
  DSButton,
  DSCard,
  DSEmpty,
  DSInput,
  useFeedback,
} from "@/components/system";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { CategoryItem, MenuProduct } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductDraft = {
  name: string;
  description: string;
  price: string;
  image: string;
  available: boolean;
  highlight: boolean;
};

const emptyDraft: ProductDraft = {
  name: "",
  description: "",
  price: "",
  image: "",
  available: true,
  highlight: false,
};

type DialogMode = "create" | "edit" | null;
type AvailFilter = "all" | "available" | "inactive";

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-0.5">
      <span className="block text-xs font-medium text-admin-fg-muted">{children}</span>
      {hint && <span className="block text-xs text-admin-fg-faint">{hint}</span>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function ToggleChip({
  active,
  onToggle,
  activeLabel,
  inactiveLabel,
  activeColor,
}: {
  active: boolean;
  onToggle: () => void;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "inline-flex items-center gap-2 rounded-ds-sm border px-3 py-2 text-xs font-medium",
        "transition-all duration-motion-default ease-motion-in-out motion-press",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/30",
        active
          ? `${activeColor} border-transparent`
          : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg",
      ].join(" ")}
    >
      {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

// ─── Feedback banner ─────────────────────────────────────────────────────────

// FeedbackBanner removido — substituído por DSFeedback + useFeedback do design system.

// ─── Image upload zone ────────────────────────────────────────────────────────

function ImageZone({
  previewSrc,
  onFile,
  onUrlChange,
  urlValue,
  altLabel,
}: {
  previewSrc: string;
  onFile: (file: File) => void;
  onUrlChange: (url: string) => void;
  urlValue: string;
  altLabel: string;
}) {
  return (
    <div className="space-y-3">
      {/* Upload trigger */}
      <label className="flex cursor-pointer items-center gap-3 rounded-ds-md border border-dashed border-admin-border bg-admin-shell px-4 py-3 transition-colors duration-motion-default ease-motion-in-out hover:border-admin-border-strong">
        <Upload className="h-4 w-4 shrink-0 text-admin-fg-faint" />
        <span className="text-sm text-admin-fg-muted">Selecionar arquivo</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>

      {/* URL input */}
      <DSInput
        placeholder="Ou cole uma URL de imagem"
        value={previewSrc.startsWith("blob:") ? "" : urlValue}
        onChange={(e) => onUrlChange(e.target.value)}
        className="bg-admin-shell"
      />

      {/* Preview */}
      {previewSrc && (
        <div className="relative h-36 overflow-hidden rounded-ds-md border border-admin-border">
          <Image src={previewSrc} alt={altLabel} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover" unoptimized />
        </div>
      )}
    </div>
  );
}

// ─── Product form (shared for create + edit) ──────────────────────────────────

function ProductForm({
  draft,
  onChange,
  onFile,
  onSubmit,
  submitLabel,
  isBusy,
  onCancel,
}: {
  draft: ProductDraft;
  onChange: (update: Partial<ProductDraft>) => void;
  onFile: (file: File) => void;
  onSubmit: () => void;
  submitLabel: string;
  isBusy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nome do produto">
        <DSInput
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Kibe assado"
          className="bg-admin-shell"
        />
      </Field>

      <Field label="Descrição" hint="Exibida no cardápio do cliente">
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descreva o item de forma apetitosa..."
          className="min-h-[92px] w-full resize-none rounded-ds-md border border-admin-border bg-admin-shell px-4 py-3 text-sm text-admin-fg placeholder:text-admin-fg-faint outline-none transition-[background-color,border-color,box-shadow] duration-motion-default ease-motion-in-out hover:border-admin-border-strong focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </Field>

      <Field label="Preço" hint="Em reais, ex: 29.90">
        <DSInput
          value={draft.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="0,00"
          className="bg-admin-shell tabular-nums"
        />
      </Field>

      <div>
        <FieldLabel hint="Upload ou URL pública">Imagem</FieldLabel>
        <div className="mt-1.5">
          <ImageZone
            previewSrc={draft.image}
            onFile={onFile}
            onUrlChange={(url) => onChange({ image: url })}
            urlValue={draft.image}
            altLabel={draft.name || "Preview"}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-2 pt-1">
        <ToggleChip
          active={draft.available}
          onToggle={() => onChange({ available: !draft.available })}
          activeLabel="Disponível"
          inactiveLabel="Indisponível"
          activeColor="bg-status-success-bg/60 text-status-success-fg"
        />
        <ToggleChip
          active={draft.highlight}
          onToggle={() => onChange({ highlight: !draft.highlight })}
          activeLabel="Em destaque"
          inactiveLabel="Sem destaque"
          activeColor="bg-status-warning-bg/50 text-status-warning-fg"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <DSButton
          type="button"
          variant="admin"
          size="sm"
          disabled={isBusy || !draft.name.trim() || !draft.price.trim()}
          onClick={onSubmit}
          className="min-w-[110px]"
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {submitLabel}
        </DSButton>
        <DSButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancelar
        </DSButton>
      </div>
    </div>
  );
}

// ─── Product dialog ───────────────────────────────────────────────────────────

function ProductDialog({
  mode,
  draft,
  onChange,
  onFile,
  onSubmit,
  isBusy,
  onClose,
  categoryName,
}: {
  mode: DialogMode;
  draft: ProductDraft;
  onChange: (update: Partial<ProductDraft>) => void;
  onFile: (file: File) => void;
  onSubmit: () => void;
  isBusy: boolean;
  onClose: () => void;
  categoryName: string;
}) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-ds-xl border-admin-border bg-admin-elevated p-0 text-admin-fg shadow-panel sm:rounded-ds-xl">
        {/* Header */}
        <DialogHeader className="border-b border-admin-border-faint px-6 py-5">
          <DialogTitle className="text-base font-semibold text-admin-fg">
            {mode === "create" ? "Novo produto" : "Editar produto"}
          </DialogTitle>
          <p className="mt-0.5 text-xs text-admin-fg-faint">
            Categoria: <span className="text-admin-fg-muted">{categoryName}</span>
          </p>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5">
          <ProductForm
            draft={draft}
            onChange={onChange}
            onFile={onFile}
            onSubmit={onSubmit}
            submitLabel={mode === "create" ? "Criar produto" : "Salvar alterações"}
            isBusy={isBusy}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  product,
  isBusy,
  onConfirm,
  onClose,
}: {
  product: MenuProduct | null;
  isBusy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm rounded-ds-xl border-admin-border bg-admin-elevated p-0 text-admin-fg shadow-panel sm:rounded-ds-xl">
        <div className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-ds-xl border border-status-danger-border bg-status-danger-bg text-status-danger-fg">
            <Trash2 className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-admin-fg">Excluir produto?</h2>
          <p className="mt-2 text-sm text-admin-fg-muted">
            <span className="font-medium text-admin-fg-secondary">{product?.name}</span> será removido
            permanentemente do cardápio. Esta ação não pode ser desfeita.
          </p>
          <div className="mt-6 flex gap-3">
            <DSButton
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </DSButton>
            <DSButton
              type="button"
              variant="danger"
              size="sm"
              disabled={isBusy}
              onClick={onConfirm}
              className="flex-1"
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Excluir
            </DSButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onCopy,
  onToggleAvail,
  onToggleHighlight,
  onDelete,
  onPreview,
  busyKey,
}: {
  product: MenuProduct;
  onEdit: () => void;
  onCopy: () => void;
  onToggleAvail: () => void;
  onToggleHighlight: () => void;
  onDelete: () => void;
  onPreview: () => void;
  busyKey: string | null;
}) {
  const isAvailBusy = busyKey === `product-toggle-${product.id}-available`;
  const isHighBusy = busyKey === `product-toggle-${product.id}-highlight`;
  const isDelBusy = busyKey === `product-delete-${product.id}`;
  const isEditBusy = busyKey === `product-update-${product.id}`;

  return (
    <article className="group flex flex-col gap-4 rounded-ds-xl border border-admin-border-faint bg-admin-surface p-4 shadow-card transition-[border-color,background-color,box-shadow,transform] duration-motion-default ease-motion-in-out hover:-translate-y-0.5 hover:border-admin-border hover:bg-admin-elevated hover:shadow-panel sm:flex-row">
      {/* Image */}
      <div className="relative aspect-square min-h-[112px] w-full shrink-0 overflow-hidden rounded-ds-lg border border-admin-border bg-admin-overlay sm:w-28">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="112px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-7 w-7 text-admin-fg-faint" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold tracking-tight text-admin-fg">{product.name}</p>
          {product.highlight && (
            <span className="inline-flex items-center gap-1 rounded-ds-sm border border-status-warning-border bg-status-warning-bg px-2 py-1 text-xs font-medium text-status-warning-fg">
              <Star className="h-3 w-3" />
              Destaque
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-admin-fg-muted">{product.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-brand-gold">
            {formatCurrency(product.price)}
          </span>
          <span
            className={[
              "inline-flex items-center rounded-ds-sm border px-2.5 py-1 text-xs font-medium",
              product.available
                ? "border-status-success-border bg-status-success-bg text-status-success-fg"
                : "border-admin-border bg-admin-overlay text-admin-fg-faint",
            ].join(" ")}
          >
            {product.available ? "Disponível" : "Inativo"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-start gap-1 rounded-ds-md border border-admin-border bg-admin-overlay p-1 opacity-80 transition-opacity duration-motion-default ease-motion-in-out group-hover:opacity-100">
        <ActionIcon
          label="Editar"
          busy={isEditBusy}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon label="Copiar" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon label="Ver no menu" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon
          label={product.available ? "Desativar" : "Ativar"}
          busy={isAvailBusy}
          onClick={onToggleAvail}
          color={product.available ? "text-status-success-fg" : "text-admin-fg-faint"}
        >
          {isAvailBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : product.available ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </ActionIcon>
        <ActionIcon
          label={product.highlight ? "Remover destaque" : "Destacar"}
          busy={isHighBusy}
          onClick={onToggleHighlight}
          color={product.highlight ? "text-status-warning-fg" : "text-admin-fg-faint"}
        >
          {isHighBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Star className="h-3.5 w-3.5" />
          )}
        </ActionIcon>
        <ActionIcon
          label="Excluir"
          busy={isDelBusy}
          onClick={onDelete}
          color="text-status-danger-fg/70 hover:text-status-danger-fg"
        >
          {isDelBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </ActionIcon>
      </div>
    </article>
  );
}

function ActionIcon({
  label,
  children,
  onClick,
  busy = false,
  color = "text-admin-fg-muted",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  color?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-ds-sm border border-transparent transition-all duration-motion-fast ease-motion-in-out",
        "hover:border-admin-border hover:bg-admin-overlay",
        "disabled:pointer-events-none disabled:opacity-50",
        color,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyProducts({
  hasFilter,
  onAdd,
}: {
  hasFilter: boolean;
  onAdd: () => void;
}) {
  return (
    <DSEmpty
      context={hasFilter ? "search" : "products"}
      size="lg"
      title={hasFilter ? "Nenhum produto encontrado" : "Categoria sem produtos"}
      description={
        hasFilter
          ? "Ajuste a busca ou filtre por outro status."
          : "Crie o primeiro item para colocar esta categoria em operação."
      }
      action={
        hasFilter
          ? undefined
          : { label: "Adicionar produto", onClick: onAdd, variant: "admin" }
      }
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MenuManager({
  initialCategories,
  initialProducts,
}: {
  initialCategories: CategoryItem[];
  initialProducts: MenuProduct[];
}) {
  const router = useRouter();

  // ── Core state ──
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategories[0]?.id ?? ""
  );

  // ── Category editing ──
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // ── Product dialog ──
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogDraft, setDialogDraft] = useState<ProductDraft>(emptyDraft);
  const [dialogProductId, setDialogProductId] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const dialogPreviewRef = useRef<string | null>(null);

  // ── Delete dialog ──
  const [deleteTarget, setDeleteTarget] = useState<MenuProduct | null>(null);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");

  // ── Feedback ──
  const fb = useFeedback();
  const setError   = (msg: string) => fb.setError(msg);
  const setSuccess = (msg: string) => fb.setSuccess(msg);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const categoryInputRef = useRef<HTMLInputElement | null>(null);

  // ── Derived ──
  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? categories[0];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const inCategory =
        p.categoryId === selectedCategory?.id ||
        p.category === selectedCategory?.name;
      if (!inCategory) return false;
      if (availFilter === "available" && !p.available) return false;
      if (availFilter === "inactive" && p.available) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, selectedCategory, search, availFilter]);

  const stats = useMemo(() => {
    const inCat = products.filter(
      (p) =>
        p.categoryId === selectedCategory?.id ||
        p.category === selectedCategory?.name
    );
    return {
      total: inCat.length,
      active: inCat.filter((p) => p.available).length,
      inactive: inCat.filter((p) => !p.available).length,
    };
  }, [products, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach((category) => {
      counts.set(
        category.id,
        products.filter(
          (product) =>
            product.categoryId === category.id || product.category === category.name
        ).length
      );
    });
    return counts;
  }, [categories, products]);

  const menuHealth = useMemo(() => {
    const active = products.filter((product) => product.available).length;
    const hidden = products.filter((product) => !product.available).length;
    const highlighted = products.filter((product) => product.highlight).length;
    const withoutImage = products.filter((product) => !product.image).length;
    const categoriesInUse = categories.filter(
      (category) => (categoryCounts.get(category.id) ?? 0) > 0
    ).length;
    const readyPercent =
      products.length === 0 ? 0 : Math.round((active / products.length) * 100);

    return {
      total: products.length,
      active,
      hidden,
      highlighted,
      withoutImage,
      categoriesInUse,
      readyPercent,
    };
  }, [categories, categoryCounts, products]);

  // ── Effects ──
  useEffect(() => {
    if (!selectedCategoryId && categories[0]?.id) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    return () => {
      if (dialogPreviewRef.current) URL.revokeObjectURL(dialogPreviewRef.current);
    };
  }, []);

  // ── Helpers ──
  function reset() {
    fb.clear();
  }

  function openCreate() {
    reset();
    setDialogDraft(emptyDraft);
    setPendingImageFile(null);
    setDialogProductId(null);
    setDialogMode("create");
  }

  function openEdit(product: MenuProduct) {
    reset();
    setDialogProductId(product.id);
    setDialogDraft({
      name: product.name,
      description: product.description,
      price: String(product.price),
      image: product.image,
      available: product.available ?? true,
      highlight: product.highlight ?? false,
    });
    setPendingImageFile(null);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    if (dialogPreviewRef.current) {
      URL.revokeObjectURL(dialogPreviewRef.current);
      dialogPreviewRef.current = null;
    }
    setPendingImageFile(null);
  }

  function handleDialogFile(file: File) {
    if (dialogPreviewRef.current) URL.revokeObjectURL(dialogPreviewRef.current);
    const url = URL.createObjectURL(file);
    dialogPreviewRef.current = url;
    setPendingImageFile(file);
    setDialogDraft((d) => ({ ...d, image: url }));
  }

  function copyProductToDraft(product: MenuProduct) {
    reset();
    if (product.categoryId) setSelectedCategoryId(product.categoryId);
    setDialogDraft({
      name: `${product.name} cópia`,
      description: product.description,
      price: String(product.price),
      image: product.image,
      available: product.available ?? true,
      highlight: product.highlight ?? false,
    });
    setPendingImageFile(null);
    setDialogMode("create");
  }

  async function maybeUploadImage(file: File | null, current?: string) {
    if (!file) return current ?? "";
    const uploaded = await uploadProductImage(file);
    return uploaded.publicUrl;
  }

  // ── Category handlers ──
  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    reset();
    try {
      setBusyKey("create-category");
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar categoria");
      setCategories((c) => [...c, data]);
      setSelectedCategoryId(data.id);
      setNewCategoryName("");
      setSuccess("Categoria criada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateCategory(categoryId: string) {
    reset();
    try {
      setBusyKey(`category-update-${categoryId}`);
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar categoria");
      setCategories((c) =>
        c.map((cat) =>
          cat.id === categoryId
            ? { ...cat, ...data, productCount: cat.productCount }
            : cat
        )
      );
      setProducts((p) =>
        p.map((prod) =>
          prod.categoryId === categoryId ? { ...prod, category: data.name } : prod
        )
      );
      setEditingCategoryId(null);
      setSuccess("Categoria atualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteCategory(category: CategoryItem) {
    reset();
    if (
      products.some(
        (p) => p.categoryId === category.id || p.category === category.name
      )
    ) {
      setError("Não é possível excluir uma categoria com produtos vinculados.");
      return;
    }
    try {
      setBusyKey(`category-delete-${category.id}`);
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir categoria");
      setCategories((c) => c.filter((cat) => cat.id !== category.id));
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId(
          categories.find((c) => c.id !== category.id)?.id ?? ""
        );
      }
      setSuccess("Categoria excluída.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir categoria");
    } finally {
      setBusyKey(null);
    }
  }

  // ── Product handlers ──
  async function handleCreateProduct() {
    reset();
    try {
      setBusyKey("create-product");
      const imageUrl = await maybeUploadImage(pendingImageFile, dialogDraft.image);
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name,
          name: dialogDraft.name,
          description: dialogDraft.description,
          price: Number(dialogDraft.price.replace(",", ".")),
          image: imageUrl,
          available: dialogDraft.available,
          highlight: dialogDraft.highlight,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar produto");
      setProducts((p) => [data, ...p]);
      setCategories((c) =>
        c.map((cat) =>
          cat.id === selectedCategory?.id
            ? { ...cat, productCount: (cat.productCount ?? 0) + 1 }
            : cat
        )
      );
      closeDialog();
      setSuccess("Produto criado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateProduct() {
    if (!dialogProductId) return;
    reset();
    try {
      setBusyKey(`product-update-${dialogProductId}`);
      const imageUrl = await maybeUploadImage(
        pendingImageFile,
        dialogDraft.image
      );
      const res = await fetch(`/api/admin/products/${dialogProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name,
          name: dialogDraft.name,
          description: dialogDraft.description,
          price: Number(dialogDraft.price.replace(",", ".")),
          image: imageUrl,
          available: dialogDraft.available,
          highlight: dialogDraft.highlight,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar produto");
      setProducts((p) =>
        p.map((prod) => (prod.id === dialogProductId ? { ...prod, ...data } : prod))
      );
      closeDialog();
      setSuccess("Produto atualizado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    reset();
    try {
      setBusyKey(`product-delete-${target.id}`);
      const res = await fetch(`/api/admin/products/${target.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir produto");
      setProducts((p) => p.filter((prod) => prod.id !== target.id));
      setCategories((c) =>
        c.map((cat) =>
          cat.id === target.categoryId
            ? { ...cat, productCount: Math.max(0, (cat.productCount ?? 1) - 1) }
            : cat
        )
      );
      setDeleteTarget(null);
      setSuccess("Produto excluído.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleProduct(
    product: MenuProduct,
    field: "available" | "highlight"
  ) {
    reset();
    try {
      setBusyKey(`product-toggle-${product.id}-${field}`);
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: product.categoryId,
          categoryName: product.category,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          available:
            field === "available"
              ? !(product.available ?? true)
              : (product.available ?? true),
          highlight:
            field === "highlight"
              ? !(product.highlight ?? false)
              : (product.highlight ?? false),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar produto");
      setProducts((p) =>
        p.map((prod) => (prod.id === product.id ? { ...prod, ...data } : prod))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar produto");
    } finally {
      setBusyKey(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Dialogs */}
      <ProductDialog
        mode={dialogMode}
        draft={dialogDraft}
        onChange={(update) => setDialogDraft((d) => ({ ...d, ...update }))}
        onFile={handleDialogFile}
        onSubmit={dialogMode === "create" ? handleCreateProduct : handleUpdateProduct}
        isBusy={
          busyKey === "create-product" ||
          busyKey === `product-update-${dialogProductId}`
        }
        onClose={closeDialog}
        categoryName={selectedCategory?.name ?? ""}
      />

      <DeleteDialog
        product={deleteTarget}
        isBusy={busyKey === `product-delete-${deleteTarget?.id}`}
        onConfirm={handleDeleteProduct}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-ds-xl border border-admin-border bg-admin-elevated p-5 shadow-card">
        <div className="max-w-2xl">
          <DSBadge variant="admin" className="mb-3">Menu Management Control Center</DSBadge>
          <h1 className="text-3xl font-semibold tracking-tight text-admin-fg">Cardápio</h1>
          <p className="mt-1 text-sm text-admin-fg-muted">
            Organize produtos, categorias, preços e disponibilidade para manter a operação pronta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DSButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/menu")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver menu
          </DSButton>
          <DSButton
            type="button"
            variant="admin"
            size="sm"
            onClick={openCreate}
            disabled={!selectedCategory}
          >
            <Plus className="h-3.5 w-3.5" />
            Novo produto
          </DSButton>
        </div>
      </div>

      <DSCard
        variant="admin-panel"
        padding="lg"
        entering
        className="mb-6 overflow-hidden shadow-panel"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <DSBadge variant={menuHealth.readyPercent >= 70 ? "success" : "warning"}>
                {menuHealth.readyPercent}% pronto
              </DSBadge>
              <span className="text-sm text-admin-fg-muted">
                {menuHealth.active} produtos ativos de {menuHealth.total}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-admin-fg">
                Cardápio operacional
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-admin-fg-muted">
                Produtos ativos primeiro, categorias organizadas ao lado e ações essenciais sempre à mão.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DSButton
                type="button"
                variant="admin"
                size="sm"
                onClick={openCreate}
                disabled={!selectedCategory}
              >
                <Plus className="h-3.5 w-3.5" />
                Criar produto
              </DSButton>
              <DSButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => categoryInputRef.current?.focus()}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova categoria
              </DSButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Ativos</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-status-success-fg">
                {menuHealth.active}
              </p>
            </div>
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Ocultos</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-admin-fg">
                {menuHealth.hidden}
              </p>
            </div>
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Categorias</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-gold">
                {categories.length}
              </p>
            </div>
            <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-4">
              <p className="text-xs text-admin-fg-faint">Sem imagem</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-status-warning-fg">
                {menuHealth.withoutImage}
              </p>
            </div>
          </div>
        </div>
      </DSCard>

      {/* Feedback */}
      {fb.hasMessage && <fb.Banner className="mb-4" />}

      {/* Main layout */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* ── Left: Categories ─── */}
        <div className="space-y-4 xl:order-2">
          <DSCard className="overflow-hidden shadow-card">
            <div className="space-y-0 border-b border-admin-border-faint px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-admin-fg">Estrutura do menu</h2>
                <span className="rounded-ds-sm border border-admin-border bg-admin-surface px-2 py-0.5 text-xs text-admin-fg-faint">
                  {categories.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-admin-fg-muted">
                Categorias que organizam o cardápio para a operação.
              </p>
            </div>

            <div className="space-y-1.5 p-4">
              {/* Category pills */}
              {categories.length === 0 && (
                <p className="py-4 text-center text-xs text-admin-fg-faint">
                  Nenhuma categoria criada ainda.
                </p>
              )}

              {categories.map((cat) => {
                const active = selectedCategory?.id === cat.id;
                return (
                  <div key={cat.id} className="space-y-2">
                    {/* Category row */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCategoryId(cat.id);
                        }
                      }}
                      className={[
                        "group flex cursor-pointer items-center justify-between rounded-ds-lg border px-3 py-3 transition-all duration-motion-default ease-motion-in-out focus:outline-none focus:ring-2 focus:ring-brand-purple/60 focus:ring-offset-1 focus:ring-offset-admin-base",
                        active
                          ? "border-brand-purple bg-brand-purple-bg"
                          : "border-transparent hover:border-admin-border hover:bg-admin-surface",
                      ].join(" ")}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${active ? "text-admin-fg" : "text-admin-fg-secondary"}`}>
                          {cat.name}
                        </p>
                        <p className="text-xs text-admin-fg-faint">
                          {cat.productCount ?? 0} iten{(cat.productCount ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition ${active ? "text-brand-purple" : "text-admin-fg-faint group-hover:text-admin-fg-faint"}`}
                      />
                    </div>

                    {/* Inline edit */}
                    {editingCategoryId === cat.id && (
                      <div
                        className="space-y-2 rounded-ds-lg border border-admin-border bg-admin-shell p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DSInput
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          inputSize="sm"
                          className="bg-admin-base"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleUpdateCategory(cat.id);
                            if (e.key === "Escape") setEditingCategoryId(null);
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <DSButton
                            type="button"
                            variant="admin"
                            size="xs"
                            disabled={busyKey === `category-update-${cat.id}`}
                            onClick={() => void handleUpdateCategory(cat.id)}
                          >
                            {busyKey === `category-update-${cat.id}` && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            Salvar
                          </DSButton>
                          <DSButton
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => setEditingCategoryId(null)}
                          >
                            Cancelar
                          </DSButton>
                        </div>
                      </div>
                    )}

                    {/* Category actions (only visible on hover of active) */}
                    {active && editingCategoryId !== cat.id && (
                      <div className="flex gap-1.5 px-1">
                        <DSButton
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategoryId(cat.id);
                            setEditingCategoryName(cat.name);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </DSButton>
                        <DSButton
                          type="button"
                          variant="danger"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteCategory(cat);
                          }}
                          disabled={busyKey === `category-delete-${cat.id}`}
                        >
                          {busyKey === `category-delete-${cat.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Excluir
                        </DSButton>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Create category */}
              <form
                onSubmit={handleCreateCategory}
                className="mt-3 space-y-2 rounded-ds-lg border border-dashed border-admin-border bg-admin-shell p-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-admin-fg-faint">
                  Nova categoria
                </p>
                <DSInput
                  ref={categoryInputRef}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  inputSize="sm"
                  className="bg-admin-base"
                />
                <DSButton
                  type="submit"
                  variant="admin"
                  size="xs"
                  className="w-full"
                  disabled={!newCategoryName.trim() || busyKey === "create-category"}
                >
                  {busyKey === "create-category" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Criar
                </DSButton>
              </form>
            </div>
          </DSCard>

          <DSCard padding="lg" className="shadow-card">
            <DSBadge variant="secondary" className="mb-3">
              Leitura rápida
            </DSBadge>
            <h3 className="text-base font-semibold text-admin-fg">Saúde do cardápio</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Categorias em uso</span>
                <span className="font-semibold tabular-nums text-admin-fg">
                  {menuHealth.categoriesInUse}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Itens em destaque</span>
                <span className="font-semibold tabular-nums text-status-warning-fg">
                  {menuHealth.highlighted}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Sem imagem</span>
                <span className="font-semibold tabular-nums text-status-warning-fg">
                  {menuHealth.withoutImage}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Ocultos</span>
                <span className="font-semibold tabular-nums text-admin-fg">
                  {menuHealth.hidden}
                </span>
              </div>
            </div>
          </DSCard>
        </div>

        {/* ── Right: Products ─── */}
        <div className="space-y-5 xl:order-1">

          {/* Products header */}
          <DSCard padding="lg" className="shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <DSBadge variant="secondary" className="mb-3">
                Workspace principal
              </DSBadge>
              <h2 className="text-2xl font-semibold tracking-tight text-admin-fg">
                {selectedCategory?.name ?? "Produtos"}
              </h2>
              <p className="mt-2 text-sm text-admin-fg-muted">
                {stats.total} iten{stats.total !== 1 ? "s" : ""} ·{" "}
                {stats.active} ativ{stats.active !== 1 ? "os" : "o"} ·{" "}
                {stats.inactive} inativ{stats.inactive !== 1 ? "os" : "o"}
              </p>
            </div>
            <DSButton
              type="button"
              variant="admin"
              size="sm"
              onClick={openCreate}
              disabled={!selectedCategory}
              className="shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo produto
            </DSButton>
          </div>

          {/* Search + filter */}
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-fg-faint" />
              <DSInput
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                inputSize="sm"
                className="bg-admin-surface pl-9"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5">
              {(
                [
                  { value: "all", label: "Todos" },
                  { value: "available", label: "Disponíveis" },
                  { value: "inactive", label: "Inativos" },
                ] as { value: AvailFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAvailFilter(opt.value)}
                  className={[
                    "rounded-ds-sm border px-3 py-2 text-xs font-medium transition-all duration-motion-default ease-motion-in-out",
                    availFilter === opt.value
                      ? "border-brand-gold bg-brand-gold text-admin-base"
                      : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          </DSCard>

          {/* Products list */}
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <DSCard className="shadow-card">
                <div className="p-0">
                  <EmptyProducts
                    hasFilter={search !== "" || availFilter !== "all"}
                    onAdd={openCreate}
                  />
                </div>
              </DSCard>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  busyKey={busyKey}
                  onEdit={() => openEdit(product)}
                  onCopy={() => copyProductToDraft(product)}
                  onPreview={() => router.push(`/produto/${product.id}`)}
                  onToggleAvail={() => void handleToggleProduct(product, "available")}
                  onToggleHighlight={() => void handleToggleProduct(product, "highlight")}
                  onDelete={() => setDeleteTarget(product)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
