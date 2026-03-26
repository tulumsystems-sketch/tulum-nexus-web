import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/axiosConfig';

export interface CreateCategoryProps {
  onCategoryCreated: () => void;
}

export interface CategoryFormInputs {
  nombre: string;
}

/**
 * Validación Declarativa (Yup) - Validando mínimo 3 caracteres
 */
const categorySchema: yup.ObjectSchema<CategoryFormInputs> = yup.object().shape({
  nombre: yup
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .required('El nombre de la categoría es obligatorio.'),
});

export const CreateCategoryForm: React.FC<CreateCategoryProps> = ({ onCategoryCreated }) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInputs>({
    resolver: yupResolver(categorySchema),
  });

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    // Limpiamos errores al intentar nuevamente
    setApiError(null);

    try {
      // Petición POST, nota como NUNCA enviamos el tenantId, el backend lo deduce del JWT
      await apiClient.post('/categorias', {
        nombre: data.nombre,
      });

      // Limpiamos el input después del éxito
      reset();
      
      // Notificamos al componente padre que debe re-hacer fetch
      onCategoryCreated();
    } catch (error: any) {
      console.error("DETALLE DEL ERROR AL CREAR CATEGORÍA:", error);

      // Guard Clause: Falla de red o de servidor general
      if (!error.response) {
        setApiError('No se pudo conectar con el servidor.');
        return;
      }

      // Extracción limpia del error (aprovechando el API Error Response)
      const errorMessage =
        error.response.data?.message || 'Error desconocido al crear la categoría.';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="p-4 sm:p-6 mb-8 bg-white rounded-lg shadow-sm w-full">
      <h2 className="mb-4 text-xl font-semibold text-gray-700">Crear Nueva Categoría</h2>
      
      {apiError && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded" role="alert">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-grow">
          <label className="sr-only">Nombre de la Categoría</label>
          <input
            type="text"
            {...register('nombre')}
            className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
              errors.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Ej. Criptomonedas, Acciones, Inmuebles..."
            disabled={isSubmitting}
          />
          {errors.nombre && (
            <p className="mt-1 text-xs font-medium text-red-500">{errors.nombre.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 font-bold text-white transition-colors bg-green-600 rounded whitespace-nowrap hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
        </button>
      </form>
    </div>
  );
};
