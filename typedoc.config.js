export default {
  entryPoints: ['lib', 'binding.d.cts'],
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  headings: {
    readme: false,
  },
  includeVersion: true,
  sortEntryPoints: false,
  tsconfig: 'tsconfig.emit.json',
  validation: {
    notDocumented: true,
  },
  requiredToBeDocumented: [
    'Accessor',
    'Class',
    'Constructor',
    'Enum',
    //'EnumMember',
    'Function',
    'Interface',
    'Method',
    'Module',
    //'Property',
    'TypeAlias',
    'Variable',
  ],
  externalSymbolLinkMappings: {
    '@types/node': {
      'internal.Transform':
        'https://nodejs.org/docs/latest/api/stream.html#class-streamtransform',
    },
  },
};
