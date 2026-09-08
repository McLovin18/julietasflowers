"use client";
import React, { useState, useEffect, useRef } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { obtenerBodegas } from "../lib/bodegas-db";
import { getSnapshotPricing } from "../lib/pricing";
import { useUser } from "../context/UserContext";
import BottomBarPublic from "../components/BottomBarPublic";
import { obtenerAtributos } from "../lib/atributos-db";
import { obtenerConfiguracionEntrega, obtenerTarifasEntrega, resolverCostoEntrega, TarifaEntrega, ConfiguracionEntrega } from "../lib/entregas-db";
import { storage } from "../lib/firebase";
import type { CuentaBancaria } from "../lib/transferencias-db";

function resolveCartItemKey(item: any) {
  if (!item) return "";
  return item.cartKey || item.variantKey || item.id;
}

function resolveAvailableStock(item: any) {
  if (!item) return 0;

  // Soportar variaciones dinámicas (nuevo sistema)
  if (item.selectedVariations && item.variationAttributeIds && Array.isArray(item.stockVariants)) {
    const allSelected = item.variationAttributeIds.every((attrId: string) => item.selectedVariations[attrId]);
    if (allSelected) {
      const variant = item.stockVariants.find((v: any) => {
        return item.variationAttributeIds.every(
          (attrId: string) => v.attributes?.[attrId] === item.selectedVariations[attrId]
        );
      });
      if (variant) {
        return Number(variant.cantidad ?? 0);
      }
    }
  }

  // Soportar variaciones legacy (talla/color)
  if (item.selectedTalla && item.selectedColor && Array.isArray(item.stockVariants)) {
    const variant = item.stockVariants.find(
      (v: any) => v.talla === item.selectedTalla && v.color === item.selectedColor
    );
    const variantStock = Number(variant?.cantidad ?? variant?.stock ?? variant?.variantStock ?? 0);
    if (variantStock > 0 || variantStock === 0) {
      return variantStock;
    }
  }

  return Number(item.variantStock ?? item.stock ?? 0);
}

// --- Dropdown custom (reemplaza <select> nativo para controlar 100% el estilo y el ancho) ---
type DropdownOption = { value: string; label: string };

