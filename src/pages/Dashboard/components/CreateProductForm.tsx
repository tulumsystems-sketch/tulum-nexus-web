import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';
import { calcularPrecioVenta, getMargenPorDefecto } from '../../../utils/tenantConfig';
import { esInsumo, getSufijoUnidad, getUnidadDeProducto } from '../../../utils/unidadMedida';
import { useTenantFeatures } from '../../../hooks/useTenantFeatures';

export type ProductoFormModo = 'carta' | 'deposito';

export interface CreateProductProps {
  onProductCreated: () => void;
  initialData?: any;
  onCancelEdit?: () => void;
  /** Fogón: Carta arma platos; Depósito carga insumos y bebidas. */
  modo?: ProductoFormModo;
}

export interface ProductFormInputs {
  nombre: string;
  descripcion?: string;
  precio?: number;
  precioCosto?: number;
  margenPorcentaje?: number;
  cantidadStock?: number;
  medidas?: string;
  categoriaId: number;
  imageUrl?: string;
  stockMinimo?: number;
}

const redondear = (valor: number) => Math.round(valor * 100) / 100;

const parseMargenOpcional = (valor: unknown): number | null => {
  if (valor === '' || valor == null) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

/**
 * Validación Declarativa (Yup) - Agregando campo imageUrl
 */
const productSchema: yup.ObjectSchema<ProductFormInputs> = yup.object().shape({
  nombre: yup.string().required('El nombre del producto es obligatorio.'),
  descripcion: yup.string().optional(),
  precio: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'El precio no puede ser negativo.')
    .optional(),
  precioCosto: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'El costo no puede ser negativo.')
    .optional(),
  margenPorcentaje: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'El margen no puede ser negativo.')
    .optional(),
  cantidadStock: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'La cantidad no puede ser negativa.')
    .optional(),
  medidas: yup.string().optional(),
  categoriaId: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required('Debes seleccionar una categoría.')
    .positive('Selecciona una categoría válida.'),
  imageUrl: yup.string().url('Debe ser una URL válida').optional(),
  stockMinimo: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'El stock mínimo no puede ser negativo.')
    .optional(),
}) as yup.ObjectSchema<ProductFormInputs>;

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export const CreateProductForm: React.FC<CreateProductProps> = ({ onProductCreated, initialData, onCancelEdit, modo }) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tipo, setTipo] = useState<'ELABORADO' | 'INSUMO'>('ELABORADO');
  const [vendible, setVendible] = useState(true);
  const [receta, setReceta] = useState<{ insumoId: string; cantidad: string }[]>([
    { insumoId: '', cantidad: '' },
  ]);

  // Carga asíncrona de categorías
  const { data: categorias, isLoading: isLoadingCategorias, error: categoriesError } = useSWR('/categorias', fetcher);
  const { data: globalConfig } = useSWR('/config', fetcher);
  const { data: catalogo } = useSWR('/productos', fetcher);
  const { isFeatureEnabled } = useTenantFeatures();
  const esRestaurante = isFeatureEnabled('MESAS');
  const modoDeposito = esRestaurante && modo === 'deposito';
  const modoCarta = esRestaurante && modo === 'carta';
  const seVende = !modoDeposito || vendible;

  const margenPorDefecto = getMargenPorDefecto(globalConfig);
  const usaMargenAutomatico = margenPorDefecto !== null;

  // Cuando el usuario escribe el precio de venta a mano dejamos de recalcularlo.
  const [precioPisado, setPrecioPisado] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInputs>({
    resolver: yupResolver(productSchema),
  });

  const [precioCostoActual, margenActual, categoriaIdActual] = watch(['precioCosto', 'margenPorcentaje', 'categoriaId']);

  // Un input number vacío llega como "" y Number("") === 0, lo que pisaba el 15%
  // configurado del negocio. Sólo usamos el valor del input si el usuario escribió algo.
  const margenIngresado = parseMargenOpcional(margenActual);
  const margenAplicado = margenIngresado !== null ? margenIngresado : margenPorDefecto;
  const costoNumerico = Number(precioCostoActual);
  const precioSugerido = costoNumerico > 0 && margenAplicado !== null
    ? redondear(calcularPrecioVenta(costoNumerico, margenAplicado))
    : null;

  const unidadCategoria = React.useMemo(() => {
    const categoria = Array.isArray(categorias)
      ? categorias.find((c: any) => String(c.id) === String(categoriaIdActual))
      : null;
    return categoria ? getSufijoUnidad(categoria.unidadMedida) : null;
  }, [categorias, categoriaIdActual]);

  const insumos = React.useMemo(() => {
    const lista = Array.isArray(catalogo) ? catalogo : [];
    return lista.filter((p: any) => esInsumo(p) && (!initialData?.id || p.id !== initialData.id));
  }, [catalogo, initialData]);
  const recetaArmada = tipo === 'ELABORADO' && receta.some((l) => l.insumoId && Number(l.cantidad) > 0);

  // Editando un producto viejo sin costo no podemos derivar nada: avisamos y respetamos el precio.
  const faltaCostoEnProductoExistente = Boolean(initialData) && initialData?.precioCosto == null;

  useEffect(() => {
    if (initialData) {
      reset({
        nombre: initialData.nombre,
        descripcion: initialData.descripcion,
        precio: initialData.precio,
        precioCosto: initialData.precioCosto ?? undefined,
        margenPorcentaje: initialData.margenPorcentaje ?? undefined,
        cantidadStock: initialData.cantidadStock,
        medidas: initialData.medidas,
        categoriaId: initialData.categoria?.id ?? initialData.categoriaId,
        stockMinimo: initialData.stockMinimo ?? 0,
      });
      setPreviewUrl(initialData.imageUrl || null);
      const tipoInicial = modo === 'deposito'
        ? 'INSUMO'
        : modo === 'carta'
          ? 'ELABORADO'
          : (esInsumo(initialData) ? 'INSUMO' : 'ELABORADO');
      setTipo(tipoInicial);
      setVendible(initialData.vendible !== false);
      const lineas = Array.isArray(initialData.receta) && initialData.receta.length > 0
        ? initialData.receta.map((l: any) => ({
            insumoId: String(l.insumoId ?? ''),
            cantidad: l.cantidad != null ? String(l.cantidad) : '',
          }))
        : [{ insumoId: '', cantidad: '' }];
      setReceta(lineas);
      // El precio guardado manda hasta que se toque el costo.
      setPrecioPisado(true);
    } else {
      reset({
        nombre: '',
        descripcion: '',
        precio: undefined,
        precioCosto: undefined,
        margenPorcentaje: undefined,
        cantidadStock: undefined,
        medidas: '',
        categoriaId: undefined,
        stockMinimo: undefined,
      });
      setPreviewUrl(null);
      setPrecioPisado(false);
      setTipo(modo === 'deposito' ? 'INSUMO' : 'ELABORADO');
      setVendible(modo !== 'deposito');
      setReceta([{ insumoId: '', cantidad: '' }]);
    }
    setSelectedFile(null);
  }, [initialData, reset, modo]);

  // El precio de venta se recalcula solo mientras no lo hayan pisado a mano.
  useEffect(() => {
    if (!precioPisado && precioSugerido !== null) {
      setValue('precio', precioSugerido, { shouldValidate: false });
    }
  }, [precioSugerido, precioPisado, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const onSubmit: SubmitHandler<ProductFormInputs> = async (data) => {
    setApiError(null);
    setIsUploading(true);

    try {
      let finalImageUrl = initialData?.imageUrl || null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
          const uploadRes = await apiClient.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' } // Authorization ya lo maneja apiClient internamente
          });
          
          if (uploadRes.data && uploadRes.data.url) {
            finalImageUrl = uploadRes.data.url;
          }
        } catch {
          setApiError('No pudimos subir la imagen. Proba con JPG, PNG o WebP y un archivo mas liviano.');
          return;
        }
      }

      const tipoFinal: 'ELABORADO' | 'INSUMO' = esRestaurante
        ? (modo === 'deposito' ? 'INSUMO' : modo === 'carta' ? 'ELABORADO' : tipo)
        : ((initialData?.tipo as 'ELABORADO' | 'INSUMO') || 'ELABORADO');
      const vendibleFinal = !esRestaurante
        ? true
        : modo === 'deposito'
          ? vendible
          : modo === 'carta'
            ? true
            : tipoFinal !== 'INSUMO';

      const recetaPayload = tipoFinal === 'INSUMO'
        ? []
        : receta
            .map((linea) => ({
              insumoId: Number(linea.insumoId),
              cantidad: Number(linea.cantidad),
            }))
            .filter((linea) => linea.insumoId > 0 && linea.cantidad > 0);

      if (vendibleFinal && (!data.precio || Number(data.precio) <= 0)) {
        setApiError(modoDeposito
          ? 'Si se vende en la carta, necesita un precio de venta.'
          : 'El plato de la carta necesita un precio de venta.');
        return;
      }

      const payload: Record<string, unknown> = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: vendibleFinal ? data.precio : (data.precio ?? 0),
        precioCosto: data.precioCosto ?? null,
        margenPorcentaje: data.margenPorcentaje ?? null,
        cantidadStock: recetaPayload.length > 0 ? 0 : (data.cantidadStock ?? 0),
        medidas: data.medidas,
        categoriaId: data.categoriaId,
        stockMinimo: data.stockMinimo ?? 0,
        imageUrl: finalImageUrl,
        tipo: tipoFinal,
        vendible: vendibleFinal,
      };
      if (esRestaurante) {
        payload.receta = recetaPayload;
      }

      if (initialData && initialData.id) {
        await apiClient.put(`/productos/${initialData.id}`, payload);
      } else {
        await apiClient.post('/productos', payload);
      }

      reset();
      clearFile();
      setPrecioPisado(false);
      onProductCreated();
    } catch (error: any) {
      if (!error.response) {
        setApiError('No se pudo conectar con el servidor.');
        return;
      }

      const errorMessage =
        error.response?.data?.message || 'Error desconocido al crear el producto.';
      setApiError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 mb-8 bg-white border border-gray-100 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {modoDeposito
            ? (initialData ? 'Editar artículo de stock' : 'Nuevo artículo de stock')
            : modoCarta
              ? (initialData ? 'Editar plato de la carta' : 'Nuevo plato de la carta')
              : esRestaurante
                ? (initialData
                  ? (tipo === 'INSUMO' ? 'Editar materia prima' : 'Editar plato de la carta')
                  : (tipo === 'INSUMO' ? 'Nueva materia prima' : 'Nuevo plato de la carta'))
                : (initialData ? 'Editar producto' : 'Nuevo producto')}
        </h2>
        {initialData && (
          <button type="button" onClick={onCancelEdit} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            Cancelar Edición
          </button>
        )}
      </div>
      
      {apiError && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r shadow-sm" role="alert">
          {apiError}
        </div>
      )}

      {categoriesError && (
        <div className="p-4 mb-6 text-sm text-yellow-700 bg-yellow-50 border-l-4 border-yellow-500 rounded-r shadow-sm" role="alert">
          Advertencia: No se pudieron cargar las categorías.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {esRestaurante && !modoCarta && !modoDeposito && (
          <>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTipo('ELABORADO')}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              tipo === 'ELABORADO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Carta
          </button>
          <button
            type="button"
            onClick={() => {
              setTipo('INSUMO');
              setReceta([{ insumoId: '', cantidad: '' }]);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              tipo === 'INSUMO' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Materia prima
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {tipo === 'INSUMO'
            ? 'Queso, salame, pan. El stock se descuenta cuando vendés un plato que lo usa en la receta.'
            : 'Carlito, sánguche, milanesa. Armá la receta en gramos o unidades: vender 10 sánguches descuenta 1 kg de fiambre y 10 panes, no un stock de sánguches.'}
        </p>
          </>
        )}

        {modoCarta && (
          <p className="text-xs text-slate-500">
            Sánguche, asado, milanesa. Armá la receta: al vender se descuenta el fiambre del depósito.
            Las bebidas y lo que se vende de la heladera van en Stock, con la marca «Se vende».
          </p>
        )}

        {modoDeposito && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={vendible}
              onChange={(e) => setVendible(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">Se vende (sale en la carta)</span>
              <span className="block text-xs text-slate-500">
                Marcalo para Coca, agua, cerveza. Dejalo apagado para fiambre, pan o artículos de limpieza.
              </span>
            </span>
          </label>
        )}
        
        {/* Fila 1 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Nombre del Producto *</label>
            <input
              type="text"
              {...register('nombre')}
              className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.nombre ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
              placeholder={modoDeposito
                ? 'Ej. Queso, Coca, lavandina'
                : esRestaurante
                  ? 'Ej. Carlito, sánguche, asado'
                  : 'Ej. Silla Ergonómica'}
              disabled={isSubmitting}
            />
            {errors.nombre && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Categoría *</label>
            <select
              {...register('categoriaId')}
              className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.categoriaId ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
              disabled={isSubmitting || isLoadingCategorias}
            >
              <option value="">
                {isLoadingCategorias ? 'Cargando...' : 'Selecciona una categoría'}
              </option>
              {Array.isArray(categorias) && categorias.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
            {errors.categoriaId && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.categoriaId.message}</p>}
          </div>
        </div>

        {/* Fila 2: Descripción y URL Imagen */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Imagen del Producto</label>
            <div className="flex items-start gap-4">
              <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                previewUrl ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-500' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
              }`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSubmitting || isUploading} />
                <svg className={`w-8 h-8 mb-2 ${previewUrl ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z"></path></svg>
                <span className={`text-sm font-bold ${previewUrl ? 'text-indigo-700' : 'text-slate-600'}`}>
                  {previewUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                </span>
                <span className="text-xs text-slate-400 mt-1 text-center">Formato JPG, PNG, WebP</span>
              </label>

              {previewUrl && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 flex-shrink-0 bg-slate-100 shadow-sm group">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <button type="button" onClick={clearFile} disabled={isSubmitting || isUploading} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm focus:outline-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Descripción</label>
            <textarea
              {...register('descripcion')}
              rows={2}
              className={`w-full px-4 py-2 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.descripcion ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
               placeholder="Detalles acerca del producto..."
               disabled={isSubmitting}
            />
            {errors.descripcion && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.descripcion.message}</p>}
          </div>
        </div>

        {/* Fila 3: Costo, Margen y Precio de Venta */}
        {faltaCostoEnProductoExistente && (
          <div className="p-4 text-sm text-amber-800 bg-amber-50 border-l-4 border-amber-400 rounded-r" role="alert">
            Este producto no tiene precio de costo cargado. El precio de venta actual se mantiene tal como está;
            si cargás el costo, el precio se recalcula con el margen.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Precio de Costo</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                {...register('precioCosto', { onChange: () => setPrecioPisado(false) })}
                className={`w-full pl-8 pr-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.precioCosto ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.precioCosto
              ? <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.precioCosto.message}</p>
              : <p className="mt-1 text-xs text-slate-400">Lo que te cuesta el producto.</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Margen (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('margenPorcentaje', { onChange: () => setPrecioPisado(false) })}
                className={`w-full px-4 py-2.5 pr-9 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.margenPorcentaje ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
                }`}
                placeholder={usaMargenAutomatico ? String(margenPorDefecto) : 'Sin margen'}
                disabled={isSubmitting}
              />
              <span className="absolute right-3 top-2.5 text-slate-400 font-medium">%</span>
            </div>
            {errors.margenPorcentaje
              ? <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.margenPorcentaje.message}</p>
              : (
                <p className="mt-1 text-xs text-slate-400">
                  {usaMargenAutomatico
                    ? `Vacío usa el ${margenPorDefecto}% configurado para el negocio.`
                    : 'Sin margen configurado: cargá el precio de venta a mano.'}
                </p>
              )}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">
              {seVende ? 'Precio de Venta *' : 'Precio de venta'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                {...register('precio', { onChange: () => setPrecioPisado(true) })}
                className={`w-full pl-8 pr-4 py-2.5 font-bold text-slate-800 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.precio ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.precio && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.precio.message}</p>}
            {!errors.precio && precioSugerido !== null && (
              precioPisado ? (
                <button
                  type="button"
                  onClick={() => setPrecioPisado(false)}
                  className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Recalcular con el margen: ${precioSugerido.toFixed(2)}
                </button>
              ) : (
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  Calculado con {margenAplicado}% sobre el costo. Podés editarlo.
                </p>
              )
            )}
          </div>
        </div>

        {esRestaurante && !modoDeposito && tipo !== 'INSUMO' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-800">Receta por unidad vendida</p>
                <p className="text-xs text-slate-500">
                  Cantidad en la unidad de cada insumo. Si el queso está en gramos, poné 100. Si está en kg, poné 0.1.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceta((prev) => [...prev, { insumoId: '', cantidad: '' }])}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + Ingrediente
              </button>
            </div>
            {insumos.length === 0 ? (
              <p className="text-xs font-semibold text-amber-700">
                Primero cargá artículos en Stock (queso, salame, pan) y después armá el plato.
              </p>
            ) : (
              <div className="space-y-2">
                {receta.map((linea, index) => {
                  const insumo = insumos.find((p: any) => String(p.id) === String(linea.insumoId));
                  return (
                    <div key={`${index}-${linea.insumoId}`} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <select
                        value={linea.insumoId}
                        onChange={(e) =>
                          setReceta((prev) =>
                            prev.map((l, i) => (i === index ? { ...l, insumoId: e.target.value } : l))
                          )
                        }
                        className="sm:col-span-7 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Elegí insumo</option>
                        {insumos.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({getSufijoUnidad(getUnidadDeProducto(p))})
                          </option>
                        ))}
                      </select>
                      <div className="sm:col-span-4 relative">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={linea.cantidad}
                          onChange={(e) =>
                            setReceta((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, cantidad: e.target.value } : l))
                            )
                          }
                          placeholder="100"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                          {insumo ? getSufijoUnidad(getUnidadDeProducto(insumo)) : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setReceta((prev) =>
                            prev.length === 1
                              ? [{ insumoId: '', cantidad: '' }]
                              : prev.filter((_, i) => i !== index)
                          )
                        }
                        className="sm:col-span-1 text-xs font-bold text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fila 4: Stock, Stock Minimo y Medidas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">
              Stock{unidadCategoria ? <span className="ml-1 font-normal text-slate-400">(en {unidadCategoria})</span> : null}
            </label>
            {recetaArmada ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                No se stockea el plato. Al vender se descuentan los insumos de la receta.
              </p>
            ) : (
              <>
                <input
                  type="number"
                  step="0.001"
                  {...register('cantidadStock')}
                  className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.cantidadStock ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
                  }`}
                  placeholder="0"
                  disabled={isSubmitting}
                />
                {errors.cantidadStock && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.cantidadStock.message}</p>}
              </>
            )}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Stock Mínimo</label>
            <input
              type="number"
              {...register('stockMinimo')}
              className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.stockMinimo ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.stockMinimo && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.stockMinimo.message}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Medidas</label>
            <input
              type="text"
              {...register('medidas')}
              className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.medidas ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
              placeholder="Ej. 10x20x30 cm"
              disabled={isSubmitting}
            />
            {errors.medidas && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.medidas.message}</p>}
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className={`flex items-center gap-2 px-6 py-2.5 font-bold text-white transition-all rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed ${
              isUploading ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {isSubmitting || isUploading ? (
              <>
                <svg className="w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {isUploading ? 'Subiendo...' : 'Guardando...'}
              </>
            ) : initialData ? (
               modoDeposito ? 'Actualizar artículo' : modoCarta ? 'Actualizar plato' : 'Actualizar Producto'
            ) : (
               modoDeposito ? 'Guardar artículo' : modoCarta ? 'Guardar plato' : 'Guardar Producto'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
