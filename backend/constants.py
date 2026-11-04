PERFIS_USUARIO = {'admin', 'sr', 'gv', 'cd', 'sp'}
PERFIS_ATIVIDADE = {'sr', 'gv', 'cd', 'sp'}

# Perfis que podem ser combinados (até 3 por usuário). Administrador e
# Superintendente são sempre perfil ÚNICO e nunca entram em combinação.
PERFIS_COMBINAVEIS = {'gv', 'cd', 'sp'}

# ── Tipos de perfil (perfil único ou função acumulada) ──────────────────────
# Cada usuário tem 1 a 3 perfis (ver `Usuario.perfis_list`). O "tipo de
# perfil" dele é a chave usada para buscar, em PerfilAtividade, quais
# atividades do catálogo lhe pertencem — configurável pelo admin na tela de
# Perfis (abre a lista inteira de atividades e marca as que valem para cada
# tipo). Perfil único usa o próprio código; 2+ perfis combináveis (gv/cd/sp)
# usam os códigos combinados, ordenados alfabeticamente e unidos por "+".
PERFIS_TIPO = ['gv', 'cd', 'sp', 'sr', 'cd+gv', 'gv+sp', 'cd+sp', 'cd+gv+sp']

TIPO_LABELS = {
    'gv': 'Gerente',
    'cd': 'Coordenador',
    'sp': 'Supervisor',
    'sr': 'Superintendente',
    'cd+gv': 'Gerente + Coordenador',
    'gv+sp': 'Gerente + Supervisor',
    'cd+sp': 'Coordenador + Supervisor',
    'cd+gv+sp': 'Gerente + Coordenador + Supervisor',
}


def perfil_tipo_key(perfis):
    """Chave canônica de PerfilAtividade para a lista de perfis de um usuário
    (`usuario.perfis_list`). Perfis combináveis (gv/cd/sp) acumulados (2 ou
    mais) formam uma chave composta; perfil único — incluindo sr — usa o
    próprio código. None para admin ou lista vazia (não gera rotina)."""
    combinaveis = sorted({p for p in (perfis or []) if p in PERFIS_COMBINAVEIS})
    if len(combinaveis) >= 2:
        return '+'.join(combinaveis)
    unicos = [p for p in (perfis or []) if p and p != 'admin']
    return unicos[0] if unicos else None

# Atividades que NÃO passam pelo fluxo de aprovação do Superintendente: ao serem
# concluídas pelo responsável, já são consideradas finalizadas (aprovadas
# automaticamente). Comparação por nome normalizado (sem acentos, minúsculo).
ATIVIDADES_SEM_APROVACAO = {
    'checklist de abertura do stand',
}


def normalizar_nome_atividade(nome):
    """Normaliza o nome da atividade para comparação: minúsculo, sem acentos e
    sem espaços nas pontas."""
    import unicodedata
    if not nome:
        return ''
    texto = unicodedata.normalize('NFKD', nome)
    texto = ''.join(c for c in texto if not unicodedata.combining(c))
    return texto.strip().lower()


def atividade_requer_aprovacao(nome):
    """Retorna False se a atividade for isenta do fluxo de aprovação."""
    return normalizar_nome_atividade(nome) not in ATIVIDADES_SEM_APROVACAO

PERFIL_LABELS = {
    'admin': 'Administrador',
    'sr': 'Superintendente',
    'gv': 'Gerente de Vendas',
    'cd': 'Coordenador de Produto',
    'sp': 'Supervisor de Parceria',
}
