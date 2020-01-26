{
  'targets': [
    {
      'target_name': 'binding',
      'sources': ['src/binding.cc', 'src/cctx.cc', 'src/cdict.cc'],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'defines': ['NODE_ADDON_API_DISABLE_DEPRECATED'],
      'cflags!': ['-fno-exceptions'],
      'cflags_cc!': ['-fno-exceptions'],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
      },
      'msvs_settings': {
        'VCCLCompilerTool': {'ExceptionHandling': 1},
      },
      'conditions': [
        ['OS=="linux"', {
          'ldflags': [
            '-lzstd',
          ],
        }],
        ['OS=="mac"', {
          'cflags+': ['-fvisibility=hidden'],
          'xcode_settings': {
            'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES',
          }
        }]
      ],
    },
  ],
}
