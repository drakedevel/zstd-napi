{
  'variables': {
    'zstd_asan%': '0',
    'zstd_msan_prefix%': '',
    'zstd_ubsan%': '0',
  },
  'conditions': [
    ['zstd_asan==1', {
      'cflags': ['-fsanitize=address'],
      'ldflags': ['-fsanitize=address'],
    }],
    ['zstd_msan_prefix!=""', {
      'cflags+': [
        '-nostdinc++', '-isystem<(zstd_msan_prefix)/include/c++/v1',
        '-fsanitize=memory', '-fsanitize-memory-track-origins',
      ],
      'ldflags+': [
        '-nostdlib++', '-L<(zstd_msan_prefix)/lib',
        '-Wl,-rpath,<(zstd_msan_prefix)/lib', '-lc++',
        '-fsanitize=memory', '-fsanitize-memory-track-origins',
      ],
    }],
    ['zstd_ubsan==1', {
      'cflags': ['-fsanitize=undefined', '-fno-sanitize-recover=undefined'],
      'ldflags': ['-fsanitize=undefined', '-fno-sanitize-recover=undefined'],
    }],
    ['zstd_asan==1 or zstd_msan_prefix!="" or zstd_ubsan==1', {
      'cflags': ['-fno-omit-frame-pointer', '-g'],
      'ldflags': ['-fno-omit-frame-pointer', '-g'],
    }],
    ['OS == "mac" and target_arch == "x64"', {
      'xcode_configuration_platform': 'x86_64',
    }],
  ],
}