function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const selectedLabel = options.find((option) => option.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} className="relative w-full min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-11 w-full max-w-full items-center justify-between gap-2 rounded-xl border bg-[var(--card)] px-3 text-sm font-semibold text-[var(--text)] outline-none transition-colors ${
          open ? "border-[var(--primary)]" : "border-[var(--border)]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${!value ? "text-[var(--textSecondary)] font-normal" : ""}`}>
          {selectedLabel}
        </span>
        <span className={`material-icons-round shrink-0 text-lg text-[var(--textSecondary)] transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 w-full max-w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-sm text-[var(--textSecondary)]">Sin opciones disponibles</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value || "__placeholder__"}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full max-w-full truncate px-3.5 py-2.5 text-left text-sm transition-colors ${
                  option.value === value
                    ? "bg-[var(--primary)] text-[var(--primaryForeground)] font-semibold"
                    : "text-[var(--text)] hover:bg-[var(--muted)]"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// --- Pagina principal del carrito
export default function CartPage() {
  const { carrito: carritoRaw, removeCarrito, addCarrito } = useUser();
  const carrito = carritoRaw as any[];
  const [error, setError] = useState("");
  const { isLogged } = useUser();
  const [atributos, setAtributos] = useState<any[]>([]);
  const [tarifasEntrega, setTarifasEntrega] = useState<TarifaEntrega[]>([]);
  const [configuracionEntrega, setConfiguracionEntrega] = useState<ConfiguracionEntrega>({ montoMinimoEntregaGratis: 25 });
  const [ciudadEntrega, setCiudadEntrega] = useState("");
  const [zonaEntrega, setZonaEntrega] = useState("");
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [enviandoTransferencia, setEnviandoTransferencia] = useState(false);
  const [mostrarPaypal, setMostrarPaypal] = useState(false);
  const [paypalCargando, setPaypalCargando] = useState(false);
  const [paypalProcesando, setPaypalProcesando] = useState(false);
  const [paypalPreparando, setPaypalPreparando] = useState(false);
  const [mostrarMetodosPago, setMostrarMetodosPago] = useState(false);

  const calcularPrecioData = (p: any) => {
    const { basePrice, discount, hasDiscount, fakeOldPrice, finalPrice } = getSnapshotPricing(p);
    return { basePrice, discount, hasDiscount, fakeOldPrice, finalPrice };
  };

  useEffect(() => {
    async function loadAtributos() {
      const data = await obtenerAtributos();
      setAtributos(data);
    }

    loadAtributos();
    Promise.all([obtenerConfiguracionEntrega(), obtenerTarifasEntrega()])
      .then(([configuracion, tarifas]) => {
        setConfiguracionEntrega(configuracion);
        setTarifasEntrega(tarifas);
      })
      .catch(() => setError("No se pudo cargar las opciones de entrega."));
    fetch("/api/transferencias/cuentas")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("accounts")))
      .then((data) => setCuentasBancarias(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar las cuentas bancarias."));
  }, []);

  const subtotal = carrito.reduce((sum, p) => {
    const { finalPrice } = calcularPrecioData(p);
    return sum + finalPrice * (p.cantidad || 1);
  }, 0);

  const ciudadesEntrega = [...new Set(tarifasEntrega.map((tarifa) => tarifa.ciudad))].sort((a, b) => a.localeCompare(b));
  const zonasEntrega = tarifasEntrega.filter((tarifa) => tarifa.tipo === "zona" && tarifa.ciudad === ciudadEntrega);
  const hayOpcionTodaLaCiudad = tarifasEntrega.some((tarifa) => tarifa.tipo === "ciudad" && tarifa.ciudad === ciudadEntrega);
  const zonaResolver = zonaEntrega === "__ciudad__" ? "" : zonaEntrega;
  const costoEntrega = ciudadEntrega && zonaEntrega
    ? resolverCostoEntrega(tarifasEntrega, ciudadEntrega, zonaResolver, subtotal, configuracionEntrega.montoMinimoEntregaGratis)
    : null;
  const total = subtotal + (costoEntrega || 0);

  const opcionesCiudad: DropdownOption[] = ciudadesEntrega.map((ciudad) => ({ value: ciudad, label: ciudad }));
  const opcionesZona: DropdownOption[] = [
    ...(hayOpcionTodaLaCiudad ? [{ value: "__ciudad__", label: "Toda la ciudad" }] : []),
    ...zonasEntrega.map((tarifa) => ({ value: tarifa.nombre, label: tarifa.nombre })),
  ];

  useEffect(() => {
    if (!mostrarPaypal || typeof window === "undefined") return;
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return;
    setPaypalPreparando(true);

    const renderButtons = () => {
      const paypal = (window as any).paypal;
      const container = document.getElementById("paypal-buttons");
      if (!paypal || !container) return false;
      if (container.childElementCount > 0) {
        setPaypalPreparando(false);
        return true;
      }
      paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay" },
        onClick: () => {
          setPaypalProcesando(true);
          window.setTimeout(() => setPaypalProcesando(false), 1800);
        },
        createOrder: async () => {
          const response = await fetch("/api/paypal/crear-orden", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productos: carrito, deliveryCost: costoEntrega, ciudadEntrega, zonaEntrega }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "No se pudo crear el pago.");
          return result.id;
        },
        onApprove: async (data: { orderID: string }) => {
          setPaypalCargando(true);
          try {
            const response = await fetch("/api/paypal/capturar-orden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "No se pudo confirmar el pago.");
            setMostrarPaypal(false);
            setError(`Pago aprobado. Tu número de orden es ${result.orderId}.`);
          } catch (paypalError: any) {
            setError(paypalError.message || "No se pudo confirmar el pago de PayPal.");
          } finally {
            setPaypalCargando(false);
            setPaypalProcesando(false);
          }
        },
        onCancel: () => {
          setPaypalProcesando(false);
          setError("El pago de PayPal fue cancelado. Puedes intentar nuevamente.");
        },
        onError: () => {
          setPaypalProcesando(false);
          setError("PayPal no pudo abrir el flujo de pago. Revisa el bloqueo de ventanas emergentes o intenta nuevamente.");
        },
      }).render("#paypal-buttons").then(() => setPaypalPreparando(false)).catch(() => {
        setPaypalPreparando(false);
        setError("No se pudieron cargar las opciones de PayPal.");
      });
      return true;
    };
    const existingScript = document.getElementById("paypal-sdk");
    if (existingScript && renderButtons()) return;
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
      script.onload = () => renderButtons();
      script.onerror = () => {
        setPaypalPreparando(false);
        setError("No se pudo cargar PayPal.");
      };
      document.body.appendChild(script);
    }
    const retryTimer = window.setInterval(() => {
      if (renderButtons()) window.clearInterval(retryTimer);
    }, 250);
    const timeout = window.setTimeout(() => {
      window.clearInterval(retryTimer);
      if (paypalPreparando) {
        setPaypalPreparando(false);
        setError("PayPal está tardando demasiado en cargar. Intenta nuevamente.");
      }
    }, 15000);
    return () => {
      window.clearInterval(retryTimer);
      window.clearTimeout(timeout);
    };
  }, [mostrarPaypal, carrito, costoEntrega, ciudadEntrega, zonaEntrega]);

  // Arma el texto de la variación seleccionada (talla/color legacy o variaciones dinámicas)
  const getVariationText = (p: any): string => {
    if (p.selectedTalla && p.selectedColor) {
      return ` (Talla: ${p.selectedTalla}, Color: ${p.selectedColor})`;
    }

    if (p.selectedVariations && p.variationAttributeIds && p.variationAttributeIds.length > 0) {
      const parts = p.variationAttributeIds
        .map((attrId: string) => {
          const atributo = atributos.find((a: any) => a.id === attrId);
          const attrName = atributo?.nombre || "Opción";
          const value = p.selectedVariations?.[attrId];
          return value ? `${attrName}: ${value}` : null;
        })
        .filter(Boolean);
      return parts.length > 0 ? ` (${parts.join(", ")})` : "";
    }

    return "";
  };

  const generateWhatsAppMessage = async (): Promise<string> => {
    const bodegas = await obtenerBodegas();
    const bodegasMap = new Map(bodegas.map((b) => [b.id, b.tiempoEntrega]));

    const productosText = carrito
      .map((p) => {
        const tiempoEntrega = bodegasMap.get(p.bodegaId || "technothings") || 72;
        const cantidad = p.cantidad || 1;
        const variationText = getVariationText(p);
        return `• ${cantidad}x ${p.nombre}${variationText} (Entrega Aproximada en: ${tiempoEntrega}h)`;
      })
      .join("\n");

    const headerMsg = "Hola, Me gustaría realizar una compra:";
    const footerMsg = "Quiero confirmar disponibilidad y conocer más detalles. Gracias!";

    const totalWhatsApp = total;
    const deliveryText = costoEntrega === 0 ? "Gratis" : `$${(costoEntrega || 0).toFixed(2)}`;

    const message = `${headerMsg}\n\n${productosText}\n\nEntrega: ${ciudadEntrega} - ${zonaEntrega === "__ciudad__" ? "Toda la ciudad" : zonaEntrega}\nCosto de envío: ${deliveryText}\n\n--------------------\nSUBTOTAL: $${subtotal.toFixed(2)}\nTOTAL: $${totalWhatsApp.toFixed(2)}\n--------------------\n\n${footerMsg}`;
    return encodeURIComponent(message);
  };

  const handleGenerarOrden = async () => {
    setError("");

    if (carrito.length === 0) {
      setError("El carrito está vacío");
      return;
    }

    if (!ciudadEntrega || !zonaEntrega || costoEntrega === null) {
      setError("Selecciona una ciudad y una zona de entrega configuradas.");
      return;
    }

    for (const p of carrito) {
      const availableStock = resolveAvailableStock(p);
      if (p.cantidad > availableStock) {
        setError(`Solo hay ${availableStock} unidades disponibles de "${p.nombre}".`);
        return;
      }
    }

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "0967760599";
    const message = await generateWhatsAppMessage();
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleEnviarTransferencia = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!ciudadEntrega || !zonaEntrega || costoEntrega === null) {
      setError("Selecciona primero la ciudad y zona de entrega.");
      return;
    }
    if (!nombreCliente.trim() || !telefonoCliente.trim() || !correoCliente.trim() || !cuentaSeleccionada || !evidenceUrl) {
      setError("Completa tus datos, selecciona una cuenta y envía la captura de pago.");
      return;
    }
    setEnviandoTransferencia(true);
    try {
      const response = await fetch("/api/transferencias/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: nombreCliente,
          customerPhone: telefonoCliente,
          customerEmail: correoCliente,
          productos: carrito,
          ciudadEntrega,
          zonaEntrega: zonaEntrega === "__ciudad__" ? "Toda la ciudad" : zonaEntrega,
          subtotal,
          deliveryCost: costoEntrega,
          cuentaId: cuentaSeleccionada,
          evidenceUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar la transferencia.");
      setMostrarTransferencia(false);
      setEvidencia(null);
      setEvidenceUrl("");
      setCuentaSeleccionada("");
      setError(`Transferencia enviada. Tu número de orden es ${result.orderId}.`);
    } catch (transferError: any) {
      setError(transferError.message || "No se pudo enviar la transferencia.");
    } finally {
      setEnviandoTransferencia(false);
    }
  };

  const handleEnviarCaptura = async () => {
    setError("");
    if (!evidencia) {
      setError("Selecciona primero una imagen de la transferencia.");
      return;
    }
    if (!evidencia.type.startsWith("image/") || evidencia.size > 5 * 1024 * 1024) {
      setError("La evidencia debe ser una imagen de máximo 5 MB.");
      return;
    }
    setSubiendoEvidencia(true);
    try {
      const evidenceRef = ref(storage, `transferencias/${Date.now()}-${evidencia.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`);
      await uploadBytes(evidenceRef, evidencia, { contentType: evidencia.type });
      setEvidenceUrl(await getDownloadURL(evidenceRef));
    } catch {
      setError("No se pudo enviar la captura. Intenta nuevamente.");
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  const handleCantidad = (id: string, cantidad: number) => {
    if (cantidad < 1) return;
    const prod = carrito.find((p) => resolveCartItemKey(p) === id);
    if (prod) {
      const availableStock = resolveAvailableStock(prod);
      if (cantidad > availableStock) {
        setError(
          `Solo hay ${availableStock} unidades disponibles en stock de "${prod.nombre}".`
        );
        return;
      }
      setError("");
      removeCarrito(id);
      addCarrito({ ...prod, cantidad });
    }
  };

  const EmptyCart = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--muted)] flex items-center justify-center">
        <span className="material-icons-round text-4xl text-[var(--mutedForeground)]">
          shopping_bag
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] font-lovely-flowers" style={{ fontSize: "1.5rem", lineHeight: "1.4" }}>
          Tu carrito está vacío
        </h3>
        <p className="text-sm text-[var(--textSecondary)] mt-1">
          Agrega productos para continuar
        </p>
      </div>
      <a
        href="/products-by-category"
        className="mt-2 inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:shadow-md font-semibold px-6 py-2.5 rounded-xl transition-colors shadow"
      >
        <span className="material-icons-round text-base">storefront</span>
        Ver productos
      </a>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
              Carrito
            </h1>
            {carrito.length > 0 && (
              <span className="bg-[var(--card)] border border-[var(--border)] text-[var(--text)] text-xs font-bold px-2.5 py-1 rounded-full">
                {carrito.length} {carrito.length === 1 ? "producto" : "productos"}
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
              <span className="material-icons-round text-base mt-0.5 shrink-0">error_outline</span>
              {error}
            </div>
          )}

          {carrito.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-3">
                {carrito.map((p) => {
                  const itemKey = resolveCartItemKey(p);
                  const { hasDiscount, fakeOldPrice, finalPrice, discount } = calcularPrecioData(p);
                  const lineTotal = finalPrice * (p.cantidad || 1);
                  const availableStock = resolveAvailableStock(p);

                  return (
                    <div
                      key={itemKey}
                      className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm p-4 flex gap-3 sm:gap-4 items-start"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                        <img
                          src={p.imagenes?.[0] || "/no-image.png"}
                          alt={p.nombre}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 text-[var(--text)]">
                          {p.nombre}
                        </p>
                        {p.selectedTalla && p.selectedColor && (
                          <p className="text-xs text-[var(--textSecondary)] mt-0.5">
                            Talla {p.selectedTalla} · Color {p.selectedColor}
                          </p>
                        )}
                        {p.selectedVariations && p.variationAttributeIds && p.variationAttributeIds.length > 0 && (
                          <p className="text-xs text-[var(--textSecondary)] mt-0.5">
                            {p.variationAttributeIds
                              .map((attrId: string) => {
                                const atributo = atributos.find((a: any) => a.id === attrId);
                                const attrName = atributo?.nombre || "Opción";
                                const value = p.selectedVariations?.[attrId];
                                return value ? `${attrName}: ${value}` : null;
                              })
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {hasDiscount && (
                            <span className="text-xs text-[var(--textSecondary)] line-through">
                              ${fakeOldPrice?.toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-bold text-[var(--text)]">
                            ${finalPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                              -{discount}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <div className="flex items-center gap-1 bg-[var(--muted)] rounded-lg p-0.5">
                            <button
                              onClick={() => handleCantidad(itemKey, (p.cantidad || 1) - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--card)] transition-colors text-[var(--text)] font-bold text-base"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-[var(--text)]">
                              {p.cantidad || 1}
                            </span>
                            <button
                              onClick={() => handleCantidad(itemKey, (p.cantidad || 1) + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--card)] transition-colors text-[var(--text)] font-bold text-base"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-[var(--textSecondary)]">
                            {availableStock} en stock
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between h-full gap-3 shrink-0">
                        <span className="font-bold text-sm sm:text-base text-[var(--text)]">
                          ${lineTotal.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeCarrito(itemKey)}
                          className="text-[var(--textSecondary)] hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-icons-round text-xl">delete_outline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <a
                  href="/products-by-category"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--text)] hover:underline mt-1"
                >
                  <span className="material-icons-round text-base">arrow_back</span>
                  Continuar comprando
                </a>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-md p-5 md:sticky md:top-20 space-y-4">
                  <div>
                    <p className="text-base font-bold mb-3 text-[var(--text)]">Resumen del pedido</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm text-[var(--textSecondary)]">
                        <span>
                          Subtotal ({carrito.reduce((n, p) => n + (p.cantidad || 1), 0)} items)
                        </span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>

                      {/* Selector de ciudad y zona de entrega — dropdown custom, no <select> nativo */}
                      <div className="mt-3 w-full max-w-full overflow-visible rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-3.5 sm:p-4">
                        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text)]">¿Dónde entregamos tu pedido?</p>
                            <p className="mt-0.5 text-[11px] text-[var(--textSecondary)]">Selecciona ciudad y zona para calcular el envío</p>
                          </div>
                          <span className="material-icons-round shrink-0 rounded-lg bg-[var(--primary)]/10 p-1.5 text-base text-[var(--primary)]">location_on</span>
                        </div>

                        <div className="grid w-full max-w-full grid-cols-1 gap-2.5 md:grid-cols-2">
                          <div className="w-full min-w-0 max-w-full">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--textSecondary)]">
                              Ciudad
                            </label>
                            <Dropdown
                              value={ciudadEntrega}
                              onChange={(value) => { setCiudadEntrega(value); setZonaEntrega(""); }}
                              options={opcionesCiudad}
                              placeholder="Elige una ciudad"
                            />
                          </div>

                          <div className="w-full min-w-0 max-w-full">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--textSecondary)]">
                              Zona
                            </label>
                            <Dropdown
                              value={zonaEntrega}
                              onChange={setZonaEntrega}
                              options={opcionesZona}
                              placeholder="Elige una zona"
                              disabled={!ciudadEntrega}
                            />
                          </div>
                        </div>

                        {ciudadEntrega && zonaEntrega && costoEntrega !== null && (
                          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--textSecondary)]">
                            <span className="material-icons-round text-sm text-[var(--primary)]">local_shipping</span>
                            Envío: {costoEntrega === 0 ? "Gratis por alcanzar el monto mínimo" : `$${costoEntrega.toFixed(2)}`}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex justify-between text-sm text-[var(--textSecondary)]">
                        <span>Envío</span>
                        <span>{costoEntrega === null ? "Selecciona ubicación" : costoEntrega === 0 ? "Gratis" : `$${costoEntrega.toFixed(2)}`}</span>
                      </div>

                    </div>
                    <div className="border-t border-[var(--border)] mt-3 pt-3 flex justify-between font-bold text-base">
                      <span className="text-[var(--text)]">Total</span>
                      <span className="text-[var(--text)]">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <button type="button" onClick={() => setMostrarMetodosPago((visible) => !visible)} className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${mostrarMetodosPago ? "border-[var(--primary)] bg-[var(--muted)] shadow-sm" : "border-[var(--border)] bg-[var(--muted)]/40 hover:border-[var(--primary)] hover:bg-[var(--muted)]"}`} aria-expanded={mostrarMetodosPago}>
                      <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primaryForeground)] shadow-sm"><span className="material-icons-round text-xl">payments</span></span><span><span className="block text-sm font-extrabold text-[var(--text)]">Métodos de pago</span><span className="mt-0.5 block text-xs text-[var(--textSecondary)]">Elige cómo quieres completar tu pedido</span></span></span><span className={`material-icons-round text-[var(--textSecondary)] transition-transform ${mostrarMetodosPago ? "rotate-180" : ""}`}>expand_more</span></span>
                    </button>
                    {mostrarMetodosPago && <div className="mt-3 space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-2.5">
                      <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--textSecondary)]">Selecciona una opción</p>
                      <button onClick={handleGenerarOrden} disabled={!ciudadEntrega || !zonaEntrega || costoEntrega === null} className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-[var(--primary)] px-3.5 py-3 text-left text-[var(--primaryForeground)] shadow-sm transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45" title="Enviar pedido por WhatsApp"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/10"><span className="material-icons-round text-lg">chat</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Pedir por WhatsApp</span><span className="block text-[11px] opacity-75">Confirma disponibilidad directamente</span></span><span className="material-icons-round text-base opacity-70">arrow_forward</span></button>
                      <button onClick={() => { setPaypalPreparando(true); setMostrarPaypal(true); }} disabled={!ciudadEntrega || !zonaEntrega || costoEntrega === null || !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID} className="flex w-full items-center gap-3 rounded-xl border border-[#e4ad19] bg-[#ffc439] px-3.5 py-3 text-left text-[#111827] shadow-sm transition-all hover:bg-[#f2b900] disabled:cursor-not-allowed disabled:opacity-45"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/45"><span className="material-icons-round text-lg">account_balance_wallet</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Pagar con PayPal</span><span className="block text-[11px] opacity-70">Pago seguro en línea</span></span><span className="material-icons-round text-base opacity-70">arrow_forward</span></button>
                      <button onClick={() => setMostrarTransferencia(true)} disabled={!ciudadEntrega || !zonaEntrega || costoEntrega === null || cuentasBancarias.length === 0} className="flex w-full items-center gap-3 rounded-xl border border-[var(--primary)]/35 bg-[var(--card)] px-3.5 py-3 text-left text-[var(--text)] shadow-sm transition-all hover:border-[var(--primary)] hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-45"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]"><span className="material-icons-round text-lg">account_balance</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Transferencia bancaria</span><span className="block text-[11px] text-[var(--textSecondary)]">Envía tu comprobante de pago</span></span><span className="material-icons-round text-base text-[var(--textSecondary)]">arrow_forward</span></button>
                      {(!ciudadEntrega || !zonaEntrega) && <p className="px-2 pt-1 text-[11px] font-semibold text-[var(--textSecondary)]">Completa primero la ciudad y zona de entrega.</p>}
                      {cuentasBancarias.length === 0 && <p className="px-2 pt-1 text-[11px] font-semibold text-[var(--textSecondary)]">Las transferencias estarán disponibles cuando se configuren las cuentas.</p>}
                    </div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {mostrarTransferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleEnviarTransferencia} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--card)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">Pago seguro</p><h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Pagar por transferencia</h2><p className="mt-1 text-sm text-[var(--textSecondary)]">Déjanos tus datos y adjunta la captura para revisar tu pago.</p></div>
              <button type="button" onClick={() => setMostrarTransferencia(false)} className="text-2xl text-[var(--textSecondary)]" aria-label="Cerrar">×</button>
            </div>
            <div className="mt-5 grid gap-3">
              <label className="text-sm font-semibold text-[var(--text)]">Nombre completo<input required value={nombreCliente} onChange={(event) => setNombreCliente(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-[var(--text)]">Número de teléfono<input required type="tel" value={telefonoCliente} onChange={(event) => setTelefonoCliente(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold text-[var(--text)]">Correo electrónico<input required type="email" value={correoCliente} onChange={(event) => setCorreoCliente(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 font-normal" /></label>
            </div>
            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4"><p className="text-sm font-bold text-[var(--text)]">Elige una cuenta bancaria</p><div className="mt-3 grid gap-2">{cuentasBancarias.map((cuenta) => <button type="button" key={cuenta.id} onClick={() => setCuentaSeleccionada(cuenta.id)} className={`rounded-xl border p-3 text-left transition-colors ${cuentaSeleccionada === cuenta.id ? "border-[var(--primary)] bg-[var(--card)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)] bg-[var(--card)]"}`}><p className="font-bold text-[var(--text)]">{cuenta.banco}</p><p className="text-xs text-[var(--textSecondary)]">{cuenta.tipoCuenta} · {cuenta.numeroCuenta}</p><p className="text-xs text-[var(--textSecondary)]">Titular: {cuenta.titular}</p></button>)}</div></div>
            {cuentaSeleccionada && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Información para transferir</p>{(() => { const cuenta = cuentasBancarias.find((item) => item.id === cuentaSeleccionada); return cuenta ? <div className="mt-1 space-y-0.5"><p>{cuenta.banco} · {cuenta.tipoCuenta}</p><p>Cuenta: <strong>{cuenta.numeroCuenta}</strong></p><p>Titular: {cuenta.titular}</p>{cuenta.identificacion && <p>Identificación: {cuenta.identificacion}</p>}</div> : null; })()}</div>}
            <label className="mt-5 block text-sm font-semibold text-[var(--text)]">Captura de la transferencia<input required={!evidenceUrl} type="file" accept="image/*" onChange={(event) => { setEvidencia(event.target.files?.[0] || null); setEvidenceUrl(""); }} className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm font-normal" /><span className="mt-1 block text-xs font-normal text-[var(--textSecondary)]">Imagen JPG, PNG o WEBP. Máximo 5 MB.</span></label>
            <button type="button" onClick={handleEnviarCaptura} disabled={!evidencia || subiendoEvidencia} className="mt-3 w-full rounded-xl border border-[var(--primary)] px-4 py-3 font-bold text-[var(--primary)] disabled:opacity-50">{subiendoEvidencia ? "Enviando captura..." : evidenceUrl ? "Captura enviada ✓" : "Enviar captura"}</button>
            {evidenceUrl && <p className="mt-2 text-sm font-semibold text-emerald-700">La captura quedó cargada como evidencia.</p>}
            <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="text-sm text-[var(--textSecondary)]">Total a transferir</span><strong className="text-xl text-[var(--text)]">${total.toFixed(2)}</strong></div>
            <button type="submit" disabled={enviandoTransferencia || !evidenceUrl} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primaryForeground)] disabled:opacity-50">{enviandoTransferencia ? "Enviando transacción..." : "Enviar transacción"}</button>
          </form>
        </div>
      )}
      {mostrarPaypal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-visible rounded-2xl bg-[var(--card)] shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">Pago seguro</p><h2 className="mt-1 truncate text-2xl font-bold text-[var(--text)]">Pagar con PayPal</h2><p className="mt-1 text-sm text-[var(--textSecondary)]">Total: ${total.toFixed(2)} USD</p></div><button type="button" onClick={() => setMostrarPaypal(false)} className="shrink-0 text-2xl text-[var(--textSecondary)]" aria-label="Cerrar">×</button></div>
            <div className="min-h-0 overflow-x-auto overflow-y-auto overscroll-contain p-5 sm:p-6">
              {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">PayPal aún no está configurado. Agrega el Client ID para habilitarlo.</p> : <div className="relative min-h-40 w-full max-w-full">
                <div id="paypal-buttons" className={`w-full max-w-full pt-1 ${paypalProcesando ? "pointer-events-none opacity-50" : ""}`} />
                {(paypalPreparando || paypalProcesando) && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-[var(--card)]/90 px-4 text-center backdrop-blur-[2px]"><span className="h-9 w-9 animate-spin rounded-full border-4 border-[#ffc439] border-t-transparent" /><p className="text-sm font-semibold text-[var(--text)]">{paypalPreparando ? "Cargando opciones de pago..." : "Abriendo pago con tarjeta o PayPal..."}</p><p className="text-xs text-[var(--textSecondary)]">Espera un momento, no presiones nuevamente</p></div>}
              </div>}
              {paypalCargando && <p className="mt-3 text-center text-sm text-[var(--textSecondary)]">Confirmando tu pago...</p>}
              {paypalProcesando && !paypalCargando && <p className="mt-3 text-center text-xs font-semibold text-[var(--textSecondary)]">Abriendo el pago seguro de PayPal...</p>}
            </div>
          </div>
        </div>
      )}
      {!isLogged && <BottomBarPublic />}
    </>
  );
}