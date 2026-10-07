export function createCharacterSelection(storage = globalThis.localStorage) {
  const key = userId => 'us:active-character:' + userId;
  const owned = (userId, characters) => userId ? characters.filter(c => c.user_id === userId) : [];
  function remember(userId, id) { try { storage?.setItem(key(userId), id); } catch {} }
  function resolve(userId, characters, current = '') {
    const list = owned(userId, characters);
    if (!list.length) return '';
    let saved = '';
    try { saved = storage?.getItem(key(userId)) || ''; } catch {}
    const selected = [current, saved].find(id => list.some(c => c.id === id)) || list[0].id;
    remember(userId, selected);
    return selected;
  }
  function select(userId, characters, id) {
    if (!owned(userId, characters).some(c => c.id === id)) throw Error('내 캐릭터만 선택할 수 있습니다.');
    remember(userId, id);
    return id;
  }
  return {resolve, select};
}
