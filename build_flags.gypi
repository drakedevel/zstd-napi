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
      # TODO: _FORTIFY_SOURCE=3 on GCC 12+
      'defines': ['_GLIBCXX_ASSERTIONS'],
      # TODO: -fstrict-flex-arrays=3 on GCC 13+
      'cflags': ['-fstack-clash-protection', '-fstack-protector-strong'],
      'ldflags': ['-Wl,-z,now'],
      # TODO: -mbranch-protection=standard for arm64 (PAC/BTI)
      # TODO: -fcf-protection=full for x64 (CET)
      # Both of these require the distro to ship cri*.o compiled with these
      # in order for the resulting binary to be protected, and Debian doesn't
      # support either as of 13
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
