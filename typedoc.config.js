module.exports = {
  entryPoints: ['lib', 'binding.d.ts'],
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  includeVersion: true,
  sortEntryPoints: false,
  tsconfig: 'tsconfig.emit.json',
};
