import cds from '@sap/cds';
import fs from 'node:fs';

const ROOM1 = '11111111-1111-1111-1111-111111111111';
const ROOM2 = '22222222-2222-2222-2222-222222222222';

let base = '';
let passed = 0;
let failed = 0;
const failures = [];

async function request(method, path, body, authUser) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (authUser) headers.Authorization = `Basic ${Buffer.from(`${authUser}:`).toString('base64')}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, text };
}

const val = r => (r.data && r.data.value !== undefined) ? r.data.value : r.data;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  OK   ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  FAIL ${name}\n       ${String(e.message).split('\n').slice(0, 4).join('\n       ')}`);
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'assertion failed');
};
const assertStatus = (r, status, msg) => {
  if (r.status !== status) {
    throw new Error(`${msg || ''} expected HTTP ${status}, got ${r.status}: ${JSON.stringify(r.data || r.text || '').slice(0, 300)}`);
  }
};

const idempotentDelete = async (path, body) => {
  const r = await request('POST', path, body);
  assertStatus(r, 200, `${path} ->`);
};

const FEED = '/odata/v4/feed';
const ROOMS = '/odata/v4/rooms';
const TAGS = '/odata/v4/tags';
const TOPICS = '/odata/v4/topics';
const QUESTIONS = '/odata/v4/questions';

let postID;
let commentID;
let tagID;
let questionID;
let answerID;
let documentID;
let repostID;

