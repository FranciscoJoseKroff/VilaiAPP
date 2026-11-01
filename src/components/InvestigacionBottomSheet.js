import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { costoDe, nivelDe } from '../game/investigacion';
import { efectoDescripcion, textoRequisito } from '../game/format';
import { AppIcon } from './icons';
import { CostChips } from './CostChips';
import PixelPanel from './pixel/PixelPanel';
import PixelButton from './pixel/PixelButton';

function requisitosDelNodo(nodo, aldea) {
  const tecnologias = (nodo.requiere || []).map((requisito) => ({
    texto: textoRequisito(requisito),
    cumplido: nivelDe(aldea, requisito.id) >= requisito.nivel,
  }));
  const edificios = (nodo.requiereEdificio || []).map((requisito) => {
    const edificio = (aldea.edificios || []).find((item) => item.tipoId === requisito.tipoId);
    return {
      texto: textoRequisito(requisito),
      cumplido: Boolean(edificio && Number(edificio.nivel || 1) >= requisito.nivel),
    };
  });
  return [...tecnologias, ...edificios];
}

function FichaRequisito({ requisito }) {
  const color = requisito.cumplido ? theme.colors.exito : theme.colors.aviso;
  return (
    <View style={styles.requirementRow}>
      <AppIcon name={requisito.cumplido ? 'check-circle' : 'circle-outline'} size={18} color={color} />
      <Text style={styles.requirementText}>{requisito.texto}</Text>
      <Text style={[styles.requirementStatus, { color }]}>{requisito.cumplido ? 'Cumplido' : 'Pendiente'}</Text>
    </View>
  );
}

