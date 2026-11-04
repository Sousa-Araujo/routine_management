from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.audit import log_audit
from backend.constants import PERFIS_TIPO, TIPO_LABELS
from backend.models import AtividadeCatalogo, PerfilAtividade, Usuario
from backend.extensions import db

perfis_atividades_bp = Blueprint('perfis_atividades', __name__)


def get_current_user():
    uid = int(get_jwt_identity())
    return Usuario.query.get_or_404(uid)


@perfis_atividades_bp.route('/', methods=['GET'])
@jwt_required()
def listar():
    me = get_current_user()
    if me.perfil != 'admin':
        return jsonify({'erro': 'Acesso negado'}), 403

    atribuicoes = {}
    for pa in PerfilAtividade.query.all():
        atribuicoes.setdefault(pa.perfil_tipo, []).append(pa.atividade_id)

    return jsonify([
        {
            'tipo': tipo,
            'label': TIPO_LABELS.get(tipo, tipo),
            'atividade_ids': sorted(atribuicoes.get(tipo, [])),
        }
        for tipo in PERFIS_TIPO
    ])


@perfis_atividades_bp.route('/<tipo>', methods=['PUT'])
@jwt_required()
def atualizar(tipo):
    me = get_current_user()
    if me.perfil != 'admin':
        return jsonify({'erro': 'Acesso negado'}), 403
    if tipo not in PERFIS_TIPO:
        return jsonify({'erro': 'Tipo de perfil inválido'}), 400

    data = request.get_json() or {}
    ids = data.get('atividade_ids')
    if not isinstance(ids, list):
        return jsonify({'erro': 'Informe atividade_ids'}), 400
    try:
        ids = sorted({int(i) for i in ids})
    except (TypeError, ValueError):
        return jsonify({'erro': 'atividade_ids deve ser uma lista de números'}), 400

    validos = {a.id for a in AtividadeCatalogo.query.filter(AtividadeCatalogo.id.in_(ids)).all()} if ids else set()
    if len(validos) != len(ids):
        return jsonify({'erro': 'Atividade inválida na seleção'}), 400

    antes = sorted(pa.atividade_id for pa in PerfilAtividade.query.filter_by(perfil_tipo=tipo).all())
    PerfilAtividade.query.filter_by(perfil_tipo=tipo).delete()
    for aid in ids:
        db.session.add(PerfilAtividade(perfil_tipo=tipo, atividade_id=aid))

    if antes != ids:
        log_audit(me.id, 'perfil_atividades', tipo, 'atualizar', {'atividade_ids': {'antes': antes, 'depois': ids}})
    db.session.commit()

    return jsonify({'tipo': tipo, 'label': TIPO_LABELS.get(tipo, tipo), 'atividade_ids': ids})
