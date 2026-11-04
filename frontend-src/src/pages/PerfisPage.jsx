import { useState, useEffect, useCallback, useMemo } from 'react';
import { ListChecks, Check } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { PeriodoBadge, PerfilBadge } from '../components/ui/Badge';
import { PERFIL_LABELS, PERIODO_LABELS } from '../utils/constants';

export default function PerfisPage() {
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [tipoAtivo, setTipoAtivo] = useState(null);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rTipos, rAtividades] = await Promise.all([
      apiFetch('/api/perfis-atividades/'),
      apiFetch('/api/atividades/?ativo=true'),
    ]);
    if (rTipos?.ok) {
      setTipos(rTipos.data);
      setTipoAtivo(prev => prev || rTipos.data[0]?.tipo || null);
    }
    if (rAtividades?.ok) setAtividades(rAtividades.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tipoAtual = useMemo(() => tipos.find(t => t.tipo === tipoAtivo), [tipos, tipoAtivo]);

  useEffect(() => {
    setSelecionadas(new Set(tipoAtual?.atividade_ids || []));
  }, [tipoAtual]);

  const dirty = useMemo(() => {
    if (!tipoAtual) return false;
    const salvas = new Set(tipoAtual.atividade_ids || []);
    if (salvas.size !== selecionadas.size) return true;
    for (const id of selecionadas) if (!salvas.has(id)) return true;
    return false;
  }, [tipoAtual, selecionadas]);

  const selecionarTipo = (tipo) => {
    if (tipo === tipoAtivo) return;
    if (dirty && !confirm('Há alterações não salvas neste perfil. Descartar e trocar de perfil?')) return;
    setTipoAtivo(tipo);
  };

  const toggle = (id) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const salvar = async () => {
    if (!tipoAtivo) return;
    setSaving(true);
    const atividade_ids = Array.from(selecionadas);
    const r = await apiFetch(`/api/perfis-atividades/${encodeURIComponent(tipoAtivo)}`, {
      method: 'PUT',
      body: JSON.stringify({ atividade_ids }),
    });
    if (r?.ok) {
      toast('Atividades do perfil atualizadas!', 'success');
      setTipos(prev => prev.map(t => t.tipo === tipoAtivo ? { ...t, atividade_ids } : t));
    } else {
      toast(r?.data?.erro || 'Erro ao salvar', 'error');
    }
    setSaving(false);
  };

  const atividadesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return atividades;
    return atividades.filter(a => a.nome.toLowerCase().includes(termo));
  }, [atividades, busca]);

  const gruposPorPerfil = useMemo(() => {
    const grupos = {};
    for (const a of atividadesFiltradas) {
      (grupos[a.perfil] ||= []).push(a);
    }
    return Object.entries(grupos).sort(([a], [b]) => (PERFIL_LABELS[a] || a).localeCompare(PERFIL_LABELS[b] || b));
  }, [atividadesFiltradas]);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        Escolha um tipo de perfil e marque, na lista completa de atividades do catálogo, quais rotinas ele deve receber.
        As rotinas dos usuários são geradas de acordo com esta configuração.
      </div>

      <div className="flex flex-wrap gap-2">
        {tipos.map(t => (
          <button
            key={t.tipo}
            onClick={() => selecionarTipo(t.tipo)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              t.tipo === tipoAtivo
                ? 'bg-primary-600 text-white border-transparent shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 ${t.tipo === tipoAtivo ? 'text-primary-100' : 'text-gray-400'}`}>
              ({(t.atividade_ids || []).length})
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Atividades de {tipoAtual?.label || '—'}
            {dirty && <span className="ml-2 text-xs font-normal text-warning-dark">(alterações não salvas)</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{selecionadas.size} selecionada(s)</span>
            <Button onClick={salvar} loading={saving} disabled={!dirty}>Salvar</Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            placeholder="Buscar atividade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          {gruposPorPerfil.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center">Nenhuma atividade encontrada.</div>
          ) : (
            <div className="space-y-5">
              {gruposPorPerfil.map(([perfilBase, lista]) => (
                <div key={perfilBase}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Catálogo de {PERFIL_LABELS[perfilBase] || perfilBase}
                  </div>
                  <div className="space-y-1.5">
                    {lista.map(a => {
                      const marcada = selecionadas.has(a.id);
                      return (
                        <label
                          key={a.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            marcada ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            marcada ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                          }`}>
                            {marcada && <Check size={12} className="text-white" />}
                          </span>
                          <input type="checkbox" checked={marcada} onChange={() => toggle(a.id)} className="hidden" />
                          <span className="flex-1 text-sm text-gray-800">{a.nome}</span>
                          <PeriodoBadge periodo={a.periodicidade} label={PERIODO_LABELS[a.periodicidade]} />
                          <PerfilBadge perfil={a.perfil} label={PERFIL_LABELS[a.perfil] || a.perfil} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {tipos.length === 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
              <ListChecks size={28} />
              <span className="text-sm">Nenhum tipo de perfil configurável encontrado.</span>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
