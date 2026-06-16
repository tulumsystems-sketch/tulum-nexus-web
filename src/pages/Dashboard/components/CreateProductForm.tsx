import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import useSWR from 'swr';
import apiClient from '../../../api/axiosConfig';

export interface CreateProductProps {
  onProductCreated: () => void;
  initialData?: any;
  onCancelEdit?: () => void;
}

export interface ProductFormInputs {
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidadStock: number;
  medidas?: string;
  categoriaId: number;
  imageUrl?: string;
  stockMinimo?: number;
}

/**
 * Validación Declarativa (Yup) - Agregando campo imageUrl
 */
const productSchema: yup.ObjectSchema<ProductFormInputs> = yup.object().shape({
  nombre: yup.string().required('El nombre del producto es obligatorio.'),
  descripcion: yup.string().optional(),
  precio: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required('El precio es obligatorio.')
    .positive('El precio debe ser mayor a 0.'),
  cantidadStock: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required('La cantidad en stock es obligatoria.')
    .min(0, 'La cantidad no puede ser negativa.'),
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

export const CreateProductForm: React.FC<CreateProductProps> = ({ onProductCreated, initialData, onCancelEdit }) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Carga asíncrona de categorías
  const { data: categorias, isLoading: isLoadingCategorias, error: categoriesError } = useSWR('/categorias', fetcher);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInputs>({
    resolver: yupResolver(productSchema),
  });

  useEffect(() => {
    if (initialData) {
      reset({
        nombre: initialData.nombre,
        descripcion: initialData.descripcion,
        precio: initialData.precio,
        cantidadStock: initialData.cantidadStock,
        medidas: initialData.medidas,
        categoriaId: initialData.categoria?.id ?? initialData.categoriaId,
        stockMinimo: initialData.stockMinimo ?? 0,
      });
      setPreviewUrl(initialData.imageUrl || null);
    } else {
      reset({
        nombre: '',
        descripcion: '',
        precio: undefined,
        cantidadStock: undefined,
        medidas: '',
        categoriaId: undefined,
        stockMinimo: undefined,
      });
      setPreviewUrl(null);
    }
    setSelectedFile(null);
  }, [initialData, reset]);

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
        
        const uploadRes = await apiClient.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' } // Authorization ya lo maneja apiClient internamente
        });
        
        if (uploadRes.data && uploadRes.data.url) {
          finalImageUrl = uploadRes.data.url;
        }
      }

      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        cantidadStock: data.cantidadStock,
        medidas: data.medidas,
        categoriaId: data.categoriaId,
        stockMinimo: data.stockMinimo ?? 0,
        imageUrl: finalImageUrl,
      };

      if (initialData && initialData.id) {
        await apiClient.put(`/productos/${initialData.id}`, payload);
      } else {
        await apiClient.post('/productos', payload);
      }

      reset();
      clearFile();
      onProductCreated();
    } catch (error: any) {
      console.error("DETALLE DEL ERROR AL CREAR PRODUCTO:", error);

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
        <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
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
              placeholder="Ej. Silla Ergonómica"
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

        {/* Fila 3: Precio, Cantidad, Medidas, Stock Minimo */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Precio *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                {...register('precio')}
                className={`w-full pl-8 pr-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.precio ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.precio && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.precio.message}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-slate-700">Stock *</label>
            <input
              type="number"
              {...register('cantidadStock')}
              className={`w-full px-4 py-2.5 text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.cantidadStock ? 'border-red-400 focus:ring-red-400 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500 hover:bg-white'
              }`}
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.cantidadStock && <p className="mt-1 text-xs font-medium text-red-500 animate-pulse">{errors.cantidadStock.message}</p>}
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
               'Actualizar Producto'
            ) : (
               'Guardar Producto'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
