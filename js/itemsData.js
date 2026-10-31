/**
 * Base de datos de insumos del Reto Mochila de Emergencia 60s.
 * Clasificación: essential | distractor | conditional
 */
const MAX_BACKPACK_KG = 12;
const ROUND_SECONDS = 60;

const ITEMS_DATABASE = [
  // --- OBJETOS ESENCIALES UNIVERSALES (Kit 72 Horas) ---
  {
    id: "agua",
    name: "Agua embotellada (3L/persona/día)",
    category: "essential",
    weight: 3.0,
    icon: "water-bottle.svg",
    explanation:
      "El agua potable es la prioridad #1. Se requieren al menos 3 litros por persona al día para mantenerse hidratado."
  },
  {
    id: "comida_latas",
    name: "Alimentos no perecederos y abrelatas",
    category: "essential",
    weight: 2.0,
    icon: "canned-food.svg",
    explanation:
      "Comida en lata y abrelatas manual garantizan alimento sin necesidad de cocinar o refrigerar."
  },
  {
    id: "botiquin",
    name: "Botiquín de primeros auxilios",
    category: "essential",
    weight: 1.0,
    icon: "first-aid.svg",
    explanation:
      "Indispensable para curar heridas menores, cortes o raspones durante una evacuación."
  },
  {
    id: "documentos_ziploc",
    name: "Documentos importantes en bolsa hermética",
    category: "essential",
    weight: 0.5,
    icon: "documents.svg",
    explanation:
      "Identificaciones, escrituras y actas guardadas en bolsa ziploc para evitar que se destruyan con el agua."
  },
  {
    id: "linterna_radio",
    name: "Linterna y Radio de baterías/manivela",
    category: "essential",
    weight: 1.0,
    icon: "flashlight.svg",
    explanation:
      "Permite iluminar la evacuación nocturna y escuchar avisos oficiales de Protección Civil sin red celular."
  },
  {
    id: "powerbank",
    name: "Banco de carga (Powerbank) cargado",
    category: "essential",
    weight: 0.5,
    icon: "powerbank.svg",
    explanation:
      "Mantiene el teléfono móvil con batería para llamadas de emergencia o rescate."
  },

  // --- OBJETOS DISTRACTORES (Innecesarios / Sobrepeso) ---
  {
    id: "consola_videojuegos",
    name: "Consola de Videojuegos",
    category: "distractor",
    weight: 3.5,
    icon: "console.svg",
    explanation:
      "Ocupa espacio vital y requiere energía eléctrica que estará suspendida."
  },
  {
    id: "adorno_pesado",
    name: "Florero / Adorno de cerámica",
    category: "distractor",
    weight: 2.5,
    icon: "vase.svg",
    explanation:
      "No aporta valor de supervivencia y añade peso frágil innecesario."
  },
  {
    id: "cobija_gigante",
    name: "Edredón / Cobija de plumas pesada",
    category: "distractor",
    weight: 4.0,
    icon: "heavy-blanket.svg",
    explanation:
      "Al mojarse absorbe agua y se vuelve imposible de cargar. Es mejor llevar mantas térmicas ligeras."
  },

  // --- OBJETOS CONDICIONALES / NECESIDADES ESPECÍFICAS (Inclusivos) ---
  {
    id: "audifonos_cancelacion",
    name: "Audífonos de cancelación de ruido",
    category: "conditional",
    weight: 0.3,
    icon: "headphones.svg",
    explanation:
      "Para personas dentro del espectro autista (TEA) o con hipersensibilidad auditiva, el estruendo del viento y la lluvia sobre techos de lámina genera desregulaciones severas. Mantener la calma es vital para evacuar con seguridad."
  },
  {
    id: "inhalador_meds",
    name: "Inhalador / Medicamentos recetados",
    category: "conditional",
    weight: 0.2,
    icon: "inhaler.svg",
    explanation:
      "Para familiares con asma, diabetes o hipertensión, interrumpir el tratamiento en un albergue puede ser mortal."
  },
  {
    id: "lentes_graduacion",
    name: "Lentes de graduación de repuesto",
    category: "conditional",
    weight: 0.1,
    icon: "glasses.svg",
    explanation:
      "Sufrir una evacuación a oscuras o en medio del barro sin visión clara incrementa drásticamente el riesgo de accidentes."
  },
  {
    id: "formula_bebe",
    name: "Fórmula infantil y biberón",
    category: "conditional",
    weight: 1.0,
    icon: "baby-bottle.svg",
    explanation:
      "Vital si en el hogar hay lactantes o niños pequeños que dependen de alimentación específica."
  },
  {
    id: "comida_mascota",
    name: "Alimento y correa de mascota",
    category: "conditional",
    weight: 1.5,
    icon: "pet-food.svg",
    explanation:
      "Las mascotas son parte de la familia. Evacuar con correa y alimento previene pérdidas o atropellamientos."
  }
];

