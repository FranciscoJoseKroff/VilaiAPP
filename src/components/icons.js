import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

export const RESOURCE_ICONS = {
  madera: { name: 'tree', color: theme.colors.madera, label: 'Madera' },
  comida: { name: 'food-apple', color: theme.colors.comida, label: 'Comida' },
  oro: { name: 'currency-usd', color: theme.colors.oro, label: 'Oro' },
  trigo: { name: 'barley', color: theme.colors.trigo, label: 'Trigo' },
  harina: { name: 'grain', color: theme.colors.harina, label: 'Harina' },
  pan: { name: 'bread-slice', color: theme.colors.pan, label: 'Pan' },
  hierro: { name: 'anvil', color: theme.colors.hierro, label: 'Hierro' },
  poblacion: { name: 'account-group', color: theme.colors.textoPrimario, label: 'Población' },
};

const BUILDING_ICONS = {
  casa: 'home',
  granja: 'sprout',
  molino: 'cog',
  horno: 'fire',
  mina: 'pickaxe',
  centroInvestigacion: 'flask',
  torre: 'shield',
  observatorio: 'telescope',
  almacen: 'warehouse',
  barraca: 'shield-home',
};

export function ResourceIcon({ resource, size = 18, color }) {
  const icon = RESOURCE_ICONS[resource] || RESOURCE_ICONS.madera;
  return <MaterialCommunityIcons name={icon.name} size={size} color={color || icon.color} />;
}

export function BuildingIcon({ buildingId, size = 20, color = theme.colors.acento }) {
  return <MaterialCommunityIcons name={BUILDING_ICONS[buildingId] || 'home-city'} size={size} color={color} />;
}

export function AppIcon({ name, size = 20, color = theme.colors.textoPrimario, ...props }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} {...props} />;
}
