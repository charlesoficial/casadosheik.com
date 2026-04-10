"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Pencil, Plus, Star, ToggleLeft, ToggleRight, Trash2, Upload } from "lucide-react";

import { uploadProductImage } from "@/lib/storage/upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { CategoryItem, MenuProduct } from "@/lib/types";

// Painel administrativo do cardapio.
// Aqui convivem cadastro de categorias, produtos, upload de imagem e acoes rapidas de manutencao.
type ProductDraft = {
  name: string;
  description: string;
  price: string;
  image: string;
  available: boolean;
  highlight: boolean;
};

const emptyProductDraft: ProductDraft = {
  name: "",
  description: "",
  price: "",
  image: "",
  available: true,
  highlight: false
};

export function MenuManager({
  initialCategories,
  initialProducts
}: {
  initialCategories: CategoryItem[];
  initialProducts: MenuProduct[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState(initialProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [newProduct, setNewProduct] = useState<ProductDraft>(emptyProductDraft);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductDraft>(emptyProductDraft);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const productNameInputRef = useRef<HTMLInputElement | null>(null);
  const productFormRef = useRef<HTMLFormElement | null>(null);
  const newPreviewUrlRef = useRef<string | null>(null);
  const editPreviewUrlRef = useRef<string | null>(null);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0];
  const visibleProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((product) => product.categoryId === selectedCategory.id || product.category === selectedCategory.name)
        : products,
    [products, selectedCategory]
  );

  useEffect(() => {
    if (!selectedCategoryId && categories[0]?.id) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    return () => {
      if (newPreviewUrlRef.current) URL.revokeObjectURL(newPreviewUrlRef.current);
      if (editPreviewUrlRef.current) URL.revokeObjectURL(editPreviewUrlRef.current);
    };
  }, []);

  function resetMessages() {
    setError(null);
    setSuccess(null);
  }

  function beginEditCategory(category: CategoryItem) {
    resetMessages();
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  function beginEditProduct(product: MenuProduct) {
    resetMessages();
    setEditingProductId(product.id);
    setEditingProduct({
      name: product.name,
      description: product.description,
      price: String(product.price),
      image: product.image,
      available: product.available ?? true,
      highlight: product.highlight ?? false
    });
    setEditingImageFile(null);
  }

  function focusCreateCategory() {
    resetMessages();
    categoryInputRef.current?.focus();
  }

  function focusCreateProduct() {
    resetMessages();
    productFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => productNameInputRef.current?.focus(), 120);
  }

  function copyProductToDraft(product: MenuProduct) {
    // A copia acelera cadastro de variacoes sem duplicar registro automaticamente.
    resetMessages();
    if (product.categoryId) {
      setSelectedCategoryId(product.categoryId);
    }
    setPendingImageFile(null);
    if (newPreviewUrlRef.current) {
      URL.revokeObjectURL(newPreviewUrlRef.current);
      newPreviewUrlRef.current = null;
    }
    setNewProduct({
      name: `${product.name} copia`,
      description: product.description,
      price: String(product.price),
      image: product.image,
      available: product.available ?? true,
      highlight: product.highlight ?? false
    });
    setSuccess("Dados do produto copiados para o formulario de criacao.");
    focusCreateProduct();
  }

  async function maybeUploadImage(file: File | null, currentImage?: string) {
    if (!file) return currentImage ?? "";
    const uploaded = await uploadProductImage(file);
    return uploaded.publicUrl;
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    try {
      setBusyKey("create-category");
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar categoria");

      setCategories((current) => [...current, data]);
      setSelectedCategoryId(data.id);
      setNewCategoryName("");
      setSuccess("Categoria criada com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar categoria");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateCategory(categoryId: string) {
    resetMessages();

    try {
      setBusyKey(`category-update-${categoryId}`);
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar categoria");

      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId ? { ...category, ...data, productCount: category.productCount } : category
        )
      );
      setProducts((current) =>
        current.map((product) =>
          product.categoryId === categoryId ? { ...product, category: data.name } : product
        )
      );
      setEditingCategoryId(null);
      setSuccess("Categoria atualizada com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao atualizar categoria");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteCategory(category: CategoryItem) {
    resetMessages();

    if (products.some((product) => product.categoryId === category.id || product.category === category.name)) {
      setError("Nao e possivel excluir categoria com produtos vinculados.");
      return;
    }

    try {
      setBusyKey(`category-delete-${category.id}`);
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir categoria");

      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId(categories.find((item) => item.id !== category.id)?.id ?? "");
      }
      setSuccess("Categoria excluida com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao excluir categoria");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    try {
      setBusyKey("create-product");
      const uploadedImage = await maybeUploadImage(pendingImageFile, newProduct.image);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name,
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price.replace(",", ".")),
          image: uploadedImage,
          available: newProduct.available,
          highlight: newProduct.highlight
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar produto");

      setProducts((current) => [data, ...current]);
      setCategories((current) =>
        current.map((category) =>
          category.id === selectedCategory?.id
            ? { ...category, productCount: (category.productCount ?? 0) + 1 }
            : category
        )
      );
      setNewProduct(emptyProductDraft);
      setPendingImageFile(null);
      setSuccess("Produto criado com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao criar produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateProduct(productId: string) {
    resetMessages();

    try {
      setBusyKey(`product-update-${productId}`);
      const uploadedImage = await maybeUploadImage(editingImageFile, editingProduct.image);
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name,
          name: editingProduct.name,
          description: editingProduct.description,
          price: Number(editingProduct.price.replace(",", ".")),
          image: uploadedImage,
          available: editingProduct.available,
          highlight: editingProduct.highlight
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar produto");

      setProducts((current) => current.map((product) => (product.id === productId ? { ...product, ...data } : product)));
      setEditingProductId(null);
      setEditingImageFile(null);
      setSuccess("Produto atualizado com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao atualizar produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteProduct(product: MenuProduct) {
    resetMessages();

    try {
      setBusyKey(`product-delete-${product.id}`);
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir produto");

      setProducts((current) => current.filter((item) => item.id !== product.id));
      setCategories((current) =>
        current.map((category) =>
          category.id === product.categoryId
            ? { ...category, productCount: Math.max(0, (category.productCount ?? 1) - 1) }
            : category
        )
      );
      setSuccess("Produto excluido com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao excluir produto");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleProduct(product: MenuProduct, field: "available" | "highlight") {
    resetMessages();

    try {
      setBusyKey(`product-toggle-${product.id}-${field}`);
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: product.categoryId,
          categoryName: product.category,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          available: field === "available" ? !(product.available ?? true) : product.available ?? true,
          highlight: field === "highlight" ? !(product.highlight ?? false) : product.highlight ?? false
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar produto");

      setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...data } : item)));
      setSuccess("Produto atualizado com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao atualizar produto");
    } finally {
      setBusyKey(null);
    }
  }

  function handleFilePreview(file: File | null, target: "new" | "edit") {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (target === "new") {
      if (newPreviewUrlRef.current) URL.revokeObjectURL(newPreviewUrlRef.current);
      newPreviewUrlRef.current = previewUrl;
      setPendingImageFile(file);
      setNewProduct((current) => ({ ...current, image: previewUrl }));
      return;
    }
    if (editPreviewUrlRef.current) URL.revokeObjectURL(editPreviewUrlRef.current);
    editPreviewUrlRef.current = previewUrl;
    setEditingImageFile(file);
    setEditingProduct((current) => ({ ...current, image: previewUrl }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="border-[#2a2a2a] bg-[#171717] admin-menu-shell-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#a49f92]">Categorias</p>
              <h1 className="text-2xl font-semibold text-white">Cardapio principal</h1>
            </div>
            <Button variant="admin" size="sm" type="button" onClick={focusCreateCategory}>
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-3 rounded-[20px] border border-[#2a2a2a] bg-[#111111] p-4">
            <Input
              ref={categoryInputRef}
              className="border-[#343434] bg-[#0d0d0d] text-white"
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
            <Button type="submit" variant="admin" className="w-full" disabled={busyKey === "create-category"}>
              Criar categoria
            </Button>
          </form>

          {categories.map((category) => (
            <div
              key={category.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedCategory?.id === category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCategoryId(category.id);
                }
              }}
              className={`relative rounded-[20px] border px-4 py-3 transition-colors ${
                selectedCategory?.id === category.id
                  ? "border-[#5b34ff] bg-[#17112b]"
                  : "border-[#2a2a2a] bg-[#111111]"
              } cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5b34ff]/70 focus:ring-offset-2 focus:ring-offset-[#171717]`}
            >
              <div className="flex w-full items-center justify-between text-left">
                <div>
                  <p className="font-medium text-white">{category.name}</p>
                  <p className="text-sm text-[#9d978b]">{category.productCount ?? 0} itens</p>
                </div>
                <Badge variant="success">{category.active ? "Ativa" : "Oculta"}</Badge>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    beginEditCategory(category);
                  }}
                  className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDeleteCategory(category);
                  }}
                  className="rounded-xl border border-[#313131] p-2 text-[#f0b0b0] transition-colors hover:bg-[#1b1b1b]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {editingCategoryId === category.id ? (
                <div
                  className="mt-3 space-y-3 rounded-2xl border border-[#343434] bg-[#0d0d0d] p-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Input
                    className="border-[#343434] bg-[#0a0a0a] text-white"
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="admin"
                      size="sm"
                      disabled={busyKey === `category-update-${category.id}`}
                      onClick={() => void handleUpdateCategory(category.id)}
                    >
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#343434] text-white"
                      onClick={() => setEditingCategoryId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#2a2a2a] bg-[#171717] admin-menu-shell-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#a49f92]">Produtos</p>
              <h2 className="text-3xl font-semibold text-white">{selectedCategory?.name ?? "Produtos"}</h2>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="admin"
                className="border-[#111111] bg-[#111111] text-white hover:bg-[#1f1f1f]"
                onClick={() => router.push("/menu")}
              >
                Visualizar cardapio
              </Button>
              <Button type="button" variant="admin" onClick={focusCreateProduct}>
                <Plus className="h-4 w-4" />
                Novo produto
              </Button>
            </div>
          </div>

          <form
            ref={productFormRef}
            onSubmit={handleCreateProduct}
            className="grid gap-3 rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4"
          >
            <Input
              ref={productNameInputRef}
              className="border-[#343434] bg-[#0d0d0d] text-white"
              placeholder="Nome do produto"
              value={newProduct.name}
              onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
            />
            <Textarea
              className="border-[#343434] bg-[#0d0d0d] text-white"
              placeholder="Descricao"
              value={newProduct.description}
              onChange={(event) => setNewProduct((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                className="border-[#343434] bg-[#0d0d0d] text-white"
                placeholder="Preco"
                value={newProduct.price}
                onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))}
              />
              <Input
                className="border-[#343434] bg-[#0d0d0d] text-white"
                placeholder="URL da imagem (opcional)"
                value={newProduct.image.startsWith("blob:") ? "" : newProduct.image}
                onChange={(event) => setNewProduct((current) => ({ ...current, image: event.target.value }))}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#3a3a3a] px-4 py-3 text-sm text-[#d8d2c7]">
              <Upload className="h-4 w-4" />
              <span>Selecionar imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFilePreview(event.target.files?.[0] ?? null, "new")} />
            </label>
            {newProduct.image ? (
              <div className="relative h-40 overflow-hidden rounded-2xl border border-[#2a2a2a]">
                <Image src={newProduct.image} alt="Preview do produto" fill className="object-cover" unoptimized />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewProduct((current) => ({ ...current, available: !current.available }))}
                className="inline-flex items-center gap-2 rounded-xl border border-[#343434] px-4 py-2 text-sm text-white"
              >
                {newProduct.available ? <ToggleRight className="h-4 w-4 text-[#7df2a1]" /> : <ToggleLeft className="h-4 w-4 text-[#9a9488]" />}
                Disponivel
              </button>
              <button
                type="button"
                onClick={() => setNewProduct((current) => ({ ...current, highlight: !current.highlight }))}
                className="inline-flex items-center gap-2 rounded-xl border border-[#343434] px-4 py-2 text-sm text-white"
              >
                <Star className={`h-4 w-4 ${newProduct.highlight ? "text-[#f4c35a]" : "text-[#9a9488]"}`} />
                Destaque
              </button>
            </div>
            <Button type="submit" variant="admin" className="w-full md:w-fit" disabled={busyKey === "create-product"}>
              Criar produto
            </Button>
          </form>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <div className="space-y-3">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-4 rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4"
              >
                {product.image ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl">
                    <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#1e1e1e]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-white">{product.name}</p>
                    <Badge variant="success">{product.available ? "Disponivel" : "Inativo"}</Badge>
                    {product.highlight ? <Badge>Destaque</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-[#a8a396]">
                    {product.description}
                  </p>
                  <p className="mt-2 font-semibold text-[#f4c35a]">{formatCurrency(product.price)}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginEditProduct(product)}
                    className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/produto/${product.id}`)}
                    className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyProductToDraft(product)}
                    className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleProduct(product, "available")}
                    className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                  >
                    {product.available ? <ToggleRight className="h-4 w-4 text-[#7df2a1]" /> : <ToggleLeft className="h-4 w-4 text-[#9a9488]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleProduct(product, "highlight")}
                    className="rounded-xl border border-[#313131] p-2 text-[#d9d3c7] transition-colors hover:bg-[#1b1b1b]"
                  >
                    <Star className={`h-4 w-4 ${product.highlight ? "text-[#f4c35a]" : "text-[#9a9488]"}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteProduct(product)}
                    className="rounded-xl border border-[#313131] p-2 text-[#f0b0b0] transition-colors hover:bg-[#1b1b1b]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {editingProductId === product.id ? (
                  <div className="w-full rounded-[20px] border border-[#343434] bg-[#0d0d0d] p-4">
                    <div className="grid gap-3">
                      <Input
                        className="border-[#343434] bg-[#0a0a0a] text-white"
                        value={editingProduct.name}
                        onChange={(event) => setEditingProduct((current) => ({ ...current, name: event.target.value }))}
                      />
                      <Textarea
                        className="border-[#343434] bg-[#0a0a0a] text-white"
                        value={editingProduct.description}
                        onChange={(event) => setEditingProduct((current) => ({ ...current, description: event.target.value }))}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          className="border-[#343434] bg-[#0a0a0a] text-white"
                          value={editingProduct.price}
                          onChange={(event) => setEditingProduct((current) => ({ ...current, price: event.target.value }))}
                        />
                        <Input
                          className="border-[#343434] bg-[#0a0a0a] text-white"
                          value={editingProduct.image.startsWith("blob:") ? "" : editingProduct.image}
                          onChange={(event) => setEditingProduct((current) => ({ ...current, image: event.target.value }))}
                        />
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#3a3a3a] px-4 py-3 text-sm text-[#d8d2c7]">
                        <Upload className="h-4 w-4" />
                        <span>Trocar imagem</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleFilePreview(event.target.files?.[0] ?? null, "edit")} />
                      </label>
                      {editingProduct.image ? (
                        <div className="relative h-40 overflow-hidden rounded-2xl border border-[#2a2a2a]">
                          <Image src={editingProduct.image} alt="Preview da edicao" fill className="object-cover" unoptimized />
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct((current) => ({ ...current, available: !current.available }))}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#343434] px-4 py-2 text-sm text-white"
                        >
                          {editingProduct.available ? <ToggleRight className="h-4 w-4 text-[#7df2a1]" /> : <ToggleLeft className="h-4 w-4 text-[#9a9488]" />}
                          Disponivel
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProduct((current) => ({ ...current, highlight: !current.highlight }))}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#343434] px-4 py-2 text-sm text-white"
                        >
                          <Star className={`h-4 w-4 ${editingProduct.highlight ? "text-[#f4c35a]" : "text-[#9a9488]"}`} />
                          Destaque
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="admin"
                          size="sm"
                          disabled={busyKey === `product-update-${product.id}`}
                          onClick={() => void handleUpdateProduct(product.id)}
                        >
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-[#343434] text-white"
                          onClick={() => setEditingProductId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
