/* -------------------------------------------- */
/*  Author: @aMediocreDad                       */
/* -------------------------------------------- */
import semverComp from '@utils/semver-compare';

const SYSTEM_NAME = 't2k4e';

export default async function displayMessages() {
  const messages = await fetch(`systems/${SYSTEM_NAME}/assets/messages/messages.jsonc`)
    .then(resp => resp.text())
    .then(jsonc => JSON.parse(stripJSON(jsonc)));

  messages.forEach(message => {
    handleDisplay(message);
  });
}

const stripJSON = data => {
  return data.replace(/[^:]\/\/(.*)/g, '');
};

const handleDisplay = msg => {
  const { content, title, type } = msg;
  if (!isCurrent(msg)) return;
  if (type === 'prompt') return displayPrompt(title, content);
  if (type === 'chat') return sendToChat(title, content);
};

const isCurrent = msg => {
  const isDisplayable = !msg.display === 'once' || !hasDisplayed(msg.title);
  const correctCoreVersion =
    foundry.utils.isNewerVersion(msg['max-core-version'] ?? '100.0.0', game.version) &&
    foundry.utils.isNewerVersion(game.version, msg['min-core-version'] ?? '0.0.0');
  const correctSysVersion = semverComp(
    msg['min-sys-version'] ?? '0.0.0',
    game.system.data.version,
    msg['max-sys-version'] ?? '100.0.0',
    { gEqMin: true },
  );
  return isDisplayable && correctCoreVersion && correctSysVersion;
};

const hasDisplayed = identifier => {
  const settings = game.settings.get(SYSTEM_NAME, 'messages');
  if (settings?.includes(identifier)) return true;
  else return false;
};

const displayPrompt = (title, content) => {
  content = content.replace('{name}', game.user.name);
  return Dialog.prompt({
    title: title,
    content: `<img src="systems/t2k4e/assets/t2k-banner-small.webp"/>${content}`,
    label: 'Understood!',
    options: { width: 400, classes: [SYSTEM_NAME, 'dialog'] },
    callback: () => setDisplayed(title),
  });
};

const sendToChat = (title, content) => {
  content = content.replace('{name}', game.user.name);
  setDisplayed(title);
  const footer = `<footer class="nue">${game.i18n.localize('NUE.FirstLaunchHint')}</footer>`;
  return ChatMessage.create({
    whisper: [game.user.id],
    speaker: { alias: 'Twilight: 2000 4E' },
    flags: { core: { canPopout: true } },
    title: title,
    content: `<div class="chat-card"><h3 class="nue">${title}</h3>${content}${footer}</div>`,
  });
};

const setDisplayed = async identifier => {
  const settings = game.settings.get(SYSTEM_NAME, 'messages');
  settings.push(identifier);
  await game.settings.set(SYSTEM_NAME, 'messages', settings.flat());
};
