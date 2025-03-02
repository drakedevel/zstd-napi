{
  'cflags': ['-fexceptions'],
  'xcode_settings': {
    'OTHER_CFLAGS': ['-fexceptions'],
  },
  'conditions': [
    ['OS != "mac"', {
      'defines': ['_FORTIFY_SOURCE=2'],
    }],
    ['OS == "mac" and target_arch == "x64"', {
      'xcode_configuration_platform': 'x86_64',
    }],
  ],
}
