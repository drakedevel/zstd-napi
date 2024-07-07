{
  'variables': {
    'enable_annobin%': 0,
    'enable_harden%': 0,
    'enable_lto%': 0,
  },
  'conditions': [
    ['enable_annobin == 1', {
      'cflags': ['-fplugin=annobin'],
      'ldflags': ['-fplugin=annobin'],
    }],
    ['enable_harden == 1 and OS != "mac"', {
      'defines': ['_FORTIFY_SOURCE=2', '_GLIBCXX_ASSERTIONS'],
      'cflags': ['-fstack-clash-protection', '-fstack-protector-strong', '-g', '-grecord-gcc-switches'],
      'ldflags': ['-Wl,-z,now'],
      'conditions': [
        ['target_arch == "x64"', {
          'cflags': ['-fcf-protection=full'],
        }],
      ],
    }],
    ['enable_harden == 1 and OS == "mac"', {
      'xcode_settings': {
        'OTHER_CFLAGS': ['-fstack-clash-protection', '-fstack-protector-strong'],
        'conditions': [
          ['target_arch == "x64"', {
            'OTHER_CFLAGS': ['-fcf-protection=full'],
          }],
        ],
      },
    }],
    ['enable_lto == 1', {
      'cflags': ['-flto=auto'],
      'ldflags': ['-flto=auto'],
    }],
  ],
}