const main = async () => {
  cds.env.requires.db.credentials.url = 'test-feed-api.db';
  cds.env.requires.db.kind = 'sqlite';
  process.env.PORT = '0';

  fs.rmSync('test-feed-api.db', { force: true });
  const csn = await cds.load('*');
  cds.model = cds.compile.for.nodejs(csn);
  const db = await cds.connect.to('db');
  await cds.deploy(csn).to(db);

  const server = await cds.server();
  await new Promise((res, rej) => { server.once('listening', res); server.once('error', rej); });
  base = `http://localhost:${server.address().port}`;

  console.log(`\nFeed backend — tests sur ${base}\n`);

  // ============================================================
  console.log('\n── FeedService : entités ──────────────────────────');
  await test('GET /feed/Posts (expand frontend)', async () => {
    const r = await request('GET', `${FEED}/Posts?$expand=author,tags,comments($expand=author,parent($expand=author)),documents,repostOf($expand=author)&$top=2`);
    assertStatus(r, 200, 'GET Posts');
    assert(Array.isArray(r.data.value), 'value doit être un tableau');
  });
  await test('GET /feed/Posts(ID)', async () => {
    const r = await request('GET', `${FEED}/Posts(c0000000-0000-0000-0000-000000000001)`);
    assertStatus(r, 200, 'GET Posts(ID)');
  });
  await test('GET /feed/Rooms', async () => {
    const r = await request('GET', `${FEED}/Rooms`);
    assertStatus(r, 200, 'GET Rooms');
  });
  await test('GET /feed/Tags', async () => {
    const r = await request('GET', `${FEED}/Tags`);
    assertStatus(r, 200, 'GET Tags');
  });
  await test('GET /feed/UserProfiles', async () => {
    const r = await request('GET', `${FEED}/UserProfiles`);
    assertStatus(r, 200, 'GET UserProfiles');
  });
  await test('GET /feed/Topics', async () => {
    const r = await request('GET', `${FEED}/Topics`);
    assertStatus(r, 200, 'GET Topics');
  });
  await test('GET /feed/Comments', async () => {
    const r = await request('GET', `${FEED}/Comments`);
    assertStatus(r, 200, 'GET Comments');
  });
  await test('GET /feed/Likes / Dislikes / Favorites / PostDocuments / PostTags / PostReposts', async () => {
    for (const e of ['Likes', 'Dislikes', 'Favorites', 'PostDocuments', 'PostTags', 'PostReposts']) {
      const r = await request('GET', `${FEED}/${e}`);
      assertStatus(r, 200, `GET ${e}`);
    }
  });

  // ============================================================
  console.log('\n── FeedService : fonctions ────────────────────────');
  await test('getCurrentUserProfile()', async () => {
    const r = await request('GET', `${FEED}/getCurrentUserProfile()`);
    assertStatus(r, 200, 'getCurrentUserProfile');
  });
  await test('getMyShortcuts()', async () => {
    const r = await request('GET', `${FEED}/getMyShortcuts()`);
    assertStatus(r, 200, 'getMyShortcuts');
    assert('myPostsCount' in val(r), 'myPostsCount manquant');
  });
  await test('getTrendingTags()', async () => {
    const r = await request('GET', `${FEED}/getTrendingTags()`);
    assertStatus(r, 200, 'getTrendingTags');
  });
  await test('getSuggestedExperts()', async () => {
    const r = await request('GET', `${FEED}/getSuggestedExperts()`);
    assertStatus(r, 200, 'getSuggestedExperts');
  });
  await test('getFeed() sans filtre', async () => {
    const r = await request('GET', `${FEED}/getFeed(filter='',roomID=null,topicID=null,limit=5)`);
    assertStatus(r, 200, 'getFeed');
  });
  await test('getFeed() avec roomID + topicID', async () => {
    const r = await request('GET', `${FEED}/getFeed(filter='',roomID=${ROOM1},topicID=b0000000-0000-0000-0000-000000000001,limit=5)`);
    assertStatus(r, 200, 'getFeed room+topic');
  });
  await test('getFeed() avec filtre texte', async () => {
    const r = await request('GET', `${FEED}/getFeed(filter='SAP',roomID=null,topicID=null,limit=5)`);
    assertStatus(r, 200, 'getFeed filter');
  });

  // ============================================================
  console.log('\n── FeedService : création / édition / suppression ─');
  await test('POST /feed/Posts', async () => {
    const r = await request('POST', `${FEED}/Posts`, {
      title: 'Post de test backend',
      content: 'Contenu de test pour valider le backend du feed',
      type: 'knowledge',
      status: 'published'
    });
    assertStatus(r, 201, 'POST Posts');
    assert(r.data.ID, 'ID manquant');
    postID = r.data.ID;
  });
  await test('POST /feed/Posts — contenu vide rejeté (400)', async () => {
    const r = await request('POST', `${FEED}/Posts`, { content: '   ', type: 'knowledge' });
    assertStatus(r, 400, 'POST Posts vide');
  });
  await test('PATCH /feed/Posts(ID)', async () => {
    const r = await request('PATCH', `${FEED}/Posts(${postID})`, { content: 'Contenu modifié' });
    assert([200, 204].includes(r.status), `PATCH status ${r.status}`);
  });
  await test('POST /feed/Posts dans une room → postCount incrémenté', async () => {
    const r = await request('POST', `${FEED}/Posts`, {
      content: 'Post dans une room',
      type: 'knowledge',
      status: 'published',
      room_ID: ROOM1
    });
    assertStatus(r, 201, 'POST Posts room');
    await request('DELETE', `${FEED}/Posts(${r.data.ID})`);
  });
  await test('DELETE /feed/Posts(ID) → purge complète (tags, comments, likes, reposts)', async () => {
    const r = await request('POST', `${FEED}/Posts`, { content: 'Post à supprimer', type: 'knowledge', status: 'published' });
    assertStatus(r, 201, 'POST post');
    const pid = r.data.ID;
    const like = await request('POST', `${FEED}/likePost`, { postID: pid });
    const comment = await request('POST', `${FEED}/addComment`, { postID: pid, content: 'commentaire', parentID: null });
    const del = await request('DELETE', `${FEED}/Posts(${pid})`);
    assert([200, 204].includes(del.status), `DELETE status ${del.status}`);
    const gone = await request('GET', `${FEED}/Posts(${pid})`);
    assertStatus(gone, 404, 'post supprimé doit renvoyer 404');
  });

  // ============================================================
  console.log('\n── FeedService : actions sociales ────────────────');
  await test('likePost / isLikedByMe', async () => {
    const r = await request('POST', `${FEED}/Posts`, { content: 'Post likes', type: 'knowledge', status: 'published' });
    postID = r.data.ID;
    const like = await request('POST', `${FEED}/likePost`, { postID });
    assertStatus(like, 200, 'likePost');
    assert(val(like) === true, 'likePost doit renvoyer true');
    const read = await request('GET', `${FEED}/Posts(${postID})?$select=ID,isLikedByMe,likeCount`);
    assert(val(read).isLikedByMe === true, 'isLikedByMe doit être true');
  });
  await test('unlikePost', async () => {
    const r = await request('POST', `${FEED}/unlikePost`, { postID });
    assertStatus(r, 200, 'unlikePost');
  });
  await test('dislikePost / undislikePost', async () => {
    const d = await request('POST', `${FEED}/dislikePost`, { postID });
    assertStatus(d, 200, 'dislikePost');
    const u = await request('POST', `${FEED}/undislikePost`, { postID });
    assertStatus(u, 200, 'undislikePost');
  });
  await test('addComment (racine + réponse)', async () => {
    const c1 = await request('POST', `${FEED}/addComment`, { postID, content: 'Commentaire racine', parentID: null });
    assertStatus(c1, 200, 'addComment');
    assert(val(c1).ID, 'comment ID manquant');
    commentID = val(c1).ID;
    const c2 = await request('POST', `${FEED}/addComment`, { postID, content: 'Réponse imbriquée', parentID: commentID });
    assertStatus(c2, 200, 'addComment réponse');
  });
  await test('addComment — contenu vide rejeté (400)', async () => {
    const r = await request('POST', `${FEED}/addComment`, { postID, content: '  ', parentID: null });
    assertStatus(r, 400, 'addComment vide');
  });
  await test('sharePost', async () => {
    const r = await request('POST', `${FEED}/sharePost`, { postID });
    assertStatus(r, 200, 'sharePost');
  });
  await test('repostPost → crée un post lié', async () => {
    const r = await request('POST', `${FEED}/repostPost`, { postID });
    assertStatus(r, 200, 'repostPost');
    assert(val(r).ID && val(r).repostOf_ID === postID, 'repost invalide');
    repostID = val(r).ID;
  });
  await test('repostPost — idempotent', async () => {
    const r = await request('POST', `${FEED}/repostPost`, { postID });
    assertStatus(r, 200, 'repostPost (idempotent)');
    assert(val(r).ID === repostID, 'doit renvoyer le repost existant');
  });
  await test('repostPost — post inexistant (404)', async () => {
    const r = await request('POST', `${FEED}/repostPost`, { postID: '00000000-0000-0000-0000-000000000000' });
    assertStatus(r, 404, 'repostPost 404');
  });

  // ============================================================
  console.log('\n── FeedService : favoris ─────────────────────────');
  await test('addFavorite / removeFavorite', async () => {
    const add = await request('POST', `${FEED}/addFavorite`, { targetType: 'post', targetID: postID });
    assertStatus(add, 200, 'addFavorite');
    const remove = await request('POST', `${FEED}/removeFavorite`, { targetType: 'post', targetID: postID });
    assertStatus(remove, 200, 'removeFavorite');
  });

  // ============================================================
  console.log('\n── FeedService : rooms join/leave ────────────────');
  await test('joinRoom / leaveRoom', async () => {
    const join = await request('POST', `${FEED}/joinRoom`, { roomID: ROOM2 });
    assertStatus(join, 200, 'joinRoom');
    const leave = await request('POST', `${FEED}/leaveRoom`, { roomID: ROOM2 });
    assertStatus(leave, 200, 'leaveRoom');
  });

  // ============================================================
  console.log('\n── FeedService : documents ───────────────────────');
  await test('uploadDocument (base64) / deleteDocument', async () => {
    const up = await request('POST', `${FEED}/uploadDocument`, {
      postID, fileName: 'test.pdf', fileType: 'pdf', fileSize: 512,
      content: Buffer.from('Fichier de test PDF').toString('base64'), summary: 'Résumé test'
    });
    assertStatus(up, 200, 'uploadDocument');
    documentID = val(up).ID;
    assert(documentID, 'document ID manquant');
    const del = await request('POST', `${FEED}/deleteDocument`, { documentID });
    assertStatus(del, 200, 'deleteDocument');
  });
  await test('uploadDocument — type non autorisé (400)', async () => {
    const r = await request('POST', `${FEED}/uploadDocument`, {
      postID, fileName: 'malware.exe', fileType: 'exe', fileSize: 10, content: Buffer.from('x').toString('base64'), summary: null
    });
    assertStatus(r, 400, 'uploadDocument exe');
  });
  await test('summarizeDocumentWithAI — fallback sans clé', async () => {
    const r = await request('POST', `${FEED}/summarizeDocumentWithAI`, {
      apiKey: '', fileName: 'doc.txt', fileType: 'txt', content: Buffer.from('contenu').toString('base64')
    });
    assertStatus(r, 200, 'summarizeDocumentWithAI');
    assert(typeof val(r) === 'string' && val(r).length > 0, 'résumé vide');
  });

  // ============================================================
  console.log('\n── RoomsService ──────────────────────────────────');
  await test('GET /rooms/Rooms + isJoined', async () => {
    const r = await request('GET', `${ROOMS}/Rooms`);
    assertStatus(r, 200, 'GET rooms/Rooms');
    assert('isJoined' in r.data.value[0], 'isJoined manquant');
  });
  await test('GET /rooms/RoomMembers (onglet Membres)', async () => {
    const r = await request('GET', `${ROOMS}/RoomMembers`);
    assertStatus(r, 200, 'GET RoomMembers');
    assert(Array.isArray(r.data.value), 'doit être un tableau');
  });
  await test('GET /rooms/RoomMembers?$filter=room_ID eq ...', async () => {
    const r = await request('GET', `${ROOMS}/RoomMembers?$filter=room_ID eq ${ROOM1}`);
    assertStatus(r, 200, 'GET RoomMembers filtré');
  });
  await test('GET /rooms/RoomStages', async () => {
    const r = await request('GET', `${ROOMS}/RoomStages`);
    assertStatus(r, 200, 'GET RoomStages');
  });
  await test('GET /rooms/Posts + isLikedByMe', async () => {
    const r = await request('GET', `${ROOMS}/Posts?$top=1`);
    assertStatus(r, 200, 'GET rooms/Posts');
    assert('isLikedByMe' in r.data.value[0], 'isLikedByMe manquant');
  });
  await test('joinRoom / leaveRoom (rooms-service)', async () => {
    const join = await request('POST', `${ROOMS}/joinRoom`, { roomID: ROOM2 });
    assertStatus(join, 200, 'rooms joinRoom');
    const leave = await request('POST', `${ROOMS}/leaveRoom`, { roomID: ROOM2 });
    assertStatus(leave, 200, 'rooms leaveRoom');
  });
  await test('getRoomStats', async () => {
    const r = await request('GET', `${ROOMS}/getRoomStats(roomID=${ROOM1})`);
    assertStatus(r, 200, 'getRoomStats');
    assert('memberCount' in val(r), 'memberCount manquant');
  });
  await test('getMyRooms', async () => {
    const r = await request('GET', `${ROOMS}/getMyRooms()`);
    assertStatus(r, 200, 'getMyRooms');
  });
  await test('changePostStage + getStageHistory', async () => {
    const stageID = 'e0000000-0000-0000-0000-000000000001';
    const r = await request('POST', `${ROOMS}/changePostStage`, { postID, stageID, comment: 'test stage' });
    assertStatus(r, 200, 'changePostStage');
    const hist = await request('GET', `${ROOMS}/getStageHistory(postID=${postID})`);
    assertStatus(hist, 200, 'getStageHistory');
    assert(val(hist).length >= 1, 'historique vide');
  });
  await test('createStage / updateStage / deleteStage', async () => {
    const create = await request('POST', `${ROOMS}/createStage`, {
      roomID: ROOM1, name: 'Stage test', color: '#123456', icon: 'sap-icon://tag', order: 9, isDefault: false
    });
    assertStatus(create, 200, 'createStage');
    const sid = val(create).ID;
    assert(sid, 'stage ID manquant');
    const upd = await request('POST', `${ROOMS}/updateStage`, { stageID: sid, name: 'Stage test 2', color: '#654321', icon: 'sap-icon://tag', order: 9 });
    assertStatus(upd, 200, 'updateStage');
    const del = await request('POST', `${ROOMS}/deleteStage`, { stageID: sid });
    assertStatus(del, 200, 'deleteStage');
  });
  await test('inviteMember / removeMember / updateMemberRole', async () => {
    const invite = await request('POST', `${ROOMS}/inviteMember`, { roomID: ROOM1, userID: 'test.invite.user' });
    assertStatus(invite, 200, 'inviteMember');
    const members = await request('GET', `${ROOMS}/RoomMembers?$filter=room_ID eq ${ROOM1} and userID eq 'test.invite.user'`);
    assert(members.data.value.length === 1, 'membre invité introuvable');
    const memberID = members.data.value[0].ID;
    const role = await request('POST', `${ROOMS}/updateMemberRole`, { memberID, role: 'admin' });
    assertStatus(role, 200, 'updateMemberRole');
    const rm = await request('POST', `${ROOMS}/removeMember`, { roomID: ROOM1, memberID });
    assertStatus(rm, 200, 'removeMember');
  });

  // ============================================================
  console.log('\n── TagsService ───────────────────────────────────');
  await test('GET /tags/Tags?$top=3', async () => {
    const r = await request('GET', `${TAGS}/Tags?$top=3`);
    assertStatus(r, 200, 'GET Tags');
  });
  await test('GET /tags/PostTags (utilisé par _replacePostTags)', async () => {
    const r = await request('GET', `${TAGS}/PostTags?$filter=post_ID eq ${postID}`);
    assertStatus(r, 200, 'GET PostTags');
  });
  await test('createTag / updateTag / searchTags / getTagStats', async () => {
    const create = await request('POST', `${TAGS}/createTag`, { name: 'TEST-SUITE', color: '#FF0000', icon: '', description: 'tag de test' });
    assertStatus(create, 200, 'createTag');
    tagID = val(create).ID;
    assert(tagID, 'tag ID manquant');
    const upd = await request('POST', `${TAGS}/updateTag`, { tagID, name: 'TEST-SUITE-2', color: '#00FF00', icon: '', description: 'modifié' });
    assertStatus(upd, 200, 'updateTag');
    const search = await request('GET', `${TAGS}/searchTags(query='TEST-SUITE-2')`);
    assertStatus(search, 200, 'searchTags');
    const stats = await request('GET', `${TAGS}/getTagStats(tagID=${tagID})`);
    assertStatus(stats, 200, 'getTagStats');
  });
  await test('createTag — doublon rejeté (409)', async () => {
    const r = await request('POST', `${TAGS}/createTag`, { name: 'TEST-SUITE-2', color: '#FF0000', icon: '', description: '' });
    assertStatus(r, 409, 'createTag doublon');
  });
  await test('addTagToPost / removeTagFromPost', async () => {
    const add = await request('POST', `${TAGS}/addTagToPost`, { tagID, postID });
    assertStatus(add, 200, 'addTagToPost');
    const remove = await request('POST', `${TAGS}/removeTagFromPost`, { tagID, postID });
    assertStatus(remove, 200, 'removeTagFromPost');
  });
  await test('getTrendingTags(limit=3)', async () => {
    const r = await request('GET', `${TAGS}/getTrendingTags(limit=3)`);
    assertStatus(r, 200, 'getTrendingTags');
  });
  await test('mergeTags', async () => {
    const t2 = await request('POST', `${TAGS}/createTag`, { name: 'TEST-MERGE-SRC', color: '#123456', icon: '', description: '' });
    const srcID = val(t2).ID;
    const merge = await request('POST', `${TAGS}/mergeTags`, { sourceTagID: srcID, targetTagID: tagID });
    assertStatus(merge, 200, 'mergeTags');
  });
  await test('deleteTag', async () => {
    const r = await request('POST', `${TAGS}/deleteTag`, { tagID });
    assertStatus(r, 200, 'deleteTag');
  });

  // ============================================================
  console.log('\n── TopicsService ─────────────────────────────────');
  await test('GET /topics/Topics', async () => {
    const r = await request('GET', `${TOPICS}/Topics`);
    assertStatus(r, 200, 'GET Topics');
  });
  await test('getPopularTopics / getTopicStats', async () => {
    const r = await request('GET', `${TOPICS}/getPopularTopics(limit=3)`);
    assertStatus(r, 200, 'getPopularTopics');
    const s = await request('GET', `${TOPICS}/getTopicStats(topicID=b0000000-0000-0000-0000-000000000001)`);
    assertStatus(s, 200, 'getTopicStats');
  });
  await test('createTopic / addTopicToPost / removeTopicFromPost / deleteTopic', async () => {
    const create = await request('POST', `${TOPICS}/createTopic`, { name: 'Topic test', description: 'desc', color: '#111111', icon: 'sap-icon://tag' });
    assertStatus(create, 200, 'createTopic');
    const topicID = val(create).ID;
    const add = await request('POST', `${TOPICS}/addTopicToPost`, { topicID, postID });
    assertStatus(add, 200, 'addTopicToPost');
    const remove = await request('POST', `${TOPICS}/removeTopicFromPost`, { topicID, postID });
    assertStatus(remove, 200, 'removeTopicFromPost');
    const del = await request('POST', `${TOPICS}/deleteTopic`, { topicID });
    assertStatus(del, 200, 'deleteTopic');
  });

  // ============================================================
  console.log('\n── QuestionsService ──────────────────────────────');
  await test('GET /questions/Questions?$top=1&$expand=author,answers', async () => {
    const r = await request('GET', `${QUESTIONS}/Questions?$top=1&$expand=author,answers`);
    assertStatus(r, 200, 'GET Questions expand');
  });
  await test('GET /questions/Questions (liste + $filter)', async () => {
    const r = await request('GET', `${QUESTIONS}/Questions?$filter=status eq 'open'&$top=2`);
    assertStatus(r, 200, 'GET Questions filter');
  });
  await test('POST /questions/Questions (CRUD direct)', async () => {
    const r = await request('POST', `${QUESTIONS}/Questions`, {
      title: 'Question CRUD direct', content: 'Contenu CRUD', status: 'open'
    });
    assertStatus(r, 201, 'POST Questions');
    questionID = r.data.ID;
    const del = await request('DELETE', `${QUESTIONS}/Questions(${questionID})`);
    assert([200, 204].includes(del.status), `DELETE Questions status ${del.status}`);
  });
  await test('createQuestion', async () => {
    const r = await request('POST', `${QUESTIONS}/createQuestion`, {
      title: 'Question de test backend', content: 'Contenu question test', roomID: null, tagIDs: [], topicIDs: []
    });
    assertStatus(r, 200, 'createQuestion');
    questionID = val(r).ID;
  });
  await test('createQuestion — titre vide rejeté (400)', async () => {
    const r = await request('POST', `${QUESTIONS}/createQuestion`, {
      title: '', content: 'contenu', roomID: null, tagIDs: [], topicIDs: []
    });
    assertStatus(r, 400, 'createQuestion titre vide');
  });
  await test('updateQuestion / closeQuestion / reopenQuestion', async () => {
    const upd = await request('POST', `${QUESTIONS}/updateQuestion`, { questionID, title: 'Titre modifié', content: 'Contenu modifié' });
    assertStatus(upd, 200, 'updateQuestion');
    const close = await request('POST', `${QUESTIONS}/closeQuestion`, { questionID });
    assertStatus(close, 200, 'closeQuestion');
    const reopen = await request('POST', `${QUESTIONS}/reopenQuestion`, { questionID });
    assertStatus(reopen, 200, 'reopenQuestion');
  });
  await test('createAnswer / updateAnswer / acceptAnswer / voteAnswer / cancelVoteAnswer', async () => {
    const a = await request('POST', `${QUESTIONS}/createAnswer`, { questionID, content: 'Réponse de test backend' });
    assertStatus(a, 200, 'createAnswer');
    answerID = val(a).ID;
    const self = await request('POST', `${QUESTIONS}/voteAnswer`, { answerID, value: 1 });
    assertStatus(self, 400, 'auto-vote réponse doit être rejeté');
    const vote = await request('POST', `${QUESTIONS}/voteAnswer`, { answerID, value: 1 }, 'karim.ben.salah');
    assertStatus(vote, 200, 'voteAnswer');
    const cancel = await request('POST', `${QUESTIONS}/cancelVoteAnswer`, { answerID }, 'karim.ben.salah');
    assertStatus(cancel, 200, 'cancelVoteAnswer');
    const upd = await request('POST', `${QUESTIONS}/updateAnswer`, { answerID, content: 'Réponse modifiée' });
    assertStatus(upd, 200, 'updateAnswer');
    const accept = await request('POST', `${QUESTIONS}/acceptAnswer`, { questionID, answerID });
    assertStatus(accept, 200, 'acceptAnswer');
  });
  await test('voteQuestion / cancelVoteQuestion', async () => {
    const self = await request('POST', `${QUESTIONS}/voteQuestion`, { questionID, value: 1 });
    assertStatus(self, 400, 'auto-vote question doit être rejeté');
    const v = await request('POST', `${QUESTIONS}/voteQuestion`, { questionID, value: 1 }, 'karim.ben.salah');
    assertStatus(v, 200, 'voteQuestion');
    const c = await request('POST', `${QUESTIONS}/cancelVoteQuestion`, { questionID }, 'karim.ben.salah');
    assertStatus(c, 200, 'cancelVoteQuestion');
  });
  await test('addCommentToQuestion / addCommentToAnswer / deleteComment', async () => {
    const c1 = await request('POST', `${QUESTIONS}/addCommentToQuestion`, { questionID, content: 'commentaire question' });
    assertStatus(c1, 200, 'addCommentToQuestion');
    const c2 = await request('POST', `${QUESTIONS}/addCommentToAnswer`, { answerID, content: 'commentaire réponse' });
    assertStatus(c2, 200, 'addCommentToAnswer');
  });
  await test('searchQuestions (avec filtre texte et tri)', async () => {
    const r = await request('GET', `${QUESTIONS}/searchQuestions(query='SAP',tagID=null,topicID=null,roomID=null,status=null,sortBy='newest',limit=5,skip=0)`);
    assertStatus(r, 200, 'searchQuestions');
    assert(Array.isArray(val(r)), 'doit être un tableau');
  });
  await test('searchQuestions (avec statut + room)', async () => {
    const r = await request('GET', `${QUESTIONS}/searchQuestions(query='',tagID=null,topicID=null,roomID=${ROOM1},status='open',sortBy='votes',limit=5,skip=0)`);
    assertStatus(r, 200, 'searchQuestions status');
  });
  await test('getRelatedQuestions / getMyQuestions', async () => {
    const rel = await request('GET', `${QUESTIONS}/getRelatedQuestions(questionID=${questionID},limit=3)`);
    assertStatus(rel, 200, 'getRelatedQuestions');
    const mine = await request('GET', `${QUESTIONS}/getMyQuestions()`);
    assertStatus(mine, 200, 'getMyQuestions');
  });
  await test('deleteAnswer / deleteQuestion (cleanup)', async () => {
    const dA = await request('POST', `${QUESTIONS}/deleteAnswer`, { answerID });
    assertStatus(dA, 200, 'deleteAnswer');
    const dQ = await request('POST', `${QUESTIONS}/deleteQuestion`, { questionID });
    assertStatus(dQ, 200, 'deleteQuestion');
  });
  await test('resolveQuestion', async () => {
    const r = await request('POST', `${QUESTIONS}/createQuestion`, {
      title: 'Question résolution', content: 'contenu', roomID: null, tagIDs: [], topicIDs: []
    });
    const qid = val(r).ID;
    const res = await request('POST', `${QUESTIONS}/resolveQuestion`, { questionID: qid });
    assertStatus(res, 200, 'resolveQuestion');
    await request('POST', `${QUESTIONS}/deleteQuestion`, { questionID: qid });
  });

  // ============================================================
  console.log('\n── Nettoyage du post de test ─────────────────────');
  await idempotentDelete(`${FEED}/repostPost`, { postID }); // no-op if already exists
  const delPost = await request('DELETE', `${FEED}/Posts(${postID})`);
  assert([200, 204].includes(delPost.status), `DELETE post final status ${delPost.status}`);

  console.log('\n════════════════════════════════════════════════════');
  console.log(`RÉSULTATS : ${passed} OK, ${failed} ECHECS`);
  if (failed > 0) {
    console.log('\nÉchecs :');
    failures.forEach(f => console.log(`  ✗ ${f.name}\n    ${f.error}`));
  }
  console.log('════════════════════════════════════════════════════');

  server.close();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(e => {
  console.error('FATAL', e.message, e.stack);
  process.exit(1);
});
