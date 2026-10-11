export function avisoTrasImportar(tag, nombre) {
  const quien = nombre || tag;
  return {
    tag,
    texto: `El plan de ${quien} se recalcula con la importación. Lo marcado en la sesión sigue sin confirmar.`,
  };
}