/** Kit prearmado de la Ronda 2: arrastrar una sola bandeja suma los 6 esenciales. */
const KIT_72H = {
  id: "kit_72h",
  name: "Kit 72 horas (completo)",
  itemIds: ITEMS_DATABASE.filter((item) => item.category === "essential").map(
    (item) => item.id
  ),
  weight: ITEMS_DATABASE.filter((item) => item.category === "essential").reduce(
    (sum, item) => sum + item.weight,
    0
  )
};

const ROOMS = [
  { id: "cocina", name: "Cocina", hint: "Alacena, refrigerador y cajones" },
  { id: "sala", name: "Sala", hint: "Repisas, sofá y mueble de TV" },
  { id: "recamara", name: "Recámara", hint: "Buró, closet y escritorio" }
];

const FURNITURE = [
  {
    id: "refrigerador",
    room: "cocina",
    name: "Refrigerador",
    label: "Abrir refrigerador",
    itemIds: ["agua", "comida_mascota"]
  },
  {
    id: "alacena",
    room: "cocina",
    name: "Alacena",
    label: "Abrir alacena",
    itemIds: ["comida_latas", "formula_bebe"]
  },
  {
    id: "cajon_cocina",
    room: "cocina",
    name: "Cajón de cocina",
    label: "Abrir cajón",
    itemIds: ["botiquin"]
  },
  {
    id: "mueble_tv",
    room: "sala",
    name: "Mueble de TV",
    label: "Revisar mueble",
    itemIds: ["consola_videojuegos"]
  },
  {
    id: "repisa",
    room: "sala",
    name: "Repisa",
    label: "Revisar repisa",
    itemIds: ["adorno_pesado", "documentos_ziploc"]
  },
  {
    id: "sofa",
    room: "sala",
    name: "Sofá",
    label: "Revisar sofá",
    itemIds: ["cobija_gigante"]
  },
  {
    id: "buro",
    room: "recamara",
    name: "Buró",
    label: "Abrir buró",
    itemIds: ["linterna_radio", "inhalador_meds"]
  },
  {
    id: "closet",
    room: "recamara",
    name: "Closet",
    label: "Abrir closet",
    itemIds: ["audifonos_cancelacion", "powerbank"]
  },
  {
    id: "escritorio",
    room: "recamara",
    name: "Escritorio",
    label: "Revisar escritorio",
    itemIds: ["lentes_graduacion"]
  }
];

function getItemById(id) {
  return ITEMS_DATABASE.find((item) => item.id === id) || null;
}

function getEssentials() {
  return ITEMS_DATABASE.filter((item) => item.category === "essential");
}

function getConditionals() {
  return ITEMS_DATABASE.filter((item) => item.category === "conditional");
}

function getDistractors() {
  return ITEMS_DATABASE.filter((item) => item.category === "distractor");
}

function assetPath(fileName) {
  return `assets/${fileName}`;
}
