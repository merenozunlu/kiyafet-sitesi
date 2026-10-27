import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from './api-client';

/**
 * Sunucudan dönen VALIDATION_ERROR detaylarını form alanlarına eşler.
 * Eşleşmeyen hatalar için `root` hatası set edilir; dönüş değeri genel mesajdır.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, knownFields?: readonly string[]): string | null {
  if (!isApiError(error)) return null;
  let matched = false;
  if (error.details?.length) {
    for (const d of error.details) {
      const field = d.path.split('.')[0] ?? d.path;
      if (!knownFields || knownFields.includes(field)) {
        setError(field as Path<T>, { type: 'server', message: d.message });
        matched = true;
      }
    }
  }
  if (!matched) setError('root' as Path<T>, { type: 'server', message: error.message });
  return error.message;
}