export default function InvestigacionBottomSheet({
  visible,
  nodo,
  aldea,
  disponibilidad,
  onClose,
  onInvestigar,
}) {
  if (!nodo || !aldea) return null;

  const nivel = nivelDe(aldea, nodo.id);
  const maximo = nodo.maxNivel != null && nivel >= nodo.maxNivel;
  const costo = costoDe(nodo, nivel);
  const requisitos = requisitosDelNodo(nodo, aldea);
  const reliquiasTotales = Number(aldea.legado?.reliquias) || 0;
  const reliquiasDisponibles = Math.max(0, reliquiasTotales - (Number(aldea.legado?.reliquiasGastadas) || 0));
  const efectoActual = nivel > 0 ? efectoDescripcion(nodo, nivel) : 'Sin efecto activo';
  const efectoSiguiente = maximo ? 'Nivel máximo alcanzado' : efectoDescripcion(nodo, nivel + 1);
  const sinCosto = Object.keys(costo.recursos).length === 0 && costo.reliquias === 0;
  const motivo = disponibilidad.ok ? '' : disponibilidad.motivo;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle de investigación" style={styles.backdrop} onPress={onClose} />
        <PixelPanel variant="elevada" style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.nodeIdentity}>
              <View style={styles.iconWrap}><AppIcon name={nodo.icono || 'flask'} size={28} color={theme.colors.acento} /></View>
              <View style={styles.titleCopy}>
                <Text accessibilityRole="header" style={styles.title}>{nodo.nombre}</Text>
                <Text style={styles.level}>{maximo ? 'MÁX' : `Nivel ${nivel}${nodo.maxNivel == null ? '' : `/${nodo.maxNivel}`}`}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} style={styles.closeButton} onPress={onClose}>
              <AppIcon name="close" size={22} color={theme.colors.textoPrimario} />
            </Pressable>
          </View>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <Text style={styles.description}>{nodo.descripcion}</Text>

            <Text style={styles.sectionTitle}>Efecto actual</Text>
            <Text style={styles.detail}>{efectoActual}</Text>
            <Text style={styles.sectionTitle}>Siguiente nivel</Text>
            <Text style={styles.detail}>{efectoSiguiente}</Text>

            {requisitos.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Requisitos</Text>
                {requisitos.map((requisito, index) => <FichaRequisito key={`${requisito.texto}-${index}`} requisito={requisito} />)}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Costo</Text>
            {sinCosto ? <Text style={styles.detail}>Sin costo</Text> : (
              <>
                <CostChips resources={costo.recursos} available={aldea.recursos || {}} />
                {costo.reliquias > 0 ? (
                  <View style={styles.relicRow}>
                    <View style={[
                      styles.relicChip,
                      reliquiasDisponibles >= costo.reliquias ? styles.relicChipOk : styles.relicChipMissing,
                    ]}>
                      <AppIcon name="diamond-stone" size={16} color={theme.colors.acento} />
                      <Text style={styles.relicText}>
                        Reliquias {reliquiasDisponibles >= costo.reliquias ? costo.reliquias : `${reliquiasDisponibles}/${costo.reliquias}`}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            )}

            <PixelButton
              accessibilityLabel={`Investigar ${nodo.nombre}, nivel ${nivel + 1}`}
              disabled={!disponibilidad.ok}
              style={styles.action}
              onPress={() => onInvestigar(nodo.id)}
            >
              {maximo ? 'Investigación completada' : `Investigar nivel ${nivel + 1}`}
            </PixelButton>
            {!disponibilidad.ok ? <Text accessibilityRole="alert" style={styles.reason}>{motivo || 'No puedes investigar este nodo todavía.'}</Text> : null}
          </ScrollView>
        </PixelPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { maxHeight: '88%', backgroundColor: theme.colors.superficie, borderTopLeftRadius: theme.radius[16], borderTopRightRadius: theme.radius[16], borderWidth: 1, borderColor: theme.colors.borde, paddingHorizontal: theme.spacing[16], paddingTop: theme.spacing[8], paddingBottom: theme.spacing[16] },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: theme.radius[6], backgroundColor: theme.colors.textoSecundario, marginBottom: theme.spacing[12] },
  heading: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[8] },
  nodeIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  iconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  titleCopy: { flex: 1 },
  title: { color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.title, fontWeight: theme.typography.weights.bold },
  level: { color: theme.colors.acento, fontSize: 14, marginTop: 2 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta },
  content: { marginTop: theme.spacing[12] },
  contentInner: { paddingBottom: theme.spacing[16] },
  description: { color: theme.colors.textoSecundario, fontSize: 14, lineHeight: 21, marginBottom: theme.spacing[8] },
  sectionTitle: { color: theme.colors.acento, fontSize: 14, fontWeight: theme.typography.weights.bold, marginTop: theme.spacing[12], marginBottom: theme.spacing[4] },
  detail: { color: theme.colors.textoPrimario, fontSize: 14, lineHeight: 20 },
  requirementRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], borderBottomWidth: 1, borderBottomColor: theme.colors.borde },
  requirementText: { flex: 1, color: theme.colors.textoPrimario, fontSize: 14 },
  requirementStatus: { fontSize: 14, fontWeight: theme.typography.weights.semibold },
  relicRow: { flexDirection: 'row', marginTop: theme.spacing[8] },
  relicChip: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4], borderWidth: 1, borderRadius: theme.radius[6], paddingHorizontal: theme.spacing[8] },
  relicChipOk: { borderColor: theme.colors.exito, backgroundColor: theme.colors.superficieAlta },
  relicChipMissing: { borderColor: theme.colors.peligro, backgroundColor: theme.colors.superficie },
  relicText: { color: theme.colors.textoPrimario, fontSize: 14, fontWeight: theme.typography.weights.semibold },
  action: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.acento, borderRadius: theme.radius[10], marginTop: theme.spacing[16], paddingHorizontal: theme.spacing[12] },
  actionDisabled: { backgroundColor: theme.colors.superficieAlta },
  actionText: { color: theme.colors.fondo, fontSize: 14, fontWeight: theme.typography.weights.bold, textAlign: 'center' },
  reason: { color: theme.colors.aviso, fontSize: 14, textAlign: 'center', marginTop: theme.spacing[8] },
});