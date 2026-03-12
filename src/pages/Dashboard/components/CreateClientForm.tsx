import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import apiClient from '../../../api/axiosConfig';

export interface CreateClientProps {
  onClientCreated: () => void;
}

export interface ClientFormInputs {
  nombre: string;
  apellido: string;
  empresa?: string;
}

/**
 * Validación Declarativa (Yup)
 */
const clientSchema: yup.ObjectSchema<ClientFormInputs> = yup.object().shape({
  nombre: yup.string().required('El nombre es obligatorio.'),
  apellido: yup.string().required('El apellido es obligatorio.'),
  empresa: yup.string().optional(),
}) as yup.ObjectSchema<ClientFormInputs>;

export const CreateClientForm: React.FC<CreateClientProps> = ({ onClientCreated }) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormInputs>({
    resolver: yupResolver(clientSchema),
  });

  const onSubmit: SubmitHandler<ClientFormInputs> = async (data) => {
    setApiError(null);

    try {
      // POST sin enviar el tenantId
      await apiClient.post('/clientes', {
        nombre: data.nombre,
        apellido: data.apellido,
        empresa: data.empresa,
      });

      // Limpia el formulario
      reset();

      // Refresca la lista en el padre
      onClientCreated();
    } catch (error: any) {
      console.error("DETALLE DEL ERROR AL CREAR CLIENTE:", error);

      if (!error.response) {
        setApiError('No se pudo conectar con el servidor.');
        return;
      }

      const errorMessage =
        error.response.data?.message || 'Error desconocido al crear el cliente.';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="w-full p-6 mb-8 bg-white rounded-lg shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-700">Crear Nuevo Cliente</h2>

      {apiError && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded" role="alert">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Nombre */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Nombre *</label>
            <input
              type="text"
              {...register('nombre')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Ej. Juan"
              disabled={isSubmitting}
            />
            {errors.nombre && <p className="mt-1 text-xs font-medium text-red-500">{errors.nombre.message}</p>}
          </div>

          {/* Apellido */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Apellido *</label>
            <input
              type="text"
              {...register('apellido')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.apellido ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Ej. Pérez"
              disabled={isSubmitting}
            />
            {errors.apellido && <p className="mt-1 text-xs font-medium text-red-500">{errors.apellido.message}</p>}
          </div>

          {/* Empresa */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Empresa (Opcional)</label>
            <input
              type="text"
              {...register('empresa')}
              className={`w-full px-4 py-2 text-gray-700 border rounded focus:outline-none focus:ring-2 ${
                errors.empresa ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Ej. Acme Corp."
              disabled={isSubmitting}
            />
            {errors.empresa && <p className="mt-1 text-xs font-medium text-red-500">{errors.empresa.message}</p>}
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 font-bold text-white transition-colors bg-purple-600 rounded whitespace-nowrap hover:bg-purple-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
};
