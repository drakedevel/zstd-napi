{
  'variables': {
    'enable_annobin%': 0,
    'enable_harden%': 0,
    'enable_lto%': 0,
    'conditions': [
      ['OS!="win"', {
        'enable_annobin': '<!(echo $ZSTD_NAPI_ENABLE_ANNOBIN)',
        'enable_harden': '<!(echo $ZSTD_NAPI_ENABLE_HARDEN)',
        'enable_lto': '<!(echo $ZSTD_NAPI_ENABLE_LTO)',
      }],
    ],
  },
  'cflags': ['-fexceptions'],
  'xcode_settings': {
    'OTHER_CFLAGS': ['-fexceptions'],
  },
  'conditions': [
    ['OS != "mac"', {
      'defines': ['_FORTIFY_SOURCE=2'],
    }],
    ['enable_annobin == 1', {
      'cflags': ['-fplugin=annobin'],
      'ldflags': ['-fplugin=annobin'],
    }],
    ['enable_harden == 1 and OS != "mac"', {
      'defines!': ['_FORTIFY_SOURCE=2'],
      'defines': ['_FORTIFY_SOURCE=3', '_GLIBCXX_ASSERTIONS'],
      'cflags': ['-fstrict-flex-arrays=3', '-fstack-clash-protection', '-fstack-protector-strong'],
      'ldflags': ['-Wl,-z,now'],
    }],
    ['enable_harden == 1 and OS != "mac" and target_arch == "arm64"', {
      # XXX: Investigate why this doesn't work on AlmaLinux 8, even with GCC 14
      'cflags': ['-mbranch-protection=standard'],
      # TODO: -Wl,-z,bti-report=error on Binutils 2.44+
    }],
    ['enable_harden == 1 and OS != "mac" and target_arch == "x64"', {
      'cflags': ['-fcf-protection=full'],
      'ldflags': ['-Wl,-z,cet-report=error'],
    }],
    ['enable_harden == 1 and OS == "mac"', {
      'xcode_settings': {
        # TODO: -fstrict-flex-arrays=3 on Clang 16+
        'OTHER_CFLAGS': ['-fstack-protector-strong', '-fstrict-flex-arrays=2'],
        # TODO: Support PAC when Apple stabilizes arm64e
      },
    }],
    ['enable_lto == 1', {
      'cflags': ['-flto=auto'],
      'ldflags': ['-flto=auto'],
      'xcode_settings': {
        'LLVM_LTO': 'YES',
      },
    }],
    ['OS == "mac" and target_arch == "x64"', {
      'xcode_configuration_platform': 'x86_64',
    }],
  ],
}
