export const hitSlop44 = { top: 8, bottom: 8, left: 8, right: 8 };

export function contrasteHex(foreground, background) {
  const luminancia = (hex) => {
    const canales = [1, 3, 5].map((indice) => parseInt(hex.slice(indice, indice + 2), 16) / 255)
      .map((valor) => valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4);
    return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
  };
  const claro = luminancia(foreground);
  const oscuro = luminancia(background);
  return (Math.max(claro, oscuro) + 0.05) / (Math.min(claro, oscuro) + 0.05);
}
