export function esErrorCliente(error) {
  return Number(error?.status) >= 400 && Number(error?.status) < 500;
}

export function debeReintentarGuardado(error, intento) {
  return !esErrorCliente(error) && intento < 3;
}
