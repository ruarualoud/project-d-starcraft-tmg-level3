// The publisher hosts the excerpts. Full-length tracks can be supplied by the host or by a player.
export const battlefieldSoundtrack = Object.freeze([
  { id: "terran-one", name: "Terran One", preview: "2835574" },
  { id: "protoss-one", name: "Protoss One", preview: "2835580" },
  { id: "zerg-one", name: "Zerg One", preview: "2835587" },
].map(({ id, name, preview }) => Object.freeze({
  id, name, localPath: `/assets/soundtrack/${id}.mp3`,
  previewUrl: `https://macphersonrecords.com/player/1901173/tracks/${preview}.mp3`,
})));
