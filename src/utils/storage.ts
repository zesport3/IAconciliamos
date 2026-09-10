import { Empresa, Reconciliacao } from '../types';
import { DEMO_EMPRESA, DEMO_RECONCILIACAO } from '../data/seedData';

const STORAGE_KEY_EMPRESAS = 'conciliacao_empresas_local_v2';
const STORAGE_KEY_RECS_PREFIX = 'conciliacao_recs_local_v2_';
const STORAGE_KEY_ACTIVE_EMPRESA = 'conciliacao_active_empresa_v2';
const STORAGE_KEY_ACTIVE_REC = 'conciliacao_active_rec_v2';

export function getStoredEmpresas(): Empresa[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMPRESAS);
    if (!raw) {
      // Initialize with Portuguese demo company
      const initial = [DEMO_EMPRESA];
      localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(initial));
      saveStoredReconciliacao(DEMO_EMPRESA.id, DEMO_RECONCILIACAO);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [DEMO_EMPRESA];
      localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(initial));
      saveStoredReconciliacao(DEMO_EMPRESA.id, DEMO_RECONCILIACAO);
      return initial;
    }
    return parsed;
  } catch (e) {
    console.warn('Erro ao ler empresas do localStorage:', e);
    return [DEMO_EMPRESA];
  }
}

export function setStoredEmpresas(empresas: Empresa[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(empresas));
  } catch (e) {
    console.error('Erro ao guardar empresas no localStorage:', e);
  }
}

export function createStoredEmpresa(data: Omit<Empresa, 'id'>): Empresa {
  const empresas = getStoredEmpresas();
  const id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const novaEmpresa: Empresa = {
    ...data,
    id,
    normativo: 'SNC',
    moeda: 'EUR',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  const updated = [...empresas, novaEmpresa];
  setStoredEmpresas(updated);
  setActiveEmpresaId(novaEmpresa.id);
  return novaEmpresa;
}

export function updateStoredEmpresa(id: string, updates: Partial<Empresa>): Empresa | null {
  const empresas = getStoredEmpresas();
  const idx = empresas.findIndex((e) => e.id === id);
  if (idx === -1) return null;

  const updatedEmpresa: Empresa = {
    ...empresas[idx],
    ...updates,
    atualizadoEm: new Date().toISOString(),
  };

  empresas[idx] = updatedEmpresa;
  setStoredEmpresas(empresas);
  return updatedEmpresa;
}

export function deleteStoredEmpresa(id: string): void {
  const empresas = getStoredEmpresas();
  const filtered = empresas.filter((e) => e.id !== id);
  setStoredEmpresas(filtered);

  // Remove associated reconciliations
  try {
    localStorage.removeItem(`${STORAGE_KEY_RECS_PREFIX}${id}`);
  } catch (e) {
    // ignore
  }

  // Update active empresa
  const currentActive = getActiveEmpresaId();
  if (currentActive === id) {
    if (filtered.length > 0) {
      setActiveEmpresaId(filtered[0].id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_EMPRESA);
    }
  }
}

export function getStoredReconciliacoes(empresaId: string): Reconciliacao[] {
  if (!empresaId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_RECS_PREFIX}${empresaId}`);
    if (!raw) {
      if (empresaId === DEMO_EMPRESA.id) {
        saveStoredReconciliacao(empresaId, DEMO_RECONCILIACAO);
        return [DEMO_RECONCILIACAO];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    parsed.sort((a, b) => b.id.localeCompare(a.id));
    return parsed;
  } catch (e) {
    console.warn(`Erro ao ler conciliações da empresa ${empresaId}:`, e);
    return [];
  }
}

export function saveStoredReconciliacao(empresaId: string, rec: Reconciliacao): void {
  if (!empresaId || !rec || !rec.id) return;
  try {
    const list = getStoredReconciliacoes(empresaId);
    const idx = list.findIndex((r) => r.id === rec.id);

    const updatedRec: Reconciliacao = {
      ...rec,
      atualizadoEm: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updatedRec;
    } else {
      list.unshift(updatedRec);
    }

    list.sort((a, b) => b.id.localeCompare(a.id));
    localStorage.setItem(`${STORAGE_KEY_RECS_PREFIX}${empresaId}`, JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao guardar reconciliação no localStorage:', e);
  }
}

export function deleteStoredReconciliacao(empresaId: string, recId: string): void {
  if (!empresaId || !recId) return;
  try {
    const list = getStoredReconciliacoes(empresaId);
    const filtered = list.filter((r) => r.id !== recId);
    localStorage.setItem(`${STORAGE_KEY_RECS_PREFIX}${empresaId}`, JSON.stringify(filtered));
  } catch (e) {
    console.error('Erro ao eliminar reconciliação no localStorage:', e);
  }
}

export function getActiveEmpresaId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_EMPRESA);
  } catch {
    return null;
  }
}

export function setActiveEmpresaId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_EMPRESA, id);
  } catch {
    // ignore
  }
}

export function getActiveRecId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_REC);
  } catch {
    return null;
  }
}

export function setActiveRecId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_REC, id);
  } catch {
    // ignore
  }
}

export function resetAllToDemo(): { empresa: Empresa; reconciliacao: Reconciliacao } {
  const empresas = [DEMO_EMPRESA];
  setStoredEmpresas(empresas);
  saveStoredReconciliacao(DEMO_EMPRESA.id, DEMO_RECONCILIACAO);
  setActiveEmpresaId(DEMO_EMPRESA.id);
  setActiveRecId(DEMO_RECONCILIACAO.id);
  return { empresa: DEMO_EMPRESA, reconciliacao: DEMO_RECONCILIACAO };
}

export function exportBackupJson(): string {
  const empresas = getStoredEmpresas();
  const allData: { empresas: Empresa[]; reconciliacoes: Record<string, Reconciliacao[]> } = {
    empresas,
    reconciliacoes: {},
  };

  empresas.forEach((emp) => {
    allData.reconciliacoes[emp.id] = getStoredReconciliacoes(emp.id);
  });

  return JSON.stringify(allData, null, 2);
}

export function importBackupJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.empresas)) {
      return false;
    }
    setStoredEmpresas(parsed.empresas);
    if (parsed.reconciliacoes && typeof parsed.reconciliacoes === 'object') {
      Object.entries(parsed.reconciliacoes).forEach(([empId, recs]) => {
        if (Array.isArray(recs)) {
          localStorage.setItem(`${STORAGE_KEY_RECS_PREFIX}${empId}`, JSON.stringify(recs));
        }
      });
    }
    if (parsed.empresas.length > 0) {
      setActiveEmpresaId(parsed.empresas[0].id);
    }
    return true;
  } catch (e) {
    console.error('Erro ao importar backup JSON:', e);
    return false;
  }
}
