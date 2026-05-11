export const normalizarDocumento = (
  documento: string | null | undefined,
): string | null | undefined => {
  if (documento === undefined) {
    return undefined;
  }

  if (documento === null || documento.trim() === '') {
    return null;
  }

  return documento.replace(/\D+/g, '');
};
