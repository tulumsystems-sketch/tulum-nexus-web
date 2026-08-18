import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/axiosConfig';
import { UNIDADES_MEDIDA, UNIDAD_POR_DEFECTO } from '../../../utils/unidadMedida';

export interface CreateCategoryProps {
  onCategoryCreated: () => void;
  initialData?: any;
  onCancelEdit?: () => void;
}

export interface CategoryFormInputs {
  nombre: string;
  unidadMedida: string;
}

const categorySchema: yup.ObjectSchema<CategoryFormInputs> = yup.object().shape({
  nombre: yup
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .required('El nombre de la categoría es obligatorio.'),
  unidadMedida: yup
    .string()
    .required('Elegí la unidad de medida.')
    .default(UNIDAD_POR_DEFECTO),
});

export const CreateCategoryForm: React.FC<CreateCategoryProps> = ({
  onCategoryCreated,
  initialData,
  onCancelEdit,
}) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const editando = Boolean(initialData?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInputs>({
    resolver: yupResolver(categorySchema),
    defaultValues: { nombre: '', unidadMedida: UNIDAD_POR_DEFECTO },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        nombre: initialData.nombre || '',
        unidadMedida: initialData.unidadMedida || UNIDAD_POR_DEFECTO,
      });
    } else {
      reset({ nombre: '', unidadMedida: UNIDAD_POR_DEFECTO });
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    setApiError(null);

    try {
      const payload = {
        nombre: data.nombre,
        unidadMedida: data.unidadMedida,
      };
      if (editando) {
        await apiClient.put(`/categorias/${initialData.id}`, payload);
      } else {
        await apiClient.post('/categorias', payload);
      }

      reset({ nombre: '', unidadMedida: UNIDAD_POR_DEFECTO });
      onCategoryCreated();
    } catch (error: any) {
      if (!error.response) {
        setApiError('No se pudo conectar con el servidor.');
        return;
      }
      const errorMessage =
        error.response.data?.message ||
        (editando ? 'No se pudo actualizar la categoría.' : 'Error desconocido al crear la categoría.');
      setApiError(errorMessage);
    }
  };

  return (
    <div className="p-4 sm:p-6 mb-8 bg-white rounded-lg shadow-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">
          {editando ? 'Editar Categoría' : 'Crear Nueva Categoría'}
        </h2>
        {editando && onCancelEdit && (
          <button type="button" onClick={onCancelEdit} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            Cancelar edición
          </button>
        )}
      </div>

      {apiError && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded" role="alert">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-grow">
          <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Nombre de la Categoría
          </label>
          <input
            type="text"
            {...register('nombre')}
            className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
              errors.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Ej. Bebidas, Golosinas, Fiambres..."
            disabled={isSubmitting}
          />
          {errors.nombre && (
            <p className="mt-1 text-xs font-medium text-red-500">{errors.nombre.message}</p>
          )}
        </div>

        <div className="sm:w-56">
          <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Unidad de Medida
          </label>
          <select
            {...register('unidadMedida')}
            className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
              errors.unidadMedida ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            disabled={isSubmitting}
          >
            {UNIDADES_MEDIDA.map((unidad) => (
              <option key={unidad.value} value={unidad.value}>
                {unidad.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Se muestra junto a las cantidades de los productos de esta categoría.
          </p>
          {errors.unidadMedida && (
            <p className="mt-1 text-xs font-medium text-red-500">{errors.unidadMedida.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 font-bold text-white transition-colors bg-green-600 rounded whitespace-nowrap hover:bg-green-700 disabled:opacity-50 sm:mt-6"
        >
          {isSubmitting ? 'Guardando...' : editando ? 'Actualizar Categoría' : 'Guardar Categoría'}
        </button>
      </form>
    </div>
  );
};
