"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Link, useRouter } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth-store";
import { obtenerPedidos, actualizarLibrasPedido, eliminarPedido, type PedidoItem } from "@/lib/pedidos";
import { products } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/types";

export default function AmbassadorDashboard({ locale }: { locale: Locale }) {
  const t = useTranslations("account");
  const router = useRouter();
  const { user, loading, init } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoItem[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!loading && !user) {
      router.push({ pathname: "/acceso", query: { next: "/cuenta" } });
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    obtenerPedidos(user.id)
      .then(setPedidos)
      .finally(() => setPedidosLoading(false));
  }, [user]);

  const totalLibras = pedidos.reduce((s, p) => s + p.libras, 0);
  const totalUtilidad = pedidos.reduce((s, p) => s + p.utilidad_total, 0);
  const totalUtilidadUsd = pedidos.reduce((s, p) => {
    const product = products.find((prod) => prod.id === p.producto_slug);
    if (!product?.retail_usd || !product?.wholesale_usd) return s;
    return s + (product.retail_usd - product.wholesale_usd) * p.libras;
  }, 0);

  function startEdit(p: PedidoItem) {
    setEditingId(p.id);
    setEditValue(String(p.libras));
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setRowError(null);
  }

  async function saveEdit(id: string) {
    const libras = Number(editValue);
    if (!Number.isFinite(libras) || libras <= 0) {
      setRowError(t("editError"));
      return;
    }
    setBusyId(id);
    setRowError(null);
    try {
      await actualizarLibrasPedido(id, libras);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, libras, utilidad_total: libras * p.utilidad_lb } : p))
      );
      setEditingId(null);
    } catch {
      setRowError(t("editError"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setRowError(null);
    try {
      await eliminarPedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setRowError(t("deleteError"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyCode() {
    if (!user) return;
    await navigator.clipboard.writeText(user.codigoReferido);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-5.5 py-12"
        style={{ background: "#2A1410" }}
      >
        <p className="font-body text-crema/60 text-sm">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5.5 py-12"
      style={{ background: "#2A1410" }}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] tracking-[.25em] text-naranja uppercase mb-2">
            {t("kicker")}
          </p>
          <h1 className="font-display font-bold text-crema-papel" style={{ fontSize: "clamp(26px,4vw,36px)" }}>
            {t("greeting", { name: user.nombre.split(" ")[0] })}
          </h1>
          <p className="font-body text-crema/50 text-sm mt-2">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div
          className="max-w-md mx-auto rounded-card-lg border border-white/10 p-6 md:p-8 space-y-6"
          style={{ background: "rgba(255,255,255,.04)" }}
        >
          {/* Status */}
          <div>
            <p className="font-mono text-[10px] tracking-[.18em] text-crema/40 uppercase mb-1.5">
              {t("statusLabel")}
            </p>
            <span className="inline-block font-body font-700 text-sm text-dorado-claro bg-dorado/10 border border-dorado/25 rounded-pill px-3 py-1 capitalize">
              {user.estado}
            </span>
          </div>

          {/* Referral code */}
          <div>
            <p className="font-mono text-[10px] tracking-[.18em] text-crema/40 uppercase mb-1.5">
              {t("codeLabel")}
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono font-bold text-crema-papel text-lg tracking-[.1em] bg-white/5 border border-white/10 rounded-input px-4 py-2.5">
                {user.codigoReferido}
              </span>
              <button
                onClick={handleCopyCode}
                className="shrink-0 font-body font-600 text-sm text-crema-papel border border-white/15 hover:bg-white/10 rounded-input px-4 py-2.5 transition-colors"
              >
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
            <p className="font-body text-crema/40 text-xs mt-1.5">{t("codeHint")}</p>
          </div>
        </div>

        {/* Orders table */}
        <div
          className="mt-6 rounded-card-lg border border-white/10 p-6 md:p-8"
          style={{ background: "rgba(255,255,255,.04)" }}
        >
          <h2 className="font-display font-bold text-crema-papel text-lg mb-4">{t("ordersTitle")}</h2>
          {pedidosLoading ? (
            <p className="font-body text-crema/40 text-sm">{t("loading")}</p>
          ) : pedidos.length === 0 ? (
            <p className="font-body text-crema/50 text-sm">{t("ordersEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label={t("ordersTitle")}>
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 pr-3">{t("colProducto")}</th>
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 pr-3 text-right">{t("colLibras")}</th>
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 pr-3 text-right">{t("colPrecio")}</th>
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 pr-3 text-right">{t("colUtilidadLb")}</th>
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 pr-3 text-right">{t("colUtilidadTotal")}</th>
                    <th className="font-mono text-[10px] tracking-[.1em] text-crema/40 uppercase font-normal pb-2 text-right">{t("colAcciones")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const product = products.find((prod) => prod.id === p.producto_slug);
                    const utilidadLbUsd =
                      product?.retail_usd !== undefined && product?.wholesale_usd !== undefined
                        ? product.retail_usd - product.wholesale_usd
                        : undefined;
                    const isEditing = editingId === p.id;
                    const isBusy = busyId === p.id;
                    return (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="font-body text-crema-papel py-2.5 pr-3">{p.producto_nombre}</td>
                        <td className="font-mono text-crema/80 py-2.5 pr-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              aria-label={t("editLibras")}
                              className="w-16 bg-white/5 border border-white/15 rounded-input px-2 py-1 text-right font-mono text-crema-papel focus:outline-none focus:border-naranja"
                              autoFocus
                            />
                          ) : (
                            p.libras
                          )}
                        </td>
                        <td className="font-mono text-crema/80 py-2.5 pr-3 text-right">
                          {formatPrice(p.precio_venta_lb, product?.retail_usd, locale)}
                        </td>
                        <td className="font-mono text-dorado-claro py-2.5 pr-3 text-right">
                          {formatPrice(p.utilidad_lb, utilidadLbUsd, locale)}
                        </td>
                        <td className="font-mono font-bold text-dorado-claro py-2.5 pr-3 text-right">
                          {formatPrice(
                            p.utilidad_total,
                            utilidadLbUsd !== undefined ? utilidadLbUsd * p.libras : undefined,
                            locale
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(p.id)}
                                  disabled={isBusy}
                                  aria-label={t("save")}
                                  title={t("save")}
                                  className="p-1.5 rounded-btn text-dorado-claro hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={isBusy}
                                  aria-label={t("cancel")}
                                  title={t("cancel")}
                                  className="p-1.5 rounded-btn text-crema/50 hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                  <X size={16} strokeWidth={2} aria-hidden="true" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(p)}
                                  disabled={isBusy}
                                  aria-label={t("editLibras")}
                                  title={t("editLibras")}
                                  className="p-1.5 rounded-btn text-crema/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                  <Pencil size={16} strokeWidth={1.8} aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  disabled={isBusy}
                                  aria-label={t("deleteItem")}
                                  title={t("deleteItem")}
                                  className="p-1.5 rounded-btn text-crema/70 hover:bg-vino/30 hover:text-naranja-claro transition-colors disabled:opacity-50"
                                >
                                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="font-body font-700 text-crema-papel pt-3 pr-3">{t("totalLabel")}</td>
                    <td className="font-mono font-700 text-crema-papel pt-3 pr-3 text-right">{totalLibras}</td>
                    <td />
                    <td />
                    <td className="font-mono font-bold text-naranja-claro pt-3 pr-3 text-right">
                      {formatPrice(totalUtilidad, totalUtilidadUsd, locale)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {rowError && (
            <p role="alert" className="font-body text-xs text-naranja-claro mt-3">
              {rowError}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-6 space-y-3">
          <Link
            href="/tienda"
            className="block text-center w-full bg-naranja hover:bg-naranja-700 text-white font-body font-800 text-base py-3.5 rounded-btn shadow-cta transition-all duration-150 hover:-translate-y-0.5"
          >
            {t("shopCta")}
          </Link>
          <Link
            href="/embajadores#tm-calc"
            className="block text-center w-full border border-white/15 text-crema hover:bg-white/10 font-body font-700 text-sm py-3 rounded-btn transition-colors"
          >
            {t("calcCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
