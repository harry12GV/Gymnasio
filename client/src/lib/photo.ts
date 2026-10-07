/**
 * Convierte un archivo de imagen a data URL (base64) redimensionándolo
 * para que quepa cómodamente en la base de datos y viaje rápido.
 */
export function fileToDataUrl(file: File, maxSize = 512, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
