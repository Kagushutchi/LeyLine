<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content suscriptor-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">
          {{ isEditing ? 'Modificar Suscriptor' : 'Nuevo Suscriptor' }}
        </h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="nombre">Nombre *</label>
              <input
                id="nombre"
                v-model="formData.nombre"
                type="text"
                placeholder="Ej. Valeria"
                required
              />
            </div>
            <div class="form-group">
              <label for="apellido">Apellido</label>
              <input
                id="apellido"
                v-model="formData.apellido"
                type="text"
                placeholder="Ej. Rossi"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="email">Email *</label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                placeholder="valeria@ejemplo.com"
                required
              />
            </div>
            <div class="form-group">
              <label for="telefono">Teléfono</label>
              <input
                id="telefono"
                v-model="formData.telefono"
                type="tel"
                placeholder="+54 11 4567-8900"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="documento">Documento / CUIT</label>
            <input
              id="documento"
              v-model="formData.documento"
              type="text"
              placeholder="DNI o CUIT"
            />
          </div>

          <div class="section-divider">
            <span class="section-title">Dirección de Entrega</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="calle">Calle</label>
              <input
                id="calle"
                v-model="formData.direccion.calle"
                type="text"
                placeholder="Av. Santa Fe"
              />
            </div>
            <div class="form-group">
              <label for="numero">Número / Piso / Depto</label>
              <input
                id="numero"
                v-model="formData.direccion.numero"
                type="text"
                placeholder="1420 4to B"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ciudad">Ciudad</label>
              <input
                id="ciudad"
                v-model="formData.direccion.ciudad"
                type="text"
                placeholder="Buenos Aires"
              />
            </div>
            <div class="form-group">
              <label for="provincia">Provincia</label>
              <input
                id="provincia"
                v-model="formData.direccion.provincia"
                type="text"
                placeholder="CABA"
              />
            </div>
          </div>

          <div class="section-divider">
            <span class="section-title">Preferencias Organolépticas</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="prefCategoria">Club de Nicho *</label>
              <select id="prefCategoria" v-model="formData.preferenciasOrganolepticas.categoria" required>
                <option value="vinos">Club de Vinos</option>
                <option value="cafes">Club de Café de Especialidad</option>
                <option value="cervezas">Club de Cervezas Artesanales</option>
              </select>
            </div>
            <div class="form-group">
              <label for="intensidad">Intensidad Preferida</label>
              <select id="intensidad" v-model="formData.preferenciasOrganolepticas.intensidad">
                <option value="Suave">Suave / Equilibrada</option>
                <option value="Media">Media / Con Carácter</option>
                <option value="Intensa">Intensa / Robusta</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="perfilSabor">Perfil de Sabor (separados por coma)</label>
            <input
              id="perfilSabor"
              v-model="perfilSaborInput"
              type="text"
              placeholder="Ej. Frutos rojos, Madera, Floral, Cítrico"
            />
            <span class="form-hint">Escribe notas de cata preferidas separadas por coma.</span>
          </div>

          <div class="form-group">
            <label for="alergias">Alergias o Restricciones</label>
            <input
              id="alergias"
              v-model="alergiasInput"
              type="text"
              placeholder="Ej. Sulfitos, Gluten, Frutos secos"
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="formData.activo" type="checkbox" />
              <span>Suscriptor Activo</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { SuscriptorDTO } from '../services/suscriptores.service';

const props = defineProps<{
  isOpen: boolean;
  suscriptor?: SuscriptorDTO | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: Partial<SuscriptorDTO>): void;
}>();

const isEditing = ref(false);
const errorMessage = ref('');
const perfilSaborInput = ref('');
const alergiasInput = ref('');

const formData = reactive({
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  documento: '',
  activo: true,
  direccion: {
    calle: '',
    numero: '',
    ciudad: '',
    provincia: '',
    pais: 'Argentina',
  },
  preferenciasOrganolepticas: {
    categoria: 'vinos',
    perfilSabor: [] as string[],
    intensidad: 'Media',
    alergiasRestricciones: [] as string[],
    notasAdicionales: '',
  },
});

watch(
  () => props.suscriptor,
  (newVal) => {
    if (newVal) {
      isEditing.value = true;
      formData.nombre = newVal.nombre || '';
      formData.apellido = newVal.apellido || '';
      formData.email = newVal.email || '';
      formData.telefono = newVal.telefono || '';
      formData.documento = newVal.documento || '';
      formData.activo = newVal.activo !== false;
      formData.direccion = {
        calle: newVal.direccion?.calle || '',
        numero: newVal.direccion?.numero || '',
        ciudad: newVal.direccion?.ciudad || '',
        provincia: newVal.direccion?.provincia || '',
        pais: newVal.direccion?.pais || 'Argentina',
      };
      formData.preferenciasOrganolepticas = {
        categoria: newVal.preferenciasOrganolepticas?.categoria || 'vinos',
        perfilSabor: newVal.preferenciasOrganolepticas?.perfilSabor || [],
        intensidad: newVal.preferenciasOrganolepticas?.intensidad || 'Media',
        alergiasRestricciones: newVal.preferenciasOrganolepticas?.alergiasRestricciones || [],
        notasAdicionales: newVal.preferenciasOrganolepticas?.notasAdicionales || '',
      };
      perfilSaborInput.value = (newVal.preferenciasOrganolepticas?.perfilSabor || []).join(', ');
      alergiasInput.value = (newVal.preferenciasOrganolepticas?.alergiasRestricciones || []).join(', ');
    } else {
      isEditing.value = false;
      formData.nombre = '';
      formData.apellido = '';
      formData.email = '';
      formData.telefono = '';
      formData.documento = '';
      formData.activo = true;
      formData.direccion = {
        calle: '',
        numero: '',
        ciudad: '',
        provincia: '',
        pais: 'Argentina',
      };
      formData.preferenciasOrganolepticas = {
        categoria: 'vinos',
        perfilSabor: [],
        intensidad: 'Media',
        alergiasRestricciones: [],
        notasAdicionales: '',
      };
      perfilSaborInput.value = '';
      alergiasInput.value = '';
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const close = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!formData.nombre.trim() || !formData.email.trim()) {
    errorMessage.value = 'El nombre y el email son obligatorios.';
    return;
  }

  const perfilArray = perfilSaborInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const alergiasArray = alergiasInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload: Partial<SuscriptorDTO> = {
    nombre: formData.nombre.trim(),
    apellido: formData.apellido.trim() || undefined,
    email: formData.email.trim(),
    telefono: formData.telefono.trim() || undefined,
    documento: formData.documento.trim() || undefined,
    activo: formData.activo,
    direccion: formData.direccion,
    preferenciasOrganolepticas: {
      ...formData.preferenciasOrganolepticas,
      perfilSabor: perfilArray,
      alergiasRestricciones: alergiasArray,
    },
  };

  emit('save', payload);
};
</script>

<style scoped>
.suscriptor-modal {
  max-width: 680px;
}

.section-divider {
  margin: 1.5rem 0 1rem 0;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-dark);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.checkbox-group {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  accent-color: var(--color-dark);
}
</style>
