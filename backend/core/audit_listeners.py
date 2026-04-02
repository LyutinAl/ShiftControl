from sqlalchemy import event, inspect as sa_inspect
from sqlalchemy.orm import Session

from core.audit_context import current_user_id


def _serialize(value) -> object:
    """Приводим значения к JSON-сериализуемому виду."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):   # datetime
        return value.isoformat()
    if hasattr(value, "value"):       # Enum
        return value.value
    return value


def _instance_dict(instance) -> dict:
    """Все колонки объекта в виде словаря."""
    return {
        c.key: _serialize(getattr(instance, c.key))
        for c in sa_inspect(instance).mapper.column_attrs
    }


def _get_changes(instance) -> tuple[dict, dict]:
    """Возвращает (old_values, new_values) — только изменённые поля."""
    old, new = {}, {}
    for attr in sa_inspect(instance).attrs:
        history = attr.load_history()
        if history.has_changes():
            old[attr.key] = _serialize(history.deleted[0] if history.deleted else None)
            new[attr.key] = _serialize(history.added[0] if history.added else None)
    return old, new


@event.listens_for(Session, "before_flush")
def capture_changes(session, flush_context, instances):
    """
    Перехватываем изменения ДО flush — в этот момент атрибуты ещё содержат историю.
    Новые объекты (session.new) не имеют id — сохраняем ссылку, id получим позже.
    """
    if not hasattr(session, "_audit_queue"):
        session._audit_queue = []

    user_id = current_user_id.get()

    for obj in session.new:
        if getattr(obj.__class__, "__audit_skip__", False):
            continue
        # entity_id пока неизвестен — запомним ссылку на объект
        session._audit_queue.append({
            "user_id": user_id,
            "action": "create",
            "entity_type": obj.__tablename__,
            "obj_ref": obj,      # после flush у него появится id
            "entity_id": None,
            "old_value": None,
            "new_value": None,   # заполним после flush
        })

    for obj in session.dirty:
        if getattr(obj.__class__, "__audit_skip__", False):
            continue
        if not session.is_modified(obj):
            continue
        old, new = _get_changes(obj)
        if not old:
            continue
        session._audit_queue.append({
            "user_id": user_id,
            "action": "update",
            "entity_type": obj.__tablename__,
            "obj_ref": None,
            "entity_id": obj.id,
            "old_value": old,
            "new_value": new,
        })

    for obj in session.deleted:
        if getattr(obj.__class__, "__audit_skip__", False):
            continue
        session._audit_queue.append({
            "user_id": user_id,
            "action": "delete",
            "entity_type": obj.__tablename__,
            "obj_ref": None,
            "entity_id": obj.id,
            "old_value": _instance_dict(obj),
            "new_value": None,
        })


@event.listens_for(Session, "after_flush_postexec")
def write_audit_entries(session, flush_context):
    """
    После flush id уже присвоены — создаём AuditLog записи.
    Очередь очищаем ДО добавления в сессию, чтобы не войти в рекурсию:
    AuditLog.add → следующий flush → before_flush → queue пустой → выход.
    """
    from models.audit_log import AuditLog, ActionType

    if not getattr(session, "_audit_queue", None):
        return

    queue = session._audit_queue
    session._audit_queue = []  # очищаем до session.add()

    for entry in queue:
        obj_ref = entry["obj_ref"]
        entity_id = obj_ref.id if obj_ref is not None else entry["entity_id"]
        new_value = _instance_dict(obj_ref) if obj_ref is not None else entry["new_value"]

        session.add(AuditLog(
            user_id=entry["user_id"],
            action_type=ActionType(entry["action"]),
            entity_type=entry["entity_type"],
            entity_id=entity_id,
            old_value=entry["old_value"],
            new_value=new_value,
        ))
